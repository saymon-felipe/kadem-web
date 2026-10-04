import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import 'fake-indexeddb/auto';
import { createServer } from 'vite';
import { createPinia, setActivePinia, disposePinia } from 'pinia';
import { RadioListeningTracker } from '../src/services/radioListeningTracker.js';

const song = { youtube_id: 'abcdefghijk', source: 'youtube', title: 'Música', channel: 'Artista', duration_seconds: 240 };
function fixture(start = Date.parse('2026-10-03T12:00:00Z')) {
  let now = start;
  let state = { user_id: 1, track: song, position: 0, playing: true, offline: false };
  const saved = [];
  const tracker = new RadioListeningTracker({ snapshot: () => state, now: () => now,
    persist: async (user_id, rows) => saved.push(...rows.map(row => ({ ...row, user_id }))) });
  tracker.sample();
  const tick = (seconds, patch = {}) => { now += seconds * 1000; state = { ...state, ...patch }; tracker.sample(); };
  return { tracker, saved, tick };
}

test('mede avanço real, exclui buffering/pausa/seek, retoma sem nova reprodução e registra conclusão', async () => {
  const f = fixture();
  f.tick(1, { position: 1 });
  f.tick(15, { position: 1, playing: false });
  await f.tracker.event('pause');
  f.tick(30, { position: 1 });
  f.tick(1, { playing: true });
  f.tick(1, { position: 2 });
  await f.tracker.event('seek', 100);
  f.tick(1, { position: 101 });
  f.tick(1, { position: 240 }); // Unobserved seek must not add 139 seconds.
  await f.tracker.finish('completed');
  const sum = field => f.saved.reduce((total, row) => total + (row[field] || 0), 0);
  assert.equal(sum('play_count'), 1);
  assert.equal(sum('listened_ms'), 3000);
  assert.equal(sum('pause_count'), 1);
  assert.equal(sum('seek_count'), 1);
  assert.equal(sum('completed_count'), 1);
  assert.equal(sum('skipped_count'), 0);
});

test('divide meia-noite, distingue áudio offline e conta replay sem duplicar pausas', async () => {
  const f = fixture(Date.parse('2026-10-03T23:59:58Z'));
  f.tick(1, { position: 1, offline: true });
  f.tick(2, { position: 3 });
  await f.tracker.finish('skipped');
  const first = f.saved.filter(row => row.event_date === '2026-10-03');
  const second = f.saved.filter(row => row.event_date === '2026-10-04');
  assert.equal(first.reduce((sum, row) => sum + (row.listened_ms || 0), 0), 2000);
  assert.equal(second.reduce((sum, row) => sum + (row.listened_ms || 0), 0), 1000);
  assert.equal(second.reduce((sum, row) => sum + (row.offline_ms || 0), 0), 1000);
  assert.equal(first.reduce((sum, row) => sum + (row.play_count || 0), 0), 1);
  assert.equal(second.reduce((sum, row) => sum + (row.play_count || 0), 0), 0);
  f.tick(1, { position: 0 }); f.tick(1, { position: 1 });
  await f.tracker.finish('completed');
  assert.equal(f.saved.reduce((sum, row) => sum + (row.play_count || 0), 0), 2);
});

test('falha de mídia não conta reprodução; troca de conta preserva o dono dos deltas', async () => {
  const f = fixture();
  f.tick(20, { playing: false, position: 0 });
  await f.tracker.finish('skipped');
  assert.equal(f.saved.length, 0);
  f.tick(1, { playing: true }); f.tick(1, { position: 1 });
  f.tick(1, { user_id: 2, position: 0 }); f.tick(1, { position: 1 });
  await f.tracker.finish();
  assert.equal(f.saved.filter(row => row.user_id === 1).reduce((sum, row) => sum + (row.play_count || 0), 0), 1);
  assert.equal(f.saved.filter(row => row.user_id === 2).reduce((sum, row) => sum + (row.play_count || 0), 0), 1);
});

test('checkpoint com IndexedDB indisponível conserva os deltas até conseguir gravar', async () => {
  const f = fixture();
  let attempts = 0;
  f.tracker.onError = () => {};
  const original = f.tracker.persist;
  f.tracker.persist = async (...args) => { if (++attempts === 1) throw new Error('IndexedDB ocupado'); return original(...args); };
  f.tick(1, { position: 1 });
  await f.tracker.flush();
  f.tick(1, { position: 2 });
  await f.tracker.flush();
  assert.equal(f.saved[0].listened_ms, 2000);
  assert.equal(f.saved[0].play_count, 1);
});

