import { isHealthRoutine, isHealthRecurring, HEALTH_OBJECT_TYPE_OPTIONS } from "@/utils/healthObjectTypes";

// Utilitários puros da Agenda: datas locais, grade do mês, posicionamento no dia e projeção dos agendamentos do Health.

const MINUTE = 60 * 1000;
const MIN_BLOCK_MINUTES = 30;
const MAX_PROJECTED_OCCURRENCES = 120;

export const SOURCE_LABELS = {
  manual: "Kadem",
  google: "Google Agenda",
  health: "Health",
};

// Compromissos do Kadem e do Google têm a mesma cor: a origem só aparece, discreta, no modal do compromisso.
export const SOURCE_COLORS = {
  manual: "#3b82f6",
  google: "#3b82f6",
  health: "#e25373",
};

export const capitalizeFirst = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

export function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function addDays(date, amount) {
  const day = new Date(date);
  day.setDate(day.getDate() + amount);
  return day;
}

export function addMonths(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

export function startOfWeek(date) {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

const pad = (value) => String(value).padStart(2, "0");

export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateFromKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Seis semanas a partir do domingo anterior ao dia 1, para a grade do mês nunca mudar de altura.
export function monthGrid(anchor) {
  const first = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function weekDays(anchor) {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

// Data (AAAA-MM-DD) de um instante em um fuso: compromissos de dia inteiro pertencem ao dia do fuso em que foram criados.
function dayKeyInTimezone(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return dayKey(new Date(iso));
  }
}

// Intervalo [início, fim) de um compromisso no relógio local do navegador.
export function eventSpan(event) {
  if (event.all_day) {
    const timeZone = event.timezone || "America/Sao_Paulo";
    const start = dateFromKey(dayKeyInTimezone(event.start_at, timeZone));
    let end = dateFromKey(dayKeyInTimezone(event.end_at, timeZone));
    if (end <= start) end = addDays(start, 1);
    return { start, end, allDay: true };
  }
  const start = new Date(event.start_at);
  let end = new Date(event.end_at);
  if (!(end > start)) end = new Date(start.getTime() + MIN_BLOCK_MINUTES * MINUTE);
  return { start, end, allDay: false };
}

export function spanTouchesDay(span, day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return span.start < dayEnd && span.end > dayStart;
}

// Item exibido na agenda, independentemente da origem (compromisso do Kadem, Google ou Health).
export function toAgendaItem(event) {
  return {
    key: `event:${event.local_key}`,
    kind: "event",
    source: event.source || "manual",
    title: event.title,
    location: event.location || "",
    description: event.description || "",
    span: eventSpan(event),
    event,
  };
}

export function itemsForDay(items, day) {
  return items
    .filter((item) => spanTouchesDay(item.span, day))
    .sort((left, right) => {
      if (left.span.allDay !== right.span.allDay) return left.span.allDay ? -1 : 1;
      return left.span.start - right.span.start || left.title.localeCompare(right.title, "pt-BR");
    });
}

// Colunas lado a lado para compromissos que se sobrepõem no mesmo dia (visão de semana).
export function layoutDay(items, day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const blocks = items
    .filter((item) => !item.span.allDay && spanTouchesDay(item.span, day))
    .map((item) => {
      const start = Math.max(item.span.start, dayStart);
      const end = Math.min(item.span.end, dayEnd);
      const top = (start - dayStart) / MINUTE;
      const bottom = Math.max((end - dayStart) / MINUTE, top + MIN_BLOCK_MINUTES);
      return { item, top, bottom: Math.min(bottom, 1440), column: 0, columns: 1 };
    })
    .sort((left, right) => left.top - right.top || right.bottom - left.bottom);

  let cluster = [];
  let clusterEnd = -1;
  const closeCluster = () => {
    const columns = cluster.reduce((max, block) => Math.max(max, block.column + 1), 1);
    cluster.forEach((block) => { block.columns = columns; });
    cluster = [];
  };

  for (const block of blocks) {
    if (cluster.length && block.top >= clusterEnd) closeCluster();
    const taken = new Set(cluster.filter((other) => other.bottom > block.top).map((other) => other.column));
    while (taken.has(block.column)) block.column += 1;
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, block.bottom);
  }
  closeCluster();
  return blocks;
}

function addInterval(dateValue, unit, value) {
  const date = new Date(dateValue);
  const amount = Number(value || 1);
  if (unit === "months") date.setMonth(date.getMonth() + amount);
  else if (unit === "hours") date.setHours(date.getHours() + amount);
  else if (unit === "weeks") date.setDate(date.getDate() + amount * 7);
  else date.setDate(date.getDate() + amount);
  return date;
}

const healthTypeLabel = (object) =>
  HEALTH_OBJECT_TYPE_OPTIONS.find((option) => option.value === object.object_type)?.label || "Agendamento";

function healthItem(schedule, at, state) {
  const start = new Date(at);
  return {
    key: `health:${schedule.local_key}:${state}:${start.toISOString()}`,
    kind: "health",
    source: "health",
    title: schedule.name,
    location: "",
    description: schedule.notes || "",
    typeLabel: healthTypeLabel(schedule),
    state,
    span: { start, end: new Date(start.getTime() + MIN_BLOCK_MINUTES * MINUTE), allDay: false },
    schedule,
  };
}

// Agendamentos do Health como itens somente leitura: o próximo vencimento, as conclusões já registradas e,
// para recorrências, as próximas repetições previstas (a partir do vencimento atual).
export function healthItems({ schedules = [], events = [], nextDueAt, now = new Date(), horizon }) {
  const items = [];
  const end = horizon || addDays(now, 400);

  for (const schedule of schedules) {
    if (!isHealthRoutine(schedule)) continue;

    for (const event of events) {
      if (event.event_type !== "SCHEDULE_COMPLETED" || event.object_key !== schedule.local_key) continue;
      const at = event.metadata?.scheduled_for || event.occurred_at;
      if (at && !Number.isNaN(new Date(at).getTime())) items.push(healthItem(schedule, at, "done"));
    }

    const due = nextDueAt(schedule);
    if (!due || Number.isNaN(new Date(due).getTime())) continue;
    const overdue = new Date(due) < now;
    items.push(healthItem(schedule, due, overdue ? "overdue" : "pending"));

    if (isHealthRecurring(schedule)) {
      let next = addInterval(due, schedule.frequency_unit, schedule.frequency_value);
      for (let count = 0; count < MAX_PROJECTED_OCCURRENCES && next < end; count += 1) {
        if (next >= now) items.push(healthItem(schedule, next, "projected"));
        next = addInterval(next, schedule.frequency_unit, schedule.frequency_value);
      }
    }
  }
  return items;
}

// Valores de <input type="datetime-local"> / <input type="date"> no horário local.
export function toDateTimeLocal(value) {
  const date = new Date(value);
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

export function formatTime(date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatItemWhen(item) {
  const { start, end, allDay } = item.span;
  const day = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(start);
  if (allDay) {
    const lastDay = addDays(end, -1);
    return isSameDay(start, lastDay)
      ? `${day} · dia inteiro`
      : `${day} – ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(lastDay)}`;
  }
  return item.kind === "health" || isSameDay(start, end) || end - start <= MIN_BLOCK_MINUTES * MINUTE
    ? `${day} · ${formatTime(start)}`
    : `${day} · ${formatTime(start)} – ${formatTime(end)}`;
}
