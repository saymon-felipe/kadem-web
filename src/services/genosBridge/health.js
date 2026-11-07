import {
  HEALTH_OBJECT_TYPE_OPTIONS,
  HEALTH_SCHEDULE_TYPE_OPTIONS,
  isHealthObject,
  isHealthRecurring,
  isHealthRoutine,
  isHealthScheduled,
  isHealthStockObject,
} from "@/utils/healthObjectTypes";
import {
  BRIDGE_ERRORS,
  BridgeError,
  finite_number,
  format_local_datetime,
  parse_local_datetime,
  rank_matches,
} from "@/utils/genos_bridge";
import { normalize_spoken } from "@/utils/genos_command";

const DEFAULT_LIST = 30;
const MAX_LIST = 100;
const FREQUENCY_UNITS = ["hours", "days", "weeks", "months"];
const DEFAULT_WARNING_DAYS = 7;
const KINDS = new Set(["all", "schedules", "supplies", "entities"]);

const text = (value, max) => String(value ?? "").trim().slice(0, max);
const bad_request = (message) => new BridgeError(BRIDGE_ERRORS.BAD_REQUEST, message);
const type_label = (type) => HEALTH_OBJECT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;

function parse_anchor(value) {
  const parsed = parse_local_datetime(value);
  if (!parsed) throw bad_request("Informe uma data válida para o agendamento.");
  // Sem horário falado, o agendamento vale para o início da manhã (como a pessoa espera de "dia 10").
  if (parsed.dateOnly) parsed.date.setHours(9, 0, 0, 0);
  return parsed.date.toISOString();
}

/**
 * Converte a configuração falada em campos de agendamento do Health. `recurrence`: { unit, value } ou null.
 * `schedule.enabled === false` desliga o agendamento.
 */
function schedule_fields(schedule, { creating }) {
  if (schedule === undefined || schedule === null) return {};
  if (typeof schedule !== "object") throw bad_request("Agendamento inválido.");
  if (schedule.enabled === false) return { schedule_enabled: false, recurrence_enabled: false };

  const fields = { schedule_enabled: true };
  if (schedule.anchor !== undefined) fields.anchor_date = parse_anchor(schedule.anchor);
  else if (creating) throw bad_request("Informe a data do agendamento.");

  if (schedule.recurrence !== undefined) {
    if (schedule.recurrence === null) {
      fields.recurrence_enabled = false;
    } else {
      const unit = String(schedule.recurrence?.unit ?? "");
      const value = finite_number(schedule.recurrence?.value, { min: 1, max: 1000 });
      if (!FREQUENCY_UNITS.includes(unit) || !Number.isInteger(value)) throw bad_request("Informe um intervalo de repetição válido.");
      fields.recurrence_enabled = true;
      fields.frequency_unit = unit;
      fields.frequency_value = value;
    }
  } else if (creating) {
    fields.recurrence_enabled = false;
  }

  if (schedule.warning_before !== undefined) {
    const warning = finite_number(schedule.warning_before, { min: 0, max: 365 });
    if (!Number.isInteger(warning)) throw bad_request("Informe um aviso prévio válido.");
    fields.warning_before = warning;
  } else if (creating) {
    fields.warning_before = DEFAULT_WARNING_DAYS;
  }
  return fields;
}

