import { db } from "@/db";
import { syncQueueRepository } from "./localData/syncQueueRepository";
import { financeRepository } from "./localData/financeRepository";
import { healthRepository } from "./localData/healthRepository";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";
import { clampToMacroTone } from "@/utils/colorTones";
const FINANCE_BATCH_LIMIT = 100;
export function createPersonalSyncExecutor({ api, getUserId, syncReceipt }) {
  const sanitizeTransactionPayload = (data) => {
    if (!data) return {};
    const allowedKeys = [
      "payment_method",
      "credit_card_id",
      "cash_amount",
      "client_id",
      "description",
      "observation",
      "amount",
      "type",
      "category_id",
      "goal_id",
      "transaction_date",
      "status",
      "source",
      "is_ignored",
    ];
    const clean = {};
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) {
        clean[key] = data[key];
      }
    });
    return clean;
  };

  const sanitizeCategoryPayload = (data) => {
    if (!data) return {};
    const allowedKeys = [
      "macro_category",
      "macro_color",
      "name",
      "type",
      "icon",
      "color",
      "investment_flow_type",
      "linked_investment_category_id",
    ];
    const clean = {};
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) {
        if (key === "linked_investment_category_id") {
          const numeric = Number(data[key]);
          if (Number.isFinite(numeric)) clean[key] = numeric;
        } else {
          clean[key] = data[key];
        }
      }
    });
    return clean;
  };

  const sanitizeMacroCategoryPayload = (data) => {
    if (!data) return {};
    const allowedKeys = ["name", "color", "is_investment"];
    const clean = {};
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) {
        clean[key] = data[key];
      }
    });
    return clean;
  };

  const remapQueuedFinanceCategoryReferences = async (currentCategory, serverCategoryId) => {
    if (!currentCategory || !serverCategoryId) return;

    const temporaryIds = new Set(
      [currentCategory.id, currentCategory.local_key]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value)),
    );
    if (!temporaryIds.size) return;

    const tasks = await syncQueueRepository.getPendingTasks();
    for (const task of tasks) {
      let changed = false;

      if (["CREATE_FINANCE_TRANSACTION", "UPDATE_FINANCE_TRANSACTION"].includes(task.type)) {
        const data = task.payload?.data;
        if (data && temporaryIds.has(String(data.category_id ?? ""))) {
          data.category_id = serverCategoryId;
          changed = true;
        }
      }

      if (task.type === "CREATE_FINANCE_TRANSACTIONS_BATCH") {
        for (const transaction of task.payload?.transactions || []) {
          if (temporaryIds.has(String(transaction.category_id ?? ""))) {
            transaction.category_id = serverCategoryId;
            changed = true;
          }
        }
      }

      if (changed) await syncQueueRepository.updateTask(task.id, { payload: task.payload });
    }
  };

  const updateFinanceLocalRecord = async (table, localId, serverData) => {
    if (!localId || !serverData) return;
    const current = await db[table].get(localId);
    await db[table].update(localId, {
      ...serverData,
      pending_sync: false,
      updated_at: serverData.updated_at || new Date().toISOString(),
    });

    if (table === "finance_credit_cards" && current && serverData.id) {
      const refs = new Set([current.id, current.local_key].filter(Boolean).map(String));
      const rows = await db.finance_transactions.filter((t) => refs.has(String(t.credit_card_id))).toArray();
      await Promise.all(rows.map((t) => db.finance_transactions.update(t.local_id, { credit_card_id: serverData.id })));
      const tasks = await syncQueueRepository.getPendingTasks();
      for (const task of tasks) {
        let changed = false;
        for (const data of [task.payload?.data, ...(task.payload?.transactions || [])].filter(Boolean)) {
          if (refs.has(String(data.credit_card_id))) {
            data.credit_card_id = serverData.id;
            changed = true;
          }
        }
        if (changed) await syncQueueRepository.updateTask(task.id, { payload: task.payload });
      }
    }

    if (table === "finance_categories" && current.id && serverData.id) {
      const transactions = await db.finance_transactions.where("category_id").equals(current.id).toArray();
      if (transactions.length) {
        await Promise.all(
          transactions.map((transaction) =>
            db.finance_transactions.update(transaction.local_id, {
              category_id: serverData.id,
              updated_at: transaction.updated_at || new Date().toISOString(),
            }),
          ),
        );
      }

      const budgets = await db.finance_budgets.where("category_id").equals(current.id).toArray();
      if (budgets.length) {
        await Promise.all(
          budgets.map((budget) =>
            db.finance_budgets.update(budget.local_id, {
              category_id: serverData.id,
              updated_at: budget.updated_at || new Date().toISOString(),
            }),
          ),
        );
      }

      const linkedCategories = await db.finance_categories
        .where("linked_investment_category_id")
        .equals(current.id)
        .toArray();
      if (linkedCategories.length) {
        await Promise.all(
          linkedCategories.map((category) =>
            db.finance_categories.update(category.local_id, {
              linked_investment_category_id: serverData.id,
              updated_at: category.updated_at || new Date().toISOString(),
            }),
          ),
        );
      }

      await remapQueuedFinanceCategoryReferences(current, serverData.id);
    }

    if (table === "finance_macro_categories" && current.id && serverData.id) {
      const budgetGroups = await db.finance_budget_groups.where("macro_category_id").equals(current.id).toArray();
      if (budgetGroups.length) {
        await Promise.all(
          budgetGroups.map((group) =>
            db.finance_budget_groups.update(group.local_id, {
              macro_category_id: serverData.id,
              updated_at: group.updated_at || new Date().toISOString(),
            }),
          ),
        );
      }

      const categories = await db.finance_categories.where("macro_category").equals(current.name).toArray();
      if (categories.length) {
        await Promise.all(
          categories.map((category) => {
            const targetMacroColor = serverData.color || category.macro_color || "#999999";
            return db.finance_categories.update(category.local_id, {
              macro_category: serverData.name || current.name,
              macro_category_id: serverData.id,
              macro_color: targetMacroColor,
              color: category.color ? clampToMacroTone(category.color, targetMacroColor) : targetMacroColor,
              ...(serverData.is_investment && category.investment_flow_type !== "INVESTMENT_OUT"
                ? { type: "EXPENSE" }
                : {}),
              pending_sync: false,
              updated_at: new Date().toISOString(),
            });
          }),
        );
      }
    }

    if (table === "finance_investment_events" && current.category_id && serverData.category_id) {
      await db.finance_investment_events.update(localId, {
        category_id: serverData.category_id,
        pending_sync: false,
        updated_at: serverData.updated_at || new Date().toISOString(),
      });
    }
  };

  const deleteFinanceLocalRecord = async (table, payload = {}) => {
    if (payload.local_id) {
      const current = await db[table].get(payload.local_id);
      if (current) {
        await db[table].delete(payload.local_id);
        return;
      }
    }

    const id = payload.server_id || payload.id;
    if (!id) return;

    const numeric = Number(id);
    const current = Number.isFinite(numeric)
      ? await db[table].where("id").equals(numeric).first()
      : await db[table].where("local_key").equals(id).first();

    if (current?.local_id) {
      await db[table].delete(current.local_id);
    }
  };

  const resolveFinanceServerId = async (table, payload) => {
    if (payload.server_id && Number.isFinite(Number(payload.server_id))) return Number(payload.server_id);
    if (payload.id && Number.isFinite(Number(payload.id))) return Number(payload.id);
    if (!payload.local_id) throw new Error(`FINANCE_NOT_SYNCED: ${table} sem ID local`);
    const row = await db[table].get(payload.local_id);
    if (row.id && Number.isFinite(Number(row.id))) return Number(row.id);
    throw new Error(`FINANCE_NOT_SYNCED: aguardando ID do servidor para ${table} local ${payload.local_id}`);
  };

  const resolveFinanceEntityId = async (table, id) => {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) return numeric;
    const row = await db[table].where("local_key").equals(id).first();
    if (row.id && Number.isFinite(Number(row.id))) return Number(row.id);
    throw new Error(`FINANCE_NOT_SYNCED: aguardando ID do servidor para ${table} ${id}`);
  };

  const resolveBudgetGroupsForServer = async (groups = []) => {
    const resolved = [];
    for (const group of groups) {
      const macroId = await resolveFinanceEntityId("finance_macro_categories", group.macro_category_id);
      const items = [];
      for (const item of group.items || []) {
        const categoryId = await resolveFinanceEntityId("finance_categories", item.category_id);
        items.push({
          category_id: categoryId,
          amount: Number(item.amount || 0),
          type: item.type || "EXPENSE",
        });
      }
      resolved.push({
        macro_category_id: macroId,
        planned_amount: Number(group.planned_amount || 0),
        items,
      });
    }
    return resolved;
  };

  // Meta criada offline so tem id depois do sync. Meta removida antes disso nunca vai existir no
  // servidor: o aporte segue sem meta em vez de ficar esperando para sempre.
  const resolveGoalReferenceForServer = async (goalId) => {
    const numeric = Number(goalId);
    if (Number.isFinite(numeric)) return numeric;

    const row = await db.finance_investment_goals.where("local_key").equals(goalId).first();
    if (!row || row.is_archived) return null;
    if (row.id && Number.isFinite(Number(row.id))) return Number(row.id);
    throw new Error(`FINANCE_NOT_SYNCED: aguardando ID do servidor para finance_investment_goals ${goalId}`);
  };

  const resolveTransactionPayloadForServer = async (data) => {
    const cleanData = sanitizeTransactionPayload(data);
    if (cleanData.credit_card_id)
      cleanData.credit_card_id = await resolveFinanceEntityId("finance_credit_cards", cleanData.credit_card_id);
    if (cleanData.category_id) {
      cleanData.category_id = await resolveFinanceEntityId("finance_categories", cleanData.category_id);
    }
    if (cleanData.goal_id) {
      const goalId = await resolveGoalReferenceForServer(cleanData.goal_id);
      if (goalId) cleanData.goal_id = goalId;
      else delete cleanData.goal_id;
    }
    return cleanData;
  };

  const sanitizeInvestmentGoalPayload = (data) => {
    if (!data) return {};
    const allowedKeys = ["name", "horizon", "target_amount", "target_date", "current_amount", "color"];
    const clean = {};
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) clean[key] = data[key];
    });
    return clean;
  };

  const sanitizeInvestmentEventPayload = (data) => {
    if (!data) return {};
    const allowedKeys = ["category_id", "event_type", "description", "amount", "event_date", "notes"];
    const clean = {};
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) clean[key] = data[key];
    });
    return clean;
  };

  const resolveInvestmentEventPayloadForServer = async (data) => {
    const cleanData = sanitizeInvestmentEventPayload(data);
    if (cleanData.category_id) {
      cleanData.category_id = await resolveFinanceEntityId("finance_categories", cleanData.category_id);
    }
    return cleanData;
  };

  async function _handleFinanceTask(task) {
    const { payload } = task;

    switch (task.type) {
      case "SYNC_FINANCE_RECEIPT": {
        await syncReceipt(payload);
        return;
      }
      case "IMPORT_FINANCE_TRANSACTION": {
        const session = captureSyncSession();
        const { user_id, ...data } = payload;
        if (user_id !== getUserId()) throw new Error("NOT_SYNCED: aguardando a conta proprietária da importação.");
        const cleanData = await resolveTransactionPayloadForServer(data);
        cleanData.client_id = data.client_id;
        const result = await api.post("/finance/transaction-imports", cleanData, {
          headers: { "X-Expected-User-Id": String(user_id) },
        });
        assertSyncSession(session);
        if (result.data.client_id !== data.client_id) throw new Error("Resposta de importação incompatível.");
        await db.finance_import_entries.update(data.client_id, { state: result.data.state, result: result.data });
        if (result.data.transaction) {
          const existing = await db.finance_transactions.where("id").equals(result.data.transaction.id).first();
          if (!existing?.pending_sync) {
            if (existing) await db.finance_transactions.update(existing.local_id, result.data.transaction);
            else await db.finance_transactions.add({ ...result.data.transaction, pending_sync: false });
          }
        }
        return;
      }
      case "CREATE_FINANCE_CREDIT_CARD":
      case "UPDATE_FINANCE_CREDIT_CARD": {
        const creating = task.type === "CREATE_FINANCE_CREDIT_CARD";
        const id = creating ? null : await resolveFinanceServerId("finance_credit_cards", payload);
        const keys = ["client_id", "name", "bank", "last_four", "brand", "credit_limit", "is_archived", "is_primary"];
        const data = Object.fromEntries(
          keys
            .filter((k) => payload.data[k] !== undefined && (!creating || k !== "is_archived"))
            .map((k) => [k, payload.data[k]]),
        );
        const result = creating
          ? await api.post("/finance/credit-cards", data)
          : await api.put(`/finance/credit-cards/${id}`, data);
        await updateFinanceLocalRecord("finance_credit_cards", payload.local_id, result.data);
        // Preserve edits queued while this request was in flight.
        const remaining = (await syncQueueRepository.getPendingTasks()).filter(
          (t) => t.id !== task.id && t.type === "UPDATE_FINANCE_CREDIT_CARD" && t.payload.local_id === payload.local_id,
        );
        for (const next of remaining)
          await db.finance_credit_cards.update(payload.local_id, { ...next.payload.data, pending_sync: true });
        break;
      }
      case "CREATE_FINANCE_TRANSACTION": {
        const cleanData = await resolveTransactionPayloadForServer(payload.data);
        const response = await api.post("/finance/transactions", cleanData);
        await updateFinanceLocalRecord("finance_transactions", payload.local_id, response.data);
        return;
      }
      case "CREATE_FINANCE_TRANSACTIONS_BATCH": {
        if ((payload.transactions || []).length > FINANCE_BATCH_LIMIT) {
          for (let index = 0; index < payload.transactions.length; index += FINANCE_BATCH_LIMIT) {
            await syncQueueRepository.addSyncQueueTask({
              type: "CREATE_FINANCE_TRANSACTIONS_BATCH",
              payload: {
                local_ids: (payload.local_ids || []).slice(index, index + FINANCE_BATCH_LIMIT),
                transactions: (payload.transactions || []).slice(index, index + FINANCE_BATCH_LIMIT),
              },
              timestamp: task.timestamp || new Date().toISOString(),
            });
          }
          return;
        }

        const cleanTransactions = [];
        for (const tx of payload.transactions || []) {
          cleanTransactions.push(await resolveTransactionPayloadForServer(tx));
        }
        const response = await api.post("/finance/transactions/batch", {
          transactions: cleanTransactions,
        });
        if (Array.isArray(response.data)) {
          for (let i = 0; i < response.data.length; i++) {
            const serverData = response.data[i];
            const localId = payload.local_ids[i];
            await updateFinanceLocalRecord("finance_transactions", localId, serverData);
          }
        }
        return;
      }

      case "UPDATE_FINANCE_TRANSACTION": {
        const id = await resolveFinanceServerId("finance_transactions", payload);
        const cleanData = await resolveTransactionPayloadForServer(payload.data);
        delete cleanData.client_id;
        const response = await api.put(`/finance/transactions/${id}`, cleanData);
        await updateFinanceLocalRecord("finance_transactions", payload.local_id, response.data);
        return;
      }
      case "DELETE_FINANCE_TRANSACTION": {
        const id = await resolveFinanceServerId("finance_transactions", payload);
        await api.delete(`/finance/transactions/${id}`);
        return;
      }
      case "CREATE_FINANCE_CATEGORY": {
        const cleanData = sanitizeCategoryPayload(payload.data);
        const response = await api.post("/finance/categories", cleanData);
        await updateFinanceLocalRecord("finance_categories", payload.local_id, response.data);
        return;
      }
      case "UPDATE_FINANCE_CATEGORY": {
        const id = await resolveFinanceServerId("finance_categories", payload);
        const cleanData = sanitizeCategoryPayload(payload.data);
        const response = await api.put(`/finance/categories/${id}`, cleanData);
        await updateFinanceLocalRecord("finance_categories", payload.local_id, response.data);
        return;
      }
      case "DELETE_FINANCE_CATEGORY": {
        const id = await resolveFinanceServerId("finance_categories", payload);
        await api.delete(`/finance/categories/${id}`);
        await deleteFinanceLocalRecord("finance_categories", payload);
        return;
      }
      case "CREATE_FINANCE_MACRO_CATEGORY": {
        const cleanData = sanitizeMacroCategoryPayload(payload.data);
        const response = await api.post("/finance/macro-categories", cleanData);
        await updateFinanceLocalRecord("finance_macro_categories", payload.local_id, response.data);
        return;
      }
      case "UPDATE_FINANCE_MACRO_CATEGORY": {
        const id = await resolveFinanceServerId("finance_macro_categories", payload);
        const cleanData = sanitizeMacroCategoryPayload(payload.data);
        const response = await api.put(`/finance/macro-categories/${id}`, cleanData);
        await updateFinanceLocalRecord("finance_macro_categories", payload.local_id, response.data);
        return;
      }
      case "DELETE_FINANCE_MACRO_CATEGORY": {
        const id = await resolveFinanceServerId("finance_macro_categories", payload);
        await api.delete(`/finance/macro-categories/${id}`);
        await deleteFinanceLocalRecord("finance_macro_categories", payload);
        return;
      }
      case "SAVE_FINANCE_BUDGETS": {
        const groups = await resolveBudgetGroupsForServer(payload.groups || []);
        const response = await api.post("/finance/budgets", {
          month: payload.month,
          groups,
        });
        await financeRepository.setBudgetGroups(payload.month, response.data || []);
        return;
      }
      case "CREATE_FINANCE_INVESTMENT_GOAL": {
        const cleanData = sanitizeInvestmentGoalPayload(payload.data);
        const response = await api.post("/finance/investments/goals", cleanData);
        await updateFinanceLocalRecord("finance_investment_goals", payload.local_id, response.data);
        return;
      }
      case "UPDATE_FINANCE_INVESTMENT_GOAL": {
        const id = await resolveFinanceServerId("finance_investment_goals", payload);
        const cleanData = sanitizeInvestmentGoalPayload(payload.data);
        const response = await api.put(`/finance/investments/goals/${id}`, cleanData);
        await updateFinanceLocalRecord("finance_investment_goals", payload.local_id, response.data);
        return;
      }
      case "DELETE_FINANCE_INVESTMENT_GOAL": {
        const id = await resolveFinanceServerId("finance_investment_goals", payload);
        await api.delete(`/finance/investments/goals/${id}`);
        await deleteFinanceLocalRecord("finance_investment_goals", payload);
        return;
      }
      case "CREATE_FINANCE_INVESTMENT_EVENT": {
        const cleanData = await resolveInvestmentEventPayloadForServer(payload.data);
        const response = await api.post("/finance/investments/events", cleanData);
        await updateFinanceLocalRecord("finance_investment_events", payload.local_id, response.data);
        return;
      }
      case "UPDATE_FINANCE_INVESTMENT_EVENT": {
        const id = await resolveFinanceServerId("finance_investment_events", payload);
        const cleanData = await resolveInvestmentEventPayloadForServer(payload.data);
        const response = await api.put(`/finance/investments/events/${id}`, cleanData);
        await updateFinanceLocalRecord("finance_investment_events", payload.local_id, response.data);
        return;
      }
      case "DELETE_FINANCE_INVESTMENT_EVENT": {
        const id = await resolveFinanceServerId("finance_investment_events", payload);
        await api.delete(`/finance/investments/events/${id}`);
        await deleteFinanceLocalRecord("finance_investment_events", payload);
        return;
      }
      default:
        throw new Error(`Tarefa financeira desconhecida: ${task.type}`);
    }
  }

  const sanitizeHealthData = (data = {}) => {
    const internalKeys = new Set([
      "id",
      "local_id",
      "local_key",
      "user_id",
      "pending_sync",
      "deleted_at",
      "server_updated_at",
    ]);
    return Object.fromEntries(Object.entries(data).filter(([key]) => !internalKeys.has(key)));
  };

  const HEALTH_RECORD_TYPES = new Set(["HEALTH_OBJECT", "OBJECT_RELATION", "HEALTH_EVENT", "OVERVIEW_WIDGET"]);

  async function normalizeHealthUpsertTask(task) {
    const payload = task.payload || {};
    let localRecord = null;
    if (payload.local_id) localRecord = await db.health_records.get(payload.local_id);
    if (!localRecord && payload.local_key) {
      localRecord = await db.health_records.where("local_key").equals(payload.local_key).first();
    }

    // Queues created during the Health rollout may have stored the whole record
    // under `record`/`data`, before record_type became an explicit task field.
    const legacyRecord = payload.record || payload.data || localRecord || {};
    const recordType = [payload.record_type, legacyRecord.record_type, localRecord?.record_type].find((value) =>
      HEALTH_RECORD_TYPES.has(value),
    );
    const normalized = {
      ...payload,
      local_id: payload.local_id || localRecord?.local_id,
      local_key: payload.local_key || legacyRecord.local_key || localRecord?.local_key,
      record_type: recordType,
      data: sanitizeHealthData(payload.data?.record_type ? payload.data : legacyRecord),
      updated_at: payload.updated_at || legacyRecord.updated_at || localRecord?.updated_at,
    };

    if (!normalized.local_key || !normalized.record_type || !normalized.updated_at) {
      throw new Error("HEALTH_INVALID_QUEUE_ITEM: tarefa sem dados suficientes para sincronizar.");
    }

    if (
      normalized.local_id !== payload.local_id ||
      normalized.local_key !== payload.local_key ||
      normalized.record_type !== payload.record_type ||
      normalized.updated_at !== payload.updated_at ||
      !payload.data
    ) {
      await syncQueueRepository.updateTask(task.id, { payload: normalized });
    }
    return normalized;
  }

  async function _handleHealthTask(task) {
    if (task.type === "UPSERT_HEALTH_RECORD") {
      const payload = await normalizeHealthUpsertTask(task);
      const response = await api.post("/health/records", {
        local_key: payload.local_key,
        record_type: payload.record_type,
        data: sanitizeHealthData(payload.data),
        updated_at: payload.updated_at,
        idempotency_key: task.idempotency_key,
      });
      await healthRepository.markRecordSynced(payload.local_key, response.data.record);
      return;
    }

    if (task.type === "DELETE_HEALTH_RECORD") {
      const { payload } = task;
      const response = await api.delete("/health/records", {
        data: {
          local_key: payload.local_key,
          updated_at: payload.updated_at,
          idempotency_key: task.idempotency_key,
        },
      });
      await healthRepository.resolveDeletedRecord(payload.local_key, response.data.record || null);
      return;
    }

    throw new Error(`Tarefa Health desconhecida: ${task.type}`);
  }

  return { finance: _handleFinanceTask, health: _handleHealthTask };
}
