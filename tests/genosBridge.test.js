import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { setActivePinia, createPinia } from "pinia";
import {
  BRIDGE_OPS,
  decode_bridge_request,
  encode_bridge_request,
  finite_number,
  is_bridge_query,
  parse_bridge_command,
  parse_local_datetime,
  pick_unique,
  rank_matches,
} from "../src/utils/genos_bridge.js";
import { authorize_scopes, consent_text, has_scopes, scopes_for } from "../src/services/genosAccess.js";
import { strip_genos_query } from "../src/utils/genos_command.js";

const KEY = "k7Qp2xVn9LmR4sTw";
const NOW = new Date(2026, 10, 8, 10, 0, 0); // domingo, 8/11/2026 10:00 (hora local)

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.location = { pathname: "/", search: "", hash: "", origin: "http://localhost:3000", href: "http://localhost:3000/" };
globalThis.history = { state: null, pushState() {}, replaceState() {} };
globalThis.window = { localStorage, location, history, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
globalThis.document = { querySelector() { return null; }, createElement() { return {}; }, documentElement: { style: {} }, addEventListener() {}, removeEventListener() {} };

const memory_storage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) };
};

const request_query = (request, extra = {}) => ({
  genos: "bridge", req: encode_bridge_request({ v: 1, ...request }), key: KEY, nonce: "n1", port: "38517", ...extra,
});

// --- protocolo (funções puras) ---

test("lê o pedido da ponte na URL e recusa o que está incompleto, adulterado ou desconhecido", () => {
  const query = request_query({ op: "agenda.list", args: { from: "2026-11-08" } });
  assert.deepEqual(parse_bridge_command(query), {
    action: "bridge", op: "agenda.list", args: { from: "2026-11-08" }, confirmed: false, key: KEY, nonce: "n1", port: 38517,
  });
  assert.equal(parse_bridge_command(request_query({ op: "agenda.delete", args: { key: "a" }, confirmed: true })).confirmed, true);
  assert.equal(parse_bridge_command({ ...query, key: "curta" }), null, "chave fraca");
  assert.equal(parse_bridge_command({ ...query, nonce: "" }), null, "sem nonce");
  assert.equal(parse_bridge_command({ ...query, port: "80" }), null, "porta privilegiada");
  assert.equal(parse_bridge_command({ ...query, port: "abc" }), null);
  assert.equal(parse_bridge_command({ ...query, req: "%%%" }), null, "base64 inválido");
  assert.equal(parse_bridge_command({ ...query, req: encode_bridge_request({ v: 2, op: "agenda.list" }) }), null, "versão desconhecida");
  assert.equal(parse_bridge_command({ ...query, req: encode_bridge_request({ v: 1, op: "nexo.transfer", args: {} }) }), null, "operação inexistente");
  assert.equal(parse_bridge_command({ ...query, req: encode_bridge_request({ v: 1, op: "agenda.list", args: [] }) }), null);
  assert.equal(parse_bridge_command({ ...query, genos: "play" }), null);
  assert.equal(is_bridge_query({ genos: ["bridge"] }), true);
  assert.equal(is_bridge_query({ genos: "play" }), false);
  assert.equal(decode_bridge_request("a".repeat(9000)), null, "pedido enorme");
  assert.deepEqual(strip_genos_query({ ...query, outra: "1" }), { outra: "1" }, "req e port saem da URL");
});

test("o texto com acentos e emojis sobrevive à ida e volta pela URL", () => {
  const args = { title: "Consulta com a Dra. Conceição ☕", notes: "ã é ô — “aspas”" };
  const decoded = decode_bridge_request(encode_bridge_request({ v: 1, op: "agenda.create", args, confirmed: true }));
  assert.deepEqual(decoded.args, args);
});

test("o Nexo é somente leitura e toda escrita exige confirmação", () => {
  for (const [op, info] of Object.entries(BRIDGE_OPS)) {
    if (op.startsWith("nexo.")) assert.equal(info.write, false, `${op} não pode escrever`);
  }
  const writes = Object.entries(BRIDGE_OPS).filter(([, info]) => info.write).map(([op]) => op);
  assert.deepEqual(writes.sort(), [
    "agenda.create", "agenda.delete", "agenda.update",
    "health.object.create", "health.object.delete", "health.object.update", "health.supply.entry", "health.supply.use",
  ]);
});

