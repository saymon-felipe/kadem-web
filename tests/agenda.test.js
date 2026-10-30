import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { setActivePinia, createPinia } from "pinia";

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

async function startServer() {
  return createServer({
    configFile: false, root: process.cwd(), plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
}

test("a grade do mês tem seis semanas a partir do domingo e os dias de dia inteiro respeitam o fuso do evento", async () => {
  const server = await startServer();
  try {
    const calendar = await server.ssrLoadModule("/src/utils/agendaCalendar.js");
    const grid = calendar.monthGrid(new Date(2026, 10, 15));
    assert.equal(grid.length, 42);
    assert.equal(grid[0].getDay(), 0);
    assert.equal(calendar.dayKey(grid[0]), "2026-11-01");
    assert.equal(calendar.dayKey(grid[41]), "2026-12-12");

    // Meia-noite de São Paulo (03:00Z) continua sendo o dia 5, qualquer que seja o fuso do navegador.
    const span = calendar.eventSpan({
      all_day: true, timezone: "America/Sao_Paulo",
      start_at: "2026-11-05T03:00:00.000Z", end_at: "2026-11-06T03:00:00.000Z",
    });
    assert.equal(calendar.dayKey(span.start), "2026-11-05");
    assert.equal(calendar.dayKey(span.end), "2026-11-06");
    assert.equal(span.allDay, true);

    const item = calendar.toAgendaItem({ local_key: "a", title: "Feriado", all_day: true, timezone: "America/Sao_Paulo", start_at: "2026-11-05T03:00:00.000Z", end_at: "2026-11-06T03:00:00.000Z" });
    assert.equal(calendar.itemsForDay([item], new Date(2026, 10, 5)).length, 1);
    assert.equal(calendar.itemsForDay([item], new Date(2026, 10, 6)).length, 0, "o fim é exclusivo");
  } finally {
    await server.close();
  }
});

test("compromissos sobrepostos ficam em colunas lado a lado e os separados usam a largura toda", async () => {
  const server = await startServer();
  try {
    const calendar = await server.ssrLoadModule("/src/utils/agendaCalendar.js");
    const make = (key, start, end) => calendar.toAgendaItem({
      local_key: key, title: key, all_day: false,
      start_at: new Date(2026, 10, 3, ...start).toISOString(), end_at: new Date(2026, 10, 3, ...end).toISOString(),
    });
    const blocks = calendar.layoutDay([
      make("a", [9, 0], [11, 0]), make("b", [10, 0], [12, 0]), make("c", [10, 30], [11, 30]), make("d", [14, 0], [15, 0]),
    ], new Date(2026, 10, 3));
    const by = Object.fromEntries(blocks.map((block) => [block.item.title, block]));
    assert.deepEqual([by.a.column, by.b.column, by.c.column], [0, 1, 2]);
    assert.equal(by.a.columns, 3);
    assert.equal(by.d.columns, 1);
    assert.equal(by.d.column, 0);
    assert.equal(by.a.top, 9 * 60);
  } finally {
    await server.close();
  }
});

test("os agendamentos do Health viram itens somente leitura: pendente, atrasado, concluído e repetições previstas", async () => {
  const server = await startServer();
  try {
    const calendar = await server.ssrLoadModule("/src/utils/agendaCalendar.js");
    const now = new Date(2026, 10, 10, 12, 0);
    const consulta = { local_key: "c", name: "Consulta", object_type: "APPOINTMENT", schedule_enabled: true, recurrence_enabled: false, anchor_date: new Date(2026, 10, 20, 9, 0).toISOString() };
    const exame = { local_key: "e", name: "Exame", object_type: "EXAM", schedule_enabled: true, recurrence_enabled: false, anchor_date: new Date(2026, 10, 1, 9, 0).toISOString() };
    const rotina = { local_key: "r", name: "Fisioterapia", object_type: "SCHEDULE", schedule_enabled: true, recurrence_enabled: true, frequency_unit: "weeks", frequency_value: 1, anchor_date: new Date(2026, 10, 12, 8, 0).toISOString() };
    const insumo = { local_key: "i", name: "Vitamina", object_type: "SUPPLY" };
    const due = { c: consulta.anchor_date, e: exame.anchor_date, r: rotina.anchor_date };

    const items = calendar.healthItems({
      schedules: [consulta, exame, rotina, insumo],
      events: [{ event_type: "SCHEDULE_COMPLETED", object_key: "r", occurred_at: new Date(2026, 10, 5, 8, 5).toISOString(), metadata: { scheduled_for: new Date(2026, 10, 5, 8, 0).toISOString() } }],
      nextDueAt: (schedule) => due[schedule.local_key] || null,
      now,
      horizon: new Date(2026, 11, 1),
    });

    const states = (key) => items.filter((item) => item.schedule.local_key === key).map((item) => item.state);
    assert.deepEqual(states("c"), ["pending"]);
    assert.deepEqual(states("e"), ["overdue"]);
    assert.deepEqual(states("r"), ["done", "pending", "projected", "projected"], "uma conclusão, o próximo vencimento (12/11) e as repetições semanais (19 e 26/11) até o horizonte");
    assert.equal(states("i").length, 0, "insumos não são agendamentos");
    assert.ok(items.every((item) => item.kind === "health" && item.source === "health"));
  } finally {
    await server.close();
  }
});

test("compromissos criados offline ficam pendentes, entram na fila compactada e a exclusão substitui o envio", async () => {
  const server = await startServer();
  try {
    const { db } = await server.ssrLoadModule("/src/db.js");
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useAgendaStore } = await server.ssrLoadModule("/src/stores/agenda.js");
    const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
    syncService.processSyncQueue = async () => {};
    setActivePinia(createPinia());
    useAuthStore().user = { id: "agenda-offline" };
    const store = useAgendaStore();

    const created = await store.createEvent({ title: "  Dentista ", start_at: "2026-11-03T15:00", end_at: "2026-11-03T16:00", location: "Clínica" });
    assert.equal(created.title, "Dentista");
    assert.equal(created.pending_sync, true);
    assert.equal(created.source, "manual");
    assert.equal(store.events.length, 1);
    assert.ok(created.local_key.startsWith("agenda-"));

    const edited = await store.updateEvent(created, { title: "Dentista (remarcado)", start_at: "2026-11-04T15:00", end_at: "2026-11-04T16:00" });
    assert.equal(edited.local_key, created.local_key);
    assert.equal(edited.local_id, created.local_id);
    assert.equal(store.events.length, 1);

    let tasks = await db.syncQueue.toArray();
    assert.equal(tasks.length, 1, "edições do mesmo compromisso viram uma tarefa só");
    assert.equal(tasks[0].type, "UPSERT_AGENDA_EVENT");
    assert.equal(tasks[0].payload.data.title, "Dentista (remarcado)");
    assert.equal(tasks[0].payload.user_id, "agenda-offline");
    assert.deepEqual(Object.keys(tasks[0].payload.data).sort(), ["all_day", "description", "end_at", "location", "start_at", "timezone", "title"]);

    await store.deleteEvent(edited);
    assert.equal(store.events.length, 0);
    tasks = await db.syncQueue.toArray();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].type, "DELETE_AGENDA_EVENT");
    assert.equal((await db.agenda_events.toArray()).filter((record) => !record.deleted_at).length, 0);

    await assert.rejects(() => store.createEvent({ title: "   ", start_at: "2026-11-03T15:00" }), /título/);
    await assert.rejects(() => store.createEvent({ title: "X", start_at: "2026-11-03T16:00", end_at: "2026-11-03T15:00" }), /depois do início/);
  } finally {
    await server.close();
  }
});

