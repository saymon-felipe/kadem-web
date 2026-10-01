import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";

// O grafo de stores importa o router, que exige window/history; o teste so precisa da fila.
const STUB_ROUTER_ID = "\0stub-router";
const stubRouter = {
  name: "stub-router",
  enforce: "pre",
  resolveId(id) {
    if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id)) return STUB_ROUTER_ID;
  },
  load(id) {
    if (id === STUB_ROUTER_ID) return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
  },
};

const installMemoryStorage = () => {
  const items = new Map();
  globalThis.localStorage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  };
};

const createViteServer = () =>
  createServer({
    configFile: false,
    plugins: [stubRouter, vue()],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });

test("pulls concorrentes do Nexo preservam a meta local pendente", async () => {
  const server = await createViteServer();
  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { financeRepository } = await server.ssrLoadModule("/src/services/localData/financeRepository.js");

    await financeRepository.clearLocalFinance();
    await financeRepository.createLocalInvestmentGoal({ name: "Meta local", horizon: "SHORT", target_amount: 100 });

    // reloadAll, troca de aba e refresh pos-mutacao disparam getInvestments em paralelo.
    const serverGoals = [{ id: 7, name: "Meta do servidor", horizon: "LONG", target_amount: 500, is_archived: 0 }];
    await Promise.all(Array.from({ length: 8 }, () => financeRepository.setInvestmentGoals(serverGoals)));

    const goals = await financeRepository.getInvestmentGoals();
    assert.deepEqual(goals.map((goal) => goal.name).sort(), ["Meta do servidor", "Meta local"]);
  } finally {
    db?.close();
    await server.close();
  }
});

test("tarefa enfileirada durante uma execucao da fila e processada, nao fica parada", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    const { useUtilsStore } = await server.ssrLoadModule("/src/stores/utils.js");
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    const { financeRepository } = await server.ssrLoadModule("/src/services/localData/financeRepository.js");
    const { syncQueueRepository } = await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");

    const utils = useUtilsStore();
    utils.is_network_online = true;
    utils.is_kadem_api_available = true;
    useAuthStore().user = { id: 1 };

    await financeRepository.clearLocalFinance();
    await syncQueueRepository.clearSyncQueue();

    const posts = [];
    api.post = async (url, body) => {
      posts.push({ url, body });
      return { data: { id: 100 + posts.length, ...body, is_archived: 0 } };
    };

    // A execucao da fila termina puxando o delta do Health. Seguramos essa chamada para
    // enfileirar a segunda meta depois da ultima leitura da fila, mas antes do fim da execucao.
    let releaseHealth;
    const healthGate = new Promise((resolve) => (releaseHealth = resolve));
    let healthEntered;
    const healthEnteredSignal = new Promise((resolve) => (healthEntered = resolve));
    api.get = async (url) => {
      if (url !== "/health/sync") throw new Error(`GET inesperado: ${url}`);
      healthEntered();
      await healthGate;
      return { data: { changes: [], next_cursor: 0, has_more: false } };
    };

    const first = financeService.createInvestmentGoal({ name: "Meta A", horizon: "SHORT", target_amount: 100 });
    await healthEnteredSignal;
    await financeService.createInvestmentGoal({ name: "Meta B", horizon: "LONG", target_amount: 200 });
    releaseHealth();
    await first;

    assert.deepEqual(posts.map((post) => post.body.name).sort(), ["Meta A", "Meta B"]);
    assert.equal((await syncQueueRepository.getPendingTasks()).length, 0);
    const goals = await financeRepository.getInvestmentGoals();
    assert.ok(goals.every((goal) => Number.isFinite(Number(goal.id))), "as duas metas devem ter id do servidor");
  } finally {
    db?.close();
    await server.close();
  }
});

