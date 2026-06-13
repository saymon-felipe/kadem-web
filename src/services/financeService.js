import { api } from "@/plugins/api";
import { financeRepository, syncQueueRepository } from "@/services/localData";
import { syncService } from "@/services/syncService";

const response = (data) => ({ data });
const enqueue = async (type, payload) => {
  await syncQueueRepository.addSyncQueueTask({
    type,
    payload,
    timestamp: Date.now(),
  });
  await syncService.processSyncQueue();
};

const localDashboard = async (month) => {
  const transactions = await financeRepository.getTransactions({ month });
  const categories = await financeRepository.getCategories();
  const categoryMap = new Map(categories.map((category) => [Number(category.id || category.local_id), category]));
  const visible = transactions.filter((item) => !item.is_ignored);
  const totals = visible.reduce(
    (acc, item) => {
      const amount = Number(item.amount || 0);
      if (item.type === "INCOME") acc.income += amount;
      else acc.expense += amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 },
  );
  const byMacro = new Map();
  visible
    .filter((item) => item.type === "EXPENSE")
    .forEach((item) => {
      const category = categoryMap.get(Number(item.category_id));
      const name = category?.macro_category || "Geral";
      const current = byMacro.get(name) || {
        macro_category: name,
        color: category?.macro_color || category?.color || "#999999",
        total: 0,
      };
      current.total += Number(item.amount || 0);
      byMacro.set(name, current);
    });
  return {
    totals,
    recent_transactions: transactions.slice(0, 20),
    macro_distribution: [...byMacro.values()],
  };
};

export const financeService = {
  async getDashboard(params = {}) {
    try {
      const result = await api.get("/finance/dashboard", { params });
      if (Array.isArray(result.data?.recent_transactions)) {
        await financeRepository.setTransactions(result.data.recent_transactions);
      }
      return result;
    } catch {
      return response(await localDashboard(params.month));
    }
  },

  async listTransactions(params = {}) {
    try {
      const result = await api.get("/finance/transactions", { params });
      await financeRepository.setTransactions(result.data || []);
      return result;
    } catch {
      return response(await financeRepository.getTransactions(params));
    }
  },

  async createTransaction(data) {
    const local = await financeRepository.createLocalTransaction(data);
    await enqueue("CREATE_FINANCE_TRANSACTION", { local_id: local.local_id, data });
    return response(local);
  },

  async createTransactionsBatch(transactions) {
    const cleanTransactions = transactions.map((item) => JSON.parse(JSON.stringify(item)));
    const local = await financeRepository.createLocalTransactionsBatch(cleanTransactions);
    await enqueue("CREATE_FINANCE_TRANSACTIONS_BATCH", {
      local_ids: local.map((item) => item.local_id),
      transactions: cleanTransactions,
    });
    return response(local);
  },


  async updateTransaction(id, data) {
    const local = await financeRepository.updateLocalTransaction(id, data);
    await enqueue("UPDATE_FINANCE_TRANSACTION", { id, local_id: local?.local_id, data });
    return response(local);
  },

  async deleteTransaction(id) {
    const local = await financeRepository.deleteLocalTransaction(id);
    if (local?.id) await enqueue("DELETE_FINANCE_TRANSACTION", { id: local.id, server_id: local.id });
    return response(null);
  },

  async getCategories() {
    try {
      const result = await api.get("/finance/categories");
      await financeRepository.setCategories(result.data || []);
      return result;
    } catch {
      return response(await financeRepository.getCategories());
    }
  },

  async getMacroCategories() {
    try {
      const result = await api.get("/finance/macro-categories");
      await financeRepository.setMacroCategories(result.data || []);
      return result;
    } catch {
      return response(await financeRepository.getMacroCategories());
    }
  },

  async createMacroCategory(data) {
    const local = await financeRepository.createLocalMacroCategory(data);
    await enqueue("CREATE_FINANCE_MACRO_CATEGORY", { local_id: local.local_id, data });
    return response(local);
  },

  async updateMacroCategory(id, data) {
    const local = await financeRepository.updateLocalMacroCategory(id, data);
    await enqueue("UPDATE_FINANCE_MACRO_CATEGORY", { id, local_id: local?.local_id, data });
    return response(local);
  },

  async deleteMacroCategory(id) {
    const local = await financeRepository.deleteLocalMacroCategory(id);
    if (local?.id) await enqueue("DELETE_FINANCE_MACRO_CATEGORY", { id: local.id, server_id: local.id });
    return response(null);
  },

  async createCategory(data) {
    const local = await financeRepository.createLocalCategory(data);
    await enqueue("CREATE_FINANCE_CATEGORY", { local_id: local.local_id, data });
    return response(local);
  },

  async updateCategory(id, data) {
    const local = await financeRepository.updateLocalCategory(id, data);
    await enqueue("UPDATE_FINANCE_CATEGORY", { id, local_id: local?.local_id, data });
    return response(local);
  },

  async deleteCategory(id) {
    const local = await financeRepository.deleteLocalCategory(id);
    if (local?.id) await enqueue("DELETE_FINANCE_CATEGORY", { id: local.id, server_id: local.id });
    return response(null);
  },

  async getBudgets(params = {}) {
    try {
      const result = await api.get("/finance/budgets", { params });
      await financeRepository.setBudgetGroups(params.month, result.data || []);
      return result;
    } catch {
      return response(await financeRepository.getBudgetGroups(params.month));
    }
  },

  async saveBudgets(data) {
    const local = await financeRepository.replaceLocalBudgetGroups(data.month, data.groups || []);
    await enqueue("SAVE_FINANCE_BUDGETS", { month: data.month, groups: data.groups || [] });
    return response(local);
  },

  getConnectToken() {
    return api.post("/finance/open-finance/connect-token");
  },
  async getConnections() {
    try {
      const result = await api.get("/finance/open-finance/connections");
      await financeRepository.setConnections(result.data || []);
      return result;
    } catch {
      return response(await financeRepository.getConnections());
    }
  },
  saveConnection(data) {
    return api.post("/finance/open-finance/connections", data);
  },
  deleteConnection(itemId) {
    return api.delete(`/finance/open-finance/connections/${itemId}`);
  },
  syncConnections(data = {}) {
    return api.post("/finance/open-finance/sync", data);
  },
  autoCategorize(data = {}) {
    return api.post("/finance/ai/categorize", data);
  },
  generateBudgetPlan(data) {
    return api.post("/finance/ai/budget-plan", data);
  },
  getInsights(params) {
    return api.get("/finance/ai/insights", { params });
  },
  getUsage() {
    return api.get("/finance/ai/usage");
  },
  analyzeCsvSchema(data) {
    return api.post("/finance/ai/analyze-csv-schema", data);
  },
};
