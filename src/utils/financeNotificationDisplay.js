// Genos supplies an absolute notification timestamp; CSV/manual dates retain their calendar semantics.
const notificationClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export const isGenosNotification = (transaction) => transaction?.provider === "GENOS_NOTIFICATION";

export function transactionCalendarDate(transaction) {
  const value = transaction?.transaction_date;
  if (!isGenosNotification(transaction) || !value) return value || "";
  const raw = String(value).trim();
  // A date without a zone is already a calendar date (for example after a manual edit).
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(notificationClock.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function transactionDescription(transaction) {
  const value = transaction?.description || "";
  return isGenosNotification(transaction) ? value.replace(/^([^:]+:\s*)UNKNOWN\b/, "$1Transação") : value;
}

export function transactionObservation(transaction) {
  const value = transaction?.observation || "";
  if (!isGenosNotification(transaction)) return value;
  const labels = { UNKNOWN: "Meio não informado", CREDIT_CARD: "Crédito", DEBIT_CARD: "Débito", CARD: "Cartão", PIX: "Pix", BOLETO: "Boleto", TRANSFER: "Transferência" };
  return value.replace(/ · (UNKNOWN|CREDIT_CARD|DEBIT_CARD|CARD|PIX|BOLETO|TRANSFER) · /, (_, method) => ` · ${labels[method]} · `);
}
