import { db } from "../../db";

const now = () => new Date().toISOString();
const localKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isServerId = (id) => id !== null && id !== undefined && Number.isFinite(Number(id));
const sameFinanceId = (left, right) => String(left ?? "") === String(right ?? "");
const entityReferenceIds = (entity) =>
  [entity?.id, entity?.local_key].filter((value) => value !== null && value !== undefined);

const normalizeMonth = (month) => month || new Date().toISOString().slice(0, 7);
const INVESTMENT_FLOW = {
  STANDARD: "STANDARD",
  IN: "INVESTMENT_IN",
  OUT: "INVESTMENT_OUT",
};
const investmentWithdrawalCategoryName = (name = "") => `${String(name).trim()} (Saída)`;
const normalizeFinanceText = (value = "") => String(value || "").trim().toLowerCase();

const sameCategorySignature = (category, payload) => {
  return normalizeFinanceText(category?.name) === normalizeFinanceText(payload?.name)
    && normalizeFinanceText(category?.macro_category || "Geral") === normalizeFinanceText(payload?.macro_category || "Geral")
    && String(category?.investment_flow_type || INVESTMENT_FLOW.STANDARD) === String(payload?.investment_flow_type || INVESTMENT_FLOW.STANDARD);
};

const normalizeDesc = (desc) => {
  return String(desc || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .replace(/[^a-z0-9]/g, " ")      // Replace special characters/punctuation with spaces
    .replace(/\s+/g, " ")            // Collapse multiple spaces
    .trim();
};

const withUpdatedAt = (items = []) => items.map((item) => ({ ...item, updated_at: item.updated_at || now() }));

const replaceServerItemsPreservingPending = async (table, items = [], options = {}) => {
  const { preserveFields = [] } = options;
  const serverItems = withUpdatedAt(items);
  const existing = await table.toArray();
  const pendingItems = existing.filter((item) =>
    item.pending_sync || (item.local_key && !isServerId(item.id) && item.pending_sync !== false),
  );
  const existingByServerId = new Map(
    existing
      .filter((item) => isServerId(item.id))
      .map((item) => [String(item.id), item]),
  );
  const pendingServerIds = new Set(
    pendingItems
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id)),
  );

  await table.clear();

  const hydratedServerItems = serverItems.map((item) => {
    const current = existingByServerId.get(String(item.id));
    if (!current) return item;

    const merged = { ...item };
    if (current.local_id) merged.local_id = current.local_id;
    if (current.local_key) merged.local_key = current.local_key;
    preserveFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(current, field) && merged[field] === undefined) {
        merged[field] = current[field];
      }
    });
    return merged;
  });

  const merged = [
    ...hydratedServerItems.filter((item) => !pendingServerIds.has(Number(item.id))),
    ...pendingItems,
  ];

  if (merged.length) {
    await table.bulkPut(merged);
  }
};

