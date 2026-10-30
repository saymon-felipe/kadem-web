// Genos and fiscal receipts use absolute timestamps; CSV/manual dates retain calendar semantics.
const notificationClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export const isGenosNotification = (transaction) => transaction?.provider === "GENOS_NOTIFICATION";
export const isAbsoluteFinanceDate = (transaction) => ['GENOS_NOTIFICATION','FISCAL_RECEIPT'].includes(transaction?.provider);

const genosMethodLabels = { UNKNOWN: "Meio não informado", CREDIT_CARD: "Crédito", DEBIT_CARD: "Débito", CARD: "Cartão", PIX: "Pix", BOLETO: "Boleto", TRANSFER: "Transferência" };
const genosDescriptionPattern = /^([^:]+):\s*(UNKNOWN|CREDIT_CARD|DEBIT_CARD|CARD|PIX|BOLETO|TRANSFER|Meio não informado|Transação|Crédito|Débito|Cartão|Pix|Boleto|Transferência)\s+(recebido de|para)\s+(.+)$/i;
const genosDescriptionParts = (transaction) => isGenosNotification(transaction)
  ? genosDescriptionPattern.exec(transaction?.description || "") : null;

export function transactionCalendarDate(transaction) {
  const value = transaction?.transaction_date;
  if (!isAbsoluteFinanceDate(transaction) || !value) return value || "";
  const raw = String(value).trim();
  // A date without a zone is already a calendar date (for example after a manual edit).
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(notificationClock.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function transactionReferenceMonth(transaction) {
  return transaction?.reference_month || String(transactionCalendarDate(transaction) || "").slice(0, 7);
}

export function transactionDescription(transaction) {
  const value = transaction?.description || "";
  const parts = genosDescriptionParts(transaction);
  if (!parts) return isGenosNotification(transaction) ? value.replace(/^([^:]+:\s*)UNKNOWN\b/, "$1Transação") : value;
  const [, bank, originalMethod, direction, counterparty] = parts;
  const income = transaction.type === "INCOME" || (!transaction.type && direction.toLowerCase() === "recebido de");
  const purchase = ["CREDIT_CARD", "DEBIT_CARD", "CARD"].includes(transaction.payment_method)
    || (!transaction.payment_method && /^(CREDIT_CARD|DEBIT_CARD|CARD|Crédito|Débito|Cartão)$/i.test(originalMethod));
  const action = income ? "Recebimento" : purchase ? "Compra" : transaction.type === "EXPENSE" ? "Pagamento" : "Transação";
  if (/^contraparte n[ãa]o informada$/i.test(counterparty.trim())) return `${bank.trim()}: ${action}`;
  return `${bank.trim()}: ${action} ${income ? "de" : purchase ? "em" : "para"} ${counterparty}`;
}

export function editedTransactionDate(transaction, calendarDay) {
  const original = String(transaction?.transaction_date || '');
  if (!original) return calendarDay;
  const calendar = transactionCalendarDate(transaction);
  if (calendar.slice(0,10) === calendarDay) return original;
  if (isAbsoluteFinanceDate(transaction)) {
    const fraction = /[T ]\d{2}:\d{2}:\d{2}(\.\d+)/.exec(original)?.[1] || '';
    return `${calendarDay}T${calendar.slice(11,19) || '00:00:00'}${fraction}-03:00`;
  }
  return calendarDay + original.slice(10);
}

export function transactionObservation(transaction) {
  const value = transaction?.observation || "";
  if (!isGenosNotification(transaction)) return value;
  const parts = genosDescriptionParts(transaction);
  const metadata = /^(.+?) · (.+?) · (.+)$/.exec(value);
  if (parts && metadata && parts[1].trim() === metadata[1].trim() && parts[4].trim() === metadata[3].trim()
    && [...Object.keys(genosMethodLabels), ...Object.values(genosMethodLabels)].includes(metadata[2])) return "";
  return value.replace(/ · (UNKNOWN|CREDIT_CARD|DEBIT_CARD|CARD|PIX|BOLETO|TRANSFER) · /, (_, method) => ` · ${genosMethodLabels[method]} · `);
}
