export const KANBAN_COLUMN_TYPES = Object.freeze([
  {
    value: 'BACKLOG',
    label: 'Backlog',
    description: 'Ideias e demandas ainda não priorizadas.',
    icon: 'box-archive',
    color: '#8b9cb5',
  },
  {
    value: 'TODO',
    label: 'A fazer',
    description: 'Trabalho planejado, ainda não iniciado.',
    icon: 'list-check',
    color: '#3b82f6',
  },
  {
    value: 'IN_PROGRESS',
    label: 'Em andamento',
    description: 'Trabalho iniciado e em execução.',
    icon: 'clock-rotate-left',
    color: '#f59e0b',
  },
  {
    value: 'WAITING',
    label: 'Aguardando',
    description: 'Aguardando uma resposta ou dependência.',
    icon: 'clock',
    color: '#a855f7',
  },
  {
    value: 'BLOCKED',
    label: 'Bloqueado',
    description: 'Trabalho impedido de continuar.',
    icon: 'triangle-exclamation',
    color: '#ef4444',
  },
  {
    value: 'REVIEW',
    label: 'Em revisão',
    description: 'Trabalho aguardando revisão ou aprovação.',
    icon: 'eye',
    color: '#06b6d4',
  },
  {
    value: 'DONE',
    label: 'Concluído',
    description: 'Trabalho concluído.',
    icon: 'circle-check',
    color: '#10b981',
  },
  {
    value: 'CANCELED',
    label: 'Cancelado',
    description: 'Trabalho encerrado sem conclusão.',
    icon: 'xmark',
    color: '#64748b',
  },
]);

export const DEFAULT_COLUMN_TYPE = 'TODO';
export const isColumnType = (type) => KANBAN_COLUMN_TYPES.some(option => option.value === type);
export const normalizeColumn = (column) => ({
  ...column,
  title: column.title ?? column.name,
  name: column.title ?? column.name,
  type: column.type ?? DEFAULT_COLUMN_TYPE,
  order: column.order ?? column.position ?? column.order_index ?? 0,
  position: column.order ?? column.position ?? column.order_index ?? 0,
});