const normalizeCategoryMacroReferences = async () => {
  const [macros, categories] = await Promise.all([
    db.finance_macro_categories.toArray(),
    db.finance_categories.toArray(),
  ]);
  const macrosById = new Map();
  const macrosByName = new Map();

  macros.forEach((macro) => {
    if (!macro) return;
    [macro.id, macro.local_id, macro.local_key].filter(Boolean).forEach((key) => {
      macrosById.set(String(key), macro);
    });
    macrosByName.set(String(macro.name || "").toLowerCase(), macro);
  });

  await Promise.all(
    categories.map((category) => {
      const macro =
        macrosById.get(String(category.macro_category_id || "")) ||
        macrosByName.get(String(category.macro_category || "").toLowerCase());
      if (!macro) return null;

      const patch = {};
      if (category.macro_category !== macro.name) patch.macro_category = macro.name;
      if (!sameFinanceId(category.macro_category_id, macro.id)) patch.macro_category_id = macro.id;
      if (category.macro_color !== macro.color) patch.macro_color = macro.color || "#999999";
      if (category.color !== macro.color) patch.color = macro.color || "#999999";
      if (macro.is_investment && category.investment_flow_type !== INVESTMENT_FLOW.OUT && category.type !== "EXPENSE") {
        patch.type = "EXPENSE";
      }

      if (Object.keys(patch).length === 0) return null;
      return db.finance_categories.update(category.local_id, {
        ...patch,
        updated_at: category.updated_at || now(),
      });
    }),
  );
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
      db.finance_investment_goals.clear(),
      db.finance_investment_events.clear(),
    ]);
  },

  async setMacroCategories(items = []) {
    await replaceServerItemsPreservingPending(db.finance_macro_categories, items);
    await normalizeCategoryMacroReferences();
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
      is_investment: Boolean(data.is_investment),
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

    await db.transaction("rw", db.finance_macro_categories, db.finance_categories, async () => {
      await db.finance_macro_categories.update(current.local_id, payload);

      const forceExpense = changes.is_investment === true;

      if (changes.name && changes.name !== current.name) {
        const categories = await db.finance_categories.where("macro_category").equals(current.name).toArray();
        if (categories.length) {
          await Promise.all(
            categories.map((category) =>
              db.finance_categories.update(category.local_id, {
                macro_category: changes.name,
                macro_color: changes.color || category.macro_color || "#999999",
                color: changes.color || category.color || "#999999",
                ...(forceExpense ? { type: "EXPENSE" } : {}),
                pending_sync: true,
                updated_at: now(),
              })
            )
          );
        }
      } else if (changes.color && changes.color !== current.color) {
        const categories = await db.finance_categories.where("macro_category").equals(current.name).toArray();
        if (categories.length) {
          await Promise.all(
            categories.map((category) =>
              db.finance_categories.update(category.local_id, {
                macro_color: changes.color,
                color: changes.color,
                ...(forceExpense ? { type: "EXPENSE" } : {}),
                pending_sync: true,
                updated_at: now(),
              })
            )
          );
        }
      } else if (forceExpense) {
        const categories = await db.finance_categories.where("macro_category").equals(current.name).toArray();
        if (categories.length) {
          await Promise.all(
            categories.map((category) =>
              db.finance_categories.update(category.local_id, {
                type: "EXPENSE",
                pending_sync: true,
                updated_at: now(),
              })
            )
          );
        }
      }
    });

    await normalizeCategoryMacroReferences();
    return { ...current, ...payload };
  },

  async deleteLocalMacroCategory(id) {
    const current = await this.findMacroCategory(id);
    if (current?.local_id) {
      await db.transaction("rw", db.finance_macro_categories, db.finance_categories, db.finance_budget_groups, async () => {
        const currentIds = entityReferenceIds(current).map(String);
        let defaultMacro = await db.finance_macro_categories.where("name").equals("Geral").first();
        if (!defaultMacro) {
          const defaultLocalKey = localKey("macro");
          const defaultPayload = {
            id: defaultLocalKey,
            local_key: defaultLocalKey,
            name: "Geral",
            color: "#999999",
            pending_sync: false,
            created_at: now(),
            updated_at: now(),
          };
          const defaultLocalId = await db.finance_macro_categories.add(defaultPayload);
          defaultMacro = { ...defaultPayload, local_id: defaultLocalId };
        }

        const categories = (await db.finance_categories.toArray()).filter(
          (category) =>
            category.macro_category === current.name ||
            currentIds.includes(String(category.macro_category_id || "")),
        );
        if (categories.length) {
          await Promise.all(
            categories.map((category) =>
              db.finance_categories.update(category.local_id, {
                macro_category: "Geral",
                macro_category_id: defaultMacro?.id || null,
                macro_color: "#999999",
                color: "#999999",
                investment_flow_type: INVESTMENT_FLOW.STANDARD,
                linked_investment_category_id: null,
                updated_at: now(),
              }),
            ),
          );
        }

        const budgetGroups = (await db.finance_budget_groups.toArray()).filter((group) =>
          currentIds.includes(String(group.macro_category_id || "")),
        );
        if (budgetGroups.length) {
          await db.finance_budget_groups.bulkDelete(budgetGroups.map((group) => group.local_id));
        }

        await db.finance_macro_categories.delete(current.local_id);
      });
    }
    return current;
  },

  async findMacroCategory(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_macro_categories.where("id").equals(numeric).first();
      if (byServer) return byServer;
      const byLocal = await db.finance_macro_categories.get(numeric);
      if (byLocal) return byLocal;
    }
    const byLocalKey = await db.finance_macro_categories.where("local_key").equals(id).first();
    if (byLocalKey) return byLocalKey;
    return db.finance_macro_categories
      .filter((macro) => sameFinanceId(macro.local_id, id))
      .first();
  },

  async setCategories(items = []) {
    await replaceServerItemsPreservingPending(db.finance_categories, items);
    await normalizeCategoryMacroReferences();
  },

  async getCategories() {
    return db.finance_categories.orderBy("name").toArray();
  },

  async createLocalCategory(data) {
    const categoryLocalKey = data.local_key || localKey("category");
    const payload = {
      ...data,
      local_id: undefined,
      local_key: categoryLocalKey,
      id: data.id || categoryLocalKey,
      type: data.investment_flow_type === INVESTMENT_FLOW.OUT ? "INCOME" : (data.type || "EXPENSE"),
      icon: data.icon || "tag",
      color: data.color || data.macro_color || "#999999",
      investment_flow_type: data.investment_flow_type || INVESTMENT_FLOW.STANDARD,
      linked_investment_category_id: data.linked_investment_category_id || null,
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const macro = data.macro_category ? await db.finance_macro_categories.where("name").equals(data.macro_category).first() : null;
    if (macro?.is_investment && payload.investment_flow_type !== INVESTMENT_FLOW.OUT) {
      payload.type = "EXPENSE";
      payload.investment_flow_type = INVESTMENT_FLOW.IN;
    } else if (payload.investment_flow_type === INVESTMENT_FLOW.OUT) {
      payload.type = "INCOME";
    }

    const existing = await db.finance_categories
      .filter((category) => sameCategorySignature(category, payload))
      .first();

    let local_id = existing?.local_id;
    let created;

    if (existing?.local_id) {
      const mergedPayload = {
        ...payload,
        local_key: existing.local_key || payload.local_key,
        id: existing.id || existing.local_key || payload.id,
        pending_sync: existing.pending_sync !== false,
        updated_at: now(),
      };
      delete mergedPayload.local_id;
      await db.finance_categories.update(existing.local_id, mergedPayload);
      created = { ...existing, ...mergedPayload, local_id: existing.local_id };
    } else {
      delete payload.local_id;
      local_id = await db.finance_categories.add(payload);
      created = { ...payload, local_id };
    }

    if (macro?.is_investment && created.investment_flow_type === INVESTMENT_FLOW.IN) {
      const twinLocalKey = localKey("category-out");
      const twinName = investmentWithdrawalCategoryName(created.name);
      const existingTwin = created.linked_investment_category_id
        ? await this.findCategory(created.linked_investment_category_id)
        : await db.finance_categories
          .filter((category) => sameCategorySignature(category, {
            name: twinName,
            macro_category: created.macro_category,
            investment_flow_type: INVESTMENT_FLOW.OUT,
          }))
          .first();
      const twinPayload = {
        macro_category: created.macro_category,
        macro_category_id: created.macro_category_id,
        macro_color: created.macro_color,
        color: created.color || created.macro_color || "#999999",
        icon: created.icon || "tag",
        local_key: existingTwin?.local_key || twinLocalKey,
        id: existingTwin?.id || existingTwin?.local_key || twinLocalKey,
        name: twinName,
        type: "INCOME",
        investment_flow_type: INVESTMENT_FLOW.OUT,
        linked_investment_category_id: created.id,
        pending_sync: false,
        created_at: existingTwin?.created_at || now(),
        updated_at: now(),
      };

      let twinLocalId = existingTwin?.local_id;
      if (existingTwin?.local_id) {
        await db.finance_categories.update(existingTwin.local_id, twinPayload);
      } else {
        twinLocalId = await db.finance_categories.add(twinPayload);
      }

      await db.finance_categories.update(local_id, { linked_investment_category_id: twinPayload.id });
      created.linked_investment_category_id = twinPayload.id;
      created.linked_investment_category_local_id = twinLocalId;
    }
    return created;
  },

  async updateLocalCategory(id, changes) {
    const current = await this.findCategory(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    const targetMacroName = changes.macro_category || current.macro_category;
    if (targetMacroName) {
      const macro = await db.finance_macro_categories.where("name").equals(targetMacroName).first();
      const nextFlow = changes.investment_flow_type || current.investment_flow_type || INVESTMENT_FLOW.STANDARD;
      if (macro?.is_investment && nextFlow !== INVESTMENT_FLOW.OUT) {
        payload.type = "EXPENSE";
        payload.investment_flow_type = INVESTMENT_FLOW.IN;
      } else if (nextFlow === INVESTMENT_FLOW.OUT) {
        payload.type = "INCOME";
        payload.investment_flow_type = INVESTMENT_FLOW.OUT;
      }
    }
    await db.finance_categories.update(current.local_id, payload);
    const updated = { ...current, ...payload };
    if (updated.investment_flow_type === INVESTMENT_FLOW.IN) {
      const twinName = investmentWithdrawalCategoryName(updated.name);
      const twin = updated.linked_investment_category_id
        ? await this.findCategory(updated.linked_investment_category_id)
        : null;
      if (twin?.local_id) {
        await db.finance_categories.update(twin.local_id, {
          name: twinName,
          macro_category: updated.macro_category,
          macro_color: updated.macro_color || updated.color,
          color: updated.color || updated.macro_color || "#999999",
          icon: updated.icon || "tag",
          type: "INCOME",
          investment_flow_type: INVESTMENT_FLOW.OUT,
          linked_investment_category_id: updated.id,
          updated_at: now(),
        });
      }
    }
    return updated;
  },

  async deleteLocalCategory(id) {
    const current = await this.findCategory(id);
    let deletedCategories = current ? [current] : [];
    if (current?.local_id) {
      await db.transaction("rw", db.finance_categories, db.finance_transactions, db.finance_budgets, db.finance_investment_events, async () => {
        const currentIds = entityReferenceIds(current).map(String);
        const linkedCategories = [];

        if (current.investment_flow_type === INVESTMENT_FLOW.IN && current.linked_investment_category_id) {
          const linkedCategory = await this.findCategory(current.linked_investment_category_id);
          if (linkedCategory) linkedCategories.push(linkedCategory);
        }

        if (current.investment_flow_type === INVESTMENT_FLOW.OUT) {
          const bases = (await db.finance_categories.toArray()).filter((category) =>
            currentIds.includes(String(category.linked_investment_category_id || "")),
          );
          linkedCategories.push(...bases);
        }
        deletedCategories = [current, ...linkedCategories];

        const deletedIds = new Set([
          ...currentIds,
          ...linkedCategories.flatMap((category) => entityReferenceIds(category).map(String)),
        ]);
        const allTransactions = (await db.finance_transactions.toArray()).filter((transaction) =>
          deletedIds.has(String(transaction.category_id || "")),
        );
        if (allTransactions.length) {
          await Promise.all(
            allTransactions.map((transaction) =>
              db.finance_transactions.update(transaction.local_id, {
                category_id: null,
                updated_at: now(),
              }),
            ),
          );
        }

        const budgets = (await db.finance_budgets.toArray()).filter((budget) =>
          deletedIds.has(String(budget.category_id || "")),
        );
        if (budgets.length) {
          await db.finance_budgets.bulkDelete(budgets.map((budget) => budget.local_id));
        }

        const events = (await db.finance_investment_events.toArray()).filter((event) =>
          deletedIds.has(String(event.category_id || "")),
        );
        if (events.length) {
          await Promise.all(
            events.map((event) =>
              db.finance_investment_events.update(event.local_id, {
                category_id: null,
                updated_at: now(),
              }),
            ),
          );
        }

        await db.finance_categories.delete(current.local_id);
        if (linkedCategories.length) {
          await db.finance_categories.bulkDelete(
            [...new Set(linkedCategories.map((category) => category.local_id).filter(Boolean))],
          );
        }
      });
    }
    return current ? { ...current, deleted_categories: deletedCategories } : current;
  },

  async findCategory(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_categories.where("id").equals(numeric).first();
      if (byServer) return byServer;
      const byLocal = await db.finance_categories.get(numeric);
      if (byLocal) return byLocal;
    }
    const byLocalKey = await db.finance_categories.where("local_key").equals(id).first();
    if (byLocalKey) return byLocalKey;
    return db.finance_categories
      .filter((category) => sameFinanceId(category.local_id, id))
      .first();
  },

  async setTransactions(items = []) {
    await replaceServerItemsPreservingPending(db.finance_transactions, items, {
      preserveFields: ["original_type"],
    });
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
            const cid = String(tx.category_id);
            freq[cid] = (freq[cid] || 0) + 1;
          }
        }
      }
      let maxCount = 0;
      let bestId = null;
      for (const cid in freq) {
        if (freq[cid] > maxCount) {
          maxCount = freq[cid];
          bestId = cid;
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
    const category = category_id ? await this.findCategory(category_id) : null;
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
    if (category?.investment_flow_type === INVESTMENT_FLOW.OUT) {
      payload.type = "INCOME";
    } else if (category?.investment_flow_type === INVESTMENT_FLOW.IN) {
      payload.type = "EXPENSE";
    }
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
        const category = category_id ? await this.findCategory(category_id) : null;
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
        if (category?.investment_flow_type === INVESTMENT_FLOW.OUT) {
          payload.type = "INCOME";
        } else if (category?.investment_flow_type === INVESTMENT_FLOW.IN) {
          payload.type = "EXPENSE";
        }
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
    if (payload.category_id !== undefined && payload.category_id !== null) {
      const category = await this.findCategory(payload.category_id);
      if (category.investment_flow_type === INVESTMENT_FLOW.OUT) {
        payload.type = "INCOME";
      } else if (category.investment_flow_type === INVESTMENT_FLOW.IN) {
        payload.type = "EXPENSE";
      }
    } else if (payload.type !== undefined && current.category_id) {
      const category = await this.findCategory(current.category_id);
      if (category.investment_flow_type === INVESTMENT_FLOW.OUT) {
        payload.type = "INCOME";
      } else if (category.investment_flow_type === INVESTMENT_FLOW.IN) {
        payload.type = "EXPENSE";
      }
    }
    await db.finance_transactions.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async deleteLocalTransaction(id) {
    const current = await this.findTransaction(id);
    if (current.local_id) await db.finance_transactions.delete(current.local_id);
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

  async setInvestmentGoals(items = []) {
    await replaceServerItemsPreservingPending(db.finance_investment_goals, items);
  },

  async getInvestmentGoals() {
    return db.finance_investment_goals
      .filter((item) => !item.is_archived)
      .sortBy("target_amount");
  },

  async createLocalInvestmentGoal(data) {
    const payload = {
      ...data,
      local_key: localKey("investment-goal"),
      id: data.id || null,
      color: data.color || "#355AFD",
      is_archived: false,
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const local_id = await db.finance_investment_goals.add(payload);
    const created = { ...payload, local_id };
    if (!created.id) {
      created.id = created.local_key;
      await db.finance_investment_goals.update(local_id, { id: created.id });
    }
    return created;
  },

  async updateLocalInvestmentGoal(id, changes) {
    const current = await this.findInvestmentGoal(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    await db.finance_investment_goals.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async archiveLocalInvestmentGoal(id) {
    const current = await this.findInvestmentGoal(id);
    if (!current) return null;
    await db.finance_investment_goals.update(current.local_id, {
      is_archived: true,
      pending_sync: true,
      updated_at: now(),
    });
    return { ...current, is_archived: true, pending_sync: true };
  },

  async findInvestmentGoal(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_investment_goals.where("id").equals(numeric).first();
      if (byServer) return byServer;
      return db.finance_investment_goals.get(numeric);
    }
    return db.finance_investment_goals.where("local_key").equals(id).first();
  },

  async setInvestmentEvents(items = []) {
    await replaceServerItemsPreservingPending(db.finance_investment_events, items);
  },

  async getInvestmentEvents() {
    return db.finance_investment_events.orderBy("event_date").reverse().toArray();
  },

  async createLocalInvestmentEvent(data) {
    const payload = {
      ...data,
      local_key: localKey("investment-event"),
      id: data.id || null,
      pending_sync: true,
      created_at: now(),
      updated_at: now(),
    };
    const local_id = await db.finance_investment_events.add(payload);
    const created = { ...payload, local_id };
    if (!created.id) {
      created.id = created.local_key;
      await db.finance_investment_events.update(local_id, { id: created.id });
    }
    return created;
  },

  async updateLocalInvestmentEvent(id, changes) {
    const current = await this.findInvestmentEvent(id);
    if (!current) return null;
    const payload = { ...changes, pending_sync: true, updated_at: now() };
    await db.finance_investment_events.update(current.local_id, payload);
    return { ...current, ...payload };
  },

  async deleteLocalInvestmentEvent(id) {
    const current = await this.findInvestmentEvent(id);
    if (current.local_id) {
      await db.finance_investment_events.delete(current.local_id);
    }
    return current;
  },

  async findInvestmentEvent(id) {
    if (!id) return null;
    const numeric = Number(id);
    if (Number.isFinite(numeric)) {
      const byServer = await db.finance_investment_events.where("id").equals(numeric).first();
      if (byServer) return byServer;
      return db.finance_investment_events.get(numeric);
    }
    return db.finance_investment_events.where("local_key").equals(id).first();
  },

  async getInvestmentsSummary({ month } = {}) {
    const selected = normalizeMonth(month);
    const [transactions, categories, macros, goals, events] = await Promise.all([
      db.finance_transactions.toArray(),
      db.finance_categories.toArray(),
      db.finance_macro_categories.toArray(),
      this.getInvestmentGoals(),
      this.getInvestmentEvents(),
    ]);

    const macroByName = new Map(macros.map((macro) => [macro?.name, macro]));
    const categoriesById = new Map(categories.map((category) => [String(category.id || category.local_id), category]));
    const investmentTransactions = transactions.filter((transaction) => {
      if (transaction.is_ignored) return false;
      const category = categoriesById.get(String(transaction.category_id || ""));
      if (!category) return false;
      const macro = macroByName.get(category.macro_category || "Geral");
      return Boolean(macro?.is_investment) && [INVESTMENT_FLOW.IN, INVESTMENT_FLOW.OUT].includes(category.investment_flow_type);
    });

    const summary = {
      month_invested: 0,
      month_withdrawn: 0,
      month_net: 0,
      total_invested: 0,
      total_yield: 0,
      total_withdrawn: 0,
      total_adjustments: 0,
      estimated_balance: 0,
    };

    const monthlyMap = new Map();
    const categoryDistributionMap = new Map();

    investmentTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount || 0);
      const monthKey = String(transaction.transaction_date || "").slice(0, 7);
      const category = categoriesById.get(String(transaction.category_id || ""));
      const macro = macroByName.get(category?.macro_category || "Geral");
      const isWithdrawal = category.investment_flow_type === INVESTMENT_FLOW.OUT;
      if (isWithdrawal) {
        summary.total_withdrawn += amount;
        if (monthKey === selected) summary.month_withdrawn += amount;
      } else {
        summary.total_invested += amount;
        if (monthKey === selected) summary.month_invested += amount;
      }

      const monthEntry = monthlyMap.get(monthKey) || {
        month: monthKey,
        invested: 0,
        yield: 0,
        withdrawn: 0,
        adjustments: 0,
        estimated_balance: 0,
      };
      if (isWithdrawal) monthEntry.withdrawn += amount;
      else monthEntry.invested += amount;
      monthlyMap.set(monthKey, monthEntry);

      const baseCategoryId = isWithdrawal ? category.linked_investment_category_id : (category.id || transaction.category_id);
      const baseCategory = isWithdrawal ? categoriesById.get(String(baseCategoryId || "")) : category;
      const categoryKey = String(baseCategoryId || "");
      const categoryEntry = categoryDistributionMap.get(categoryKey) || {
        category_id: baseCategory?.id || baseCategoryId || null,
        category_name: baseCategory?.name || "Sem categoria",
        macro_category: baseCategory?.macro_category || category.macro_category || "Geral",
        color: macro?.color || baseCategory?.macro_color || baseCategory?.color || category.color || "#999999",
        invested: 0,
        yield: 0,
        withdrawn: 0,
        adjustments: 0,
        estimated_balance: 0,
      };
      if (isWithdrawal) categoryEntry.withdrawn += amount;
      else categoryEntry.invested += amount;
      categoryDistributionMap.set(categoryKey, categoryEntry);
    });

    events.forEach((event) => {
      const amount = Number(event.amount || 0);
      const monthKey = String(event.event_date || "").slice(0, 7);
      const monthEntry = monthlyMap.get(monthKey) || {
        month: monthKey,
        invested: 0,
        yield: 0,
        withdrawn: 0,
        adjustments: 0,
        estimated_balance: 0,
      };
      if (event.event_type === "YIELD") {
        monthEntry.yield += amount;
        summary.total_yield += amount;
      } else if (event.event_type === "WITHDRAWAL") {
        monthEntry.withdrawn += amount;
        summary.total_withdrawn += amount;
      } else {
        monthEntry.adjustments += amount;
        summary.total_adjustments += amount;
      }
      monthlyMap.set(monthKey, monthEntry);

      if (event.category_id) {
        const category = categoriesById.get(String(event.category_id));
        const macro = macroByName.get(category?.macro_category || "Geral");
        const categoryKey = String(event.category_id);
        const categoryEntry = categoryDistributionMap.get(categoryKey) || {
          category_id: category?.id || event.category_id,
          category_name: category?.name || "Sem categoria",
          macro_category: category?.macro_category || "Geral",
          color: macro?.color || category?.macro_color || category?.color || "#999999",
          invested: 0,
          yield: 0,
          withdrawn: 0,
          adjustments: 0,
          estimated_balance: 0,
        };
        if (event.event_type === "YIELD") categoryEntry.yield += amount;
        if (event.event_type === "WITHDRAWAL") categoryEntry.withdrawn += amount;
        if (event.event_type === "ADJUSTMENT") categoryEntry.adjustments += amount;
        categoryDistributionMap.set(categoryKey, categoryEntry);
      }
    });

    const monthly_history = [...monthlyMap.values()]
      .filter((item) => item.month)
      .sort((left, right) => left.month.localeCompare(right.month));

    let runningBalance = 0;
    monthly_history.forEach((item) => {
      runningBalance += Number(item.invested || 0) + Number(item.yield || 0) + Number(item.adjustments || 0) - Number(item.withdrawn || 0);
      item.estimated_balance = Number(runningBalance.toFixed(2));
    });

    const category_distribution = [...categoryDistributionMap.values()]
      .map((item) => ({
        ...item,
        estimated_balance: Number((item.invested + item.yield + item.adjustments - item.withdrawn).toFixed(2)),
      }))
      .sort((left, right) => right.estimated_balance - left.estimated_balance);

    summary.month_net = Number((summary.month_invested - summary.month_withdrawn).toFixed(2));
    summary.estimated_balance = Number((summary.total_invested + summary.total_yield + summary.total_adjustments - summary.total_withdrawn).toFixed(2));

    return {
      selected_month: selected,
      summary,
      monthly_history,
      category_distribution,
      goals,
      events,
    };
  },
};
