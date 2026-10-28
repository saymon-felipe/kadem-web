// Group only equivalent lines; keep the stored receipt and its ordering untouched.
const scaled = (value, scale) => {
  if (value == null || value === "") return null;
  const match = String(value).match(/^(\d+)(?:\.(\d+))?$/);
  if (!match || (match[2] || "").length > scale) return null;
  return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt((match[2] || "").padEnd(scale, "0") || "0");
};

const formatScaled = (value, scale) => {
  const digits = value.toString().padStart(scale + 1, "0");
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
};

export function matchingReceiptItemIds(items, target) {
  const identity = (item) => item.gtin ? `gtin:${item.gtin}` : item.supplier_code ? `sku:${item.supplier_code}` : item.description ? `name:${item.description}|${item.unit || ''}` : null;
  const key = identity(target);
  return items.filter((item) => item.id != null && (key == null ? item.id === target.id : identity(item) === key)).map((item) => item.id);
}

export function groupReceiptItems(items = []) {
  const groups = new Map();
  const result = [];
  for (const item of items) {
    const quantity = scaled(item.quantity, 6);
    const total = scaled(item.total, 2);
    const price = scaled(item.unit_price, 10);
    const identifiable = item.product_id != null || item.gtin || item.supplier_code;
    const key = identifiable && item.id != null && quantity != null && total != null && price != null
      ? JSON.stringify([item.description, item.gtin || "", item.supplier_code || "", item.unit || "", price.toString(), item.product_id ?? null])
      : null;
    const existing = key == null ? null : groups.get(key);
    if (existing) {
      existing.quantitySum += quantity;
      existing.totalSum += total;
      existing.row.quantity = formatScaled(existing.quantitySum, 6);
      existing.row.total = formatScaled(existing.totalSum, 2);
      existing.row.groupItemIds.push(item.id);
    } else {
      const row = { ...item, groupItemIds: [item.id] };
      result.push(row);
      if (key != null) groups.set(key, { row, quantitySum: quantity, totalSum: total });
    }
  }
  return result;
}
