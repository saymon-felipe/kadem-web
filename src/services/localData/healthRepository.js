import { db, runDbOperation } from "@/db";

const now = () => new Date().toISOString();
const active = (record) => !record.deleted_at;

export const healthRepository = {
  getRecords(userId) {
    return runDbOperation(
      async () => (await db.health_records.where("user_id").equals(userId).toArray()).filter(active),
      { userMessage: "Não foi possível ler os dados de saúde deste dispositivo." },
    );
  },

  getSyncCursor(userId) {
    return runDbOperation(async () => Number((await db.health_sync_state.get(userId))?.cursor || 0), {
      userMessage: "Não foi possível ler o estado de sincronização do Health.",
    });
  },

  saveRecord(record) {
    return runDbOperation(() => db.health_records.put(record), {
      userMessage: "Não foi possível salvar os dados de saúde neste dispositivo.",
    });
  },

  markDeleted(localKey, updatedAt = now()) {
    return runDbOperation(
      async () => {
        const record = await db.health_records.where("local_key").equals(localKey).first();
        if (!record) return null;
        await db.health_records.update(record.local_id, {
          deleted_at: updatedAt,
          updated_at: updatedAt,
          pending_sync: true,
        });
        return { ...record, deleted_at: updatedAt, updated_at: updatedAt, pending_sync: true };
      },
      { userMessage: "Não foi possível atualizar a configuração do Health neste dispositivo." },
    );
  },

  markRecordSynced(localKey, serverRecord) {
    return runDbOperation(
      async () => {
        const current = await db.health_records.where("local_key").equals(localKey).first();
        if (!current || current.deleted_at) return current || null;
        const synced = {
          ...current,
          ...serverRecord,
          local_id: current.local_id,
          local_key: localKey,
          user_id: current.user_id,
          pending_sync: false,
          deleted_at: null,
        };
        await db.health_records.put(synced);
        return synced;
      },
      { userMessage: "Não foi possível confirmar a sincronização do Health." },
    );
  },

  resolveDeletedRecord(localKey, serverRecord = null) {
    return runDbOperation(
      async () => {
        const current = await db.health_records.where("local_key").equals(localKey).first();
        if (!current) return null;
        if (!serverRecord) {
          await db.health_records.delete(current.local_id);
          return null;
        }
        const restored = {
          ...current,
          ...serverRecord,
          local_id: current.local_id,
          local_key: localKey,
          user_id: current.user_id,
          pending_sync: false,
          deleted_at: null,
        };
        await db.health_records.put(restored);
        return restored;
      },
      { userMessage: "Não foi possível concluir a exclusão sincronizada do Health." },
    );
  },

  applyServerChanges(userId, changes = [], cursor = 0) {
    return runDbOperation(
      () =>
        db.transaction("rw", db.health_records, db.health_sync_state, async () => {
          for (const change of changes) {
            const current = await db.health_records.where("local_key").equals(change.local_key).first();
            if (current?.pending_sync) continue;

            if (change.operation === "DELETE") {
              if (current?.local_id) await db.health_records.delete(current.local_id);
              continue;
            }

            if (!change.record) continue;
            await db.health_records.put({
              ...change.record,
              local_id: current?.local_id,
              local_key: change.local_key,
              user_id: userId,
              pending_sync: false,
              deleted_at: null,
            });
          }

          await db.health_sync_state.put({ user_id: userId, cursor: Number(cursor || 0), updated_at: now() });
        }),
      { userMessage: "Não foi possível aplicar a atualização remota do Health." },
    );
  },
};
