import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/plugins/api";
import { agendaRepository, buildAgendaDeleteTask, buildAgendaUpsertTask } from "@/services/localData/agendaRepository";
import { syncQueueRepository } from "@/services/localData/syncQueueRepository";
import { syncService } from "@/services/syncService";
import { addDays, browserTimezone, dateFromKey, toAgendaItem } from "@/utils/agendaCalendar";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";

const now = () => new Date().toISOString();
const localKey = () => "agenda-" + (crypto.randomUUID?.() || Date.now() + "-" + Math.random());
const MAX_DURATION_MS = 366 * 24 * 60 * 60 * 1000;

// O formulário trabalha com datas/horas locais; o armazenamento e a API usam instantes ISO.
// Compromissos de dia inteiro chegam como `start_day`/`end_day` (AAAA-MM-DD, fim inclusivo).
function normalizeInput(data) {
  const title = String(data.title || "").trim();
  if (!title) throw new Error("Informe o título do compromisso.");
  if (title.length > 200) throw new Error("O título deve ter no máximo 200 caracteres.");

  let start;
  let end;
  const allDay = Boolean(data.all_day);
  if (allDay) {
    start = dateFromKey(data.start_day);
    end = addDays(dateFromKey(data.end_day || data.start_day), 1);
  } else {
    start = new Date(data.start_at);
    end = new Date(data.end_at || data.start_at);
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Informe uma data e hora válidas.");
  if (end < start) throw new Error("O fim do compromisso deve ser depois do início.");
  if (end - start > MAX_DURATION_MS) throw new Error("O compromisso pode durar no máximo um ano.");

  return {
    title,
    description: String(data.description || "").trim().slice(0, 4000),
    location: String(data.location || "").trim().slice(0, 255),
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: allDay,
    timezone: browserTimezone(),
  };
}

export const useAgendaStore = defineStore("agenda", () => {
  const records = ref([]);
  const isLoading = ref(false);
  const error = ref("");
  const googleStatus = ref(null);
  const googleBusy = ref(false);
  let loadGeneration = 0;

  function clearState() {
    loadGeneration++;
    records.value = [];
    error.value = "";
    isLoading.value = false;
    googleStatus.value = null;
    googleBusy.value = false;
  }

  // Os compromissos com origem "health" existem só para levar os agendamentos do Health ao Google (o servidor os
  // mantém); aqui o Health é exibido pela projeção em `healthItems`, que mostra também atrasados, feitos e repetições.
  const events = computed(() => records.value.filter((record) => !record.deleted_at && record.source !== "health"));
  const items = computed(() => events.value.map(toAgendaItem));

  function currentUserId() {
    const authStore = useAuthStore();
    if (!authStore.user?.id) throw new Error("Entre na sua conta para acessar a agenda.");
    return String(authStore.user.id);
  }

  async function persist(record) {
    const raw = { ...record, user_id: currentUserId(), pending_sync: true, deleted_at: null, updated_at: now() };
    const saved = JSON.parse(JSON.stringify(raw));
    const localId = await agendaRepository.saveEvent(saved);
    const normalized = { ...saved, local_id: localId };
    const index = records.value.findIndex((item) => item.local_key === normalized.local_key);
    if (index === -1) records.value.push(normalized);
    else records.value.splice(index, 1, normalized);
    await syncQueueRepository.addSyncQueueTask(buildAgendaUpsertTask(normalized));
    await syncService.processSyncQueue();
    return normalized;
  }

  // Lê o Dexie e depois deixa a fila enviar o que está pendente e baixar o delta (Google e outros dispositivos).
  async function loadEvents({ silent = false } = {}) {
    const sessionIsCurrent = captureSyncSession();
    const generation = ++loadGeneration;
    const isCurrent = () => sessionIsCurrent() && generation === loadGeneration;
    if (!silent) isLoading.value = true;
    error.value = "";
    try {
      const userId = currentUserId();
      const local = await agendaRepository.getEvents(userId);
      if (!isCurrent()) return;
      records.value = local;
      await syncService.processSyncQueue();
      if (!isCurrent()) return;
      records.value = await agendaRepository.getEvents(userId);
    } catch (loadError) {
      if (!isCurrent()) return;
      error.value = loadError.message || "Não foi possível abrir a agenda.";
      throw loadError;
    } finally {
      if (isCurrent()) isLoading.value = false;
    }
  }

  async function createEvent(data) {
    const timestamp = now();
    return persist({ local_key: localKey(), source: "manual", created_at: timestamp, ...normalizeInput(data) });
  }

  async function updateEvent(event, data) {
    const current = records.value.find((record) => record.local_key === event?.local_key);
    if (!current) throw new Error("Este compromisso não existe mais.");
    return persist({ ...current, ...normalizeInput(data) });
  }

  async function deleteEvent(event) {
    const current = records.value.find((record) => record.local_key === event?.local_key);
    if (!current) return;
    const deletedAt = now();
    const userId = currentUserId();
    const marked = await agendaRepository.markDeleted(userId, current.local_key, deletedAt);
    records.value = records.value.filter((record) => record.local_key !== current.local_key);
    if (!marked) return;
    await syncQueueRepository.addSyncQueueTask(buildAgendaDeleteTask({ ...current, user_id: userId }, deletedAt));
    await syncService.processSyncQueue();
  }

  // --- Google Agenda ---

  async function loadGoogleStatus() {
    const isCurrent = captureSyncSession();
    try {
      const response = await api.get("/agenda/google/status", { timeout: 15000 });
      assertSyncSession(isCurrent);
      googleStatus.value = response.data;
    } catch {
      // Sem rede a agenda segue funcionando; o painel só não mostra o estado da conexão.
    }
    return googleStatus.value;
  }

  async function runGoogleAction(action, { silent = false } = {}) {
    if (!silent) googleBusy.value = true;
    try {
      return await action();
    } finally {
      if (!silent) googleBusy.value = false;
    }
  }

  const connectGoogle = () =>
    runGoogleAction(async () => {
      const response = await api.post("/agenda/google/connect", null, { timeout: 15000 });
      window.location.assign(response.data.url);
    });

  // `full` refaz a janela completa (botão "Sincronizar agora"); a atualização automática é incremental e silenciosa.
  const syncGoogle = ({ full = true, silent = false } = {}) =>
    runGoogleAction(async () => {
      const response = await api.post("/agenda/google/sync", { full }, { timeout: 60000 });
      googleStatus.value = response.data;
      await loadEvents({ silent: true });
      return response.data;
    }, { silent });

  const disconnectGoogle = () =>
    runGoogleAction(async () => {
      const response = await api.delete("/agenda/google", { timeout: 15000 });
      googleStatus.value = response.data;
      await loadEvents({ silent: true });
      return response.data;
    });

  return {
    records,
    events,
    items,
    isLoading,
    error,
    googleStatus,
    googleBusy,
    clearState,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    loadGoogleStatus,
    connectGoogle,
    syncGoogle,
    disconnectGoogle,
  };
});
