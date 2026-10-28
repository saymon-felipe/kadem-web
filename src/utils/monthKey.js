// Chaves de mês no formato YYYY-MM, usadas pelo filtro de mês do Nexo.
export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const SHORT_MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isMonthKey = (value) => MONTH_PATTERN.test(String(value ?? ""));

// O servidor do Nexo trabalha em America/Sao_Paulo; o "mês atual" segue o mesmo fuso.
export const currentMonthKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);

export const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

export const shiftMonthKey = (key, delta) => {
  const [year, month] = key.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  return monthKey(Math.floor(total / 12), total % 12);
};

export const monthLabel = (key) => {
  if (!isMonthKey(key)) return "";
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`;
};
