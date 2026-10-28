export function orderedReceiptColumns(columns, order = []) {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  return [...new Set([...order, ...columns.map((column) => column.key)])]
    .filter((key) => byKey.has(key)).map((key) => byKey.get(key));
}

export function moveReceiptColumn(order, from, to) {
  if (from === to || !order.includes(from) || !order.includes(to)) return [...order];
  const next = order.filter((key) => key !== from);
  next.splice(order.indexOf(to), 0, from);
  return next;
}

export function sortReceiptRows(rows, column, direction) {
  if (!column || !direction) return rows;
  const sign = direction === 'desc' ? -1 : 1;
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const left = a.row[column.key], right = b.row[column.key];
    if (left == null || left === '') return right == null || right === '' ? a.index - b.index : 1;
    if (right == null || right === '') return -1;
    const difference = column.numeric
      ? Number(left) - Number(right)
      : String(left).localeCompare(String(right), 'pt-BR', { sensitivity: 'base', numeric: true });
    return (Number.isFinite(difference) ? difference * sign : 0) || a.index - b.index;
  }).map(({ row }) => row);
}
