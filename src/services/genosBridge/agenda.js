import { addDays, dateFromKey, dayKey, healthItems, startOfDay, toAgendaItem } from "@/utils/agendaCalendar";
import {
  BRIDGE_ERRORS,
  BridgeError,
  finite_number,
  format_local_datetime,
  parse_local_datetime,
  rank_matches,
} from "@/utils/genos_bridge";
import { normalize_spoken } from "@/utils/genos_command";

const HOUR_MS = 60 * 60 * 1000;
const MAX_LIST = 100;
const DEFAULT_LIST = 40;
const DEFAULT_FIND = 5;
const FIND_BACK_DAYS = 7;
const FIND_AHEAD_DAYS = 365;
const MAX_OVERDUE = 5;

const text = (value, max) => String(value ?? "").trim().slice(0, max);

const bad_request = (message) => new BridgeError(BRIDGE_ERRORS.BAD_REQUEST, message);

function parse_day(value, label) {
  const parsed = parse_local_datetime(value);
  if (!parsed) throw bad_request(`${label} inválida.`);
  return startOfDay(parsed.date);
}

/** Um item da Agenda como o Genos o recebe: horários locais "AAAA-MM-DDTHH:mm" (dia inteiro: "AAAA-MM-DD", fim inclusivo). */
export function serialize_agenda_item(item) {
  const { start, end, allDay } = item.span;
  const out = {
    key: item.kind === "event" ? item.event.local_key : item.schedule.local_key,
    title: item.title,
    all_day: allDay,
    start: allDay ? dayKey(start) : format_local_datetime(start),
    end: allDay ? dayKey(addDays(end, -1)) : format_local_datetime(end),
    location: item.location || "",
    source: item.source,
    editable: item.kind === "event",
  };
  if (item.kind === "event") {
    const notes = text(item.description, 200);
    if (notes) out.notes = notes;
  } else {
    out.state = item.state;
    out.type = item.typeLabel;
  }
  return out;
}

