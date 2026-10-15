import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { setActivePinia, createPinia } from "pinia";
import { HEALTH_ENTITY_TYPE_OPTIONS, HEALTH_SCHEDULE_TYPE_OPTIONS, HEALTH_OBJECT_TYPE_OPTIONS } from "../src/utils/healthObjectTypes.js";

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

test("health entities can be edited offline without replacing identity, history or links", async () => {
  const server = await createServer({
    configFile: false, root: process.cwd(), plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useHealthStore } = await server.ssrLoadModule("/src/stores/health.js");
    const { syncService } = await server.ssrLoadModule("/src/services/syncService.js");
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    const { healthRepository } = await server.ssrLoadModule("/src/services/localData/healthRepository.js");
    const { syncQueueRepository } = await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");
    syncService.processSyncQueue = async () => {};
    api.get = async () => ({ data: [] });
    setActivePinia(createPinia());
    useAuthStore().user = { id: "health-entities-test" };
    const store = useHealthStore();

    for (const option of HEALTH_OBJECT_TYPE_OPTIONS.filter((option) => option.value !== "SCHEDULE")) {
      await store.createObject({ name: option.label, object_type: option.value, unit: "unidades", minimum_quantity: 2 });
    }
    const schedule = await store.createObject({ name: "Rotina", object_type: "SCHEDULE" });
    const tracker = await store.createTracker({ name: "Energia", value_type: "NUMBER" });
    await store.createTrackerGroup({ name: "Grupo" });
    assert.equal(store.entities.length, HEALTH_ENTITY_TYPE_OPTIONS.length);
    assert.equal(store.schedules.length, HEALTH_SCHEDULE_TYPE_OPTIONS.length);
    assert.ok(store.entities.every((object) => !["SCHEDULE", "TRACKER", "TRACKER_GROUP"].includes(object.object_type)));

    const supply = store.supplies.find((object) => object.object_type === "SUPPLY");
    const widget = await store.addWidget(supply.local_key);
    const relation = await store.linkConsumption({ schedule_key: schedule.local_key, supply_key: supply.local_key, quantity: 1 });
    const initial = await store.recordSupplyMovement({ object_key: supply.local_key, movement_type: "ENTRY", quantity: 10 });
    await store.recordSupplyMovement({ object_key: supply.local_key, movement_type: "EXIT", quantity: 3 });
    const changes = { name: "Material atualizado", notes: "Nova observação", unit: "caixas", minimum_quantity: 5, stock_quantity: 4, object_type: "SCHEDULE" };
    const updated = await store.updateObject(supply, changes);
    assert.equal(updated.local_key, supply.local_key);
    assert.equal(updated.local_id, supply.local_id);
    assert.equal(updated.created_at, supply.created_at);
    assert.equal(updated.object_type, "SUPPLY");
    assert.equal(updated.name, changes.name);
    assert.equal(updated.unit, "caixas");
    assert.equal(updated.minimum_quantity, 5);
    assert.equal(updated.notes, changes.notes);
    assert.equal(store.supplyBalance(supply.local_key), 4);
    assert.equal(store.events.find((event) => event.local_key === initial.local_key).quantity, 10);
    assert.equal(store.events.find((event) => event.event_type === "SUPPLY_ADJUSTED").quantity, -3);
    assert.equal(store.widgets[0].local_key, widget.local_key);
    assert.equal(store.relations[0].local_key, relation.local_key);

    await store.updateObject(supply, { ...changes, stock_quantity: 12 });
    assert.equal(store.supplyBalance(supply.local_key), 12);
    const count = store.events.length;
    await store.updateObject(supply, { ...changes, stock_quantity: 12 });
    await store.updateObject(supply, { name: "Só o cadastro", notes: "Notas", unit: "caixas", minimum_quantity: 0 });
    assert.equal(store.events.length, count);
    assert.equal(store.supplyBalance(supply.local_key), 12);
    await assert.rejects(store.updateObject(supply, { ...changes, stock_quantity: "" }), /estoque atual/);
    await assert.rejects(store.updateObject(supply, { ...changes, minimum_quantity: -1 }), /estoque mínimo/);
    await assert.rejects(store.updateObject(supply, { ...changes, name: " " }), /nome/);
    await assert.rejects(store.updateObject(tracker, changes), /entidade de saúde válida/);

    const medication = store.supplies.find((object) => object.object_type === "MEDICATION");
    await store.recordSupplyMovement({ object_key: medication.local_key, movement_type: "ENTRY", quantity: 8 });
    await store.updateObject(medication, { ...changes, stock_quantity: 6 });
    assert.equal(store.supplyBalance(medication.local_key), 6);
    assert.equal(store.findObject(medication.local_key).object_type, "MEDICATION");
    const exam = store.schedules.find((object) => object.object_type === "EXAM");
    assert.equal(store.nextDueAt(exam), null);
    await store.updateObject(exam, { name: "Exame atualizado", notes: "Detalhes" });
    assert.equal(store.findObject(exam.local_key).notes, "Detalhes");

    const local = (await healthRepository.getRecords("health-entities-test")).find((record) => record.local_key === supply.local_key);
    const queued = await syncQueueRepository.getPendingTasksByType("UPSERT_HEALTH_RECORD");
    const objectTasks = queued.filter((task) => task.payload.local_key === supply.local_key);
    assert.equal(objectTasks.length, 1);
    assert.equal(objectTasks[0].payload.data.name, "Só o cadastro");
    assert.equal(objectTasks[0].payload.data.stock_quantity, undefined);
    assert.ok(queued.filter((task) => task.payload.data.event_type === "SUPPLY_ADJUSTED").every((task) => task.idempotency_key));
    await healthRepository.applyServerChanges("health-entities-test", [{ local_key: supply.local_key, operation: "UPSERT", record: { ...local, name: "Remoto antigo" } }], 1);
    assert.equal((await healthRepository.getRecords("health-entities-test")).find((record) => record.local_key === supply.local_key).name, "Só o cadastro");
    await store.loadRecords();
    assert.equal(store.findObject(supply.local_key).name, "Só o cadastro");
    assert.equal(store.supplyBalance(supply.local_key), 12);

    const { default: modal } = await server.ssrLoadModule("/src/components/health/HealthObjectModal.vue");
    assert.ok(modal.computed.objectTypeOptions.call({ scope: "entities" }).every((option) => option.value !== "SCHEDULE"));
    assert.deepEqual(modal.computed.objectTypeOptions.call({ scope: "schedules" }).map((option) => option.value), ["SCHEDULE", "TREATMENT", "EXAM", "APPOINTMENT"]);
    const context = { object: store.findObject(supply.local_key), currentStock: 12, initialType: "SUPPLY", objectTypeOptions: HEALTH_ENTITY_TYPE_OPTIONS, unitOptions: [], localDateTime: () => "2026-10-14T09:00", loading: false };
    modal.methods.resetForm.call(context);
    assert.equal(context.form.name, "Só o cadastro");
    assert.equal(context.form.minimum_quantity, 0);
    assert.equal(context.form.stock_quantity, 12);
    assert.deepEqual(modal.computed.unitOptions.call({ units: [], object: context.object }), [{ value: "caixas", label: "caixas" }]);
    let payload;
    context.$emit = (_event, data) => { payload = data; };
    modal.methods.handleSubmit.call(context);
    assert.equal(payload.initial_stock, undefined);
    assert.equal(payload.stock_quantity, undefined);
    context.form.stock_quantity = 9;
    modal.methods.handleSubmit.call(context);
    assert.equal(payload.stock_quantity, 9);
    context.object = null;
    context.initialType = "SCHEDULE";
    modal.methods.resetForm.call(context);
    assert.equal(context.form.object_type, "SUPPLY");
    assert.equal(context.form.name, "");

    const appointment = await store.createObject({ name: "Consulta pontual", object_type: "APPOINTMENT", schedule_enabled: true, recurrence_enabled: false, anchor_date: "2090-10-14T09:00:00.000Z", warning_before: 0 });
    assert.equal(store.nextDueAt(appointment), "2090-10-14T09:00:00.000Z");
    assert.equal(appointment.warning_before, 0);
    await store.completeSchedule({ object_key: appointment.local_key, occurred_at: "2090-10-14T08:30:00.000Z" });
    assert.equal(store.nextDueAt(appointment), null, "even an early completion closes a one-time appointment");
    await assert.rejects(store.completeSchedule({ object_key: appointment.local_key }), /já foi concluído/);
    const rescheduled = await store.updateObject(appointment, { name: appointment.name, schedule_enabled: true, recurrence_enabled: false, anchor_date: "2091-10-14T09:00:00.000Z" });
    assert.equal(store.nextDueAt(rescheduled), "2091-10-14T09:00:00.000Z");

    const treatment = await store.createObject({ name: "Sessões", object_type: "TREATMENT", schedule_enabled: true, recurrence_enabled: true, anchor_date: "2090-10-14T09:00:00.000Z", frequency_unit: "weeks", frequency_value: 1 });
    assert.equal(store.nextDueAt(treatment), treatment.anchor_date, "the selected first occurrence is not skipped");
    await store.completeSchedule({ object_key: treatment.local_key, occurred_at: "2090-10-14T09:00:00.000Z" });
    assert.equal(store.nextDueAt(treatment), "2090-10-21T09:00:00.000Z");

    const medicationBefore = store.findObject(medication.local_key);
    const scheduledMedication = await store.updateObject(medicationBefore, { name: medicationBefore.name, unit: medicationBefore.unit, minimum_quantity: medicationBefore.minimum_quantity, schedule_enabled: true, recurrence_enabled: true, anchor_date: "2090-10-14T09:00:00.000Z", frequency_unit: "hours", frequency_value: 8 });
    assert.ok(!store.entities.some((object) => object.local_key === medication.local_key));
    assert.ok(store.schedules.some((object) => object.local_key === medication.local_key));
    assert.ok(store.supplies.some((object) => object.local_key === medication.local_key));
    assert.equal(store.supplyBalance(medication.local_key), 6);
    await store.linkConsumption({ schedule_key: medication.local_key, supply_key: supply.local_key, quantity: 2 });
    await store.linkConsumption({ schedule_key: medication.local_key, supply_key: medication.local_key, quantity: 1 });
    await store.completeSchedule({ object_key: medication.local_key, occurred_at: "2090-10-14T09:00:00.000Z" });
    assert.equal(store.nextDueAt(scheduledMedication), "2090-10-14T17:00:00.000Z");
    assert.equal(store.supplyBalance(supply.local_key), 10, "scheduled typed entities keep automatic consumption links");
    assert.equal(store.supplyBalance(medication.local_key), 5, "scheduled medication can consume its own stock");
    await store.updateObject(scheduledMedication, { name: scheduledMedication.name, unit: scheduledMedication.unit, minimum_quantity: 5, schedule_enabled: false });
    assert.ok(store.entities.some((object) => object.local_key === medication.local_key));
    assert.ok(!store.schedules.some((object) => object.local_key === medication.local_key));
    assert.equal(store.supplyBalance(medication.local_key), 5);
    await assert.rejects(store.completeSchedule({ object_key: medication.local_key }), /Selecione uma agenda/);
    await assert.rejects(store.updateObject(exam, { name: "Exame", schedule_enabled: true, anchor_date: "" }), /data/);
    await assert.rejects(store.updateObject(exam, { name: "Exame", schedule_enabled: true, anchor_date: "invalid" }), /data/);
    await assert.rejects(store.updateObject(exam, { name: "Exame", schedule_enabled: true, anchor_date: "2090-01-01", recurrence_enabled: true, frequency_value: 0 }), /intervalo/);

    const timestamp = "2026-10-14T09:00:00.000Z";
    for (const object_type of ["SCHEDULE", "EXAM", "APPOINTMENT", "TREATMENT"]) {
      await healthRepository.saveRecord({ user_id: "health-entities-test", id: 700 + HEALTH_SCHEDULE_TYPE_OPTIONS.findIndex((option) => option.value === object_type), local_key: "legacy-" + object_type, record_type: "HEALTH_OBJECT", object_type, name: "Legado " + object_type, anchor_date: object_type === "SCHEDULE" ? timestamp : null, frequency_unit: "months", frequency_value: 1, created_at: timestamp, updated_at: timestamp, pending_sync: false });
    }
    await store.loadRecords();
    assert.ok(store.schedules.some((object) => object.local_key === "legacy-EXAM"));
    assert.ok(store.schedules.some((object) => object.local_key === "legacy-APPOINTMENT"));
    assert.ok(store.schedules.some((object) => object.local_key === "legacy-TREATMENT"));
    const legacyRoutine = store.findObject("legacy-SCHEDULE");
    assert.equal(store.nextDueAt(legacyRoutine), "2026-11-14T09:00:00.000Z", "old routine anchors keep their existing interval behavior");
    const migratedLocal = (await healthRepository.getRecords("health-entities-test")).find((record) => record.local_key === "legacy-EXAM");
    assert.equal(migratedLocal.schedule_enabled, undefined, "tab migration does not rewrite remote records");
    assert.equal(store.findObject(medication.local_key).schedule_enabled, false);
    assert.equal(store.supplyBalance(supply.local_key), 10);
    const schedulingTask = (await syncQueueRepository.getPendingTasksByType("UPSERT_HEALTH_RECORD")).find((task) => task.payload.local_key === treatment.local_key);
    assert.equal(schedulingTask.payload.data.object_type, "TREATMENT");
    assert.equal(schedulingTask.payload.data.recurrence_enabled, true);
  } finally {
    db?.close();
    await server.close();
  }
});
