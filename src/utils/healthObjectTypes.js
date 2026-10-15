export const HEALTH_ENTITY_TYPE_OPTIONS = [
  { value: "SUPPLY", label: "Insumo / Estoque" },
  { value: "MEDICATION", label: "Medicação" },
  { value: "SYMPTOM", label: "Sintoma" },
  { value: "DEVICE", label: "Dispositivo de saúde" },
  { value: "CUSTOM", label: "Entidade livre" },
];

export const HEALTH_SCHEDULE_TYPE_OPTION = { value: "SCHEDULE", label: "Agenda recorrente / Rotina" };

export const HEALTH_SCHEDULE_TYPE_OPTIONS = [
  HEALTH_SCHEDULE_TYPE_OPTION,
  { value: "TREATMENT", label: "Tratamento" },
  { value: "EXAM", label: "Exame" },
  { value: "APPOINTMENT", label: "Consulta médica" },
];

export const HEALTH_OBJECT_TYPE_OPTIONS = [...HEALTH_ENTITY_TYPE_OPTIONS, ...HEALTH_SCHEDULE_TYPE_OPTIONS];

export function isHealthObject(object) {
  return HEALTH_OBJECT_TYPE_OPTIONS.some((option) => option.value === object?.object_type);
}

export function isHealthScheduled(object) {
  if (!isHealthObject(object)) return false;
  return typeof object.schedule_enabled === "boolean"
    ? object.schedule_enabled
    : HEALTH_SCHEDULE_TYPE_OPTIONS.some((option) => option.value === object.object_type);
}

export function isHealthRecurring(object) {
  return isHealthScheduled(object) && (typeof object.recurrence_enabled === "boolean"
    ? object.recurrence_enabled : object.object_type === "SCHEDULE");
}

export function isHealthEntity(object) {
  return isHealthObject(object) && !isHealthScheduled(object);
}

export function isHealthStockObject(object) {
  return ["SUPPLY", "MEDICATION"].includes(object?.object_type);
}
