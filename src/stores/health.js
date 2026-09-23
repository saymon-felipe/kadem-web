import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/plugins/api";
import { healthRepository } from "@/services/localData/healthRepository";
import { syncQueueRepository } from "@/services/localData/syncQueueRepository";
import { syncService } from "@/services/syncService";
import { DIGESTIVE_WELLBEING_TEMPLATE } from "@/services/healthTrackerTemplates";

export const DEFAULT_HEALTH_UNITS = [
  { value: "comprimidos", label: "Comprimidos (comp)", symbol: "comp", category: "sólido" },
  { value: "capsulas", label: "Cápsulas (cáp)", symbol: "cáp", category: "sólido" },
  { value: "gotas", label: "Gotas (gts)", symbol: "gts", category: "líquido" },
  { value: "ml", label: "Mililitros (ml)", symbol: "ml", category: "líquido" },
  { value: "mg", label: "Miligramas (mg)", symbol: "mg", category: "massa" },
  { value: "g", label: "Gramas (g)", symbol: "g", category: "massa" },
  { value: "doses", label: "Doses (dose)", symbol: "dose", category: "unidade" },
  { value: "ampolas", label: "Ampolas (amp)", symbol: "amp", category: "injetável" },
  { value: "saches", label: "Sachês (sachê)", symbol: "sachê", category: "unidade" },
  { value: "aplicacoes", label: "Aplicações (aplic)", symbol: "aplic", category: "unidade" },
  { value: "frascos", label: "Frascos (fr)", symbol: "fr", category: "recipiente" },
  { value: "caixas", label: "Caixas (cx)", symbol: "cx", category: "recipiente" },
  { value: "tubos", label: "Tubos (tb)", symbol: "tb", category: "recipiente" },
  { value: "adesivos", label: "Adesivos (ades)", symbol: "ades", category: "unidade" },
  { value: "unidades", label: "Unidades (un)", symbol: "un", category: "geral" },
];

const now = () => new Date().toISOString();
const localKey = (prefix) => prefix + "-" + (crypto.randomUUID?.() || Date.now() + "-" + Math.random());
const controlFields = new Set(["id", "local_id", "local_key", "user_id", "pending_sync", "deleted_at", "server_updated_at"]);
const HEALTH_RECORD_TYPES = new Set(["HEALTH_OBJECT", "OBJECT_RELATION", "HEALTH_EVENT", "OVERVIEW_WIDGET"]);

function syncPayload(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !controlFields.has(key)));
}

function addInterval(dateValue, unit, value) {
  const date = new Date(dateValue);
  if (unit === "months") date.setMonth(date.getMonth() + Number(value || 1));
  else if (unit === "weeks") date.setDate(date.getDate() + Number(value || 1) * 7);
  else date.setDate(date.getDate() + Number(value || 1));
  return date.toISOString();
}