test("compromissos de dia inteiro usam o último dia inclusivo e guardam meia-noite local", async () => {
  const server = await startServer();
  try {
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useAgendaStore } = await server.ssrLoadModule("/src/stores/agenda.js");
    const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
    syncService.processSyncQueue = async () => {};
    setActivePinia(createPinia());
    useAuthStore().user = { id: "agenda-all-day" };
    const store = useAgendaStore();

    const created = await store.createEvent({ title: "Viagem", all_day: true, start_day: "2026-11-05", end_day: "2026-11-07" });
    assert.equal(created.all_day, true);
    assert.equal(new Date(created.start_at).getTime(), new Date(2026, 10, 5).getTime());
    assert.equal(new Date(created.end_at).getTime(), new Date(2026, 10, 8).getTime(), "o fim guardado é exclusivo (dia seguinte ao último)");
  } finally {
    await server.close();
  }
});

test("o delta remoto não sobrescreve alteração local pendente e aplica criações, edições e exclusões", async () => {
  const server = await startServer();
  try {
    const { db } = await server.ssrLoadModule("/src/db.js");
    const { agendaRepository } = await server.ssrLoadModule("/src/services/localData/agendaRepository.js");
    const user = "agenda-delta";
    const remote = (key, title, extra = {}) => ({ id: 1, local_key: key, title, start_at: "2026-11-03T18:00:00.000Z", end_at: "2026-11-03T19:00:00.000Z", all_day: false, timezone: "America/Sao_Paulo", source: "google", updated_at: "2026-10-30T12:00:00.000Z", ...extra });

    await agendaRepository.applyServerChanges(user, [
      { operation: "UPSERT", local_key: "google-1", record: remote("google-1", "Importado do Google") },
      { operation: "UPSERT", local_key: "k-2", record: remote("k-2", "Do servidor") },
    ], 5);
    assert.equal((await agendaRepository.getEvents(user)).length, 2);
    assert.equal(await agendaRepository.getSyncCursor(user), 5);

    const local = (await agendaRepository.getEvents(user)).find((event) => event.local_key === "k-2");
    await agendaRepository.saveEvent({ ...local, title: "Edição local", pending_sync: true });
    await agendaRepository.applyServerChanges(user, [
      { operation: "UPSERT", local_key: "k-2", record: remote("k-2", "Sobrescrita indevida") },
      { operation: "UPSERT", local_key: "google-1", record: remote("google-1", "Editado no Google") },
      { operation: "DELETE", local_key: "google-1", record: null },
    ], 9);
    const events = await agendaRepository.getEvents(user);
    assert.deepEqual(events.map((event) => [event.local_key, event.title]), [["k-2", "Edição local"]]);
    assert.equal(await agendaRepository.getSyncCursor(user), 9);

    // Contas diferentes no mesmo navegador não colidem, nem com a mesma chave de evento.
    await agendaRepository.applyServerChanges("outra-conta", [{ operation: "UPSERT", local_key: "k-2", record: remote("k-2", "Da outra conta") }], 1);
    assert.equal((await agendaRepository.getEvents("outra-conta")).length, 1);
    assert.equal((await agendaRepository.getEvents(user)).length, 1);
    assert.equal(await db.agenda_events.where("user_id").anyOf(user, "outra-conta").count(), 2);
  } finally {
    await server.close();
  }
});

