import { api } from "@/plugins/api";
import { financeRepository, syncQueueRepository } from "@/services/localData";
import { syncService } from "@/services/syncService";

const response = (data) => ({ data });
const FINANCE_BATCH_LIMIT = 100;
const isServerId = (id) => id !== null && id !== undefined && Number.isFinite(Number(id));
const sameId = (left, right) => String(left ?? "") === String(right ?? "");
const chunkItems = (items = [], size = FINANCE_BATCH_LIMIT) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};
const entityReferenceIds = (entity) =>
  [entity?.server_id, entity?.id, entity?.local_key].filter((value) => value !== null && value !== undefined);
const entityServerId = (...ids) => {
  const id = ids.find((value) => isServerId(value));
  return id === undefined ? null : Number(id);
};
const entityMatchesAnyServerId = (entity, ids) =>
  ids.some((id) => isServerId(id) && sameId(entityServerId(entity?.server_id, entity?.id), id));

const pendingDeleteServerIds = async (...types) => {
  const tasks = await syncQueueRepository.getPendingTasks();
  return tasks
    .filter((task) => types.includes(task.type))
    .flatMap((task) => [
      entityServerId(task.payload?.server_id, task.payload?.id),
      ...(task.payload?.related_ids || []).map((id) => entityServerId(id)),
    ])
    .filter((id) => id !== null);
};

const withoutPendingDeletes = (items = [], ids = []) => {
  if (!ids.length) return items;
  return items.filter((item) => !entityMatchesAnyServerId(item, ids));
};

const toPlain = (value, fallback = {}) => {
  if (value === undefined || value === null) return fallback;
  return JSON.parse(JSON.stringify(value));
};