test("datas locais são validadas sem estourar para o mês seguinte", () => {
  assert.equal(parse_local_datetime("2026-02-31"), null);
  assert.equal(parse_local_datetime("2026-11-08T25:00"), null);
  assert.equal(parse_local_datetime("amanhã"), null);
  assert.equal(parse_local_datetime("2026-11-08").dateOnly, true);
  const parsed = parse_local_datetime("2026-11-08T14:30");
  assert.equal(parsed.dateOnly, false);
  assert.equal(parsed.date.getHours(), 14);
  assert.equal(parsed.date.getMinutes(), 30);
});

test("escolhe o item pelo nome falado e só aceita sozinho quando não há dúvida", () => {
  const items = [{ name: "Dentista Dr. Paulo" }, { name: "Dentista" }, { name: "Reunião de equipe" }];
  const matches = rank_matches(items, "dentista");
  assert.equal(matches[0].item.name, "Dentista", "empate: o nome mais curto");
  assert.equal(pick_unique(matches).status, "one");
  assert.equal(pick_unique(rank_matches(items, "futebol")).status, "none");
  const twins = rank_matches([{ name: "Consulta ana" }, { name: "Consulta ana lima" }], "consulta ana");
  assert.equal(pick_unique(twins).status === "one" || pick_unique(twins).status === "ambiguous", true);
  assert.equal(finite_number("2,5"), 2.5);
  assert.equal(finite_number("abc"), null);
  assert.equal(finite_number(-1, { min: 0 }), null);
});

// --- escopos e consentimento ---

test("o consentimento vale por escopo; chaves antigas continuam valendo só para o Radio Flow", () => {
  const store = memory_storage();
  assert.deepEqual(scopes_for(KEY, store), []);
  store.setItem("kadem_genos_remote_key", KEY); // aceita antes dos escopos existirem
  assert.deepEqual(scopes_for(KEY, store), ["radio"]);
  assert.equal(has_scopes(KEY, ["agenda"], store), false);

  authorize_scopes(KEY, ["agenda", "health", "nexo"], store);
  assert.deepEqual(scopes_for(KEY, store), ["radio", "agenda", "health", "nexo"], "mantém o que já tinha");
  assert.equal(has_scopes(KEY, ["agenda", "nexo"], store), true);
  assert.deepEqual(scopes_for("outra-chave-qualquer-123", store), []);

  authorize_scopes("outra-chave-qualquer-123", ["agenda"], store);
  assert.deepEqual(scopes_for("outra-chave-qualquer-123", store), ["agenda"], "chave nova substitui os escopos da antiga");
  assert.deepEqual(scopes_for(KEY, store), []);

  const text = consent_text(["agenda", "health", "nexo"]);
  assert.match(text, /somente leitura/);
  assert.match(text, /confirmação por voz/);
  assert.doesNotMatch(consent_text(["nexo"]), /criar/);
});

// --- execução nos dados locais ---

