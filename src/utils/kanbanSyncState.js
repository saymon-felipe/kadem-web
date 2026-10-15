export function normalizeKanbanSyncs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, timestamp]) =>
    /^\d+$/.test(key) && Number(key) > 0 && (
      (typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0) ||
      (typeof timestamp === 'string' && timestamp.trim() && !Number.isNaN(Date.parse(timestamp)))
    ),
  ));
}

export function loadKanbanSyncs() {
  try {
    if (localStorage.getItem('kadem_kanban_semantics_version') !== '1') {
      localStorage.removeItem('kadem_kanban_syncs');
      localStorage.setItem('kadem_kanban_semantics_version', '1');
    }
    return normalizeKanbanSyncs(JSON.parse(localStorage.getItem('kadem_kanban_syncs') || '{}'));
  } catch {
    // Cursor é cache de sincronização: um valor inválido pede pull completo, sem apagar o quadro.
    return {};
  }
}
