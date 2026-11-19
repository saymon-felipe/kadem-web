import { db, runDbOperation } from "@/db";
import { captureSyncSession, assertSyncSession, requireSyncArray } from "@/utils/syncState";

export function projectReceipt(row) {
  const pending = row?.pending_correction;
  if (!pending || pending.error) return row;

  const { document_complete, ...changes } = pending.changes;
  const data = { ...row.data, ...changes };
  const total = data.document_kind === "FOREIGN_RECEIPT" ? row.total : data.total ?? row.total;
  const hasOriginal = Boolean(row.documents?.length || row.document_count);
  const manualConfirmation = document_complete && hasOriginal && (data.items ?? row.items)?.length > 0;
  const complete = Boolean(manualConfirmation || row.original_complete);
  const transientWarning = /^(?:IA indisponível|Não foi possível interpretar a resposta da IA\.|Consulta pública indisponível\.|O portal retornou uma leitura parcial\.|Para consultar os dados da nota, use o QR Code ou o link do portal fiscal\.)/i;
  const warnings = (row.warnings || []).filter((warning) =>
    !/^processamento interrompido/i.test(warning) &&
    !(complete && /^(?:comprovante integral pendente|leitura parcial da nota)/i.test(warning)) &&
    !(manualConfirmation && transientWarning.test(warning)));
  const ai_status = manualConfirmation && ["INSUFFICIENT_AI_CREDITS", "UNAVAILABLE", "INVALID_RESPONSE"].includes(row.ai_status)
    ? "NOT_NEEDED" : row.ai_status;
  let status = row.status;
  if (complete && status !== "ARCHIVED") {
    const cents = (value) => Math.round(Number(value) * 100);
    const allocated = (row.links || []).reduce((sum, link) =>
      link.transaction_id == null ? sum : sum + cents(link.amount), 0);
    const expected = cents(total);
    status = warnings.length || !(allocated > 0 && allocated <= expected) ? "REVIEW"
      : allocated === expected ? "MATCHED" : "PARTIAL";
  }
  const items = changes.items?.map((item, index) => {
    const original = row.items?.[index];
    return original && original.description === item.description && original.supplier_code === item.supplier_code
      ? { ...original, ...item }
      : item;
  }) || row.items;
  return { ...row, data, total, items, warnings, status, ai_status, original_complete: Number(complete),
    merchant: data.merchant ?? row.merchant, issuer_id: data.issuer_id ?? row.issuer_id,
    issued_on: data.issued_on ?? row.issued_on };
}

export function isOlderReceipt(remote, current) {
  return remote.id === current.id && remote.revision != null && current.revision != null &&
    Number(remote.revision) < Number(current.revision);
}

export function matchesReceiptFilters(row, filters) {
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
}

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
          if (!existing.pending_sync && !existing.pending_delete && !isOlderReceipt(row, existing))
            await db.finance_receipts.update(existing.local_id, { ...row, user_id });
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
        const pending = Boolean(row.pending_sync || row.pending_correction);
        const priorPending = Boolean(prior?.pending_sync || prior?.pending_correction);
        if (!prior || (pending && !priorPending) || (pending === priorPending && row.local_id > prior.local_id))
          deduplicated.set(key, row);
      }
      return [...deduplicated.values()]
        .map(projectReceipt)
        .filter((row) => matchesReceiptFilters(row, filters))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    });
  },
};