async function startServer() {
  return createServer({
    configFile: false, root: process.cwd(), plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
}

async function setup(server, { userId = "bridge-test", finance = {}, physical = {}, stubSync = true } = {}) {
  const { createGenosBridge } = await server.ssrLoadModule("/src/services/genosBridge/index.js");
  const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
  const { useAgendaStore } = await server.ssrLoadModule("/src/stores/agenda.js");
  const { useHealthStore } = await server.ssrLoadModule("/src/stores/health.js");
  const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
  const { api } = await server.ssrLoadModule("/src/plugins/api.js");
  const { db } = await server.ssrLoadModule("/src/db.js");
  const syncCalls = { count: 0 };
  if (stubSync) syncService.processSyncQueue = async () => { syncCalls.count += 1; };
  api.get = async () => ({ data: [] });
  setActivePinia(createPinia());
  if (userId) useAuthStore().user = { id: userId };
  const bridge = createGenosBridge({
    stores: { agenda: useAgendaStore, health: useHealthStore, auth: useAuthStore },
    finance, physical, sync: syncService, online: () => true, now: () => NOW,
  });
  return { bridge, db, syncService, syncCalls, agenda: useAgendaStore(), health: useHealthStore() };
}

const call = (bridge, op, args = {}, confirmed = false) => bridge.execute({ op, args, confirmed });

test("a agenda cria, lista, procura, remarca e apaga compromissos, sempre com confirmação nas escritas", async () => {
  const server = await startServer();
  let db;
  try {
    const ctx = await setup(server);
    db = ctx.db;
    const { bridge } = ctx;

    const refused = await call(bridge, "agenda.create", { title: "Dentista", start: "2026-11-09T14:00" });
    assert.equal(refused.ok, false);
    assert.equal(refused.code, "confirmation_required");
    assert.equal((await call(bridge, "agenda.list", { from: "2026-11-01", to: "2026-11-30" })).data.total, 0, "nada foi criado sem confirmação");

    const created = await call(bridge, "agenda.create", { title: "Dentista", start: "2026-11-09T14:00", location: "Rua A, 10" }, true);
    assert.equal(created.ok, true);
    assert.equal(created.data.event.start, "2026-11-09T14:00");
    assert.equal(created.data.event.end, "2026-11-09T15:00", "uma hora por padrão, como na tela da Agenda");
    assert.equal(created.data.event.editable, true);
    assert.deepEqual(created.data.conflicts, []);
    const key = created.data.event.key;

    const overlapping = await call(bridge, "agenda.create", { title: "Reunião", start: "2026-11-09T14:30", end: "2026-11-09T15:30" }, true);
    assert.equal(overlapping.data.conflicts.length, 1);
    assert.equal(overlapping.data.conflicts[0].title, "Dentista");

    const repeated = await call(bridge, "agenda.create", { title: "dentista", start: "2026-11-09T14:00" }, true);
    assert.equal(repeated.data.already_exists, true, "pedido repetido não duplica");
    assert.equal(repeated.data.event.key, key);

    const day = await call(bridge, "agenda.list", { from: "2026-11-09" });
    assert.deepEqual(day.data.items.map((item) => item.title), ["Dentista", "Reunião"]);
    assert.equal((await call(bridge, "agenda.list", { from: "2026-11-10" })).data.total, 0);

    const found = await call(bridge, "agenda.find", { query: "o dentista" });
    assert.equal(found.data.matches[0].key, key);

    const moved = await call(bridge, "agenda.update", { key, patch: { start: "2026-11-10T16:00" } }, true);
    assert.equal(moved.data.event.start, "2026-11-10T16:00");
    assert.equal(moved.data.event.end, "2026-11-10T17:00", "a duração é mantida");
    assert.equal(moved.data.event.location, "Rua A, 10");
    const renamed = await call(bridge, "agenda.update", { key, patch: { title: "Dentista Paulo", location: "" } }, true);
    assert.equal(renamed.data.event.title, "Dentista Paulo");
    assert.equal(renamed.data.event.location, "");

    const removed = await call(bridge, "agenda.delete", { key }, true);
    assert.equal(removed.data.deleted.title, "Dentista Paulo");
    assert.equal((await call(bridge, "agenda.delete", { key }, true)).code, "not_found");
    assert.deepEqual((await call(bridge, "agenda.list", { from: "2026-11-01", to: "2026-11-30" })).data.items.map((item) => item.title), ["Reunião"]);

    const queue = await db.syncQueue.toArray();
    assert.ok(queue.some((task) => task.type === "UPSERT_AGENDA_EVENT"), "as escritas entram na fila de sincronização");
    assert.ok(queue.some((task) => task.type === "DELETE_AGENDA_EVENT"));
  } finally {
    await server.close();
  }
});

test("compromissos de dia inteiro, validações e conta não conectada", async () => {
  const server = await startServer();
  try {
    const { bridge } = await setup(server);
    const allDay = await call(bridge, "agenda.create", { title: "Feriado", all_day: true, start: "2026-11-15" }, true);
    assert.equal(allDay.data.event.all_day, true);
    assert.equal(allDay.data.event.start, "2026-11-15");
    assert.equal(allDay.data.event.end, "2026-11-15");
    const week = await call(bridge, "agenda.list", { from: "2026-11-14", to: "2026-11-16" });
    assert.equal(week.data.items.length, 1);

    assert.equal((await call(bridge, "agenda.create", { title: "Sem hora", start: "2026-11-09" }, true)).code, "bad_request");
    assert.equal((await call(bridge, "agenda.create", { title: "", start: "2026-11-09T10:00" }, true)).code, "bad_request");
    assert.equal((await call(bridge, "agenda.create", { title: "Dia 31", start: "2026-02-31T10:00" }, true)).code, "bad_request");
    assert.equal((await call(bridge, "agenda.list", { from: "2026-11-10", to: "2026-11-01" })).code, "bad_request");
    assert.equal((await call(bridge, "agenda.update", { key: "nao-existe", patch: { title: "x" } }, true)).code, "not_found");
    assert.equal((await call(bridge, "inexistente", {})).code, "bad_request");
    assert.equal((await call(bridge, "ping")).data.pong, true);

    const guest = await setup(server, { userId: null });
    assert.equal((await call(guest.bridge, "agenda.list", { from: "2026-11-09" })).code, "unavailable");
    assert.equal((await call(guest.bridge, "ping")).ok, true, "o teste de conexão não depende da conta");
  } finally {
    await server.close();
  }
});

test("insumos: entrada, uso e saldo; categorias e agendamentos recorrentes ou não", async () => {
  const server = await startServer();
  try {
    const { bridge } = await setup(server);

    const supply = await call(bridge, "health.object.create", {
      name: "Dipirona", object_type: "MEDICATION", unit: "comprimidos", minimum_quantity: 4, initial_stock: 10,
    }, true);
    assert.equal(supply.ok, true);
    assert.equal(supply.data.object.kind, "supply");
    assert.equal(supply.data.object.stock.balance, 10);
    assert.equal(supply.data.object.stock.low, false);
    const key = supply.data.object.key;

    assert.equal((await call(bridge, "health.supply.use", { key, quantity: 3 })).code, "confirmation_required");
    const used = await call(bridge, "health.supply.use", { key, quantity: 3 }, true);
    assert.equal(used.data.object.stock.balance, 7);
    const entry = await call(bridge, "health.supply.entry", { key, quantity: "2,5", notes: "Farmácia" }, true);
    assert.equal(entry.data.object.stock.balance, 9.5);
    const low = await call(bridge, "health.supply.use", { key, quantity: 9 }, true);
    assert.equal(low.data.object.stock.low, true, "abaixo do mínimo");
    assert.equal((await call(bridge, "health.supply.use", { key, quantity: 0 }, true)).code, "bad_request");
    assert.equal((await call(bridge, "health.supply.entry", { key: "nao-existe", quantity: 1 }, true)).code, "not_found");

    const stock = await call(bridge, "health.list", { kind: "supplies" });
    assert.equal(stock.data.low_stock, 1);
    assert.equal(stock.data.objects[0].name, "Dipirona");

    const repeated = await call(bridge, "health.object.create", { name: "dipirona", object_type: "MEDICATION" }, true);
    assert.equal(repeated.data.already_exists, true);
    assert.equal((await call(bridge, "health.list", { kind: "supplies" })).data.total, 1);

    assert.equal((await call(bridge, "health.object.create", { name: "Dentista", object_type: "APPOINTMENT" }, true)).code, "bad_request", "agendamento sem data");
    const appointment = await call(bridge, "health.object.create", {
      name: "Consulta dermatologista", object_type: "APPOINTMENT", schedule: { anchor: "2026-11-20T09:30" },
    }, true);
    assert.equal(appointment.data.object.schedule.recurring, false);
    assert.equal(appointment.data.object.schedule.next_due, "2026-11-20T09:30");
    assert.equal(appointment.data.object.schedule.state, "pending");

    const routine = await call(bridge, "health.object.create", {
      name: "Antibiótico", object_type: "SCHEDULE", schedule: { anchor: "2026-11-08", recurrence: { unit: "hours", value: 8 } },
    }, true);
    assert.equal(routine.data.object.schedule.recurring, true);
    assert.deepEqual(routine.data.object.schedule.every, { unit: "hours", value: 8 });
    assert.equal(routine.data.object.schedule.next_due, "2026-11-08T09:00", "sem horário falado vale 9h");
    assert.equal(routine.data.object.schedule.state, "overdue", "9h de hoje já passou às 10h");
    assert.equal((await call(bridge, "health.object.create", { name: "X", object_type: "SCHEDULE", schedule: { anchor: "2026-11-08", recurrence: { unit: "years", value: 1 } } }, true)).code, "bad_request");

    const week = await call(bridge, "agenda.list", { from: "2026-11-20" });
    const health = week.data.items.find((item) => item.title === "Consulta dermatologista");
    assert.equal(health.source, "health");
    assert.equal(health.editable, false, "o Health manda nos agendamentos dele");
    const today = await call(bridge, "agenda.list", { from: "2026-11-08" });
    assert.equal(today.data.overdue_health, 0, "o atrasado de hoje já aparece na lista do dia");

    const schedules = await call(bridge, "health.list", { kind: "schedules" });
    assert.deepEqual(schedules.data.objects.map((item) => item.name), ["Antibiótico", "Consulta dermatologista"], "atrasados primeiro");
    assert.equal(schedules.data.overdue, 1);

    const edited = await call(bridge, "health.object.update", {
      key: appointment.data.object.key,
      patch: { name: "Consulta com a dermatologista", schedule: { anchor: "2026-11-25T14:00", recurrence: { unit: "months", value: 6 } } },
    }, true);
    assert.equal(edited.data.object.name, "Consulta com a dermatologista");
    assert.equal(edited.data.object.schedule.next_due, "2026-11-25T14:00");
    assert.deepEqual(edited.data.object.schedule.every, { unit: "months", value: 6 });
    const single = await call(bridge, "health.object.update", { key: appointment.data.object.key, patch: { schedule: { recurrence: null } } }, true);
    assert.equal(single.data.object.schedule.recurring, false);
    assert.equal(single.data.object.schedule.next_due, "2026-11-25T14:00", "o resto do agendamento continua");

    const restocked = await call(bridge, "health.object.update", { key, patch: { minimum_quantity: 2, stock_quantity: 20 } }, true);
    assert.equal(restocked.data.object.stock.balance, 20);
    assert.equal(restocked.data.object.stock.minimum, 2);
    assert.equal(restocked.data.object.name, "Dipirona", "o que não foi pedido não muda");

    const found = await call(bridge, "health.find", { query: "dipirona" });
    assert.equal(found.data.matches[0].key, key);

    const removed = await call(bridge, "health.object.delete", { key: appointment.data.object.key }, true);
    assert.equal(removed.data.deleted.name, "Consulta com a dermatologista");
    assert.equal((await call(bridge, "health.object.delete", { key: appointment.data.object.key }, true)).code, "not_found");
    assert.equal((await call(bridge, "health.list", { kind: "schedules" })).data.total, 1);
  } finally {
    await server.close();
  }
});

test("as escritas respondem sem esperar a rede e a sincronização roda uma vez depois", async () => {
  const server = await startServer();
  try {
    // Usa o processSyncQueue verdadeiro; só a passada interna da fila é contada.
    const { bridge, syncCalls, syncService } = await setup(server, { stubSync: false });
    // A passada da fila fica presa até o teste soltá-la: se a ponte a esperasse, a resposta nunca chegaria.
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    syncService._processSyncQueue = async () => { syncCalls.count += 1; await gate; };
    const within = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("a resposta esperou a rede")), ms))]);

    const created = await within(call(bridge, "agenda.create", { title: "Rápido", start: "2026-11-09T08:00" }, true), 3000);
    assert.equal(created.ok, true);
    assert.equal(syncCalls.count, 1, "a fila roda uma vez, depois de gravar, sem ser aguardada");

    // Escritas simultâneas compartilham a mesma passada final.
    const count = syncCalls.count;
    await within(Promise.all([
      call(bridge, "agenda.create", { title: "A", start: "2026-11-10T08:00" }, true),
      call(bridge, "agenda.create", { title: "B", start: "2026-11-10T09:00" }, true),
    ]), 3000);
    assert.equal(syncCalls.count, count + 1, "duas escritas, uma passada");

    // Fora das escritas da ponte o app sincroniza normalmente, na hora.
    release();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const normal = syncCalls.count;
    await syncService.processSyncQueue();
    assert.equal(syncCalls.count, normal + 1);
  } finally {
    await server.close();
  }
});