export function createAgendaOps({ agenda, health, now = () => new Date() }) {
  async function load() {
    await Promise.all([agenda.loadLocalEvents(), health.loadLocalRecords({ force: true })]);
  }

  const eventItems = () => agenda.events.map(toAgendaItem);

  // Agendamentos do Health (pendentes, atrasados e repetições previstas) até o fim da janela; os concluídos não entram.
  function healthWindowItems(horizon) {
    return healthItems({
      schedules: health.schedules,
      events: health.events,
      nextDueAt: health.nextDueAt,
      now: now(),
      horizon,
    }).filter((item) => item.state !== "done");
  }

  const sorter = (left, right) => {
    if (left.span.allDay !== right.span.allDay) return left.span.allDay ? -1 : 1;
    return left.span.start - right.span.start || left.title.localeCompare(right.title, "pt-BR");
  };

  function overlapping(items, start, end) {
    return items.filter((item) => item.span.start < end && item.span.end > start);
  }

  function requireEvent(key) {
    const current = agenda.events.find((event) => event.local_key === key);
    if (!current) throw new BridgeError(BRIDGE_ERRORS.NOT_FOUND, "Não encontrei esse compromisso na agenda.");
    return current;
  }

  // Um compromisso criado pelo Genos duas vezes (pedido repetido) não vira duplicata.
  function findDuplicate(title, startIso, allDay) {
    const wanted = normalize_spoken(title);
    return agenda.events.find((event) =>
      normalize_spoken(event.title) === wanted && event.all_day === allDay && new Date(event.start_at).getTime() === new Date(startIso).getTime());
  }

  return {
    async list(args) {
      await load();
      const from = parse_day(args.from, "Data inicial");
      const lastDay = parse_day(args.to || args.from, "Data final");
      if (lastDay < from) throw bad_request("A data final vem antes da inicial.");
      const to = addDays(lastDay, 1);
      const limit = Math.min(MAX_LIST, Math.max(1, finite_number(args.limit, { min: 1 }) ?? DEFAULT_LIST));

      const inRange = (item) => item.span.start < to && item.span.end > from;
      const all = [...eventItems().filter(inRange), ...healthWindowItems(to).filter(inRange)].sort(sorter);
      const result = { items: all.slice(0, limit).map(serialize_agenda_item), total: all.length };

      // Quem consulta o dia de hoje (ou um período que o inclui) também quer saber o que ficou para trás no Health.
      const today = startOfDay(now());
      if (from <= today && today < to) {
        const overdue = healthWindowItems(to).filter((item) => item.state === "overdue" && item.span.start < today);
        result.overdue_health = overdue.length;
        result.overdue = overdue.sort(sorter).slice(0, MAX_OVERDUE).map(serialize_agenda_item);
      }
      return result;
    },

    async find(args) {
      await load();
      const query = text(args.query, 120);
      if (!normalize_spoken(query)) throw bad_request("Diga o nome do compromisso.");
      const today = startOfDay(now());
      const from = args.from ? parse_day(args.from, "Data inicial") : addDays(today, -FIND_BACK_DAYS);
      const to = args.to ? addDays(parse_day(args.to, "Data final"), 1) : addDays(today, FIND_AHEAD_DAYS);
      const limit = Math.min(10, Math.max(1, finite_number(args.limit, { min: 1 }) ?? DEFAULT_FIND));

      const candidates = [...eventItems(), ...healthWindowItems(to)].filter((item) => item.span.start < to && item.span.end > from);
      const current = now();
      const matches = rank_matches(candidates, query, { name: (item) => item.title, limit: 20 })
        // Entre nomes igualmente bons, o próximo compromisso vem antes do já passado.
        .sort((a, b) => b.score - a.score
          || (a.item.span.start < current) - (b.item.span.start < current)
          || a.item.span.start - b.item.span.start)
        .slice(0, limit);
      return { matches: matches.map(({ item, score }) => ({ ...serialize_agenda_item(item), score })) };
    },

    async create(args) {
      await load();
      const title = text(args.title, 200);
      if (!title) throw bad_request("Informe o título do compromisso.");
      const allDay = args.all_day === true;
      const start = parse_local_datetime(args.start);
      if (!start) throw bad_request("Informe uma data válida para o compromisso.");

      let data;
      if (allDay) {
        const end = args.end ? parse_local_datetime(args.end) : start;
        if (!end) throw bad_request("Informe uma data final válida.");
        data = { title, all_day: true, start_day: dayKey(start.date), end_day: dayKey(end.date) };
      } else {
        if (start.dateOnly) throw bad_request("Informe o horário do compromisso.");
        const endParsed = args.end ? parse_local_datetime(args.end) : null;
        if (args.end && (!endParsed || endParsed.dateOnly)) throw bad_request("Informe um horário final válido.");
        const end = endParsed ? endParsed.date : new Date(start.date.getTime() + HOUR_MS);
        data = { title, all_day: false, start_at: start.date.toISOString(), end_at: end.toISOString() };
      }
      data.location = text(args.location, 255);
      data.description = text(args.description, 4000);

      const startIso = allDay ? dateFromKey(data.start_day).toISOString() : data.start_at;
      const duplicate = allDay ? null : findDuplicate(title, startIso, false);
      if (duplicate) return { event: serialize_agenda_item(toAgendaItem(duplicate)), already_exists: true, conflicts: [] };

      const created = await agenda.createEvent(data);
      const item = toAgendaItem(created);
      const conflicts = overlapping([...eventItems(), ...healthWindowItems(item.span.end)], item.span.start, item.span.end)
        .filter((other) => other.key !== item.key)
        .sort(sorter);
      return { event: serialize_agenda_item(item), conflicts: conflicts.slice(0, 3).map(serialize_agenda_item) };
    },

    async update(args) {
      await load();
      const current = requireEvent(args.key);
      const patch = args.patch && typeof args.patch === "object" ? args.patch : {};
      const span = toAgendaItem(current).span;

      const title = patch.title !== undefined ? text(patch.title, 200) : current.title;
      if (!title) throw bad_request("Informe o título do compromisso.");
      const allDay = patch.all_day !== undefined ? patch.all_day === true : current.all_day === true;
      const startPatch = patch.start !== undefined ? parse_local_datetime(patch.start) : null;
      const endPatch = patch.end !== undefined ? parse_local_datetime(patch.end) : null;
      if (patch.start !== undefined && !startPatch) throw bad_request("Informe uma data válida.");
      if (patch.end !== undefined && !endPatch) throw bad_request("Informe uma data final válida.");

      const data = {
        title,
        all_day: allDay,
        location: patch.location !== undefined ? text(patch.location, 255) : current.location,
        description: patch.description !== undefined ? text(patch.description, 4000) : current.description,
      };

      if (allDay) {
        const lastDay = addDays(span.end, -1);
        const startDay = startPatch ? startOfDay(startPatch.date) : span.start;
        let endDay;
        if (endPatch) endDay = startOfDay(endPatch.date);
        else if (current.all_day && startPatch) endDay = addDays(startDay, Math.round((lastDay - span.start) / (24 * HOUR_MS)));
        else endDay = current.all_day ? lastDay : startDay;
        data.start_day = dayKey(startDay);
        data.end_day = dayKey(endDay);
      } else {
        // Um compromisso de dia inteiro que passa a ter hora precisa de um horário novo.
        if (startPatch?.dateOnly || (current.all_day && !startPatch)) throw bad_request("Informe o horário do compromisso.");
        const start = startPatch ? startPatch.date : span.start;
        let end;
        if (endPatch) {
          if (endPatch.dateOnly) throw bad_request("Informe um horário final válido.");
          end = endPatch.date;
        } else if (startPatch && !current.all_day) {
          end = new Date(start.getTime() + (span.end - span.start));
        } else {
          end = new Date(start.getTime() + HOUR_MS);
        }
        data.start_at = start.toISOString();
        data.end_at = end.toISOString();
      }

      const updated = await agenda.updateEvent(current, data);
      const item = toAgendaItem(updated);
      const conflicts = overlapping([...eventItems(), ...healthWindowItems(item.span.end)], item.span.start, item.span.end)
        .filter((other) => other.key !== item.key)
        .sort(sorter);
      return { event: serialize_agenda_item(item), conflicts: conflicts.slice(0, 3).map(serialize_agenda_item) };
    },

    async delete(args) {
      await load();
      const current = requireEvent(args.key);
      const removed = serialize_agenda_item(toAgendaItem(current));
      await agenda.deleteEvent(current);
      return { deleted: removed };
    },
  };
}
