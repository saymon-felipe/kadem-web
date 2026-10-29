import { db } from "@/db";
import { healthRepository } from "./localData/healthRepository";
import { financeRepository } from "./localData/financeRepository";
import { requireSyncArray } from "@/utils/syncState";
import { createPersonalSyncExecutor } from "./personalSyncExecutor";
import { syncQueueRepository } from "./localData/syncQueueRepository";

export const BACKGROUND_TAG = "kadem-personal-sync";
export async function backgroundPull() {
  const config = await db.background_settings.get("current");
  if (!config?.background_sync) return;
  if (Date.now() - Number(config.last_sync || 0) < 900000 && !(await db.syncQueue.count())) return;
  const get = async (path) => {
    const response = await fetch(config.api + path, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Background sync: ${response.status}`);
    return response.json();
  };
  // Verify the current cookie against the owner before touching account-scoped data.
  const state = await get("/notifications");
  if (String(state.user_id) !== String(config.user_id)) return;
  const current = await db.background_settings.get("current");
  if (current?.generation !== config.generation) return;
  await db.background_settings.put({ ...config, notifications: state.notifications });
  let csrf;
  let activeTask;
  const request = async (method, path, data, options = {}) => {
    if ((await db.background_settings.get("current"))?.generation !== config.generation)
      throw new Error("Sessão alterada");
    if (!csrf) csrf = (await get("/auth/csrf")).csrf_token;
    const response = await fetch(config.api + path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, ...options.headers },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const e = new Error(`Sync: ${response.status}`);
      e.response = { status: response.status };
      throw e;
    }
    if ((await db.background_settings.get("current"))?.generation !== config.generation)
      throw new Error("Sessão alterada");
    const result = response.status === 204 ? null : await response.json();
    const queued = activeTask && await db.syncQueue.get(activeTask.id);
    if (activeTask && (!queued || queued.idempotency_key !== activeTask.idempotency_key))
      throw new Error('NOT_SYNCED: a edição local mudou durante o envio');
    return { data: result };
  };
  const executor = createPersonalSyncExecutor({
    api: {
      post: (p, d, o) => request("POST", p, d, o),
      put: (p, d) => request("PUT", p, d),
      delete: (p, o) => request("DELETE", p, o?.data),
    },
    getUserId: () => config.user_id,
    syncReceipt: () => {
      throw new Error("NOT_SYNCED: processamento de documentos ao abrir o app");
    },
  });
  const priority = {
    CREATE_FINANCE_MACRO_CATEGORY: 1,
    CREATE_FINANCE_CATEGORY: 2,
    CREATE_FINANCE_CREDIT_CARD: 2,
    CREATE_FINANCE_INVESTMENT_GOAL: 2,
    CREATE_FINANCE_TRANSACTION: 3,
    CREATE_FINANCE_TRANSACTIONS_BATCH: 3,
  };
  const tasks = (await syncQueueRepository.getPendingTasks())
    .filter((t) => t.type.includes("FINANCE") || t.type.includes("HEALTH"))
    .sort((a, b) => (priority[a.type] || 4) - (priority[b.type] || 4));
  for (const task of tasks.slice(0, 50)) {
    if (task.type === "SYNC_FINANCE_RECEIPT") continue;
    activeTask = task;
    try {
      await (task.type.includes("HEALTH") ? executor.health(task) : executor.finance(task));
      await syncQueueRepository.deleteTask(task.id);
    } catch (e) {
      if (e.message.includes("NOT_SYNCED")) continue;
      // Preserve queued data on authentication, validation or network failures.
      throw e;
    }
  }
  let cursor = await healthRepository.getSyncCursor(String(config.user_id));
  for (let page = 0; page < 10; page++) {
    const delta = await get(`/health/sync?cursor=${cursor}&limit=200`);
    requireSyncArray(delta.changes);
    if (
      !Number.isSafeInteger(delta.next_cursor) ||
      delta.next_cursor < cursor ||
      (delta.has_more && delta.next_cursor <= cursor)
    )
      throw new Error("Cursor inválido");
    if ((await db.background_settings.get("current"))?.generation !== config.generation) return;
    await healthRepository.applyServerChanges(String(config.user_id), delta.changes, delta.next_cursor);
    cursor = delta.next_cursor;
    if (!delta.has_more) break;
  }
  // These repository merges preserve local pending mutations. Avoid downloads while
  // deletes are queued, because those records no longer exist in the local tables.
  const pending = await db.syncQueue.count();
  if (!pending) {
    for (const [path, save] of [
      ["/finance/macro-categories", (items) => financeRepository.setMacroCategories(items)],
      ["/finance/categories", (items) => financeRepository.setCategories(items)],
    ]) {
      const items = await get(path);
      requireSyncArray(items);
      if ((await db.background_settings.get("current"))?.generation !== config.generation) return;
      if (!(await db.syncQueue.count())) await save(items);
    }
    let transactions = [],
      complete = false;
    for (let page = 0; page < 20; page++) {
      const items = await get(`/finance/transactions?limit=250&offset=${page * 250}`);
      requireSyncArray(items);
      transactions.push(...items);
      if (items.length < 250) {
        complete = true;
        break;
      }
    }
    if ((await db.background_settings.get("current"))?.generation !== config.generation) return;
    if (complete && !(await db.syncQueue.count())) await financeRepository.setTransactions(transactions);
    const investments = await get("/finance/investments");
    requireSyncArray(investments.goals);
    requireSyncArray(investments.events);
    if ((await db.background_settings.get("current"))?.generation !== config.generation) return;
    if (!(await db.syncQueue.count())) {
      await financeRepository.setInvestmentGoals(investments.goals);
      await financeRepository.setInvestmentEvents(investments.events);
    }
  }
  if ((await db.background_settings.get("current"))?.generation === config.generation)
    await db.background_settings.update("current", { last_sync: Date.now() });
}