const loadOfflineFinance = async (server) => {
  installMemoryStorage();
  setActivePinia(createPinia());
  const modules = {
    db: (await server.ssrLoadModule("/src/db.js")).db,
    api: (await server.ssrLoadModule("/src/plugins/api.js")).api,
    useUtilsStore: (await server.ssrLoadModule("/src/stores/utils.js")).useUtilsStore,
    useAuthStore: (await server.ssrLoadModule("/src/stores/auth.js")).useAuthStore,
    financeService: (await server.ssrLoadModule("/src/services/financeService.js")).financeService,
    financeRepository: (await server.ssrLoadModule("/src/services/localData/financeRepository.js")).financeRepository,
    syncQueueRepository: (await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js")).syncQueueRepository,
    syncService: (await server.ssrLoadModule("/src/services/syncService.js")).syncService,
  };
  modules.useAuthStore().user = { id: 1 };
  await modules.financeRepository.clearLocalFinance();
  await modules.syncQueueRepository.clearSyncQueue();

  const posts = [];
  modules.api.post = async (url, body) => {
    posts.push({ url, body });
    return { data: { id: 100 * posts.length, ...body, is_archived: 0 } };
  };
  modules.api.get = async () => ({ data: { changes: [], next_cursor: 0, has_more: false } });
  modules.posts = posts;
  modules.setOnline = (online) => {
    const utils = modules.useUtilsStore();
    utils.is_network_online = online;
    utils.is_kadem_api_available = online;
  };
  modules.addCategory = (category) =>
    modules.db.finance_categories.add({ local_key: `category-${category.id}`, pending_sync: false, ...category });
  return modules;
};

test("aporte criado offline com meta nova: a meta sincroniza antes e o aporte leva o id do servidor", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    m.setOnline(false);

    const { data: goal } = await m.financeService.createInvestmentGoal({ name: "Reserva", horizon: "SHORT", target_amount: 500 });
    await m.financeService.createTransaction({
      description: "Aporte",
      amount: 100,
      type: "EXPENSE",
      category_id: 11,
      goal_id: goal.id,
      transaction_date: "2026-09-10",
    });
    assert.equal(m.posts.length, 0, "offline nada e enviado");

    m.setOnline(true);
    await m.syncService.processSyncQueue();

    assert.deepEqual(m.posts.map((post) => post.url), ["/finance/investments/goals", "/finance/transactions"]);
    const goalServerId = 100;
    assert.equal(m.posts[1].body.goal_id, goalServerId);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});

test("meta removida antes do sync: o aporte segue sem meta em vez de ficar preso na fila", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    m.setOnline(false);

    const { data: goal } = await m.financeService.createInvestmentGoal({ name: "Reserva", horizon: "SHORT", target_amount: 500 });
    await m.financeService.createTransaction({
      description: "Aporte",
      amount: 100,
      type: "EXPENSE",
      category_id: 11,
      goal_id: goal.id,
      transaction_date: "2026-09-10",
    });
    await m.financeService.deleteInvestmentGoal(goal.id);

    m.setOnline(true);
    await m.syncService.processSyncQueue();

    assert.deepEqual(m.posts.map((post) => post.url), ["/finance/transactions"]);
    assert.equal("goal_id" in m.posts[0].body, false);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});

test("categoria comum nao guarda meta localmente, nem ao trocar a categoria de um aporte", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    await m.addCategory({ id: 3, name: "Mercado", type: "EXPENSE", investment_flow_type: "STANDARD" });
    m.setOnline(false);

    const { data: common } = await m.financeService.createTransaction({
      description: "Feira", amount: 20, type: "EXPENSE", category_id: 3, goal_id: 7, transaction_date: "2026-09-10",
    });
    assert.equal(common.goal_id, null);

    const { data: contribution } = await m.financeService.createTransaction({
      description: "Aporte", amount: 100, type: "EXPENSE", category_id: 11, goal_id: 7, transaction_date: "2026-09-10",
    });
    assert.equal(contribution.goal_id, 7);

    await m.financeService.updateTransaction(contribution.id, { category_id: 3 });
    const [row] = (await m.financeRepository.getTransactions({ month: "2026-09" })).filter(
      (item) => item.description === "Aporte",
    );
    assert.equal(row.goal_id, null);
  } finally {
    db?.close();
    await server.close();
  }
});

test("waitForSync: false devolve o lancamento local antes de o servidor responder", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    m.setOnline(true);

    let releasePost;
    const postGate = new Promise((resolve) => (releasePost = resolve));
    const originalPost = m.api.post;
    m.api.post = async (url, body) => {
      await postGate;
      return originalPost(url, body);
    };

    const payload = { description: "Mercado", amount: 20, type: "EXPENSE", transaction_date: "2026-09-10" };
    const pending = m.financeService.createTransaction(payload, { waitForSync: false });
    const outcome = await Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve("bloqueou"), 3000))]);

    assert.notEqual(outcome, "bloqueou", "a chamada nao pode esperar o servidor");
    assert.equal(outcome.data.description, "Mercado");
    assert.equal(m.posts.length, 0, "o servidor ainda nao respondeu");

    releasePost();
    await outcome.synced;
    assert.equal(m.posts.length, 1);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});