export function createHealthOps({ health, now = () => new Date() }) {
  const load = () => health.loadLocalRecords({ force: true });

  // Entidades e agendamentos; rastreadores e grupos de rastreadores são de outra parte do Health.
  const objects = () => health.objects.filter(isHealthObject);

  function describe(object) {
    const out = {
      key: object.local_key,
      name: object.name,
      type: object.object_type,
      type_label: type_label(object.object_type),
      kind: isHealthRoutine(object) ? "schedule" : isHealthStockObject(object) ? "supply" : "entity",
    };
    const notes = text(object.notes, 200);
    if (notes) out.notes = notes;
    if (isHealthScheduled(object)) {
      const due = health.nextDueAt(object);
      const recurring = isHealthRecurring(object);
      out.schedule = {
        recurring,
        next_due: due && !Number.isNaN(new Date(due).getTime()) ? format_local_datetime(new Date(due)) : null,
        state: !due ? (object.anchor_date ? "done" : "none") : new Date(due) < now() ? "overdue" : "pending",
        every: recurring ? { unit: object.frequency_unit || "months", value: Number(object.frequency_value || 1) } : null,
        warning_before: Number(object.warning_before ?? DEFAULT_WARNING_DAYS),
      };
    }
    if (isHealthStockObject(object)) {
      const balance = health.supplyBalance(object.local_key);
      const minimum = Number(object.minimum_quantity || 0);
      out.stock = { balance, unit: object.unit || "unidades", minimum, low: balance <= minimum };
    }
    return out;
  }

  function require_object(key) {
    const current = health.findObject(key);
    if (!isHealthObject(current)) throw new BridgeError(BRIDGE_ERRORS.NOT_FOUND, "Não encontrei esse item no Health.");
    return current;
  }

  const kindFilter = (kind) => (object) => {
    if (kind === "schedules") return isHealthRoutine(object);
    if (kind === "supplies") return isHealthStockObject(object);
    if (kind === "entities") return !isHealthRoutine(object);
    return true;
  };

  function search(query, kind, limit) {
    const pool = objects().filter(kindFilter(kind));
    return rank_matches(pool, query, { name: (object) => object.name, limit });
  }

  // Entrada (compra, reposição) ou uso/gasto de um insumo. O Kadem permite saldo negativo (estoque desatualizado);
  // o Genos recebe o saldo resultante para avisar.
  async function record_supply(args, movement_type) {
    await load();
    const supply = require_object(args.key);
    if (!isHealthStockObject(supply)) throw bad_request("Esse item não controla estoque.");
    const quantity = finite_number(args.quantity, { min: 0 });
    if (!quantity) throw bad_request("Informe uma quantidade maior que zero.");
    const when = args.when ? parse_local_datetime(args.when) : null;
    if (args.when && !when) throw bad_request("Informe uma data válida.");
    await health.recordSupplyMovement({
      object_key: supply.local_key,
      movement_type,
      quantity,
      notes: text(args.notes, 500),
      occurred_at: when ? when.date.toISOString() : undefined,
    });
    return { object: describe(health.findObject(supply.local_key)), quantity, movement: movement_type === "ENTRY" ? "entry" : "use" };
  }

  return {
    async list(args) {
      await load();
      const kind = KINDS.has(args.kind) ? args.kind : "all";
      const limit = Math.min(MAX_LIST, Math.max(1, finite_number(args.limit, { min: 1 }) ?? DEFAULT_LIST));
      const query = text(args.query, 120);
      let items = query && normalize_spoken(query)
        ? search(query, kind, MAX_LIST).map((entry) => entry.item)
        : objects().filter(kindFilter(kind));
      const described = items.map(describe);
      // Agendamentos: os atrasados e os mais próximos primeiro; insumos: os abaixo do mínimo primeiro.
      described.sort((a, b) => {
        const rank = (item) => (item.schedule?.state === "overdue" ? 0 : item.stock?.low ? 1 : 2);
        const due = (item) => (item.schedule?.next_due ? Date.parse(item.schedule.next_due) : Infinity);
        return rank(a) - rank(b) || due(a) - due(b) || a.name.localeCompare(b.name, "pt-BR");
      });
      items = described.slice(0, limit);
      return {
        objects: items,
        total: described.length,
        overdue: described.filter((item) => item.schedule?.state === "overdue").length,
        low_stock: described.filter((item) => item.stock?.low).length,
      };
    },

    async find(args) {
      await load();
      const query = text(args.query, 120);
      if (!normalize_spoken(query)) throw bad_request("Diga o nome do item.");
      const kind = KINDS.has(args.kind) ? args.kind : "all";
      const limit = Math.min(10, Math.max(1, finite_number(args.limit, { min: 1 }) ?? 5));
      return { matches: search(query, kind, limit).map(({ item, score }) => ({ ...describe(item), score })) };
    },

    async create(args) {
      await load();
      const name = text(args.name, 120);
      if (!name) throw bad_request("Informe o nome.");
      const type = String(args.object_type ?? "");
      if (!HEALTH_OBJECT_TYPE_OPTIONS.some((option) => option.value === type)) throw bad_request("Tipo de item do Health inválido.");
      const isScheduleType = HEALTH_SCHEDULE_TYPE_OPTIONS.some((option) => option.value === type);
      // Consultas, exames e rotinas sempre têm data; sem ela o cadastro ficaria na lista de agendas sem data.
      if (isScheduleType && !args.schedule) throw bad_request("Informe a data do agendamento.");
      const fields = schedule_fields(args.schedule, { creating: isScheduleType || args.schedule !== undefined });

      // Um pedido repetido não duplica: o mesmo nome e tipo (e, nos agendamentos, a mesma data) já é o cadastro.
      const existing = objects().find((object) => object.object_type === type && normalize_spoken(object.name) === normalize_spoken(name)
        && (!fields.anchor_date || (object.anchor_date && new Date(object.anchor_date).getTime() === new Date(fields.anchor_date).getTime())));
      if (existing) return { object: describe(existing), already_exists: true };

      const data = { name, object_type: type, notes: text(args.notes, 2000), ...fields };
      if (isHealthStockObject({ object_type: type })) {
        data.unit = text(args.unit, 40) || "unidades";
        const minimum = finite_number(args.minimum_quantity, { min: 0 });
        if (args.minimum_quantity !== undefined && minimum === null) throw bad_request("Informe um estoque mínimo válido.");
        data.minimum_quantity = minimum ?? 0;
      }
      const created = await health.createObject(data);
      const initial = finite_number(args.initial_stock, { min: 0 });
      if (isHealthStockObject(created) && initial && initial > 0) {
        await health.recordSupplyMovement({ object_key: created.local_key, movement_type: "ENTRY", quantity: initial, notes: "Estoque inicial cadastrado" });
      }
      return { object: describe(health.findObject(created.local_key) || created) };
    },

    async update(args) {
      await load();
      const current = require_object(args.key);
      const patch = args.patch && typeof args.patch === "object" ? args.patch : {};

      // updateObject troca o cadastro inteiro: o que não foi pedido continua como está.
      const data = {
        name: patch.name !== undefined ? text(patch.name, 120) : current.name,
        notes: patch.notes !== undefined ? text(patch.notes, 2000) : current.notes || "",
      };
      if (!data.name) throw bad_request("Informe o nome.");
      if (isHealthStockObject(current)) {
        data.unit = patch.unit !== undefined ? text(patch.unit, 40) : current.unit || "unidades";
        const minimum = patch.minimum_quantity !== undefined ? finite_number(patch.minimum_quantity, { min: 0 }) : Number(current.minimum_quantity || 0);
        if (minimum === null) throw bad_request("Informe um estoque mínimo válido.");
        data.minimum_quantity = minimum;
        if (patch.stock_quantity !== undefined) {
          const stock = finite_number(patch.stock_quantity);
          if (stock === null) throw bad_request("Informe um estoque atual válido.");
          data.stock_quantity = stock;
        }
      }
      Object.assign(data, schedule_fields(patch.schedule, { creating: false }));
      // Ligar o agendamento de algo que não tinha exige a data.
      if (data.schedule_enabled === true && !isHealthScheduled(current) && data.anchor_date === undefined) {
        throw bad_request("Informe a data do agendamento.");
      }
      const updated = await health.updateObject(current, data);
      return { object: describe(health.findObject(updated.local_key) || updated) };
    },

    async delete(args) {
      await load();
      const current = require_object(args.key);
      const removed = describe(current);
      await health.deleteObject(current);
      return { deleted: removed };
    },

    entry: (args) => record_supply(args, "ENTRY"),
    use: (args) => record_supply(args, "EXIT"),
  };
}