test("o envio confirma a sincronização, mantém a edição feita durante o voo e processa a exclusão", async () => {
  const server = await startServer();
  try {
    const { db } = await server.ssrLoadModule("/src/db.js");
    const { agendaRepository, buildAgendaUpsertTask, buildAgendaDeleteTask } = await server.ssrLoadModule("/src/services/localData/agendaRepository.js");
    const { createPersonalSyncExecutor } = await server.ssrLoadModule("/src/services/personalSyncExecutor.js");
    const user = "agenda-exec";
    const calls = [];
    let responder = async (_url, body) => ({ data: { operation: "UPSERT", record: { id: 77, local_key: body.local_key, source: "manual", google_linked: false, updated_at: body.updated_at, ...body.data } } });
    const executor = createPersonalSyncExecutor({
      api: {
        post: async (url, body) => { calls.push(["post", url, body]); return responder(url, body); },
        delete: async (url, config) => { calls.push(["delete", url, config.data]); return { data: { operation: "DELETE", local_key: config.data.local_key } }; },
        put: async () => ({ data: {} }),
      },
      getUserId: () => user,
    });

    const base = { local_key: "agenda-x", user_id: user, title: "Reunião", start_at: "2026-11-03T18:00:00.000Z", end_at: "2026-11-03T19:00:00.000Z", all_day: false, timezone: "America/Sao_Paulo", source: "manual", pending_sync: true, deleted_at: null, updated_at: "2026-10-30T12:00:00.000Z" };
    base.local_id = await agendaRepository.saveEvent(base);
    await executor.agenda({ ...buildAgendaUpsertTask(base), id: 1 });

    assert.deepEqual(calls[0].slice(0, 2), ["post", "/agenda/events"]);
    assert.equal(calls[0][2].data.title, "Reunião");
    assert.ok(!("pending_sync" in calls[0][2].data) && !("user_id" in calls[0][2].data));
    let stored = (await agendaRepository.getEvents(user))[0];
    assert.equal(stored.pending_sync, false);
    assert.equal(stored.id, 77);

    // Edição feita enquanto a requisição anterior estava em voo: continua pendente e volta para a fila.
    const edited = { ...stored, title: "Reunião remarcada", pending_sync: true, updated_at: "2026-10-30T12:05:00.000Z" };
    await agendaRepository.saveEvent(edited);
    responder = async (_url, body) => ({ data: { operation: "UPSERT", record: { id: 77, local_key: body.local_key, updated_at: "2026-10-30T12:00:00.000Z", title: "Reunião" } } });
    await db.syncQueue.clear();
    await executor.agenda({ ...buildAgendaUpsertTask({ ...edited, updated_at: "2026-10-30T12:00:00.000Z" }), id: 2 });
    stored = (await agendaRepository.getEvents(user))[0];
    assert.equal(stored.title, "Reunião remarcada");
    assert.equal(stored.pending_sync, true);
    const queued = await db.syncQueue.toArray();
    assert.equal(queued.length, 1);
    assert.equal(queued[0].payload.data.title, "Reunião remarcada");

    // Exclusão: chama a API e remove o tombstone local.
    const marked = await agendaRepository.markDeleted(user, "agenda-x", "2026-10-30T12:10:00.000Z");
    await executor.agenda({ ...buildAgendaDeleteTask(marked, "2026-10-30T12:10:00.000Z"), id: 3 });
    assert.deepEqual(calls.at(-1), ["delete", "/agenda/events", { local_key: "agenda-x", updated_at: "2026-10-30T12:10:00.000Z" }]);
    assert.equal(await db.agenda_events.where("user_id").equals(user).count(), 0);

    // Tarefa de outra conta espera a conta dona voltar.
    await assert.rejects(
      () => executor.agenda({ ...buildAgendaDeleteTask({ ...marked, user_id: "outra" }, "2026-10-30T12:10:00.000Z"), id: 4 }),
      /NOT_SYNCED/,
    );
  } finally {
    await server.close();
  }
});