test("o Nexo só lê: resume o mês, filtra movimentações, investimentos, patrimônio, cartões e orçamento", async () => {
  const server = await startServer();
  try {
    const used = new Set();
    const reader = (name, value) => async (...args) => { used.add(name); return typeof value === "function" ? value(...args) : { data: value }; };
    const finance = {
      getDashboard: reader("getDashboard", {
        totals: { income: 5000, expense: 1234.5, balance: 3765.5, transfer_in: 0, transfer_out: 10 },
        macro_distribution: [{ macro_category: "Lazer", total: 100 }, { macro_category: "Moradia", total: 900.25 }],
        credit: { expense: 300, unassigned: 20, review_count: 2, by_card: [{ credit_card_id: 7, total: 280, count: 4 }] },
        investment_summary: { month_invested: 500, month_withdrawn: 100, month_net: 400 },
      }),
      getCategories: reader("getCategories", [{ id: 1, name: "Mercado", macro_category: "Moradia" }, { id: 2, name: "Cinema", macro_category: "Lazer" }]),
      listTransactions: reader("listTransactions", [
        { id: 1, description: "Compra em Mercado Bom Preço", amount: 150.9, type: "EXPENSE", category_id: 1, transaction_date: "2026-11-05", payment_method: "PIX" },
        { id: 2, description: "Cinema Shopping", amount: 60, type: "EXPENSE", category_id: 2, transaction_date: "2026-11-07", payment_method: "CREDIT_CARD" },
        { id: 3, description: "Salário", amount: 5000, type: "INCOME", category_id: null, transaction_date: "2026-11-01", payment_method: "TRANSFER" },
        { id: 4, description: "Estornado", amount: 99, type: "EXPENSE", category_id: 1, transaction_date: "2026-11-02", status: "CANCELED" },
        { id: 5, description: "Outro mês", amount: 1, type: "EXPENSE", category_id: 1, transaction_date: "2026-10-30" },
      ]),
      getInvestments: reader("getInvestments", {
        summary: { month_invested: 500, month_withdrawn: 100, month_net: 400, total_invested: 9000, total_yield: 300, total_withdrawn: 1000, estimated_balance: 8300 },
        category_distribution: [{ category_name: "Tesouro", estimated_balance: 6000 }, { category_name: "Vazia", estimated_balance: 0 }],
        goals: [{ name: "Viagem", target_amount: 10000, current_amount: 2500, target_date: "2027-07-01T00:00:00Z" }, { name: "Antiga", is_archived: true }],
      }),
      getCreditCards: reader("getCreditCards", [{ id: 7, name: "Roxinho", brand: "Mastercard", last_four: "1234" }, { id: 8, name: "Velho", is_archived: 1 }]),
      getBudgets: reader("getBudgets", [
        { macro_category: "Moradia", planned_amount: 1000, actual_amount: 900.25 },
        { macro_category: "Lazer", planned_amount: 200, actual_amount: 100 },
        { macro_category: "Vazio", planned_amount: 0, actual_amount: 0 },
      ]),
      // Qualquer método de escrita que a ponte tentasse chamar derruba o teste.
      createTransaction: () => { throw new Error("Nexo é somente leitura"); },
      updateTransaction: () => { throw new Error("Nexo é somente leitura"); },
      deleteTransaction: () => { throw new Error("Nexo é somente leitura"); },
      saveBudgets: () => { throw new Error("Nexo é somente leitura"); },
    };
    const physical = { overview: async () => ({ offline: false, data: { summary: { consolidated_total: 20000, digital_accounts: 5000, digital_investments: 8300, cash: 700, metals: 6000, missing_quotes: false } } }) };
    const { bridge } = await setup(server, { finance, physical });

    const summary = await call(bridge, "nexo.summary", {});
    assert.equal(summary.data.month, "2026-11");
    assert.equal(summary.data.expense, 1234.5);
    assert.deepEqual(summary.data.top_expenses, [{ name: "Moradia", amount: 900.25 }, { name: "Lazer", amount: 100 }]);
    assert.equal(summary.data.credit.review_count, 2);
    assert.equal(summary.data.investments.net, 400);
    assert.equal((await call(bridge, "nexo.summary", { month: "2026-13" })).code, "bad_request");

    const all = await call(bridge, "nexo.transactions", { type: "EXPENSE" });
    assert.equal(all.data.count, 2, "cancelada e de outro mês ficam de fora");
    assert.equal(all.data.expense, 210.9);
    assert.equal(all.data.transactions[0].description, "Cinema Shopping", "mais recente primeiro");
    const biggest = await call(bridge, "nexo.transactions", { sort: "largest", limit: 1 });
    assert.equal(biggest.data.transactions[0].description, "Salário");
    const market = await call(bridge, "nexo.transactions", { query: "mercado" });
    assert.deepEqual(market.data.transactions.map((item) => item.description), ["Compra em Mercado Bom Preço"]);
    assert.equal(market.data.transactions[0].payment, "Pix");
    const leisure = await call(bridge, "nexo.transactions", { category: "lazer" });
    assert.equal(leisure.data.count, 1, "a categoria vale também pelo grupo");

    const investments = await call(bridge, "nexo.investments", {});
    assert.equal(investments.data.summary.estimated_balance, 8300);
    assert.deepEqual(investments.data.categories, [{ name: "Tesouro", balance: 6000 }]);
    assert.deepEqual(investments.data.goals, [{ name: "Viagem", target: 10000, current: 2500, target_date: "2027-07-01" }]);

    const wealth = await call(bridge, "nexo.wealth", {});
    assert.equal(wealth.data.consolidated_total, 20000);
    assert.equal(wealth.data.metals, 6000);

    const cards = await call(bridge, "nexo.cards", {});
    assert.deepEqual(cards.data.cards, [{ name: "Roxinho", brand: "Mastercard", last_four: "1234", spent: 280, purchases: 4 }]);

    const budget = await call(bridge, "nexo.budget", {});
    assert.equal(budget.data.planned, 1200);
    assert.deepEqual(budget.data.groups.map((group) => group.name), ["Moradia", "Lazer"]);

    assert.deepEqual([...used].sort(), ["getBudgets", "getCategories", "getCreditCards", "getDashboard", "getInvestments", "listTransactions"]);
    // Mesmo com confirmação, não existe operação de escrita no Nexo.
    assert.equal((await call(bridge, "nexo.transactions", { type: "EXPENSE" }, true)).ok, true);
    assert.equal((await call(bridge, "nexo.create", {}, true)).code, "bad_request");
  } finally {
    await server.close();
  }
});

