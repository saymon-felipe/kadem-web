import { db, runDbOperation } from "@/db";
import { captureSyncSession, assertSyncSession, requireSyncArray } from "@/utils/syncState";

export const receiptRepository = {
  async create(user_id, files = [], qr_reference = "") {
    const local_key = crypto.randomUUID();
    const row = {
      user_id,
      local_key,
      qr_reference,
      status: "AWAITING_DOCUMENT",
      pending_sync: true,
      created_at: new Date().toISOString(),
      data: {},
      documents: [],
      items: [],
      links: [],
      warnings: [],
    };
    await runDbOperation(() =>
      db.transaction("rw", db.finance_receipts, db.finance_receipt_files, async () => {
        row.local_id = await db.finance_receipts.add(row);
        await db.finance_receipt_files.bulkPut(
          files.map((file) => ({
            local_key: crypto.randomUUID(),
            user_id,
            receipt_local_key: local_key,
            blob: file,
            name: file.name || "fotografia.jpg",
            uploaded: false,
          })),
        );
      }),
    );
    return row;
  },
  get(user_id, local_key) {
    return runDbOperation(() => db.finance_receipts.where("[user_id+local_key]").equals([user_id, local_key]).first());
  },
  files(user_id, local_key) {
    return runDbOperation(() =>
      db.finance_receipt_files
        .where("receipt_local_key")
        .equals(local_key)
        .and((f) => f.user_id === user_id)
        .toArray(),
    );
  },
  async save(user_id, local_key, remote, extra = {}) {
    const current = await this.get(user_id, local_key);
    if (!current) throw new Error("Rascunho de nota fiscal indisponível.");
    // A tela entrega a nota como proxy reativo do Vue e o IndexedDB não clona Proxy (DataCloneError).
    const fields = JSON.parse(JSON.stringify({ ...remote, ...extra }));
    // O erro de envio vem da fila e só existe na tela; gravá-lo deixaria o aviso preso após o sucesso.
    delete fields.sync_error;
    await db.finance_receipts.update(current.local_id, { ...fields, user_id, local_key });
    return this.get(user_id, local_key);
  },
  async merge(user_id, rows) {
    requireSyncArray(rows);
    const currentSession = captureSyncSession();
    await db.transaction("rw", db.finance_receipts, async () => {
      assertSyncSession(currentSession);
      for (const row of rows) {
        const existing = await db.finance_receipts.where("[user_id+id]").equals([user_id, row.id]).first()
          || (row.client_id && await this.get(user_id, row.client_id));
        if (existing) {
          if (!existing.pending_sync && !existing.pending_delete) await db.finance_receipts.update(existing.local_id, { ...row, user_id });
        } else await db.finance_receipts.add({ ...row, user_id, local_key: row.id, pending_sync: false });
      }
      assertSyncSession(currentSession);
    });
  },
  async list(user_id, filters = {}) {
    return runDbOperation(async () => {
      const rows = await db.finance_receipts.where("user_id").equals(user_id).toArray();
      const deduplicated = new Map();
      const deletedIds = new Set(rows.filter((row) => row.pending_delete && row.id).map((row) => row.id));
      for (const row of rows) {
        if (row.pending_delete || deletedIds.has(row.id)) continue;
        const key = row.id || row.local_key;
        const prior = deduplicated.get(key);
        if (!prior || row.pending_sync || (!prior.pending_sync && row.local_id > prior.local_id))
          deduplicated.set(key, row);
      }
      return [...deduplicated.values()]
        .filter((row) => {
          const date = String(row.issued_on || row.data?.issued_on || "").slice(0, 10);
          return (
            (!filters.from || date >= filters.from) &&
            (!filters.to || date <= filters.to) &&
            (!filters.status || row.status === filters.status) &&
            (!filters.amount || Number(row.total) === Number(filters.amount)) &&
            (!filters.q ||
              JSON.stringify([row.merchant, row.issuer_id, row.access_key, row.data?.items, row.items])
                .toLocaleLowerCase("pt-BR")
                .includes(filters.q.toLocaleLowerCase("pt-BR")))
          );
        })
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    });
  },
};
