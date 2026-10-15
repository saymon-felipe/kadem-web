import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import 'fake-indexeddb/auto';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createPinia, setActivePinia } from 'pinia';
import { readSyncTimestamp, writeSyncTimestamp, normalizeSyncCursor } from '../src/utils/syncState.js';
import { normalizeWindowStates } from '../src/utils/windowState.js';

async function withModules(run) {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
  globalThis.Audio = class { play() {} pause() {} addEventListener() {} removeEventListener() {} };
  const server = await createServer({ configFile: false, root: process.cwd(),
    plugins: [{ name: 'stub-router', enforce: 'pre', resolveId(id) { if (/router(\/index(\.js)?)?$/.test(id)) return '\0stub-router'; }, load(id) { if (id === '\0stub-router') return 'export default { push() {}, currentRoute: { value: {} } };'; } }, vue()],
    resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error' });
  let db;
  try {
    ({ db } = await server.ssrLoadModule('/src/db.js'));
    setActivePinia(createPinia());
    const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js');
    useAuthStore().user = { id: 'module-recovery-test' };
    const { api } = await server.ssrLoadModule('/src/plugins/api.js');
    await run({ server, db, api, storage });
  } finally { db?.close(); await server.close(); }
}

test('cursores escalares inválidos e janelas salvas corrompidas recebem valores seguros', () => {
  const previous = globalThis.localStorage;
  try {
    for (const timestamp of ['null', 'undefined', 'sem data', '']) {
      globalThis.localStorage = { getItem: () => timestamp };
      assert.equal(readSyncTimestamp('cursor'), null);
    }
    globalThis.localStorage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Cheio'); } };
    assert.equal(readSyncTimestamp('cursor'), null);
    assert.equal(writeSyncTimestamp('cursor', '2026-10-14T15:00:00.000Z'), '2026-10-14T15:00:00.000Z');
    assert.equal(normalizeSyncCursor('NaN'), 0);
    assert.equal(normalizeSyncCursor(-1), 0);
    assert.equal(normalizeSyncCursor(12), 12);
    assert.deepEqual(normalizeWindowStates(null), {});
    const restored = normalizeWindowStates({ user: { openWindows: { bad: null, valid: { componentId: 'ProductivityWindow', position: null, size: null, previousSize: {}, zIndex: NaN } }, windowPrefs: { bad: null, valid: { size: { width: -1 }, pos: {} } } } });
    assert.equal(restored.user.openWindows.bad, undefined);
    assert.deepEqual(restored.user.openWindows.valid.position, { x: 50, y: 100 });
    assert.deepEqual(restored.user.openWindows.valid.size, { width: 900, height: 600 });
    assert.deepEqual(restored.user.openWindows.valid.previousSize, { width: 900, height: 600 });
    assert.deepEqual(restored.user.windowPrefs.bad, { pos: { x: 100, y: 100 }, size: { width: 500, height: 400 }, isMaximized: false });
    assert.deepEqual(restored.user.windowPrefs.valid.size, { width: 400, height: 400 });
  } finally { globalThis.localStorage = previous; }
});

test('Nexo rejeita respostas nulas sem apagar categorias, movimentos, orçamento ou investimentos', () => withModules(async ({ server, db, api }) => {
  const { financeService: service } = await server.ssrLoadModule('/src/services/financeService.js');
  const tables = ['finance_categories', 'finance_macro_categories', 'finance_transactions', 'finance_connections', 'finance_budget_groups', 'finance_budgets', 'finance_investment_goals', 'finance_investment_events'];
  for (const table of tables) await db[table].clear();
  const categoryId = await db.finance_categories.add({ id: 1, name: 'Preservada', pending_sync: false });
  await db.finance_macro_categories.add({ id: 2, name: 'Geral', pending_sync: false });
  await db.finance_transactions.add({ id: 3, description: 'Movimento salvo', transaction_date: '2026-10-14', amount: 10, pending_sync: false });
  await db.finance_connections.add({ id: 4, name: 'Conexão salva' });
  await db.finance_budget_groups.add({ id: 5, month: '2026-10', name: 'Orçamento salvo' });
  await db.finance_investment_goals.add({ id: 6, name: 'Meta salva', pending_sync: false });
  await db.finance_investment_events.add({ id: 7, amount: 10, event_date: '2026-10-14', pending_sync: false });
  api.get = async () => ({ data: null });
  await service.getCategories(); await service.getMacroCategories(); await service.listTransactions({ month: '2026-10' });
  await service.getConnections(); await service.getBudgets({ month: '2026-10' }); await service.getInvestments({ month: '2026-10' });
  for (const table of tables.filter(table => table !== 'finance_budgets')) assert.equal(await db[table].count(), 1, table);
  assert.equal((await db.finance_categories.get(categoryId)).name, 'Preservada');
  api.get = async () => ({ data: [] });
  await service.getCategories();
  assert.equal(await db.finance_categories.count(), 0, 'Uma lista vazia válida ainda pode ser aplicada');
}));

test('delta de rádio preserva playlists não alteradas e respostas inválidas não removem dados', () => withModules(async ({ server, db }) => {
  const { radioRepository: repo } = await server.ssrLoadModule('/src/services/localData/radioRepository.js');
  await db.playlists.clear(); await db.tracks.clear();
  await db.playlists.add({ id: 1, name: 'Atualizada' });
  const retained = await db.playlists.add({ id: 2, name: 'Não alterada' });
  const trackId = await db.tracks.add({ id: 20, playlist_local_id: retained, title: 'Faixa preservada' });
  await repo.mergeApiPlaylists([{ id: 1, name: 'Novo nome', tracks: [] }], { isDelta: true });
  assert.equal((await db.playlists.get(retained)).name, 'Não alterada');
  assert.equal((await db.tracks.get(trackId)).title, 'Faixa preservada');
  await assert.rejects(repo.mergeApiPlaylists(null), /inválida/);
  await assert.rejects(repo.mergeApiPlaylists([{ id: 1, tracks: null }]), /inválida/);
  assert.equal(await db.playlists.count(), 2);
  const { invalidateSyncSession } = await server.ssrLoadModule('/src/utils/syncState.js');
  const invalidate = () => { invalidateSyncSession(); };
  db.playlists.hook('updating', invalidate);
  try { await assert.rejects(repo.mergeApiPlaylists([{ id: 1, name: 'Não deve entrar' }], { isDelta: true }), /troca de sessão/); }
  finally { db.playlists.hook('updating').unsubscribe(invalidate); }
  assert.equal((await db.playlists.where('id').equals(1).first()).name, 'Novo nome');
}));

test('projetos, rádio e cofre ignoram respostas recebidas depois da troca de sessão', () => withModules(async ({ server, db, api }) => {
  const { invalidateSyncSession } = await server.ssrLoadModule('/src/utils/syncState.js');
  const { useProjectStore } = await server.ssrLoadModule('/src/stores/projects.js');
  const { useRadioStore } = await server.ssrLoadModule('/src/stores/radio.js');
  const { useVaultStore } = await server.ssrLoadModule('/src/stores/vault.js');
  for (const [store, pull, table] of [[useProjectStore(), 'pullProjects', 'projects'], [useRadioStore(), 'pullPlaylists', 'playlists'], [useVaultStore(), 'pullAccounts', 'accounts']]) {
    await db[table].clear();
    let release; let started;
    const requestStarted = new Promise(resolve => { started = resolve; });
    api.get = () => new Promise(resolve => { release = resolve; started(); });
    const operation = store[pull]();
    await requestStarted;
    invalidateSyncSession();
    release({ data: { items: [{ id: 100, name: 'Resposta antiga', data: 'ciphertext', tracks: [] }], server_timestamp: '2026-10-14T15:00:00.000Z' } });
    await operation;
    assert.equal(await db[table].count(), 0, table);
  }
}));

test('player rejeita fila inválida e não reabre um app desconhecido', () => withModules(async ({ server, api }) => {
  const { usePlayerStore } = await server.ssrLoadModule('/src/stores/player.js');
  const player = usePlayerStore();
  player.queue = [{ youtube_id: 'preservada' }];
  api.get = async () => ({ data: { queue: { inválida: true }, active_app: 'app-inexistente' } });
  await player.pullPlayerState();
  assert.equal(player.queue[0].youtube_id, 'preservada');
  assert.equal(player.active_app, null);
}));

test('Health recupera cursor corrompido e interrompe paginação sem avanço', (context) => withModules(async ({ server, db, api }) => {
  context.mock.method(console, 'error', () => {});
  const { healthRepository } = await server.ssrLoadModule('/src/services/localData/healthRepository.js');
  await db.health_sync_state.put({ user_id: 'module-recovery-test', cursor: 'NaN' });
  assert.equal(await healthRepository.getSyncCursor('module-recovery-test'), 0);
  const { useUtilsStore } = await server.ssrLoadModule('/src/stores/utils.js');
  useUtilsStore().is_network_online = true;
  useUtilsStore().is_kadem_api_available = true;
  const { syncService } = await server.ssrLoadModule('/src/services/syncService.js');
  await db.syncQueue.clear();
  let calls = 0;
  api.get = async () => { calls++; return { data: { changes: [], next_cursor: 0, has_more: true } }; };
  await syncService.processSyncQueue();
  assert.equal(calls, 1, 'Não pode entrar em loop infinito quando o servidor não avança o cursor');
  assert.equal(await healthRepository.getSyncCursor('module-recovery-test'), 0);
}));
