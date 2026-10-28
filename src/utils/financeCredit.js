export const PAYMENT_METHODS = [
  { value: "UNKNOWN", label: "Não informado" },
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Crédito" },
  { value: "DEBIT_CARD", label: "Débito" },
  { value: "CARD", label: "Cartão (modalidade a revisar)" },
  { value: "BOLETO", label: "Boleto" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "CASH", label: "Dinheiro em espécie" },
  { value: "MIXED", label: "Misto (inclui espécie)" },
];
// Cash only comes from fiscal receipts/proofs that specify it (see Patrimônio Físico), so it is never a manual choice.
export const CASH_PAYMENT_METHODS = ["CASH", "MIXED"];
export const paymentMethodChoices = (current) =>
  PAYMENT_METHODS.filter((m) => !CASH_PAYMENT_METHODS.includes(m.value) || m.value === current);
export const paymentMethodLabel = (method) => PAYMENT_METHODS.find((m) => m.value === method)?.label || "Não informado";
export const cardLabel = (card) =>
  card ? `${card.name} · ${card.brand} •• ${card.last_four}` : "Cartão a identificar";
export const normalizePaymentOrigin = (data, current = {}) => {
  const method = data.payment_method ?? current.payment_method ?? "UNKNOWN";
  const expense = (data.type ?? current.type) === "EXPENSE";
  const card =
    expense && method === "CREDIT_CARD"
      ? (data.credit_card_id !== undefined ? data.credit_card_id : current.credit_card_id) || null
      : null;
  return {
    payment_method: method,
    credit_card_id: card,
    payment_review_reason: !expense
      ? null
      : method === "CREDIT_CARD" && !card
        ? "Selecione o cartão desta compra."
        : ["UNKNOWN", "CARD"].includes(method)
          ? "Confirme o meio de pagamento."
          : null,
  };
};
export const creditSummary = (transactions, categories = []) => {
  const byCategory = new Map(),
    byCard = new Map();
  let expense = 0,
    unassigned = 0,
    review_count = 0;
  for (const tx of transactions) {
    if (tx.type !== "EXPENSE" || tx.is_ignored || tx.status === "CANCELED") continue;
    if (tx.payment_review_reason) review_count++;
    if (tx.payment_method !== "CREDIT_CARD") continue;
    const amount = Math.round(Number(tx.amount) * 100);
    expense += amount;
    if (!tx.credit_card_id) unassigned += amount;
    const category = categories.find((c) => String(c.id) === String(tx.category_id));
    const key = String(tx.category_id || "none");
    const item = byCategory.get(key) || {
      category_id: tx.category_id,
      macro_category: category?.name || tx.category_name || "Sem categoria",
      color: category?.color || tx.category_color || "#999999",
      total: 0,
    };
    item.total += amount;
    byCategory.set(key, item);
    const cardKey = String(tx.credit_card_id || "none");
    const card = byCard.get(cardKey) || {
      credit_card_id: tx.credit_card_id || null,
      total: 0,
      count: 0,
      categories: [],
    };
    const cardCategory = card.categories.find((c) => String(c.category_id) === String(tx.category_id));
    if (cardCategory) cardCategory.total += amount / 100;
    else card.categories.push({ ...item, total: amount / 100 });
    card.total += amount;
    card.count++;
    byCard.set(cardKey, card);
  }
  const finalize = (map) =>
    [...map.values()]
      .map((v) => ({
        ...v,
        total: v.total / 100,
        expense: v.total / 100,
        ...(v.categories ? { categories: v.categories.map((c) => ({ ...c, total: Number(c.total.toFixed(2)) })) } : {}),
      }))
      .sort((a, b) => b.total - a.total);
  return {
    expense: expense / 100,
    unassigned: unassigned / 100,
    review_count,
    categories: finalize(byCategory),
    by_card: finalize(byCard),
  };
};