test("o CSP do site deixa o Kadem falar com o servidor local do Genos (e só com o aparelho, não com a rede)", async () => {
  const { readFile } = await import("node:fs/promises");
  const toml = await readFile(path.resolve("netlify.toml"), "utf8");
  const connect = /connect-src ([^;]*);/.exec(toml)?.[1] || "";
  assert.ok(connect.split(" ").includes("http://127.0.0.1:*"), "sem isso o navegador bloqueia a resposta ao Genos");
  assert.ok(!connect.split(" ").includes("http:"), "não libera http para qualquer endereço");
  assert.ok(!connect.includes("http://*"));
});

test("a resposta ao Genos tenta o endereço local, cai para o valor aceito pelo navegador e respeita a recusa", async () => {
  const server = await startServer();
  try {
    const { reply_to_genos } = await server.ssrLoadModule("/src/services/genosBridge/reply.js");
    const target = { port: 38517, key: KEY, nonce: "n9" };

    const calls = [];
    const flaky = async (url, init) => {
      calls.push({ url, init });
      if (init.targetAddressSpace === "loopback") throw new TypeError("valor desconhecido");
      return { ok: true, status: 200 };
    };
    assert.equal(await reply_to_genos(target, { ok: true, data: { x: 1 } }, { fetchImpl: flaky }), true);
    assert.equal(calls.length, 2, "tentou 'loopback' e depois 'local'");
    assert.equal(calls[0].url, "http://127.0.0.1:38517/kadem/v1/result");
    const body = JSON.parse(calls[1].init.body);
    assert.deepEqual(body, { v: 1, nonce: "n9", key: KEY, ok: true, data: { x: 1 } });
    assert.equal(calls[1].init.method, "POST");
    assert.equal(calls[1].init.credentials, "omit");

    let rejected = 0;
    const refusing = async () => { rejected += 1; return { ok: false, status: 403 }; };
    assert.equal(await reply_to_genos(target, { ok: true, data: {} }, { fetchImpl: refusing }), false);
    assert.equal(rejected, 1, "recusa do Genos não é repetida");

    const offline = async () => { throw new TypeError("Failed to fetch"); };
    assert.equal(await reply_to_genos(target, { ok: true, data: {} }, { fetchImpl: offline }), false);
    assert.equal(await reply_to_genos({ ...target, port: 80 }, { ok: true, data: {} }, { fetchImpl: flaky }), false, "porta inválida nem tenta");
  } finally {
    await server.close();
  }
});