test('Dexie v24 → v25: curtidas offline, contador compartilhado entre abas, pull pendente e envio concorrente', { timeout: 30000 }, async () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  globalThis.Audio = class { volume = 1; pause() {} };
  const server = await createServer({ configFile: false, root: process.cwd(),
    plugins: [{ name: 'stub-router', enforce: 'pre', resolveId(id) { if (/router(\/index(\.js)?)?$/.test(id)) return '\0router'; }, load(id) { if (id === '\0router') return 'export default {push(){},replace(){},currentRoute:{value:{}}};'; } }],
    resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error' });
  let db, pinia;
  try {
    ({ db } = await server.ssrLoadModule('/src/db.js'));
    await db.delete();
    const old = new db.constructor(db.name);
    old.version(24).stores(Object.fromEntries(db.tables.filter(table => !['radio_reactions', 'radio_listening_daily', 'radio_clients', 'radio_statistics'].includes(table.name))
      .map(table => [table.name, [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(',')])));
    await old.open();
    await old.global_audio_cache.put({ youtube_id: song.youtube_id, audio_blob: new Blob(['offline']) });
    await old.syncQueue.add({ type: 'CREATE_PLAYLIST', payload: { name: 'Pendente' }, timestamp: new Date().toISOString() });
    old.close(); await db.open();
    assert.equal(db.verno, 25);
    assert.equal((await db.global_audio_cache.get(song.youtube_id)).audio_blob.size, 7);
    assert.equal(await db.syncQueue.count(), 1);
    await db.syncQueue.clear();
    const { radioInsightsRepository: repo } = await server.ssrLoadModule('/src/services/localData/radioInsightsRepository.js');
    const { syncQueueRepository: queue } = await server.ssrLoadModule('/src/services/localData/syncQueueRepository.js');
    const first = await repo.setReaction(1, { ...song, playlist_id: 1 }, 1);
    const sent = (await queue.getPendingTasks())[0];
    const second = await repo.setReaction(1, { ...song, playlist_id: 2 }, -1);
    assert.equal(await db.radio_reactions.count(), 1);
    assert.equal(await db.syncQueue.count(), 1);
    assert.ok(second.updated_at > first.updated_at);
    await repo.mergeReactions(1, [{ ...song, reaction: 1, updated_at: new Date(Date.now() + 1000).toISOString() }]);
    assert.equal((await repo.getReactions(1))[0].reaction, -1);
    await repo.acknowledgeReaction(1, sent.payload, { ...song, reaction: 1, updated_at: first.updated_at });
    await repo.deleteAcknowledgedTask(sent);
    assert.equal(await db.syncQueue.count(), 1, 'in-flight acknowledgment must not delete the next vote');
    await repo.setReaction(1, song, 0);
    assert.equal((await repo.getReactions(1))[0].reaction, 0);
    const delta = { song, event_date: '2026-10-03', last_played_at: '2026-10-03T12:00:00Z', play_count: 1, listened_ms: 1000, offline_ms: 1000 };
    await Promise.all([repo.addListening(1, [delta]), repo.addListening(1, [delta])]);
    const rows = await db.radio_listening_daily.toArray();
    assert.equal(rows.length, 1); assert.equal(rows[0].play_count, 2); assert.equal(rows[0].listened_ms, 2000);
    await repo.addListening(2, [delta]);
    assert.notEqual((await db.radio_clients.get(1)).client_id, (await db.radio_clients.get(2)).client_id);
    await queue.clearSyncQueue({ preserveRadioInsights: true });
    assert.equal(await db.syncQueue.count(), 3, 'logout preserves radio outbox');

    pinia = createPinia(); setActivePinia(pinia);
    const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js');
    const { useUtilsStore } = await server.ssrLoadModule('/src/stores/utils.js');
    const { syncService } = await server.ssrLoadModule('/src/services/syncService.js');
    const { api } = await server.ssrLoadModule('/src/plugins/api.js');
    const auth = useAuthStore(); auth.user = { id: 1 };
    useUtilsStore().connection.connected = true;
    const posts = [];
    api.get = async () => ({ data: { items: [], changes: [], next_cursor: 0, has_more: false } });
    let changed = false;
    api.put = async (url, payload) => {
      posts.push({ url, payload });
      if (url.endsWith('/reaction')) {
        if (!changed) { changed = true; await repo.setReaction(1, song, 1); }
        return { data: { ...song, reaction: payload.reaction, updated_at: payload.updated_at } };
      }
      return { data: { accepted: 1 } };
    };
    await syncService.processSyncQueue();
    assert.equal(posts.filter(post => post.url.endsWith('/reaction')).length, 2);
    assert.equal((await repo.getReactions(1))[0].reaction, 1);
    assert.equal((await repo.getReactions(1))[0].pending_sync, false);
    assert.equal(await db.syncQueue.count(), 1, 'another account remains queued');
    assert.equal((await db.syncQueue.toArray())[0].payload.user_id, 2);
    auth.user = { id: 2 };
    await syncService.processSyncQueue();
    assert.equal(await db.syncQueue.count(), 0);
  } finally { disposePinia(pinia); await db?.delete(); await server.close(); delete globalThis.Audio; delete globalThis.localStorage; }
});
