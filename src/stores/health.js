import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/plugins/api";
import { healthRepository } from "@/services/localData/healthRepository";
import { syncQueueRepository } from "@/services/localData/syncQueueRepository";
import { syncService } from "@/services/syncService";
import { DIGESTIVE_WELLBEING_TEMPLATE } from "@/services/healthTrackerTemplates";
import { isHealthEntity, isHealthObject, isHealthRoutine, isHealthScheduled, isHealthRecurring, isHealthStockObject } from "@/utils/healthObjectTypes";
import { db } from "@/db";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";

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

export const DEFAULT_TRACKER_GROUPS = [
  { name: "Bem-estar", description: "Disposição geral, energia e vitalidade", icon: "heart", color: "#e25373" },
  { name: "Sintomas", description: "Dores, desconfortos e ocorrências", icon: "triangle-exclamation", color: "#f59e0b" },
  { name: "Hábitos", description: "Sono, alimentação, hidratação e rotina", icon: "mug-saucer", color: "#10b981" },
  { name: "Digestão", description: "Trânsito intestinal e digestivo", icon: "shield-halved", color: "#8d5fd3" },
  { name: "Aspectos físicos", description: "Pele, peso, pressão, estoma e corpo", icon: "user", color: "#3b82f6" },
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
  else if (unit === "hours") date.setHours(date.getHours() + Number(value || 1));
  else if (unit === "weeks") date.setDate(date.getDate() + Number(value || 1) * 7);
  else date.setDate(date.getDate() + Number(value || 1));
  return date.toISOString();
}

