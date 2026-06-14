import { db } from "../../db";

const now = () => new Date().toISOString();
const localKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeMonth = (month) => month || new Date().toISOString().slice(0, 7);

const normalizeDesc = (desc) => {
  return String(desc || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .replace(/[^a-z0-9]/g, " ")      // Replace special characters/punctuation with spaces
    .replace(/\s+/g, " ")            // Collapse multiple spaces
    .trim();
};


export const financeRepository = {
  async clearLocalFinance() {
    await Promise.all([
      db.finance_macro_categories.clear(),
      db.finance_categories.clear(),
      db.finance_transactions.clear(),
      db.finance_budget_groups.clear(),
      db.finance_budgets.clear(),
      db.finance_connections.clear(),
    ]);
  },

  async setMacroCategories(items = []) {
    await db.finance_macro_categories.clear();
    if (items.length) {
      await db.finance_macro_categories.bulkPut(items.map((item) => ({ ...item, updated_at: item.updated_at || now() })));
    }
  },

  async getMacroCategories() {
    return db.finance_macro_categories.orderBy("name").toArray();
  },

  async createLocalMacroCategory(data) {
    const payload = {
      ...data,
      local_key: localKey("macro"),
      id: data.id || null,
      name: data.name,
      color: data.color || "#999999",
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const local_id = await db.finance_macro_categories.add(payload);
    const created = { ...payload, local_id };
    if (!created.id) {
      created.id = created.local_key;
      await db.finance_macro_categories.update(local_id, { id: created.id });
    }
    return created;
  },

  async updateLocalMacroCategory(id, changes) {
    const current = await this.findMacroCategory(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    await db.finance_macro_categories.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async deleteLocalMacroCategory(id) {
    const current = await this.findMacroCategory(id);
    if (current?.local_id) await db.finance_macro_categories.delete(current.local_id);
    return current;
  },

  async findMacroCategory(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_macro_categories.where("id").equals(numeric).first();
      if (byServer) return byServer;
      return db.finance_macro_categories.get(numeric);
    }
    return db.finance_macro_categories.where("local_key").equals(id).first();
  },

  async setCategories(items = []) {
    await db.finance_categories.clear();
    if (items.length) {
      await db.finance_categories.bulkPut(items.map((item) => ({ ...item, updated_at: item.updated_at || now() })));
    }
  },

  async getCategories() {
    return db.finance_categories.orderBy("name").toArray();
  },

  async createLocalCategory(data) {
    const payload = {
      ...data,
      local_key: localKey("category"),
      id: data.id || null,
      type: data.type || "EXPENSE",
      icon: data.icon || "tag",
      color: data.color || data.macro_color || "#999999",
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const local_id = await db.finance_categories.add(payload);
    const created = { ...payload, local_id };
    if (!created.id) {
      created.id = created.local_key;
      await db.finance_categories.update(local_id, { id: created.id });
    }
    return created;
  },

  async updateLocalCategory(id, changes) {
    const current = await this.findCategory(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    await db.finance_categories.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async deleteLocalCategory(id) {
    const current = await this.findCategory(id);
    if (current?.local_id) await db.finance_categories.delete(current.local_id);
    return current;
  },

  async findCategory(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_categories.where("id").equals(numeric).first();
      if (byServer) return byServer;
      return db.finance_categories.get(numeric);
    }
    return db.finance_categories.where("local_key").equals(id).first();
  },

  async setTransactions(items = []) {
    await db.finance_transactions.clear();
    if (items.length) {
      await db.finance_transactions.bulkPut(items.map((item) => ({ ...item, updated_at: item.updated_at || now() })));
    }
  },

  async getTransactions({ month } = {}) {
    const selected = normalizeMonth(month);
    const rows = await db.finance_transactions.toArray();
    return rows
      .filter((item) => !selected || String(item.transaction_date || "").startsWith(selected))
      .sort((a, b) => {
        const dateCompare = String(b.transaction_date || "").localeCompare(String(a.transaction_date || ""));
        if (dateCompare !== 0) return dateCompare;

        const isNumericA = a.id && Number.isFinite(Number(a.id));
        const isNumericB = b.id && Number.isFinite(Number(b.id));

        if (isNumericA && isNumericB) {
          return Number(b.id) - Number(a.id);
        }

        if (!isNumericA && isNumericB) return -1;
        if (isNumericA && !isNumericB) return 1;

        return (b.local_id || 0) - (a.local_id || 0);
      });
  },

  async resolveCategoryFromLocalHistory(description) {
    if (!description) return null;
    try {
      const norm = normalizeDesc(description);
      const txs = await db.finance_transactions.toArray();
      const freq = {};
      for (const tx of txs) {
        if (tx.category_id && !tx.is_ignored) {
          if (normalizeDesc(tx.description) === norm) {
            const cid = Number(tx.category_id);
            freq[cid] = (freq[cid] || 0) + 1;
          }
        }
      }
      let maxCount = 0;
      let bestId = null;
      for (const cid in freq) {
        if (freq[cid] > maxCount) {
          maxCount = freq[cid];
          bestId = Number(cid);
        }
      }
      return bestId;
    } catch (error) {
      console.warn("[resolveCategoryFromLocalHistory] Error:", error);
      return null;
    }
  },

  async createLocalTransaction(data) {
    let category_id = data.category_id || null;
    if (!category_id && data.description) {
      category_id = await this.resolveCategoryFromLocalHistory(data.description);
    }
    const payload = {
      ...data,
      category_id,
      local_key: localKey("transaction"),
      id: data.id || null,
      source: data.source || "MANUAL",
      status: data.status || "POSTED",
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const local_id = await db.finance_transactions.add(payload);
    const created = { ...payload, local_id };
    if (!created.id) {
      created.id = created.local_key;
      await db.finance_transactions.update(local_id, { id: created.id });
    }
    return created;
  },

  async createLocalTransactionsBatch(items) {
    return db.transaction("rw", db.finance_transactions, async () => {
      const createdItems = [];
      for (const data of items) {
        let category_id = data.category_id || null;
        if (!category_id && data.description) {
          category_id = await this.resolveCategoryFromLocalHistory(data.description);
        }
        const lKey = localKey("transaction");
        const payload = {
          ...data,
          category_id,
          local_key: lKey,
          id: data.id || lKey,
          source: data.source || "IMPORT",
          status: data.status || "POSTED",
          pending_sync: true,
          created_at: now(),
          updated_at: now(),
        };
        const local_id = await db.finance_transactions.add(payload);
        createdItems.push({ ...payload, local_id });
      }
      return createdItems;
    });
  },



  async updateLocalTransaction(id, changes) {
    const current = await this.findTransaction(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    await db.finance_transactions.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async deleteLocalTransaction(id) {
    const current = await this.findTransaction(id);
    if (current?.local_id) await db.finance_transactions.delete(current.local_id);
    return current;
  },

  async findTransaction(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_transactions.where("id").equals(numeric).first();
      if (byServer) return byServer;
      return db.finance_transactions.get(numeric);
    }
    return db.finance_transactions.where("local_key").equals(id).first();
  },

  async setConnections(items = []) {
    await db.finance_connections.clear();
    if (items.length) await db.finance_connections.bulkPut(items);
  },

  async getConnections() {
    return db.finance_connections.toArray();
  },

  async setBudgetGroups(month, groups = []) {
    const selected = normalizeMonth(month);
    const oldGroups = await db.finance_budget_groups.where("month").equals(selected).toArray();
    const oldGroupIds = oldGroups.map((group) => group.local_id);
    await db.transaction("rw", db.finance_budget_groups, db.finance_budgets, async () => {
      if (oldGroupIds.length) await db.finance_budget_groups.bulkDelete(oldGroupIds);
      const oldItems = await db.finance_budgets.where("month").equals(selected).toArray();
      if (oldItems.length) await db.finance_budgets.bulkDelete(oldItems.map((item) => item.local_id));

      for (const group of groups) {
        const { items = [], ...groupData } = group;
        const group_local_id = await db.finance_budget_groups.add({
          ...groupData,
          month: selected,
          updated_at: groupData.updated_at || now(),
        });
        if (items.length) {
          await db.finance_budgets.bulkAdd(
            items.map((item) => ({
              ...item,
              month: selected,
              group_local_id,
              updated_at: item.updated_at || now(),
            })),
          );
        }
      }
    });
  },

  async getBudgetGroups(month) {
    const selected = normalizeMonth(month);
    const groups = await db.finance_budget_groups.where("month").equals(selected).toArray();
    const items = await db.finance_budgets.where("month").equals(selected).toArray();
    return groups.map((group) => ({
      ...group,
      items: items.filter((item) => item.group_local_id === group.local_id),
    }));
  },

  async replaceLocalBudgetGroups(month, groups = []) {
    const selected = normalizeMonth(month);
    const hydrated = groups.map((group) => ({
      ...group,
      local_key: group.local_key || localKey("budget-group"),
      pending_sync: true,
      updated_at: now(),
      items: (group.items || []).map((item) => ({
        ...item,
        local_key: item.local_key || localKey("budget-item"),
        pending_sync: true,
        updated_at: now(),
      })),
    }));
    await this.setBudgetGroups(selected, hydrated);
    return this.getBudgetGroups(selected);
  },
};
