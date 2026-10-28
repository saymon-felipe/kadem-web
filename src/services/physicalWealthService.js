import { api } from "@/plugins/api";
import { db } from "@/db";
import { useAuthStore } from "@/stores/auth";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";

const owner = () => {
  const id = Number(useAuthStore().user?.id);
  if (!id) throw new Error("Entre novamente para acessar o patrimônio físico.");
  return id;
};
const read = async (path = "", params = {}) => {
  const user = owner(),
    current = captureSyncSession();
  const key = `${path}:${JSON.stringify(params)}`;
  try {
    const { data } = await api.get(`/finance/physical${path}`, { params });
    assertSyncSession(current);
    if (
      (path === "" && (!data?.summary || !Array.isArray(data.wallets) || !Array.isArray(data.holdings))) ||
      (path !== "" && !Array.isArray(data))
    )
      throw new Error("Resposta patrimonial inválida.");
    const saved_at = new Date().toISOString();
    await db.transaction("rw", db.finance_physical_cache, async () => {
      assertSyncSession(current);
      await db.finance_physical_cache.put({ user_id: user, key, data, saved_at });
    });
    return { data, offline: false, saved_at };
  } catch (error) {
    assertSyncSession(current);
    // Authentication, authorization and validation failures must stay visible.
    if (error.response && error.response.status < 500) throw error;
    const cached = await db.finance_physical_cache.get([user, key]);
    assertSyncSession(current);
    if (!cached) throw error;
    return { data: cached.data, offline: true, saved_at: cached.saved_at };
  }
};
const write = async (method, path, data) => {
  const user = owner(),
    current = captureSyncSession();
  const result = await api[method](`/finance/physical${path}`, data, {
    headers: { "X-Expected-User-Id": String(user) },
  });
  assertSyncSession(current);
  // Keep offline snapshots until a successful pull replaces them.
  await db.transaction("rw", db.finance_physical_cache, async () => {
    assertSyncSession(current);
    await db.finance_physical_cache.where("user_id").equals(user).modify({ stale: true });
  });
  return result;
};
export const physicalWealthService = {
  overview: () => read(),
  operations: (params) => read("/operations", params),
  ledger: (params) => read("/ledger", params),
  flows: (params) => read("/flows", params),
  reports: (params) => read("/reports", params),
  transactions: (params) => read("/transactions", params),
  audit: (id) => read(`/transactions/${id}/audit`),
  createWallet: (data) => write("post", "/wallets", data),
  createOperation: (data) => write("post", "/operations", data),
  setOperationCategory: (id, data) => write("put", `/operations/${id}/category`, data),
  allocateCash: (id, data) => write("put", `/transactions/${id}/cash`, data),
  refreshQuotes: () => write("post", "/quotes/refresh", {}),
};
