import { db, runDbOperation } from "@/db";
import { captureSyncSession, assertSyncSession, normalizeSyncCursor, requireSyncArray } from "@/utils/syncState";

const now = () => new Date().toISOString();
const active = (record) => !record.deleted_at;

const EVENT_FIELDS = ["title", "description", "location", "start_at", "end_at", "all_day", "timezone"];

export function agendaEventData(record) {
  return Object.fromEntries(EVENT_FIELDS.filter((field) => record[field] !== undefined).map((field) => [field, record[field]]));
}

// Tarefa de envio de um compromisso. `compact_key` junta edições seguidas do mesmo compromisso em uma só.
export function buildAgendaUpsertTask(record) {
  return {
    type: "UPSERT_AGENDA_EVENT",
    payload: {
      local_id: record.local_id,
      local_key: record.local_key,
      user_id: record.user_id,
      data: agendaEventData(record),
      updated_at: record.updated_at,
    },
    timestamp: record.updated_at,
    compact_key: `agenda-event:${record.user_id}:${record.local_key}`,
  };
}

export function buildAgendaDeleteTask(record, deletedAt) {
  return {
    type: "DELETE_AGENDA_EVENT",
    payload: { local_id: record.local_id, local_key: record.local_key, user_id: record.user_id, updated_at: deletedAt },
    timestamp: deletedAt,
    compact_key: `agenda-event:${record.user_id}:${record.local_key}`,
  };
}

const findByKey = (userId, localKey) => db.agenda_events.where("[user_id+local_key]").equals([userId, localKey]).first();

export const agendaRepository = {
  getEvents(userId) {
    return runDbOperation(
      async () => (await db.agenda_events.where("user_id").equals(userId).toArray()).filter(active),
      { userMessage: "Não foi possível ler a agenda deste dispositivo." },
    );
  },

  getSyncCursor(userId) {
    return runDbOperation(async () => normalizeSyncCursor((await db.agenda_sync_state.get(userId))?.cursor), {
      userMessage: "Não foi possível ler o estado de sincronização da agenda.",
    });
  },

  saveEvent(record) {
    return runDbOperation(() => db.agenda_events.put(record), {
      userMessage: "Não foi possível salvar o compromisso neste dispositivo.",
    });
  },

  markDeleted(userId, localKey, updatedAt = now()) {
    return runDbOperation(
      async () => {
        const record = await findByKey(userId, localKey);
        if (!record) return null;
        const changes = { deleted_at: updatedAt, updated_at: updatedAt, pending_sync: true };
        await db.agenda_events.update(record.local_id, changes);
        return { ...record, ...changes };
      },
      { userMessage: "Não foi possível excluir o compromisso neste dispositivo." },
    );
  },

  // Confirma o envio. Se o compromisso foi editado de novo enquanto a requisição estava em voo, a versão
  // local mais nova continua pendente e `resync` pede um novo envio em vez de perder a edição.
  markEventSynced(userId, localKey, serverRecord) {
    return runDbOperation(
      async () => {
        const current = await findByKey(userId, localKey);
        if (!current || current.deleted_at) return { record: current || null, resync: false };
        const localIsNewer = Date.parse(current.updated_at) > Date.parse(serverRecord?.updated_at);
        if (!serverRecord || localIsNewer) {
          const next = { ...current, id: serverRecord?.id ?? current.id, pending_sync: true };
          await db.agenda_events.put(next);
          return { record: next, resync: true };
        }
        const synced = {
          ...current,
          ...serverRecord,
          local_id: current.local_id,
          local_key: localKey,
          user_id: userId,
          pending_sync: false,
          deleted_at: null,
        };
        await db.agenda_events.put(synced);
        return { record: synced, resync: false };
      },
      { userMessage: "Não foi possível confirmar a sincronização da agenda." },
    );
  },

  resolveDeletedEvent(userId, localKey) {
    return runDbOperation(
      async () => {
        const current = await findByKey(userId, localKey);
        if (current?.deleted_at) await db.agenda_events.delete(current.local_id);
      },
      { userMessage: "Não foi possível concluir a exclusão sincronizada da agenda." },
    );
  },

  applyServerChanges(userId, changes = [], cursor = 0) {
    const isCurrent = captureSyncSession();
    requireSyncArray(changes);
    return runDbOperation(
      () =>
        db.transaction("rw", db.agenda_events, db.agenda_sync_state, async () => {
          assertSyncSession(isCurrent);
          for (const change of changes) {
            const current = await findByKey(userId, change.local_key);
            // Uma alteração local ainda não enviada nunca é sobrescrita por um delta remoto.
            if (current?.pending_sync) continue;

            if (change.operation === "DELETE") {
              if (current?.local_id) await db.agenda_events.delete(current.local_id);
              continue;
            }

            if (!change.record) continue;
            await db.agenda_events.put({
              ...change.record,
              local_id: current?.local_id,
              local_key: change.local_key,
              user_id: userId,
              pending_sync: false,
              deleted_at: null,
            });
          }

          await db.agenda_sync_state.put({ user_id: userId, cursor: Number(cursor || 0), updated_at: now() });
          assertSyncSession(isCurrent);
        }),
      { userMessage: "Não foi possível aplicar a atualização remota da agenda." },
    );
  },
};
