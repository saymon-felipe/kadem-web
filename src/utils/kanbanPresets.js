import { KANBAN_COLUMN_TYPES } from "./kanbanTypes.js";

export const DEFAULT_KANBAN_PRESET = "simple";

export const KANBAN_PRESETS = Object.freeze([
  {
    id: "simple",
    name: "Simples",
    description: "Organize as tarefas do dia a dia.",
    columns: [
      { title: "A fazer", type: "TODO" },
      { title: "Em andamento", type: "IN_PROGRESS" },
      { title: "Concluído", type: "DONE" },
    ],
  },
  {
    id: "development",
    name: "Desenvolvimento",
    description: "Da demanda à entrega, com revisão e bloqueios.",
    columns: [
      { title: "Backlog", type: "BACKLOG" },
      { title: "A fazer", type: "TODO" },
      { title: "Em desenvolvimento", type: "IN_PROGRESS" },
      { title: "Em revisão", type: "REVIEW" },
      { title: "Bloqueado", type: "BLOCKED" },
      { title: "Entregue", type: "DONE" },
    ],
  },
  {
    id: "content",
    name: "Conteúdo",
    description: "Planeje, produza e aprove antes de publicar.",
    columns: [
      { title: "Ideias", type: "BACKLOG" },
      { title: "Pauta definida", type: "TODO" },
      { title: "Em produção", type: "IN_PROGRESS" },
      { title: "Em aprovação", type: "REVIEW" },
      { title: "Publicado", type: "DONE" },
    ],
  },
  {
    id: "support",
    name: "Atendimento",
    description: "Acompanhe solicitações e respostas dos clientes.",
    columns: [
      { title: "Novas solicitações", type: "TODO" },
      { title: "Em atendimento", type: "IN_PROGRESS" },
      { title: "Aguardando cliente", type: "WAITING" },
      { title: "Resolvido", type: "DONE" },
      { title: "Cancelado", type: "CANCELED" },
    ],
  },
  {
    id: "empty",
    name: "Quadro vazio",
    description: "Crie suas próprias colunas depois.",
    columns: [],
  },
]);

export const getKanbanPreset = (id) => KANBAN_PRESETS.find((preset) => preset.id === id);

export const getKanbanPresetColumns = (id) => {
  if (id == null) return [];
  const preset = getKanbanPreset(id);
  if (!preset) throw new Error("Modelo de kanban inválido.");
  return preset.columns.map((column, order) => ({ ...column, order }));
};

export const getKanbanPresetRules = (id) => {
  const preset = getKanbanPreset(id);
  if (!preset?.columns.length) return [];
  const types = new Set(preset.columns.map((column) => column.type));
  const rules = ["O status da tarefa acompanha o tipo da coluna."];
  if (types.has("TODO") && types.has("IN_PROGRESS")) {
    const pending = preset.columns.find((column) => column.type === "TODO");
    const started = preset.columns.find((column) => column.type === "IN_PROGRESS");
    rules.push(
      `Ao mover de “${pending.title}” para “${started.title}”, tarefas com responsável “Qualquer” são atribuídas a quem as moveu.`,
    );
  }
  if (types.has("DONE")) {
    const completed = preset.columns.find((column) => column.type === "DONE");
    rules.push(`Em “${completed.title}”, as tarefas ficam concluídas.`);
  }
  return rules;
};

export const getPresetColumnType = (type) => KANBAN_COLUMN_TYPES.find((option) => option.value === type);
