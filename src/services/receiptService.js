import { api } from "@/plugins/api";
import { db } from "@/db";
import { useAuthStore } from "@/stores/auth";
import { receiptRepository } from "@/services/localData/receiptRepository";
import { syncQueueRepository } from "@/services/localData/syncQueueRepository";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";

const owner = () => {
  const id = useAuthStore().user?.id;
  if (!id) throw new Error("Entre na sua conta para acessar as notas fiscais.");
  return id;
};
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
const syncing = new Map();
const deleting = new Map();
const identity = (user_id) => ({ headers: { "X-Expected-User-Id": String(user_id) } });
const purgeLocal = async (user_id, rows) => {
  const keys = new Set(rows.map((item) => item.local_key));
  await db.transaction("rw", db.finance_receipts, db.finance_receipt_files, db.syncQueue, async () => {
    await db.finance_receipt_files.where("user_id").equals(user_id).filter((file) => keys.has(file.receipt_local_key)).delete();
    await db.syncQueue.where("type").anyOf("SYNC_FINANCE_RECEIPT", "DELETE_FINANCE_RECEIPT").filter((task) => task.payload?.user_id === user_id && keys.has(task.payload?.local_key)).delete();
    await db.finance_receipts.bulkDelete(rows.map((item) => item.local_id));
  });
};
export const receiptService = {
  async list(filters = {}) {
    const user_id = owner(),
      session = captureSyncSession();
    let matchingIds;
    let hasMore = false;
    if (online()) {
      try {
        const { data } = await api.get("/finance/receipts", { params: filters });
        assertSyncSession(session);
        const localRows = await db.finance_receipts.where("user_id").equals(user_id).toArray();
        const clientIds = [...new Set(localRows.map((row) => row.client_id || row.local_key).filter(Boolean))];
        const deletedClients = new Set();
        for (let i = 0; i < clientIds.length; i += 100) {
          const result = await api.post("/finance/receipts/deletion-status", { client_ids: clientIds.slice(i, i + 100) }, identity(user_id));
          assertSyncSession(session);
          const deleted = new Set(result.data);
          for (const id of deleted) deletedClients.add(id);
          await purgeLocal(user_id, localRows.filter((row) => deleted.has(row.client_id || row.local_key)));
        }
        const activeData = data.filter((row) => !deletedClients.has(row.client_id));
        await receiptRepository.merge(user_id, activeData);
        hasMore = data.length === (filters.limit || 50);
        if (filters.transaction_id) matchingIds = new Set(activeData.map((r) => r.id));
      } catch (error) {
        assertSyncSession(session);
        if (error.response && error.response.status < 500) throw error;
      }
    }
    const rows = await receiptRepository.list(user_id, filters);
    const tasks = await db.syncQueue.where("type").equals("SYNC_FINANCE_RECEIPT").toArray();
    const failures = new Map(tasks.filter((task) => task.payload?.user_id === user_id && task.last_error)
      .map((task) => [task.payload.local_key, task.last_error]));
    for (const row of rows) if (row.pending_sync && failures.has(row.local_key)) row.sync_error = failures.get(row.local_key);
    const result = filters.transaction_id
      ? rows.filter((r) =>
          matchingIds
            ? matchingIds.has(r.id)
            : r.links?.some((l) => String(l.transaction_id) === String(filters.transaction_id)),
        )
      : rows;
    result.has_more = hasMore;
    return result;
  },
  async capture(files, qr_reference = "") {
    const user_id = owner();
    const session = captureSyncSession();
    for (const file of files) if (file.size > 25 * 1024 * 1024) throw new Error("Cada arquivo deve ter até 25 MiB.");
    if (files.length > 20) throw new Error("Selecione até 20 fotografias da mesma nota.");
    const row = await db.transaction("rw", db.finance_receipts, db.finance_receipt_files, db.syncQueue, async () => {
      const created = await receiptRepository.create(user_id, files, qr_reference);
      assertSyncSession(session);
      await syncQueueRepository.addSyncQueueTask({
        type: "SYNC_FINANCE_RECEIPT",
        payload: { user_id, local_key: created.local_key },
        idempotency_key: created.local_key,
        compact_key: `receipt:${user_id}:${created.local_key}`,
        // A foreground request owns this attempt. Recover after a closed/crashed page,
        // but don't let the background queue race the upload and its error handling.
        next_attempt_at: new Date(Date.now() + (online() ? 360000 : 0)).toISOString(),
      });
      return created;
    });
    if (online()) {
      try {
        await this.sync(row.local_key, user_id);
      } catch (error) {
        assertSyncSession(session);
        const message = error?.response?.data?.message || error.message || "Erro desconhecido";
        const tasks = await db.syncQueue.where("type").equals("SYNC_FINANCE_RECEIPT")
          .filter((task) => task.payload?.user_id === user_id && task.payload?.local_key === row.local_key).toArray();
        for (const task of tasks) await syncQueueRepository.updateTask(task.id, { status: "FAILED", last_error: message });
        let cancelled = false;
        try {
          const current = await receiptRepository.get(user_id, row.local_key);
          if (current?.id && !current.operation_key) {
            const { data } = await api.get(`/finance/receipts/${current.id}`);
            assertSyncSession(session);
            if (data.id === current.id && data.client_id === row.local_key && Array.isArray(data.documents) && data.documents.length === 0) {
              await api.delete(`/finance/receipts/${current.id}`, identity(user_id));
              assertSyncSession(session);
              await purgeLocal(user_id, [current]);
              cancelled = true;
            }
          }
        } catch { /* Preserve the original when cancellation cannot be confirmed. */ }
        const detail = cancelled ? "A inserção foi cancelada." : "Não foi possível confirmar o cancelamento; o arquivo foi preservado para revisão e não será reenviado automaticamente.";
        throw new Error(`${message} ${detail}`);
      }
    }
    assertSyncSession(session);
    return receiptRepository.get(user_id, row.local_key);
  },
  sync(local_key, user_id) {
    const key = `${user_id}:${local_key}`;
    if (deleting.has(key)) return Promise.reject(new Error("A nota está sendo excluída."));
    if (syncing.has(key)) return syncing.get(key);
    const pending = this.performSync(local_key, user_id).finally(() => syncing.delete(key));
    syncing.set(key, pending);
    return pending;
  },
  async remove(row) {
    const user_id = owner(), session = captureSyncSession();
    await db.transaction("rw", db.finance_receipts, db.syncQueue, async () => {
      const current = await receiptRepository.get(user_id, row.local_key);
      if (!current) return;
      await db.finance_receipts.where("user_id").equals(user_id)
        .filter((item) => item.local_key === row.local_key || (current.id && item.id === current.id))
        .modify({ pending_delete: true, pending_sync: true });
      await db.syncQueue.where("type").equals("SYNC_FINANCE_RECEIPT")
        .filter((task) => task.payload?.user_id === user_id && task.payload?.local_key === row.local_key).delete();
      await syncQueueRepository.addSyncQueueTask({
        type: "DELETE_FINANCE_RECEIPT",
        payload: { user_id, local_key: row.local_key },
        compact_key: `delete-receipt:${user_id}:${row.local_key}`,
      });
      assertSyncSession(session);
    });
    if (online()) {
      try {
        return await this.syncDeletion(row.local_key, user_id);
      } catch (error) {
        assertSyncSession(session);
        const tasks = await db.syncQueue.where("type").equals("DELETE_FINANCE_RECEIPT")
          .filter((task) => task.payload?.user_id === user_id && task.payload?.local_key === row.local_key).toArray();
        for (const task of tasks) await syncQueueRepository.updateTask(task.id, {
          status: "RETRY", next_attempt_at: new Date(Date.now() + 30000).toISOString(),
          last_error: error.response?.data?.message || error.message,
        });
        throw error;
      }
    }
  },
  syncDeletion(local_key, user_id) {
    const key = `${user_id}:${local_key}`;
    if (deleting.has(key)) return deleting.get(key);
    const pending = this.performDeletion(local_key, user_id).finally(() => deleting.delete(key));
    deleting.set(key, pending);
    return pending;
  },
  async performDeletion(local_key, user_id) {
    if (owner() !== user_id) throw new Error("NOT_SYNCED: aguardando a conta proprietária da nota fiscal.");
    const row = { local_key };
    const session = captureSyncSession(),
      key = `${user_id}:${row.local_key}`;
    if (!online()) throw new Error("Conecte-se à internet para excluir a nota e seus arquivos.");
    // A failed upload must not prevent an explicit deletion.
    if (syncing.has(key)) await syncing.get(key).catch(() => {});
    assertSyncSession(session);
    let current = await receiptRepository.get(user_id, row.local_key);
    if (!current) return;
    if (!current.id) {
      const { data } = await api.post(
        "/finance/receipts",
        { client_id: current.local_key, qr_reference: current.qr_reference || null },
        identity(user_id),
      );
      assertSyncSession(session);
      current = await receiptRepository.save(user_id, row.local_key, data, { pending_sync: true });
    }
    try {
      await api.delete(`/finance/receipts/${current.id}`, identity(user_id));
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }
    assertSyncSession(session);
    const rows = await db.finance_receipts.where("user_id").equals(user_id)
      .filter((item) => item.id === current.id || item.local_key === current.local_key).toArray();
    await purgeLocal(user_id, rows);
  },
  async performSync(local_key, user_id) {
    if (owner() !== user_id) throw new Error("NOT_SYNCED: aguardando a conta proprietária da nota fiscal.");
    const session = captureSyncSession();
    let row = await receiptRepository.get(user_id, local_key);
    if (!row || row.pending_delete) return;
    const check = () => {
      assertSyncSession(session);
      if (owner() !== user_id) throw new Error("Sessão alterada.");
    };
    if (!row.id) {
      check();
      const { data } = await api.post(
        "/finance/receipts",
        {
          client_id: local_key,
          qr_reference: row.qr_reference || null,
        },
        identity(user_id),
      );
      check();
      row = await receiptRepository.save(user_id, local_key, data, { pending_sync: true });
    }
    const files = await receiptRepository.files(user_id, local_key);
    const newFiles = files.filter((f) => !f.uploaded);
    for (const file of newFiles) {
      check();
      const { data } = await api.post(`/finance/receipts/${row.id}/documents`, file.blob, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Expected-User-Id": String(user_id),
        },
        timeout: 120000,
      });
      check();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", await file.blob.arrayBuffer())),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      await db.finance_receipt_files.update(file.local_key, {
        uploaded: true,
        document_id: data.documents.find((d) => d.sha256 === hash)?.id,
      });
      row = await receiptRepository.save(user_id, local_key, data, { pending_sync: true });
    }
    check();
    // Persist before the request: a response-loss retry uses the same operation.
    const operation_key = newFiles.length ? crypto.randomUUID() : row.operation_key || crypto.randomUUID();
    await receiptRepository.save(user_id, local_key, row, { operation_key, pending_sync: true });
    const { data } = await api.post(
      `/finance/receipts/${row.id}/process`,
      { operation_key, use_ai: row.use_ai !== false },
      { ...identity(user_id), timeout: 250000 },
    );
    check();
    row = await receiptRepository.save(user_id, local_key, data, { pending_sync: false });
    const tasks = await db.syncQueue.where("type").equals("SYNC_FINANCE_RECEIPT").toArray();
    for (const task of tasks.filter((t) => t.payload.user_id === user_id && t.payload.local_key === local_key))
      await syncQueueRepository.deleteTask(task.id);
    return row;
  },
  async detail(row) {
    const user_id = owner(),
      session = captureSyncSession();
    if (row.id && online()) {
      try {
        const { data } = await api.get(`/finance/receipts/${row.id}`);
        assertSyncSession(session);
        return receiptRepository.save(user_id, row.local_key, data);
      } catch (error) {
        assertSyncSession(session);
        if (error.response && error.response.status < 500) throw error;
      }
    }
    return receiptRepository.get(user_id, row.local_key);
  },
  async addDocuments(row, files) {
    const user_id = owner();
    for (const file of files) if (file.size > 25 * 1024 * 1024) throw new Error("Cada arquivo deve ter até 25 MiB.");
    await db.transaction("rw", db.finance_receipts, db.finance_receipt_files, db.syncQueue, async () => {
      await db.finance_receipt_files.bulkPut(
        files.map((file) => ({
          local_key: crypto.randomUUID(),
          user_id,
          receipt_local_key: row.local_key,
          blob: file,
          name: file.name,
          uploaded: false,
        })),
      );
      await receiptRepository.save(user_id, row.local_key, row, { pending_sync: true });
      await syncQueueRepository.addSyncQueueTask({
        type: "SYNC_FINANCE_RECEIPT",
        payload: { user_id, local_key: row.local_key },
        compact_key: `receipt:${user_id}:${row.local_key}`,
      });
    });
    if (online()) return this.sync(row.local_key, user_id);
    return receiptRepository.get(user_id, row.local_key);
  },
  async retry(row, use_ai = true) {
    const user_id = owner(),
      session = captureSyncSession();
    const files = await receiptRepository.files(user_id, row.local_key);
    if (!row.id || row.pending_sync || files.some((f) => !f.uploaded)) {
      // Tentativa explícita é uma nova execução: com a chave antiga o servidor trata a execução
      // interrompida como replay e devolve o mesmo aviso sem reler a nota.
      await receiptRepository.save(user_id, row.local_key, row, { use_ai, operation_key: crypto.randomUUID() });
      return this.sync(row.local_key, user_id);
    }
    const operation_key = crypto.randomUUID();
    const { data } = await api.post(
      `/finance/receipts/${row.id}/process`,
      { operation_key, use_ai, force: true },
      { ...identity(user_id), timeout: 250000 },
    );
    assertSyncSession(session);
    return receiptRepository.save(user_id, row.local_key, data, { operation_key, pending_sync: false });
  },
  async correct(row, changes) {
    const user_id = owner(),
      session = captureSyncSession();
    const { data } = await api.patch(`/finance/receipts/${row.id}`, changes, { ...identity(user_id), timeout: 250000 });
    assertSyncSession(session);
    return receiptRepository.save(user_id, row.local_key, data);
  },
  async reconcile(row, options) {
    const user_id = owner(),
      session = captureSyncSession();
    const { data } = await api.post(`/finance/receipts/${row.id}/reconcile`, options, identity(user_id));
    assertSyncSession(session);
    return receiptRepository.save(user_id, row.local_key, data);
  },
  async candidates(row) {
    const session = captureSyncSession();
    const { data } = await api.get(`/finance/receipts/${row.id}/candidates`);
    assertSyncSession(session);
    return data;
  },
  async download(row, document, preview = false) {
    const user_id = owner(),
      session = captureSyncSession();
    const local = await db.finance_receipt_files
      .where("document_id")
      .equals(document.id)
      .and((f) => f.user_id === user_id)
      .first();
    if (local?.blob) return local.blob;
    if (!online()) throw new Error("Baixe este original enquanto estiver online para consultá-lo offline.");
    const { data } = await api.get(`/finance/receipts/${row.id}/documents/${document.id}`, {
      responseType: "blob",
      params: preview ? { preview: "1" } : {},
    });
    assertSyncSession(session);
    await db.finance_receipt_files.put({
      local_key: `download:${user_id}:${document.id}`,
      user_id,
      receipt_local_key: row.local_key,
      document_id: document.id,
      blob: data,
      name: document.file_name,
      uploaded: true,
    });
    return data;
  },
  async thumbnail(row, document) {
    owner();
    const session = captureSyncSession();
    const { data } = await api.get(`/finance/receipts/${row.id}/documents/${document.id}`, {
      responseType: "blob",
      params: { preview: "thumbnail" },
    });
    assertSyncSession(session);
    return data;
  },
  async queueImports(rows) {
    const user_id = owner();
    for (const row of rows) {
      const normalized = String(row.description || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      const bytes = new TextEncoder().encode(
        [row.transaction_date, row.type, Math.round(Number(row.amount) * 100), normalized].join("|"),
      );
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const client_id = `${user_id}:${row.client_id || `csv:${digest}`}`;
      const payload = { ...row, client_id };
      await db.transaction("rw", db.finance_import_entries, db.syncQueue, async () => {
        const existing = await db.finance_import_entries.get(client_id);
        if (existing?.user_id === user_id && existing.state !== "PENDING") return;
        await db.finance_import_entries.put({ client_id, user_id, payload, state: "PENDING" });
        await syncQueueRepository.addSyncQueueTask({
          type: "IMPORT_FINANCE_TRANSACTION",
          payload: { user_id, ...payload },
          idempotency_key: client_id,
          compact_key: `import:${user_id}:${client_id}`,
        });
      });
    }
  },
};