export const useHealthStore = defineStore("health", () => {
  const records = ref([]);
  const units = ref([...DEFAULT_HEALTH_UNITS]);
  const isLoading = ref(false);
  const error = ref("");
  let loadGeneration = 0;

  function clearState() {
    loadGeneration++;
    records.value = [];
    error.value = "";
    isLoading.value = false;
    units.value = [...DEFAULT_HEALTH_UNITS];
  }

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
  const schedules = computed(() => objects.value.filter(isHealthRoutine));
  const supplies = computed(() => objects.value.filter(isHealthStockObject));
  const entities = computed(() => objects.value.filter(isHealthEntity));
  const trackers = computed(() => objects.value.filter((object) => object.object_type === "TRACKER"));
  const activeTrackers = computed(() => trackers.value.filter((tracker) => !tracker.archived));
  const trackerGroups = computed(() => {
    const custom = objects.value.filter((object) => object.object_type === "TRACKER_GROUP");
    if (custom.length) return custom;
    return DEFAULT_TRACKER_GROUPS.map((g, index) => ({
      local_key: `default-group-${index}`,
      object_type: "TRACKER_GROUP",
      name: g.name,
      description: g.description,
      icon: g.icon,
      color: g.color,
    }));
  });
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
    const isCurrent = captureSyncSession();
    const migrated = [];
    for (const record of localRecords) {
      assertSyncSession(isCurrent);
      if (record.id || record.pending_sync || record.deleted_at) {
        migrated.push(record);
        continue;
      }
      const saved = { ...record, pending_sync: true, updated_at: record.updated_at || now() };
      const localId = await healthRepository.saveRecord(saved);
      assertSyncSession(isCurrent);
      const normalized = { ...saved, local_id: localId };
      await enqueueUpsert(normalized, false);
      migrated.push(normalized);
    }
    return migrated;
  }

  async function persist(record) {
    const raw = { ...record, user_id: currentUserId(), pending_sync: true, deleted_at: null, updated_at: now() };
    const saved = JSON.parse(JSON.stringify(raw));
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
    const sessionIsCurrent = captureSyncSession();
    const generation = ++loadGeneration;
    const isCurrent = () => sessionIsCurrent() && generation === loadGeneration;
    isLoading.value = true;
    error.value = "";
    try {
      loadUnits();
      const localRecords = (await healthRepository.getRecords(currentUserId())).filter((record) => record.record_type);
      if (!isCurrent()) return;
      const migrated = await migrateLegacyRecords(localRecords);
      if (!isCurrent()) return;
      records.value = migrated;
      await syncQueueRepository.reviveFailedTasks(
        "UPSERT_HEALTH_RECORD",
        (task) => !HEALTH_RECORD_TYPES.has(task.payload?.record_type),
      );
      await syncService.processSyncQueue();
      if (!isCurrent()) return;
      const refreshed = (await healthRepository.getRecords(currentUserId())).filter((record) => record.record_type);
      if (!isCurrent()) return;
      records.value = refreshed;
      await ensureDefaultTrackerGroups();
    } catch (loadError) {
      if (!isCurrent()) return;
      error.value = loadError.message || "Não foi possível abrir os dados de saúde.";
      throw loadError;
    } finally {
      if (isCurrent()) isLoading.value = false;
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
    if (!isHealthScheduled(schedule) || !schedule.anchor_date || Number.isNaN(new Date(schedule.anchor_date).getTime())) return null;
    const lastEvent = lastScheduleCompletion(schedule.local_key);
    const completedCurrentDate = lastEvent && (lastEvent.metadata?.scheduled_for === schedule.anchor_date || new Date(lastEvent.occurred_at) >= new Date(schedule.anchor_date));
    if (!isHealthRecurring(schedule)) {
      // Uma nova data posterior à conclusão reabre o agendamento pontual.
      return completedCurrentDate ? null : schedule.anchor_date;
    }
    if (!completedCurrentDate && schedule.schedule_enabled !== undefined) return schedule.anchor_date;
    return addInterval(
      lastEvent?.occurred_at || schedule.anchor_date,
      schedule.frequency_unit,
      schedule.frequency_value,
    );
  }

  function schedulingFields(data, current = null) {
    const object = { ...current, ...data, object_type: current?.object_type || data.object_type };
    const fields = {
      schedule_enabled: isHealthScheduled(object),
      recurrence_enabled: isHealthRecurring(object),
    };
    // Cadastros antigos sem data continuam legíveis até o usuário agendá-los.
    const configuring = data.schedule_enabled !== undefined || data.anchor_date !== undefined || data.recurrence_enabled !== undefined;
    if (fields.schedule_enabled) {
      fields.anchor_date = data.anchor_date ?? current?.anchor_date ?? (object.object_type === "SCHEDULE" ? now() : null);
      if (fields.anchor_date && Number.isNaN(new Date(fields.anchor_date).getTime())) throw new Error("Informe uma data de agendamento válida.");
      if (configuring && !fields.anchor_date) throw new Error("Informe a data do agendamento.");
      if (fields.anchor_date) fields.anchor_date = new Date(fields.anchor_date).toISOString();
      fields.warning_before = Number(data.warning_before ?? current?.warning_before ?? 7);
      if (!Number.isInteger(fields.warning_before) || fields.warning_before < 0) throw new Error("Informe um aviso prévio válido.");
      if (fields.recurrence_enabled) {
        fields.frequency_unit = data.frequency_unit ?? current?.frequency_unit ?? "months";
        fields.frequency_value = Number(data.frequency_value ?? current?.frequency_value ?? 1);
        if (!["hours", "days", "weeks", "months"].includes(fields.frequency_unit) || !Number.isInteger(fields.frequency_value) || fields.frequency_value < 1) {
          throw new Error("Informe um intervalo de recorrência válido.");
        }
      }
    }
    return fields;
  }

  async function createObject(data) {
    if (!isHealthObject(data)) throw new Error("Selecione um tipo de entidade válido.");
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Informe o nome da entidade.");
    const object = { name, object_type: data.object_type, tags: data.tags || [], notes: data.notes || "" };
    return createRecord("HEALTH_OBJECT", {
      ...object,
      ...schedulingFields(data),
      unit: data.unit || "unidades",
      minimum_quantity: Number(data.minimum_quantity || 0),
    });
  }

  async function updateObject(object, data) {
    const current = findObject(object?.local_key);
    if (!isHealthObject(current)) throw new Error("Selecione uma entidade de saúde válida.");
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Informe o nome da entidade.");
    const changes = { name, notes: String(data.notes || "").trim() };
    if (["schedule_enabled", "recurrence_enabled", "anchor_date", "frequency_unit", "frequency_value", "warning_before"].some((field) => data[field] !== undefined)) {
      Object.assign(changes, schedulingFields(data, current));
    }
    let stockQuantity;
    if (isHealthStockObject(current)) {
      changes.unit = String(data.unit || "").trim();
      changes.minimum_quantity = Number(data.minimum_quantity ?? 0);
      if (!changes.unit) throw new Error("Selecione a unidade de medida.");
      if (!Number.isFinite(changes.minimum_quantity) || changes.minimum_quantity < 0) {
        throw new Error("Informe um estoque mínimo válido.");
      }
      if (data.stock_quantity !== undefined) {
        if (data.stock_quantity === "" || data.stock_quantity === null) throw new Error("Informe o estoque atual.");
        stockQuantity = Number(data.stock_quantity);
        if (!Number.isFinite(stockQuantity)) throw new Error("Informe um estoque atual válido.");
      }
    }
    const updated = await persist({ ...current, ...changes });
    if (stockQuantity !== undefined) {
      const adjustment = stockQuantity - supplyBalance(current.local_key);
      if (adjustment !== 0) {
        await createEvent({
          object_key: current.local_key,
          event_type: "SUPPLY_ADJUSTED",
          title: "Ajuste de estoque: " + name,
          quantity: adjustment,
          notes: "Estoque ajustado na edição da entidade",
          metadata: { unit: changes.unit },
        });
      }
    }
    return updated;
  }

  async function linkConsumption(data) {
    const schedule = findObject(data.schedule_key);
    const supply = findObject(data.supply_key);
    if (!isHealthRoutine(schedule)) throw new Error("Selecione uma agenda válida.");
    if (!isHealthStockObject(supply)) throw new Error("Selecione um insumo válido.");
    const quantity = Number(data.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Informe a quantidade consumida.");
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

  async function ensureDefaultTrackerGroups() {
    const existing = objects.value.filter((o) => o.object_type === "TRACKER_GROUP");
    const existingNames = new Set(existing.map((g) => (g.name || "").toLowerCase().trim()));

    for (const def of DEFAULT_TRACKER_GROUPS) {
      if (!existingNames.has(def.name.toLowerCase().trim())) {
        await createRecord("HEALTH_OBJECT", {
          object_type: "TRACKER_GROUP",
          name: def.name,
          description: def.description,
          icon: def.icon,
          color: def.color,
        });
        existingNames.add(def.name.toLowerCase().trim());
      }
    }

    for (const tracker of trackers.value) {
      const groupName = (tracker.group || "").trim();
      if (groupName && !existingNames.has(groupName.toLowerCase())) {
        await createRecord("HEALTH_OBJECT", {
          object_type: "TRACKER_GROUP",
          name: groupName,
          description: `Rastreadores de ${groupName}`,
          icon: "folder",
          color: "#8d5fd3",
        });
        existingNames.add(groupName.toLowerCase());
      }
    }
  }

  async function createTrackerGroup(data) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Informe o nome do grupo.");
    const existing = objects.value.find(
      (o) => o.object_type === "TRACKER_GROUP" && (o.name || "").toLowerCase().trim() === name.toLowerCase(),
    );
    if (existing) throw new Error("Já existe um grupo com este nome.");

    return createRecord("HEALTH_OBJECT", {
      object_type: "TRACKER_GROUP",
      name,
      description: String(data.description || "").trim(),
      icon: data.icon || "folder",
      color: data.color || "#8d5fd3",
    });
  }

  async function updateTrackerGroup(group, data) {
    if (group?.object_type !== "TRACKER_GROUP") throw new Error("Grupo inválido.");
    const newName = String(data.name || "").trim();
    if (!newName) throw new Error("Informe o nome do grupo.");

    const oldName = (group.name || "").trim();
    const nameChanged = oldName.toLowerCase() !== newName.toLowerCase();

    if (nameChanged) {
      const conflict = objects.value.find(
        (o) =>
          o.object_type === "TRACKER_GROUP" &&
          o.local_key !== group.local_key &&
          (o.name || "").toLowerCase().trim() === newName.toLowerCase(),
      );
      if (conflict) throw new Error("Já existe um grupo com este nome.");
    }

    const updatedGroup = await persist({
      ...group,
      name: newName,
      description: String(data.description !== undefined ? data.description : group.description || "").trim(),
      icon: data.icon || group.icon || "folder",
      color: data.color || group.color || "#8d5fd3",
    });

    if (nameChanged) {
      const affectedTrackers = trackers.value.filter(
        (t) => (t.group || "").trim().toLowerCase() === oldName.toLowerCase(),
      );
      for (const tracker of affectedTrackers) {
        await persist({
          ...tracker,
          group: newName,
        });
      }
    }

    return updatedGroup;
  }

  async function deleteTrackerGroup(group, fallbackGroupName = "Bem-estar") {
    if (group?.object_type !== "TRACKER_GROUP") throw new Error("Grupo inválido.");
    const groupName = (group.name || "").trim();

    const affectedTrackers = trackers.value.filter(
      (t) => (t.group || "").trim().toLowerCase() === groupName.toLowerCase(),
    );
    for (const tracker of affectedTrackers) {
      await persist({
        ...tracker,
        group: fallbackGroupName,
      });
    }

    return deleteRecord(group);
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

  async function deleteObject(object) {
    const current = findObject(object?.local_key);
    if (!isHealthObject(current)) throw new Error("Selecione uma entidade de saúde válida.");
    const related = records.value.filter((item) =>
      (item.record_type === "OBJECT_RELATION" && (item.source_key === current.local_key || item.target_key === current.local_key)) ||
      (item.record_type === "OVERVIEW_WIDGET" && item.object_key === current.local_key)
    );
    const deletedAt = now();
    const removed = [...related, current];
    await db.transaction("rw", db.health_records, db.syncQueue, async () => {
      for (const item of removed) {
        await healthRepository.markDeleted(item.local_key, deletedAt);
        await syncQueueRepository.addSyncQueueTask({
          type: "DELETE_HEALTH_RECORD",
          payload: { local_id: item.local_id, local_key: item.local_key, record_type: item.record_type, updated_at: deletedAt },
          timestamp: deletedAt,
          compact_key: `health-record:${item.local_key}`,
        });
      }
    });
    const keys = new Set(removed.map((item) => item.local_key));
    records.value = records.value.filter((item) => !keys.has(item.local_key));
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
    if (!object) throw new Error("Selecione uma entidade de saúde ou rotina.");
    const event = await createRecord("HEALTH_EVENT", {
      object_key: object.local_key,
      event_type: data.event_type || "OBSERVATION",
      title: data.title || object.name,
      notes: data.notes || "",
      quantity: data.quantity ?? null,
      occurred_at: data.occurred_at || now(),
      metadata: data.metadata || {},
    });
    if (object.object_type === "SCHEDULE" && !isHealthScheduled(object) && event.event_type === "OBSERVATION") {
      await consumeRelations(object, event.occurred_at, data.notes);
    }
    return event;
  }

  async function recordSupplyMovement(data) {
    const supply = findObject(data.object_key);
    if (!isHealthStockObject(supply)) throw new Error("Selecione um insumo.");
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
    if (!isHealthScheduled(schedule)) throw new Error("Selecione uma agenda.");
    if (!nextDueAt(schedule)) throw new Error("Este agendamento está sem data ou já foi concluído. Edite-o para definir uma nova data.");
    const occurredAt = data.occurred_at || now();
    const completion = await createEvent({
      object_key: schedule.local_key,
      event_type: "SCHEDULE_COMPLETED",
      title: "Concluído: " + schedule.name,
      notes: data.notes,
      occurred_at: occurredAt,
      metadata: { scheduled_for: schedule.anchor_date },
    });
    await consumeRelations(schedule, occurredAt, data.notes);
    return completion;
  }

  async function consumeRelations(schedule, occurredAt, notes) {
    const consumptionRelations = objectRelations(schedule.local_key, "CONSUMES");
    for (const relation of consumptionRelations) {
      const supply = findObject(relation.target_key);
      if (!supply) continue;
      await createEvent({
        object_key: supply.local_key,
        event_type: "SUPPLY_CONSUMED",
        title: "Uso automático: " + supply.name,
        notes: "Vinculado a " + schedule.name + (notes ? " · " + notes : ""),
        quantity: relation.quantity,
        occurred_at: occurredAt,
        metadata: { schedule_key: schedule.local_key, relation_key: relation.local_key, unit: supply.unit },
      });
    }
  }

  return {
    objects,
    relations,
    events,
    widgets,
    schedules,
    supplies,
    entities,
    trackers,
    activeTrackers,
    trackerGroups,
    checkins,
    isLoading,
    clearState,
    error,
    loadRecords,
    findObject,
    objectRelations,
    supplyBalance,
    nextDueAt,
    createObject,
    updateObject,
    linkConsumption,
    addWidget,
    createTracker,
    addDigestiveWellbeingTemplate,
    updateTracker,
    archiveTracker,
    ensureDefaultTrackerGroups,
    createTrackerGroup,
    updateTrackerGroup,
    deleteTrackerGroup,
    createCheckin,
    removeWidget,
    deleteEvent,
    deleteObject,
    createEvent,
    recordSupplyMovement,
    completeSchedule,
    units,
    loadUnits,
  };
});