test("compromissos com origem health (carregados só para o Google) não aparecem em duplicidade na lista da agenda", async () => {
  const server = await startServer();
  try {
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useAgendaStore } = await server.ssrLoadModule("/src/stores/agenda.js");
    const { agendaRepository } = await server.ssrLoadModule("/src/services/localData/agendaRepository.js");
    const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
    syncService.processSyncQueue = async () => {};
    setActivePinia(createPinia());
    useAuthStore().user = { id: "agenda-health-source" };
    const store = useAgendaStore();
    const record = (key, source) => ({ id: 1, local_key: key, title: key, start_at: "2026-11-03T18:00:00.000Z", end_at: "2026-11-03T19:00:00.000Z", all_day: false, timezone: "America/Sao_Paulo", source, updated_at: "2026-10-30T12:00:00.000Z" });
    await agendaRepository.applyServerChanges("agenda-health-source", [
      { operation: "UPSERT", local_key: "agenda-health-health-1", record: record("agenda-health-health-1", "health") },
      { operation: "UPSERT", local_key: "google-1", record: record("google-1", "google") },
      { operation: "UPSERT", local_key: "agenda-1", record: record("agenda-1", "manual") },
    ], 3);

    await store.loadEvents();
    assert.deepEqual(store.events.map((event) => event.local_key).sort(), ["agenda-1", "google-1"]);
    assert.equal(store.items.length, 2);
  } finally {
    await server.close();
  }
});

