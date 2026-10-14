import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadKanbanSyncs, normalizeKanbanSyncs } from '../src/utils/kanbanSyncState.js';

test('cursor inválido ou armazenamento indisponível inicia um pull completo', () => {
  const previous = globalThis.localStorage;
  try {
    for (const value of ['null', '[]', 'true', '"texto"', '{inválido', '{"908":null}', '{"908":"sem data"}']) {
      globalThis.localStorage = { getItem: key => key === 'kadem_kanban_semantics_version' ? '1' : value };
      assert.deepEqual(loadKanbanSyncs(), {});
    }
    globalThis.localStorage = { getItem() { throw new Error('Acesso bloqueado'); } };
    assert.deepEqual(loadKanbanSyncs(), {});
    assert.deepEqual(normalizeKanbanSyncs({ 908: '2026-10-14T15:00:00.000Z', 909: null }), { 908: '2026-10-14T15:00:00.000Z' });
  } finally { globalThis.localStorage = previous; }
});
