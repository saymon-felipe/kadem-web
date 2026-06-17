import { api } from "@/plugins/api";
import { financeRepository, syncQueueRepository } from "@/services/localData";
import { syncService } from "@/services/syncService";

const response = (data) => ({ data });
const isServerId = (id) => id !== null && id !== undefined && Number.isFinite(Number(id));
const sameId = (left, right) => String(left ?? "") === String(right ?? "");

const toPlain = (value, fallback = {}) => {
  if (value === undefined || value === null) return fallback;
  return JSON.parse(JSON.stringify(value));
};

const enqueue = async (type, payload) => {
  await syncQueueRepository.addSyncQueueTask({
    type,
    payload,
    timestamp: Date.now(),
  });
  await syncService.processSyncQueue();
};

const removePendingEntityTasks = async (tasks, types, localId) => {
  for (const task of tasks) {
    if (types.includes(task.type) && task.payload?.local_id === localId) {
      await syncQueueRepository.deleteTask(task.id);
    }
  }
};

const removeDeletedCategoryReferencesFromQueue = async (category) => {
  const tasks = await syncQueueRepository.getPendingTasks();
  await removePendingEntityTasks(tasks, ["CREATE_FINANCE_CATEGORY", "UPDATE_FINANCE_CATEGORY"], category.local_id);

  for (const task of tasks) {
    if (task.type === "CREATE_FINANCE_TRANSACTION" || task.type === "UPDATE_FINANCE_TRANSACTION") {
      if (sameId(task.payload?.data?.category_id, category.id)) {
        task.payload.data.category_id = null;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "CREATE_FINANCE_TRANSACTIONS_BATCH") {
      let changed = false;
      (task.payload?.transactions || []).forEach((transaction) => {
        if (sameId(transaction.category_id, category.id)) {
          transaction.category_id = null;
          changed = true;
        }
      });
      if (changed) {
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "SAVE_FINANCE_BUDGETS") {
      let changed = false;
      const groups = (task.payload?.groups || [])
        .map((group) => ({
          ...group,
          items: (group.items || []).filter((item) => {
            const keep = !sameId(item.category_id, category.id);
            if (!keep) changed = true;
            return keep;
          }),
        }))
        .filter((group) => group.items.length > 0);
      if (changed || groups.length !== (task.payload?.groups || []).length) {
        task.payload.groups = groups;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }
  }
};

const removeDeletedMacroReferencesFromQueue = async (macro) => {
  const tasks = await syncQueueRepository.getPendingTasks();
  await removePendingEntityTasks(tasks, ["CREATE_FINANCE_MACRO_CATEGORY", "UPDATE_FINANCE_MACRO_CATEGORY"], macro.local_id);

  for (const task of tasks) {
    if (task.type === "CREATE_FINANCE_CATEGORY" || task.type === "UPDATE_FINANCE_CATEGORY") {
      if (task.payload?.data?.macro_category === macro.name) {
        task.payload.data.macro_category = "Geral";
        task.payload.data.macro_color = "#999999";
        task.payload.data.color = "#999999";
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "SAVE_FINANCE_BUDGETS") {
      const groups = (task.payload?.groups || []).filter((group) => !sameId(group.macro_category_id, macro.id));
      if (groups.length !== (task.payload?.groups || []).length) {
        task.payload.groups = groups;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }
  }
};

const localDashboard = async (month) => {
  const transactions = await financeRepository.getTransactions({ month });
  const categories = await financeRepository.getCategories();
  const categoryMap = new Map(categories.map((category) => [String(category.id ?? category.local_id), category]));
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
      const category = categoryMap.get(String(item.category_id ?? ""));
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
    transactions: transactions.slice(0, 20),
    recent_transactions: transactions.slice(0, 20),
    macro_distribution: [...byMacro.values()],
  };
};

export const financeService = {
  async getDashboard(params = {}) {
    try {
      const result = await api.get("/finance/dashboard", { params });
      const recentTransactions = Array.isArray(result.data?.transactions)
        ? result.data.transactions
        : Array.isArray(result.data?.recent_transactions)
          ? result.data.recent_transactions
          : [];

      return response({
        ...result.data,
        transactions: recentTransactions,
        recent_transactions: recentTransactions,
      });
    } catch {
      return response(await localDashboard(params.month));
    }
  },

  async listTransactions(params = {}) {
    try {
      const result = await api.get("/finance/transactions", { params });
      await financeRepository.setTransactions(result.data || []);
      return response(await financeRepository.getTransactions(params));
    } catch {
      return response(await financeRepository.getTransactions(params));
    }
  },

  async createTransaction(data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.createLocalTransaction(cleanData);
    await enqueue("CREATE_FINANCE_TRANSACTION", { local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async createTransactionsBatch(transactions) {
    const cleanTransactions = toPlain(transactions, []);
    const local = await financeRepository.createLocalTransactionsBatch(cleanTransactions);
    await enqueue("CREATE_FINANCE_TRANSACTIONS_BATCH", {
      local_ids: local.map((item) => item.local_id),
      transactions: cleanTransactions,
    });
    return response(local);
  },


  async updateTransaction(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalTransaction(id, cleanData);
    await enqueue("UPDATE_FINANCE_TRANSACTION", { id, local_id: local?.local_id, data: cleanData });
    return response(local);
  },

  async deleteTransaction(id) {
    const local = await financeRepository.deleteLocalTransaction(id);
    if (local) {
      const isLocalOnly = !local.id || !Number.isFinite(Number(local.id));
      if (isLocalOnly) {
        const tasks = await syncQueueRepository.getPendingTasks();
        for (const task of tasks) {
          if (task.type === "CREATE_FINANCE_TRANSACTION" && task.payload?.local_id === local.local_id) {
            await syncQueueRepository.deleteTask(task.id);
          } else if (task.type === "UPDATE_FINANCE_TRANSACTION" && task.payload?.local_id === local.local_id) {
            await syncQueueRepository.deleteTask(task.id);
          } else if (task.type === "CREATE_FINANCE_TRANSACTIONS_BATCH" && task.payload?.local_ids) {
            const index = task.payload.local_ids.indexOf(local.local_id);
            if (index !== -1) {
              task.payload.local_ids.splice(index, 1);
              if (Array.isArray(task.payload.transactions)) {
                task.payload.transactions.splice(index, 1);
              }
              if (task.payload.local_ids.length === 0) {
                await syncQueueRepository.deleteTask(task.id);
              } else {
                await syncQueueRepository.updateTask(task.id, { payload: task.payload });
              }
            }
          }
        }
      } else {
        await enqueue("DELETE_FINANCE_TRANSACTION", { id: local.id, server_id: local.id, local_id: local.local_id });
      }
    }
    return response(null);
  },

  async getCategories() {
    try {
      const result = await api.get("/finance/categories");
      await financeRepository.setCategories(result.data || []);
      return response(await financeRepository.getCategories());
    } catch {
      return response(await financeRepository.getCategories());
    }
  },

  async getMacroCategories() {
    try {
      const result = await api.get("/finance/macro-categories");
      await financeRepository.setMacroCategories(result.data || []);
      return response(await financeRepository.getMacroCategories());
    } catch {
      return response(await financeRepository.getMacroCategories());
    }
  },

  async createMacroCategory(data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.createLocalMacroCategory(cleanData);
    await enqueue("CREATE_FINANCE_MACRO_CATEGORY", { local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async updateMacroCategory(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalMacroCategory(id, cleanData);
    await enqueue("UPDATE_FINANCE_MACRO_CATEGORY", { id, local_id: local?.local_id, data: cleanData });
    return response(local);
  },

  async deleteMacroCategory(id) {
    const local = await financeRepository.deleteLocalMacroCategory(id);
    if (local) {
      await removeDeletedMacroReferencesFromQueue(local);
      if (isServerId(local.id)) {
        await enqueue("DELETE_FINANCE_MACRO_CATEGORY", { id: local.id, server_id: local.id, local_id: local.local_id });
      }
    }
    return response(null);
  },

  async createCategory(data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.createLocalCategory(cleanData);
    await enqueue("CREATE_FINANCE_CATEGORY", { local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async updateCategory(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalCategory(id, cleanData);
    await enqueue("UPDATE_FINANCE_CATEGORY", { id, local_id: local?.local_id, data: cleanData });
    return response(local);
  },

  async deleteCategory(id) {
    const local = await financeRepository.deleteLocalCategory(id);
    if (local) {
      await removeDeletedCategoryReferencesFromQueue(local);
      if (isServerId(local.id)) {
        await enqueue("DELETE_FINANCE_CATEGORY", { id: local.id, server_id: local.id, local_id: local.local_id });
      }
    }
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
    const cleanData = toPlain(data, { groups: [] });
    const local = await financeRepository.replaceLocalBudgetGroups(cleanData.month, cleanData.groups || []);
    await enqueue("SAVE_FINANCE_BUDGETS", { month: cleanData.month, groups: cleanData.groups || [] });
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
  async getUsage() {
    try {
      return await api.get("/finance/ai/usage");
    } catch {
      return response({});
    }
  },
  analyzeCsvSchema(data) {
    return api.post("/finance/ai/analyze-csv-schema", data);
  },
};