const enqueue = async (type, payload) => {
  await syncQueueRepository.addSyncQueueTask({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
  await syncService.processSyncQueue();
};

const removePendingEntityTasks = async (tasks, types, localId) => {
  for (const task of tasks) {
    if (types.includes(task.type) && task.payload.local_id === localId) {
      await syncQueueRepository.deleteTask(task.id);
    }
  }
};

const removeDeletedCategoryReferencesFromQueue = async (category) => {
  const tasks = await syncQueueRepository.getPendingTasks();
  const deletedCategories = category.deleted_categories || [category];
  for (const deletedCategory of deletedCategories) {
    await removePendingEntityTasks(
      tasks,
      ["CREATE_FINANCE_CATEGORY", "UPDATE_FINANCE_CATEGORY"],
      deletedCategory.local_id,
    );
  }
  const deletedCategoryIds = deletedCategories.flatMap((deletedCategory) => entityReferenceIds(deletedCategory));

  for (const task of tasks) {
    if (task.type === "CREATE_FINANCE_TRANSACTION" || task.type === "UPDATE_FINANCE_TRANSACTION") {
      if (deletedCategoryIds.some((id) => sameId(task.payload.data.category_id, id))) {
        task.payload.data.category_id = null;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "CREATE_FINANCE_TRANSACTIONS_BATCH") {
      let changed = false;
      (task.payload.transactions || []).forEach((transaction) => {
        if (deletedCategoryIds.some((id) => sameId(transaction.category_id, id))) {
          transaction.category_id = null;
          changed = true;
        }
      });
      if (changed) {
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "SAVE_FINANCE_BUDGETS") {
      let changed = false;
      const groups = (task.payload.groups || [])
        .map((group) => ({
          ...group,
          items: (group.items || []).filter((item) => {
            const keep = !deletedCategoryIds.some((id) => sameId(item.category_id, id));
            if (!keep) changed = true;
            return keep;
          }),
        }))
        .filter((group) => group.items.length > 0);
      if (changed || groups.length !== (task.payload.groups || []).length) {
        task.payload.groups = groups;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }
  }
};

const removeDeletedMacroReferencesFromQueue = async (macro) => {
  const tasks = await syncQueueRepository.getPendingTasks();
  await removePendingEntityTasks(
    tasks,
    ["CREATE_FINANCE_MACRO_CATEGORY", "UPDATE_FINANCE_MACRO_CATEGORY"],
    macro.local_id,
  );
  const deletedMacroIds = entityReferenceIds(macro);

  for (const task of tasks) {
    if (task.type === "CREATE_FINANCE_CATEGORY" || task.type === "UPDATE_FINANCE_CATEGORY") {
      if (task.payload.data.macro_category === macro?.name) {
        task.payload.data.macro_category = "Geral";
        task.payload.data.macro_color = "#999999";
        task.payload.data.color = "#999999";
        task.payload.data.investment_flow_type = "STANDARD";
        task.payload.data.linked_investment_category_id = null;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    } else if (task.type === "SAVE_FINANCE_BUDGETS") {
      const groups = (task.payload.groups || []).filter(
        (group) => !deletedMacroIds.some((id) => sameId(group.macro_category_id, id)),
      );
      if (groups.length !== (task.payload.groups || []).length) {
        task.payload.groups = groups;
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }
  }
};

const findLocalMacro = (macros, id) => {
  if (!id) return null;
  return (
    macros.find((macro) => sameId(macro.id, id) || sameId(macro.local_id, id) || sameId(macro.local_key, id)) || null
  );
};

const preparePendingMacroUpdate = async (current, local, changes) => {
  if (!current || !local) return true;

  const tasks = await syncQueueRepository.getPendingTasks();
  const nextName = changes.name !== undefined ? changes.name : current.name;
  const nextColor = changes.color !== undefined ? changes.color : current.color;
  let shouldEnqueueUpdate = true;

  for (const task of tasks) {
    if (
      ["CREATE_FINANCE_MACRO_CATEGORY", "UPDATE_FINANCE_MACRO_CATEGORY"].includes(task.type) &&
      (sameId(task.payload.local_id, local.local_id) ||
        sameId(task.payload.id, current.id) ||
        sameId(task.payload.id, current.local_key))
    ) {
      if (task.type === "CREATE_FINANCE_MACRO_CATEGORY") {
        task.payload.data = { ...task.payload.data, ...changes };
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
        shouldEnqueueUpdate = false;
      } else {
        await syncQueueRepository.deleteTask(task.id);
      }
      continue;
    }

    if (["CREATE_FINANCE_CATEGORY", "UPDATE_FINANCE_CATEGORY"].includes(task.type) && task.payload.data) {
      if (sameId(task.payload.data.macro_category, current.name)) {
        task.payload.data.macro_category = nextName;
        task.payload.data.macro_color = nextColor || "#999999";
        task.payload.data.color = nextColor || "#999999";
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
      continue;
    }

    if (task.type === "SAVE_FINANCE_BUDGETS") {
      let changed = false;
      (task.payload.groups || []).forEach((group) => {
        if (
          sameId(group.macro_category_id, current.id) ||
          sameId(group.macro_category_id, current.local_key) ||
          sameId(group.macro_category, current.name)
        ) {
          group.macro_category_id = local.id || current.id || group.macro_category_id;
          group.macro_category = nextName;
          group.macro_color = nextColor || group.macro_color || "#999999";
          changed = true;
        }
      });
      if (changed) {
        await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }
  }

  return shouldEnqueueUpdate;
};

const localDashboard = async (month) => {
  const transactions = await financeRepository.getTransactions({ month });
  const categories = await financeRepository.getCategories();
  const macros = await financeRepository.getMacroCategories();
  const categoryMap = new Map(categories.map((category) => [String(category.id || category.local_id), category]));
  const macroMap = new Map(macros.map((macro) => [macro?.name, macro]));
  const visible = transactions.filter((item) => !item.is_ignored);
  const accountingVisible = visible.filter((item) => {
    const category = categoryMap.get(String(item.category_id || ""));
    return category?.investment_flow_type !== "INVESTMENT_OUT";
  });
  const totals = accountingVisible.reduce(
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
  accountingVisible
    .filter((item) => item.type === "EXPENSE")
    .forEach((item) => {
      const category = categoryMap.get(String(item.category_id || ""));
      const name = category?.macro_category || "Geral";
      const current = byMacro.get(name) || {
        macro_category: name,
        color: category?.macro_color || category?.color || "#999999",
        total: 0,
      };
      current.total += Number(item.amount || 0);
      byMacro.set(name, current);
    });
  const month_invested = visible
    .filter((item) => {
      const category = categoryMap.get(String(item.category_id || ""));
      return (
        Boolean(macroMap.get(category?.macro_category || "Geral")?.is_investment) &&
        category?.investment_flow_type === "INVESTMENT_IN"
      );
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const month_withdrawn = visible
    .filter((item) => {
      const category = categoryMap.get(String(item.category_id || ""));
      return (
        Boolean(macroMap.get(category?.macro_category || "Geral")?.is_investment) &&
        category?.investment_flow_type === "INVESTMENT_OUT"
      );
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    totals,
    transactions: transactions.slice(0, 20),
    recent_transactions: transactions.slice(0, 20),
    macro_distribution: [...byMacro.values()],
    investment_summary: {
      month_invested,
      month_withdrawn,
      month_net: Number((month_invested - month_withdrawn).toFixed(2)),
    },
  };
};

export const financeService = {
  async getDashboard(params = {}) {
    try {
      const result = await api.get("/finance/dashboard", { params });
      const recentTransactions = Array.isArray(result.data.transactions)
        ? result.data.transactions
        : Array.isArray(result.data.recent_transactions)
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

  async getInvestments(params = {}) {
    try {
      const result = await api.get("/finance/investments", { params });
      await financeRepository.setInvestmentGoals(result.data.goals || []);
      await financeRepository.setInvestmentEvents(result.data.events || []);
      return response(result.data);
    } catch {
      return response(await financeRepository.getInvestmentsSummary(params));
    }
  },

  async listTransactions(params = {}) {
    try {
      const requestedLimit = Number(params.limit || 0);
      const requestedOffset = Number(params.offset || 0);
      const chunkLimit = 250;

      let items = [];

      if (requestedLimit > chunkLimit) {
        let offset = requestedOffset;
        let remaining = requestedLimit;

        while (remaining > 0) {
          const currentLimit = Math.min(chunkLimit, remaining);
          const result = await api.get("/finance/transactions", {
            params: {
              ...params,
              limit: currentLimit,
              offset,
            },
          });
          const chunkItems = Array.isArray(result.data) ? result.data : [];
          items = items.concat(chunkItems);

          if (chunkItems.length < currentLimit) {
            break;
          }

          offset += currentLimit;
          remaining -= currentLimit;
        }
      } else {
        const result = await api.get("/finance/transactions", { params });
        items = Array.isArray(result.data) ? result.data : [];
      }

      await financeRepository.setTransactions(items);
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
    const localIds = local.map((item) => item.local_id);
    const transactionChunks = chunkItems(cleanTransactions);
    const localIdChunks = chunkItems(localIds);

    for (let index = 0; index < transactionChunks.length; index += 1) {
      await enqueue("CREATE_FINANCE_TRANSACTIONS_BATCH", {
        local_ids: localIdChunks[index] || [],
        transactions: transactionChunks[index] || [],
      });
    }
    return response(local);
  },

  async updateTransaction(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalTransaction(id, cleanData);
    await enqueue("UPDATE_FINANCE_TRANSACTION", { id, local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async deleteTransaction(id) {
    const local = await financeRepository.deleteLocalTransaction(id);
    if (local) {
      const isLocalOnly = !local.id || !Number.isFinite(Number(local.id));
      if (isLocalOnly) {
        const tasks = await syncQueueRepository.getPendingTasks();
        for (const task of tasks) {
          if (task.type === "CREATE_FINANCE_TRANSACTION" && task.payload.local_id === local.local_id) {
            await syncQueueRepository.deleteTask(task.id);
          } else if (task.type === "UPDATE_FINANCE_TRANSACTION" && task.payload.local_id === local.local_id) {
            await syncQueueRepository.deleteTask(task.id);
          } else if (task.type === "CREATE_FINANCE_TRANSACTIONS_BATCH" && task.payload.local_ids) {
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
        await enqueue("DELETE_FINANCE_TRANSACTION", {
          id: local.id,
          server_id: local.id,
          local_id: local.local_id,
        });
      }
    }
    return response(null);
  },

  async getCategories() {
    try {
      const result = await api.get("/finance/categories");
      const deletedIds = await pendingDeleteServerIds("DELETE_FINANCE_CATEGORY");
      await financeRepository.setCategories(withoutPendingDeletes(result.data || [], deletedIds));
      return response(await financeRepository.getCategories());
    } catch {
      return response(await financeRepository.getCategories());
    }
  },

  async getMacroCategories() {
    try {
      const result = await api.get("/finance/macro-categories");
      const deletedIds = await pendingDeleteServerIds("DELETE_FINANCE_MACRO_CATEGORY");
      await financeRepository.setMacroCategories(withoutPendingDeletes(result.data || [], deletedIds));
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
    const current = findLocalMacro(await financeRepository.getMacroCategories(), id);
    const local = await financeRepository.updateLocalMacroCategory(id, cleanData);
    if (!local) throw new Error("Macro categoria local não encontrada.");
    const shouldEnqueueUpdate = await preparePendingMacroUpdate(current, local, cleanData);
    if (shouldEnqueueUpdate) {
      await enqueue("UPDATE_FINANCE_MACRO_CATEGORY", {
        id,
        local_id: local.local_id,
        data: cleanData,
      });
    } else {
      await syncService.processSyncQueue();
    }
    return response(local);
  },

  async deleteMacroCategory(id) {
    const requestedServerId = entityServerId(id);
    const local = await financeRepository.deleteLocalMacroCategory(id);
    if (local) {
      await removeDeletedMacroReferencesFromQueue(local);
      const serverId = requestedServerId || entityServerId(local.id, local.server_id);
      if (serverId) {
        await enqueue("DELETE_FINANCE_MACRO_CATEGORY", {
          id: serverId,
          server_id: serverId,
          local_id: local.local_id,
        });
      }
    } else if (requestedServerId) {
      await enqueue("DELETE_FINANCE_MACRO_CATEGORY", {
        id: requestedServerId,
        server_id: requestedServerId,
        local_id: null,
      });
    }
    return response(null);
  },

  async createInvestmentGoal(data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.createLocalInvestmentGoal(cleanData);
    await enqueue("CREATE_FINANCE_INVESTMENT_GOAL", { local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async updateInvestmentGoal(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalInvestmentGoal(id, cleanData);
    await enqueue("UPDATE_FINANCE_INVESTMENT_GOAL", {
      id,
      local_id: local.local_id,
      data: cleanData,
    });
    return response(local);
  },

  async deleteInvestmentGoal(id) {
    const local = await financeRepository.archiveLocalInvestmentGoal(id);
    if (local) {
      const isLocalOnly = !local.id || !Number.isFinite(Number(local.id));
      if (isLocalOnly) {
        const tasks = await syncQueueRepository.getPendingTasks();
        await removePendingEntityTasks(
          tasks,
          ["CREATE_FINANCE_INVESTMENT_GOAL", "UPDATE_FINANCE_INVESTMENT_GOAL"],
          local.local_id,
        );
      } else {
        await enqueue("DELETE_FINANCE_INVESTMENT_GOAL", {
          id: local.id,
          server_id: local.id,
          local_id: local.local_id,
        });
      }
    }
    return response(null);
  },

  async createInvestmentEvent(data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.createLocalInvestmentEvent(cleanData);
    await enqueue("CREATE_FINANCE_INVESTMENT_EVENT", { local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async updateInvestmentEvent(id, data) {
    const cleanData = toPlain(data);
    const local = await financeRepository.updateLocalInvestmentEvent(id, cleanData);
    await enqueue("UPDATE_FINANCE_INVESTMENT_EVENT", {
      id,
      local_id: local.local_id,
      data: cleanData,
    });
    return response(local);
  },

  async deleteInvestmentEvent(id) {
    const local = await financeRepository.deleteLocalInvestmentEvent(id);
    if (local) {
      const isLocalOnly = !local.id || !Number.isFinite(Number(local.id));
      if (isLocalOnly) {
        const tasks = await syncQueueRepository.getPendingTasks();
        await removePendingEntityTasks(
          tasks,
          ["CREATE_FINANCE_INVESTMENT_EVENT", "UPDATE_FINANCE_INVESTMENT_EVENT"],
          local.local_id,
        );
      } else {
        await enqueue("DELETE_FINANCE_INVESTMENT_EVENT", {
          id: local.id,
          server_id: local.id,
          local_id: local.local_id,
        });
      }
    }
    return response(null);
  },

  async getInvestmentRates(params = {}) {
    try {
      const result = await api.get("/finance/investments/rates", { params });
      return response(result.data);
    } catch {
      return response({ updated_at: new Date().toISOString(), rates: [] });
    }
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
    await enqueue("UPDATE_FINANCE_CATEGORY", { id, local_id: local.local_id, data: cleanData });
    return response(local);
  },

  async deleteCategory(id) {
    const requestedServerId = entityServerId(id);
    const local = await financeRepository.deleteLocalCategory(id);
    if (local) {
      await removeDeletedCategoryReferencesFromQueue(local);
      const serverId = requestedServerId || entityServerId(local.id, local.server_id);
      const relatedIds = (local.deleted_categories || [])
        .map((category) => entityServerId(category.server_id, category.id))
        .filter((relatedId) => relatedId && relatedId !== serverId);
      if (serverId) {
        await enqueue("DELETE_FINANCE_CATEGORY", {
          id: serverId,
          server_id: serverId,
          local_id: local.local_id,
          related_ids: [...new Set(relatedIds)],
        });
      }
    } else if (requestedServerId) {
      await enqueue("DELETE_FINANCE_CATEGORY", {
        id: requestedServerId,
        server_id: requestedServerId,
        local_id: null,
      });
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
    await enqueue("SAVE_FINANCE_BUDGETS", {
      month: cleanData.month,
      groups: cleanData.groups || [],
    });
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