test("compromissos do Kadem e do Google têm a mesma cor; o Health continua distinto", async () => {
  const server = await startServer();
  try {
    const { SOURCE_COLORS, SOURCE_LABELS } = await server.ssrLoadModule("/src/utils/agendaCalendar.js");
    assert.equal(SOURCE_COLORS.manual, SOURCE_COLORS.google);
    assert.notEqual(SOURCE_COLORS.health, SOURCE_COLORS.manual);
    assert.notEqual(SOURCE_LABELS.manual, SOURCE_LABELS.google, "a origem segue identificável (no modal)");
  } finally {
    await server.close();
  }
});

test("o campo Local vira link clicável ou selo do Google Maps conforme o que foi digitado", async () => {
  const server = await startServer();
  try {
    const { locationChip, linkChips, linkSegments, findLinks, toHref } = await server.ssrLoadModule("/src/utils/agendaLinks.js");

    // Link: monta o endereço completo e reconhece reunião online.
    assert.deepEqual(locationChip("meet.google.com/abc-defg-hij."), { kind: "link", href: "https://meet.google.com/abc-defg-hij", label: "Entrar na reunião", detail: "meet.google.com/abc-defg-hij" });
    assert.equal(locationChip("www.clinica.com.br/unidade?x=1").href, "https://www.clinica.com.br/unidade?x=1");
    assert.equal(locationChip("Zoom: zoom.us/j/12345 (senha 99)").href, "https://zoom.us/j/12345");
    assert.equal(locationChip("(https://pt.wikipedia.org/wiki/Foo_(bar))").href, "https://pt.wikipedia.org/wiki/Foo_(bar)");

    // Endereço e CEP levam ao Google Maps.
    const street = locationChip("Av. Paulista, 1000 - Bela Vista");
    assert.equal(street.kind, "maps");
    assert.equal(street.href, "https://www.google.com/maps/search/?api=1&query=Av.%20Paulista%2C%201000%20-%20Bela%20Vista");
    assert.equal(locationChip("Rua das Flores 45").kind, "maps");
    const cep = locationChip("01310100");
    assert.equal(cep.kind, "maps");
    assert.equal(cep.detail, "CEP 01310-100");
    assert.equal(new URL(cep.href).searchParams.get("query"), "01310-100, Brasil");
    assert.equal(new URL(locationChip("Clínica, CEP 01310-100").href).searchParams.get("query"), "Clínica, CEP 01310-100");

    // Nome de lugar, e-mail e protocolo perigoso não ganham selo.
    for (const text of ["Sala 2", "Sala 2, 3º andar", "Hospital São Luiz", "contato@clinica.com", "Dr.Silva", "javascript:alert(1)", "", "   "]) {
      assert.equal(locationChip(text), null, `sem selo para "${text}"`);
    }
    assert.equal(toHref("javascript:alert(1)"), null);
    assert.equal(toHref("ftp://exemplo.com"), null);

    // Anotações: links viram pedaços clicáveis e selos sem repetição.
    assert.deepEqual(linkSegments("Entrar em meet.google.com/abc. Depois https://x.com/a, ok"), [
      { text: "Entrar em " },
      { text: "meet.google.com/abc", href: "https://meet.google.com/abc" },
      { text: ". Depois " },
      { text: "https://x.com/a", href: "https://x.com/a" },
      { text: ", ok" },
    ]);
    assert.equal(linkChips("a https://x.com/a b https://x.com/a c zoom.us/j/1").length, 2);
    assert.equal(linkChips("1.com 2.com 3.com 4.com 5.com", { limit: 3 }).length, 3);
    assert.equal(findLinks("sem nenhum link por aqui").length, 0);
  } finally {
    await server.close();
  }
});