export const useHealthStore = defineStore("health", () => {
  const records = ref([]);
  const units = ref([...DEFAULT_HEALTH_UNITS]);
  const isLoading = ref(false);
  const error = ref("");

  const objects = computed(() => records.value.filter((record) => record.record_type === "HEALTH_OBJECT"));
  const relations = computed(() => records.value.filter((record) => record.record_type === "OBJECT_RELATION"));
  const events = computed(() =>
    (() => {
      const all = records.value.filter((record) => record.record_type === "HEALTH_EVENT");
      const replaced = new Set(all.map((record) => record.metadata?.replaces_event_key).filter(Boolean));
      return all
        .filter((record) => !replaced.has(record.local_key))
        .sort((left, right) => new Date(right.occurred_at) - new Date(left.occurred_at));
    })(),
  );
  const widgets = computed(() =>
    records.value
      .filter((record) => record.record_type === "OVERVIEW_WIDGET")
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
  );
  const schedules = computed(() => objects.value.filter((object) => object.object_type === "SCHEDULE"));
  const supplies = computed(() => objects.value.filter((object) => object.object_type === "SUPPLY"));
  const trackers = computed(() => objects.value.filter((object) => object.object_type === "TRACKER"));
  const activeTrackers = computed(() => trackers.value.filter((tracker) => !tracker.archived));
  const checkins = computed(() => events.value.filter((event) => event.event_type === "DAILY_CHECKIN"));

  function currentUserId() {
    const authStore = useAuthStore();
    if (!authStore.user?.id) throw new Error("Entre na sua conta para acessar o Health.");
    return String(authStore.user.id);
  }

  async function enqueueUpsert(saved, processImmediately = true) {
    const isEvent = saved.record_type === "HEALTH_EVENT";
    await syncQueueRepository.addSyncQueueTask({
      type: "UPSERT_HEALTH_RECORD",
      payload: {
        local_id: saved.local_id,
        local_key: saved.local_key,
        record_type: saved.record_type,
        data: syncPayload(saved),
        updated_at: saved.updated_at,
      },
      timestamp: saved.updated_at,
      compact_key: isEvent ? null : `health-record:${saved.local_key}`,
    });
    if (processImmediately) await syncService.processSyncQueue();
  }

  async function migrateLegacyRecords(localRecords) {
    const migrated = [];
    for (const record of localRecords) {
      if (record.id || record.pending_sync || record.deleted_at) {
        migrated.push(record);
        continue;
      }
      const saved = { ...record, pending_sync: true, updated_at: record.updated_at || now() };
      const localId = await healthRepository.saveRecord(saved);
      const normalized = { ...saved, local_id: localId };
      await enqueueUpsert(normalized, false);
      migrated.push(normalized);
    }
    return migrated;
  }

  async function persist(record) {
    const saved = { ...record, user_id: currentUserId(), pending_sync: true, deleted_at: null, updated_at: now() };
    const localId = await healthRepository.saveRecord(saved);
    const normalized = { ...saved, local_id: localId };
    const index = records.value.findIndex((item) => item.local_key === normalized.local_key);
    if (index === -1) records.value.push(normalized);
    else records.value.splice(index, 1, normalized);
    await enqueueUpsert(normalized);
    return normalized;
  }

  async function createRecord(record_type, payload) {
    const timestamp = now();
    return persist({
      local_key: localKey("health"),
      record_type,
      created_at: timestamp,
      updated_at: timestamp,
      ...payload,
    });
  }

  async function loadUnits() {
    try {
      const response = await api.get("/health/units");
      if (Array.isArray(response.data)) {
        units.value = response.data;
      }
    } catch {
      // Offline fallback: preserva DEFAULT_HEALTH_UNITS pré-carregados
    }
  }

  async function loadRecords() {
    isLoading.value = true;
    error.value = "";
    try {
      loadUnits();
      const localRecords = (await healthRepository.getRecords(currentUserId())).filter((record) => record.record_type);
      records.value = await migrateLegacyRecords(localRecords);
      await syncQueueRepository.reviveFailedTasks(
        "UPSERT_HEALTH_RECORD",
        (task) => !HEALTH_RECORD_TYPES.has(task.payload?.record_type),
      );
      await syncService.processSyncQueue();
      records.value = (await healthRepository.getRecords(currentUserId())).filter((record) => record.record_type);
    } catch (loadError) {
      error.value = loadError.message || "Não foi possível abrir os dados de saúde.";
      throw loadError;
    } finally {
      isLoading.value = false;
    }
  }

  function findObject(objectKey) {
    return objects.value.find((object) => object.local_key === objectKey) || null;
  }

  function objectRelations(objectKey, relationType = null) {
    return relations.value.filter(
      (relation) => relation.source_key === objectKey && (!relationType || relation.relation_type === relationType),
    );
  }

  function supplyBalance(objectKey) {
    return events.value.reduce((balance, event) => {
      if (event.object_key !== objectKey) return balance;
      const quantity = Number(event.quantity || 0);
      if (event.event_type === "SUPPLY_RECEIVED") return balance + quantity;
      if (event.event_type === "SUPPLY_CONSUMED") return balance - quantity;
      if (event.event_type === "SUPPLY_ADJUSTED") return balance + quantity;
      return balance;
    }, 0);
  }

  function lastScheduleCompletion(objectKey) {
    return (
      events.value.find((event) => event.event_type === "SCHEDULE_COMPLETED" && event.object_key === objectKey) || null
    );
  }

  function nextDueAt(schedule) {
    const lastEvent = lastScheduleCompletion(schedule.local_key);
    return addInterval(
      lastEvent?.occurred_at || schedule.anchor_date,
      schedule.frequency_unit,
      schedule.frequency_value,
    );
  }

  async function createObject(data) {
    const object = { name: data.name, object_type: data.object_type, tags: data.tags || [], notes: data.notes || "" };
    if (data.object_type === "SCHEDULE") {
      return createRecord("HEALTH_OBJECT", {
        ...object,
        frequency_unit: data.frequency_unit || "months",
        frequency_value: Number(data.frequency_value || 1),
        anchor_date: data.anchor_date || now(),
        warning_before: Number(data.warning_before || 7),
      });
    }
    return createRecord("HEALTH_OBJECT", {
      ...object,
      unit: data.unit || "unidades",
      minimum_quantity: Number(data.minimum_quantity || 0),
    });
  }

  async function linkConsumption(data) {
    const schedule = findObject(data.schedule_key);
    const supply = findObject(data.supply_key);
    if (!schedule || schedule.object_type !== "SCHEDULE") throw new Error("Selecione uma agenda válida.");
    if (!supply || supply.object_type !== "SUPPLY") throw new Error("Selecione um insumo válido.");
    const quantity = Number(data.quantity || 0);
    if (!quantity) throw new Error("Informe a quantidade consumida.");
    return createRecord("OBJECT_RELATION", {
      source_key: schedule.local_key,
      target_key: supply.local_key,
      relation_type: "CONSUMES",
      quantity,
      notes: data.notes || "",
    });
  }

  async function addWidget(objectKey) {
    const object = findObject(objectKey);
    if (!object || widgets.value.some((widget) => widget.object_key === objectKey)) return null;
    return createRecord("OVERVIEW_WIDGET", {
      object_key: objectKey,
      widget_type: object.object_type === "TRACKER" ? "TRACKER_TREND" : "OBJECT_STATUS",
      order: widgets.value.length,
    });
  }

  async function createTracker(data) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Informe o nome do rastreador.");
    return createRecord("HEALTH_OBJECT", {
      object_type: "TRACKER",
      name,
      group: String(data.group || "Bem-estar").trim(),
      value_type: data.value_type,
      min_value: Number(data.min_value ?? 0),
      max_value: Number(data.max_value ?? 10),
      unit: String(data.unit || "").trim(),
      options: Array.isArray(data.options) ? data.options : [],
      notes: String(data.notes || "").trim(),
      archived: false,
      template_key: data.template_key || null,
    });
  }

  async function addDigestiveWellbeingTemplate() {
    const created = [];
    for (const suggestion of DIGESTIVE_WELLBEING_TEMPLATE) {
      if (trackers.value.some((tracker) => tracker.template_key === suggestion.template_key)) continue;
      created.push(await createTracker(suggestion));
    }
    return created;
  }

  async function updateTracker(tracker, data) {
    if (tracker?.object_type !== "TRACKER") throw new Error("Rastreador inválido.");
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Informe o nome do rastreador.");
    return persist({
      ...tracker,
      ...data,
      name,
      group: String(data.group || "Bem-estar").trim(),
      unit: String(data.unit || "").trim(),
      options: Array.isArray(data.options) ? data.options : [],
      min_value: Number(data.min_value ?? 0),
      max_value: Number(data.max_value ?? 10),
    });
  }

  async function archiveTracker(tracker) {
    if (tracker?.object_type !== "TRACKER") throw new Error("Rastreador inválido.");
    return persist({ ...tracker, archived: true });
  }

  async function createCheckin(data) {
    const values = {};
    const correctedKeys = new Set(Object.keys(records.value.find((event) => event.local_key === data.replaces_event_key)?.values || {}));
    for (const tracker of trackers.value.filter((item) => !item.archived || correctedKeys.has(item.local_key))) {
      const value = data.values?.[tracker.local_key];
      if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) continue;
      if (["SCALE", "NUMBER"].includes(tracker.value_type)) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) throw new Error(`Valor inválido em ${tracker.name}.`);
        if (tracker.value_type === "SCALE" && (numeric < tracker.min_value || numeric > tracker.max_value)) {
          throw new Error(`Valor fora da escala em ${tracker.name}.`);
        }
        values[tracker.local_key] = numeric;
      } else if (["TAGS", "MULTI"].includes(tracker.value_type)) {
        values[tracker.local_key] = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
      } else if (tracker.value_type === "BOOLEAN") {
        values[tracker.local_key] = Boolean(value);
      } else {
        values[tracker.local_key] = String(value).trim();
      }
    }
    if (!Object.keys(values).length && !String(data.notes || "").trim()) {
      throw new Error("Preencha ao menos um rastreador ou uma observação.");
    }
    const occurredAt = data.occurred_at || now();
    if (Number.isNaN(new Date(occurredAt).getTime())) throw new Error("Data do check-in inválida.");
    return createRecord("HEALTH_EVENT", {
      object_key: null,
      event_type: "DAILY_CHECKIN",
      title: data.replaces_event_key ? "Check-in corrigido" : "Check-in de saúde",
      notes: String(data.notes || "").trim(),
      quantity: null,
      occurred_at: occurredAt,
      values,
      metadata: data.replaces_event_key ? { replaces_event_key: data.replaces_event_key } : {},
    });
  }

  async function deleteRecord(record) {
    if (!record?.local_key) throw new Error("Registro do Health inválido para exclusão.");
    const deletedAt = now();
    await healthRepository.markDeleted(record.local_key, deletedAt);
    records.value = records.value.filter((item) => item.local_key !== record.local_key);
    await syncQueueRepository.addSyncQueueTask({
      type: "DELETE_HEALTH_RECORD",
      payload: {
        local_id: record.local_id,
        local_key: record.local_key,
        record_type: record.record_type,
        updated_at: deletedAt,
      },
      timestamp: deletedAt,
      compact_key: `health-record:${record.local_key}`,
    });
    await syncService.processSyncQueue();
  }

  async function removeWidget(widget) {
    return deleteRecord(widget);
  }

  async function deleteEvent(event) {
    if (event?.record_type !== "HEALTH_EVENT") throw new Error("Apenas eventos podem ser removidos da linha do tempo.");
    return deleteRecord(event);
  }

  async function createEvent(data) {
    const object = findObject(data.object_key);
    if (!object) throw new Error("Selecione um objeto do Health.");
    return createRecord("HEALTH_EVENT", {
      object_key: object.local_key,
      event_type: data.event_type || "OBSERVATION",
      title: data.title || object.name,
      notes: data.notes || "",
      quantity: data.quantity ?? null,
      occurred_at: data.occurred_at || now(),
      metadata: data.metadata || {},
    });
  }

  async function recordSupplyMovement(data) {
    const supply = findObject(data.object_key);
    if (!supply || supply.object_type !== "SUPPLY") throw new Error("Selecione um insumo.");
    const quantity = Number(data.quantity || 0);
    if (!quantity) throw new Error("Informe uma quantidade maior que zero.");
    return createEvent({
      object_key: supply.local_key,
      event_type: data.movement_type === "ENTRY" ? "SUPPLY_RECEIVED" : "SUPPLY_CONSUMED",
      title: (data.movement_type === "ENTRY" ? "Entrada" : "Uso") + ": " + supply.name,
      notes: data.notes,
      quantity,
      occurred_at: data.occurred_at,
      metadata: { unit: supply.unit },
    });
  }

  async function completeSchedule(data) {
    const schedule = findObject(data.object_key);
    if (!schedule || schedule.object_type !== "SCHEDULE") throw new Error("Selecione uma agenda.");
    const occurredAt = data.occurred_at || now();
    const completion = await createEvent({
      object_key: schedule.local_key,
      event_type: "SCHEDULE_COMPLETED",
      title: "Concluído: " + schedule.name,
      notes: data.notes,
      occurred_at: occurredAt,
    });
    const consumptionRelations = objectRelations(schedule.local_key, "CONSUMES");
    for (const relation of consumptionRelations) {
      const supply = findObject(relation.target_key);
      if (!supply) continue;
      await createEvent({
        object_key: supply.local_key,
        event_type: "SUPPLY_CONSUMED",
        title: "Uso automático: " + supply.name,
        notes: "Vinculado a " + schedule.name + (data.notes ? " · " + data.notes : ""),
        quantity: relation.quantity,
        occurred_at: occurredAt,
        metadata: { schedule_key: schedule.local_key, relation_key: relation.local_key, unit: supply.unit },
      });
    }
    return completion;
  }

  return {
    objects,
    relations,
    events,
    widgets,
    schedules,
    supplies,
    trackers,
    activeTrackers,
    checkins,
    isLoading,
    error,
    loadRecords,
    findObject,
    objectRelations,
    supplyBalance,
    nextDueAt,
    createObject,
    linkConsumption,
    addWidget,
    createTracker,
    addDigestiveWellbeingTemplate,
    updateTracker,
    archiveTracker,
    createCheckin,
    removeWidget,
    deleteEvent,
    createEvent,
    recordSupplyMovement,
    completeSchedule,
    units,
    loadUnits,
  };
});
