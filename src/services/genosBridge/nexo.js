import { transactionCalendarDate, transactionDescription, transactionReferenceMonth } from "@/utils/financeNotificationDisplay";
import { paymentMethodLabel } from "@/utils/financeCredit";
import {
  BRIDGE_ERRORS,
  BridgeError,
  finite_number,
  is_month_key,
  month_key,
  rank_matches,
} from "@/utils/genos_bridge";
import { normalize_spoken } from "@/utils/genos_command";

// Nexo é SOMENTE LEITURA para o Genos: nada aqui chama create/update/delete/save dos serviços financeiros.

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_TRANSACTIONS = 10;
const MAX_TRANSACTIONS = 30;
const TOP_CATEGORIES = 5;
const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const text = (value, max) => String(value ?? "").trim().slice(0, max);

/** O serviço financeiro tenta a API e cai no cache local; com rede ruim a espera tem limite. */
function with_timeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new BridgeError(BRIDGE_ERRORS.UNAVAILABLE, "O Nexo demorou para responder.")), REQUEST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createNexoOps({ finance, physical, online = () => true, now = () => new Date() }) {
  const month_of = (args) => {
    if (args.month === undefined || args.month === null || args.month === "") return month_key(now());
    if (!is_month_key(args.month)) throw new BridgeError(BRIDGE_ERRORS.BAD_REQUEST, "Informe um mês válido.");
    return args.month;
  };
  const meta = (month) => ({ month, offline: !online() });
  const read = async (promise) => (await with_timeout(promise)).data;

  async function categories_by_id() {
    const rows = (await read(finance.getCategories())) || [];
    return new Map(rows.map((category) => [String(category.id ?? category.local_id), category]));
  }

  return {
    async summary(args) {
      const month = month_of(args);
      const dashboard = (await read(finance.getDashboard({ month }))) || {};
      const totals = dashboard.totals || {};
      const credit = dashboard.credit || {};
      const invested = dashboard.investment_summary || {};
      const expenses = (dashboard.macro_distribution || [])
        .map((item) => ({ name: item.macro_category || item.name || "Geral", amount: money(item.total ?? item.amount) }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      return {
        ...meta(month),
        income: money(totals.income),
        expense: money(totals.expense),
        balance: money(totals.balance),
        transfer_in: money(totals.transfer_in),
        transfer_out: money(totals.transfer_out),
        top_expenses: expenses.slice(0, TOP_CATEGORIES),
        credit: { expense: money(credit.expense), unassigned: money(credit.unassigned), review_count: Number(credit.review_count || 0) },
        investments: {
          invested: money(invested.month_invested),
          withdrawn: money(invested.month_withdrawn),
          net: money(invested.month_net),
        },
      };
    },

    async transactions(args) {
      const month = month_of(args);
      const type = args.type === "INCOME" || args.type === "EXPENSE" ? args.type : null;
      const limit = Math.min(MAX_TRANSACTIONS, Math.max(1, finite_number(args.limit, { min: 1 }) ?? DEFAULT_TRANSACTIONS));
      const query = text(args.query, 120);
      const category = text(args.category, 120);
      const sort = args.sort === "largest" ? "largest" : "recent";

      const [rows, categories] = await Promise.all([
        read(finance.listTransactions({ month, limit: 1000 })),
        category ? categories_by_id() : Promise.resolve(new Map()),
      ]);
      let list = (rows || []).filter((item) => !item.is_ignored && item.status !== "CANCELED"
        && transactionReferenceMonth(item) === month && (!type || item.type === type));

      if (query && normalize_spoken(query)) {
        const matches = rank_matches(list, query, { name: (item) => transactionDescription(item), threshold: 50, limit: 1000 });
        // A fala "mercado" deve achar "Compra em Mercado Bom Preço": também vale conter todas as palavras.
        const wanted = normalize_spoken(query).split(" ");
        const contained = list.filter((item) => {
          const haystack = normalize_spoken(`${transactionDescription(item)} ${item.observation || ""}`);
          return wanted.every((word) => haystack.includes(word));
        });
        const keep = new Set([...matches.map((entry) => entry.item), ...contained]);
        list = list.filter((item) => keep.has(item));
      }
      if (category && normalize_spoken(category)) {
        const wanted = normalize_spoken(category);
        list = list.filter((item) => {
          const row = categories.get(String(item.category_id ?? ""));
          const names = [item.category_name, row?.name, row?.macro_category].map((name) => normalize_spoken(name));
          return names.some((name) => name && (name === wanted || name.includes(wanted) || wanted.includes(name)));
        });
      }

      const sum = (kind) => money(list.filter((item) => item.type === kind).reduce((total, item) => total + Number(item.amount || 0), 0));
      const ordered = [...list].sort(sort === "largest"
        ? (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
        : (a, b) => String(transactionCalendarDate(b)).localeCompare(String(transactionCalendarDate(a))));
      return {
        ...meta(month),
        count: list.length,
        expense: sum("EXPENSE"),
        income: sum("INCOME"),
        transactions: ordered.slice(0, limit).map((item) => ({
          date: String(transactionCalendarDate(item)).slice(0, 10),
          description: text(transactionDescription(item), 120),
          amount: money(item.amount),
          type: item.type,
          category: item.category_name || categories.get(String(item.category_id ?? ""))?.name || "",
          payment: paymentMethodLabel(item.payment_method),
        })),
      };
    },

    async investments(args) {
      const month = month_of(args);
      const data = (await read(finance.getInvestments({ month }))) || {};
      const summary = data.summary || {};
      return {
        ...meta(month),
        summary: {
          month_invested: money(summary.month_invested),
          month_withdrawn: money(summary.month_withdrawn),
          month_net: money(summary.month_net),
          total_invested: money(summary.total_invested),
          total_yield: money(summary.total_yield),
          total_withdrawn: money(summary.total_withdrawn),
          estimated_balance: money(summary.estimated_balance),
        },
        categories: (data.category_distribution || [])
          .map((item) => ({ name: item.category_name || "Sem categoria", balance: money(item.estimated_balance) }))
          .filter((item) => item.balance !== 0)
          .slice(0, TOP_CATEGORIES),
        goals: (data.goals || [])
          .filter((goal) => !goal.is_archived)
          .map((goal) => ({
            name: text(goal.name, 80),
            target: money(goal.target_amount),
            current: money(goal.current_amount ?? goal.linked_amount),
            target_date: goal.target_date ? String(goal.target_date).slice(0, 10) : null,
          }))
          .slice(0, 10),
      };
    },

    async wealth() {
      const { data, offline } = await with_timeout(physical.overview());
      const summary = data?.summary || {};
      return {
        offline: offline === true || !online(),
        consolidated_total: money(summary.consolidated_total),
        digital_accounts: money(summary.digital_accounts),
        digital_investments: money(summary.digital_investments),
        cash: money(summary.cash),
        metals: summary.missing_quotes ? null : money(summary.metals),
        missing_quotes: summary.missing_quotes === true,
      };
    },

    async cards(args) {
      const month = month_of(args);
      const [cards, dashboard] = await Promise.all([read(finance.getCreditCards()), read(finance.getDashboard({ month }))]);
      const byCard = new Map(((dashboard?.credit || {}).by_card || []).map((item) => [String(item.credit_card_id ?? ""), item]));
      const active = (cards || []).filter((card) => !Number(card.is_archived));
      return {
        ...meta(month),
        total: money(dashboard?.credit?.expense),
        unassigned: money(dashboard?.credit?.unassigned),
        cards: active.map((card) => {
          const spent = byCard.get(String(card.id ?? "")) || byCard.get(String(card.local_key ?? ""));
          return {
            name: text(card.name, 60),
            brand: text(card.brand, 30),
            last_four: text(card.last_four, 4),
            spent: money(spent?.total),
            purchases: Number(spent?.count || 0),
          };
        }),
      };
    },

    async budget(args) {
      const month = month_of(args);
      const groups = (await read(finance.getBudgets({ month }))) || [];
      const rows = groups
        .map((group) => ({
          name: group.macro_category || "Geral",
          planned: money(group.planned_amount),
          actual: money(group.actual_amount),
        }))
        .filter((group) => group.planned > 0 || group.actual > 0);
      return {
        ...meta(month),
        planned: money(rows.reduce((total, row) => total + row.planned, 0)),
        actual: money(rows.reduce((total, row) => total + row.actual, 0)),
        groups: rows.sort((a, b) => b.actual - a.actual).slice(0, 8),
      };
    },
  };
}