test("concluir pela Agenda registra a conclusão do Health e passa a recorrência para a data seguinte", async () => {
  const server = await startServer();
  try {
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useHealthStore } = await server.ssrLoadModule("/src/stores/health.js");
    const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    const { db } = await server.ssrLoadModule("/src/db.js");
    const calendar = await server.ssrLoadModule("/src/utils/agendaCalendar.js");
    syncService.processSyncQueue = async () => {};
    api.get = async () => ({ data: [] });
    setActivePinia(createPinia());
    useAuthStore().user = { id: "agenda-complete" };
    const health = useHealthStore();

    const now = new Date("2090-10-14T12:00:00.000Z");
    const routine = await health.createObject({
      name: "Remédio", object_type: "SCHEDULE", schedule_enabled: true, recurrence_enabled: true,
      anchor_date: "2090-10-13T12:00:00.000Z", frequency_unit: "weeks", frequency_value: 1,
    });
    const project = () => calendar.healthItems({ schedules: health.schedules, events: health.events, nextDueAt: health.nextDueAt, now, horizon: new Date("2090-11-10T00:00:00.000Z") });
    const states = () => project().map((item) => item.state);

    assert.deepEqual(states(), ["overdue", "projected", "projected", "projected"], "atrasado hoje; as repetições seguintes aparecem pontilhadas");
    const overdue = project().find((item) => item.state === "overdue");

    // É o que o botão "Concluir" do modal da Agenda faz.
    await health.completeSchedule({ object_key: overdue.schedule.local_key, occurred_at: now.toISOString() });

    assert.deepEqual(states(), ["done", "pending", "projected", "projected"], "uma conclusão e a recorrência recomeça a partir dela");
    assert.equal(health.nextDueAt(overdue.schedule), "2090-10-21T12:00:00.000Z");
    const tasks = await db.syncQueue.toArray();
    assert.ok(tasks.some((task) => task.payload?.data?.event_type === "SCHEDULE_COMPLETED" && task.payload.data.object_key === routine.local_key), "a conclusão entra na fila de sync do Health");

    // Só a ocorrência vigente é concluída; repetição prevista não é (o botão nem aparece).
    assert.equal(project().find((item) => item.state === "projected").state, "projected");
    await assert.rejects(health.completeSchedule({ object_key: "nao-existe" }), /Selecione uma agenda/);
  } finally {
    await server.close();
  }
});

test("lembretes da Agenda: opções de antecedência iguais às do servidor e a notificação abre o app da Agenda", async () => {
  const server = await startServer();
  try {
    const { agendaLeadOptions, notificationLabels, notificationModuleApps, notificationService } = await server.ssrLoadModule("/src/services/notificationService.js");
    assert.deepEqual(agendaLeadOptions.map((option) => option.value), [0, 5, 10, 15, 30, 60, 120, 1440], "mesma lista aceita pela validação do core (AGENDA_LEADS)");
    assert.ok(agendaLeadOptions.every((option) => option.label));
    assert.ok(notificationLabels.agenda_events);
    assert.deepEqual(notificationModuleApps, { health: "kadem_health", agenda: "kadem_agenda", nexo: "kadem_nexo" });

    globalThis.Audio = class { play() {} pause() {} addEventListener() {} removeEventListener() {} };
    const { usePlayerStore } = await server.ssrLoadModule("/src/stores/player.js");
    setActivePinia(createPinia());
    const player = usePlayerStore();
    await notificationService.open("agenda");
    assert.equal(player.active_app, "kadem_agenda");
    await notificationService.open("health");
    assert.equal(player.active_app, "kadem_health");
    await notificationService.open("qualquer-outro");
    assert.equal(player.active_app, "kadem_nexo", "o que não é conhecido cai no Nexo, como antes");
  } finally {
    delete globalThis.Audio;
    await server.close();
  }
});
