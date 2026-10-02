import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

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

test("CSV atualiza os créditos só quando consulta a IA, inclusive se a análise falhar", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useAiCreditsStore } = await server.ssrLoadModule("/src/stores/aiCredits.js");
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    useAuthStore().user = { id: 1, plan_tier: "pro" };
    const credits = useAiCreditsStore();
    const schema = { dateColumn: "Quando", descriptionColumn: "Detalhe", amountColumn: "Quantia" };

    for (const source of ["ai", "known", "cached", "failed"]) {
      localStorage.clear();
      credits.setUsage({ remaining_credits: 300, total_credits: 300, used_credits: 0 });
      let analyses = 0;
      let usageReads = 0;
      financeService.analyzeCsvSchema = async () => {
        analyses += 1;
        if (source === "failed") throw new Error("Falha no provedor");
        return { data: schema };
      };
      api.get = async (url) => {
        assert.equal(url, "/finance/ai/usage");
        usageReads += 1;
        return { data: { remaining_credits: 298, total_credits: 300, used_credits: 2 } };
      };
      if (source === "cached") {
        localStorage.setItem("kadem:nexo:csv-schema:quando|detalhe|quantia", JSON.stringify(schema));
      }
      let parsed = false;
      const context = {
        ...Nexo.methods,
        isPaidPlan: true,
        canUseAi: true,
        usage: credits.usage,
        resolveKnownCsvSchema: () => (source === "known" ? schema : null),
        parseCsvWithSchemaEnhanced: async (rows, detected) => {
          assert.deepEqual(detected, schema);
          assert.equal(rows.length, 2);
          parsed = true;
        },
      };
      await context.handleCsvFileChange({
        target: { files: [{ name: "extrato.csv", text: async () => "Quando;Detalhe;Quantia\n2026-10-01;Mercado;-20" }] },
      });
      const calledAi = source === "ai" || source === "failed";
      assert.equal(analyses, calledAi ? 1 : 0, source);
      assert.equal(usageReads, calledAi ? 1 : 0, source);
      assert.equal(context.usage.used_credits, calledAi ? 2 : 0, source);
      assert.equal(credits.remainingCredits, calledAi ? 298 : 300, source);
      assert.equal(context.loadingSchema, false, source);
      assert.equal(parsed, source !== "failed", source);
      if (source === "failed") assert.equal(context.csvImportError, "Falha no provedor");
    }

    // O CSV conhecido usa o histórico para categorizar, preserva hora/sinal e não cobra na reimportação.
    let localTransactions = [{ id: 7, description: "Mercado", category_id: 3, is_ignored: false }];
    financeService.analyzeCsvSchema = async () => assert.fail("o CSV conhecido não deve consultar IA");
    api.get = async () => assert.fail("o processamento local não deve atualizar consumo de IA");
    const context = {
      ...Nexo.methods,
      isPaidPlan: true,
      categories: [{ id: 3, name: "Alimentação", type: "EXPENSE" }],
      loadLocalTransactionsForMemory: async () => localTransactions,
    };
    const event = { target: { files: [{
      name: "extrato-conhecido.csv",
      text: async () => "Data;Hora;Tipo;Origem/Destino;Valor\n01/10/2026;12:30;Compra;Mercado;−20,00",
    }] } };
    await context.handleCsvFileChange(event);
    assert.equal(context.csvImportError, "");
    assert.equal(context.csvImportRows.length, 1);
    assert.equal(context.csvImportRows[0].category_id, "3");
    assert.equal(context.csvImportRows[0].type, "EXPENSE");
    assert.equal(context.csvImportRows[0].transaction_date, "2026-10-01 12:30:00");
    localTransactions = [...localTransactions, { ...context.csvImportRows[0], id: 8 }];
    await context.handleCsvFileChange(event);
    assert.equal(context.csvImportRows.length, 0);
    assert.equal(context.csvPreviewRows[0].csv_status, "duplicate_exact");
  } finally {
    await server.close();
  }
});

test("aviso do CSV compara apenas linhas novas com o mês e ano do filtro", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { default: Notice } = await server.ssrLoadModule("/src/components/finance/nexo/NexoCsvMonthNotice.vue");
    const row = (month, status = "new") => ({ transaction_date: `${month}-10`, csv_status: status });
    const cases = [
      { rows: [row("2026-09")], outside: 1, button: true },
      { rows: [row("2026-10")], outside: 0, button: false },
      { rows: [row("2025-10")], outside: 1, button: true },
      { rows: [row("2026-09"), row("2026-10")], outside: 1, button: false },
      { rows: [row("2026-08"), row("2026-09")], outside: 2, button: true },
      { rows: [row("2026-09", "duplicate_exact")], outside: 0, button: false },
      { rows: [row("2026-10"), row("2026-09", "duplicate_file")], outside: 0, button: false },
    ];
    for (const scenario of cases) {
      const summary = Nexo.computed.csvImportSummary.call({
        csvPreviewRows: scenario.rows,
        selectedMonth: "2026-10",
        monthLabelFromKey: Nexo.methods.monthLabelFromKey,
      });
      assert.equal(summary.outsideSelectedMonth, scenario.outside);
      const html = await renderToString(createSSRApp(Notice, { summary }));
      assert.equal(html.includes('role="status"'), scenario.outside > 0);
      assert.equal(html.includes("Importar e ver"), scenario.button);
      if (scenario.outside > 0) assert.match(html, /outubro de 2026/);
      if (summary.importMonths.length === 1 && scenario.outside > 0) {
        assert.ok(html.includes(summary.importMonths[0].label));
      }
    }
  } finally {
    await server.close();
  }
});

test("importar e ver muda o filtro após salvar; importar normalmente ou falhar mantém o mês", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    for (const mode of ["show", "normal", "failed"]) {
      let refreshedMonth = null;
      const context = {
        selectedMonth: "2026-10",
        importingCsv: false,
        csvImportRows: [{ description: "Mercado", amount: 20, type: "EXPENSE", transaction_date: "2026-09-10" }],
        resetCsvImport() { this.csvImportRows = []; },
        async refreshTransactionDrivenViews() { refreshedMonth = this.selectedMonth; },
      };
      financeService.createTransactionsBatch = async (rows) => {
        assert.equal(context.selectedMonth, "2026-10", "o filtro deve mudar só depois de salvar");
        assert.equal(rows[0].transaction_date, "2026-09-10");
        if (mode === "failed") throw new Error("Não foi possível salvar");
      };
      await Nexo.methods.confirmCsvImport.call(context, mode === "normal" ? null : "2026-09");
      assert.equal(context.selectedMonth, mode === "show" ? "2026-09" : "2026-10");
      assert.equal(refreshedMonth, mode === "failed" ? null : context.selectedMonth);
      assert.equal(context.importingCsv, false);
      if (mode === "failed") assert.equal(context.csvImportRows.length, 1);
    }
  } finally {
    await server.close();
  }
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
