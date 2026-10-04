import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { reactive, watch, nextTick } from 'vue';

async function withRadioFlow(run) {
  const stubs = {
    player: 'usePlayerStore', radio: 'useRadioStore', utils: 'useUtilsStore',
    windows: 'useWindowStore', app: 'useAppStore', radioInsights: 'useRadioInsightsStore',
  };
  const server = await createServer({
    configFile: false, root: process.cwd(),
    plugins: [
      {
        name: 'isolate-radio-flow', enforce: 'pre',
        resolveId(id) {
          if (id.endsWith('.vue') && !id.endsWith('RadioFlow.vue')) return '\0radio-component';
          const store = id.match(/stores\/([^/]+?)(?:\.js)?$/)?.[1];
          if (stubs[store]) return `\0radio-store-${store}`;
          if (id.includes('localData/radioRepository')) return '\0radio-repository';
          if (id.includes('plugins/api')) return '\0radio-api';
          if (id === '@/db') return '\0radio-db';
        },
        load(id) {
          if (id === '\0radio-component') return 'export default {};';
          if (id.startsWith('\0radio-store-')) return `export const ${stubs[id.slice('\0radio-store-'.length)]} = () => ({});`;
          if (id === '\0radio-repository') return 'export const radioRepository = {};';
          if (id === '\0radio-api') return 'export const api = {};';
          if (id === '\0radio-db') return 'export const db = {};';
        },
      }, vue(),
    ],
    resolve: { alias: { '@': path.resolve('src') } },
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error',
  });
  try {
    const { default: RadioFlow } = await server.ssrLoadModule('/src/components/radio/RadioFlow.vue');
    const { radioRepository } = await server.ssrLoadModule('\0radio-repository');
    await run(RadioFlow, radioRepository);
  } finally { await server.close(); }
}

function deferred() {
  let resolve;
  const promise = new Promise((finish) => { resolve = finish; });
  return { promise, resolve };
}

function radioContext(RadioFlow, overrides = {}) {
  const context = {
    ...RadioFlow.data(),
    close_search() {}, close_playlist_filter() {}, setViewedPlaylistId() {},
    checkOfflineAvailability: async () => {},
    ...overrides,
  };
  for (const name of ['get_liked_tracks', 'load_playlist_tracks', 'select_playlist']) {
    if (RadioFlow.methods[name] && !context[name]) context[name] = RadioFlow.methods[name];
  }
  return reactive(context);
}

test('ciclo de reações: duplo toque alterna entre curtir, dislike e remover com feedback', () => {
  function getNextReaction(currentVote) {
    if (currentVote === 0) {
      return { nextVote: 1, type: 'like', icon: 'thumbs-up', label: 'Curtida' };
    } else if (currentVote === 1) {
      return { nextVote: -1, type: 'dislike', icon: 'thumbs-down', label: 'Não gostei' };
    } else {
      return { nextVote: 0, type: 'removed', icon: 'thumbs-up', label: 'Avaliação removida', strike: true };
    }
  }

  // 1º duplo clique: música sem avaliação (0) -> Curtir (1)
  const step1 = getNextReaction(0);
  assert.equal(step1.nextVote, 1);
  assert.equal(step1.type, 'like');
  assert.equal(step1.icon, 'thumbs-up');
  assert.equal(step1.label, 'Curtida');

  // 2º duplo clique: música já curtida (1) -> Dislike (-1)
  const step2 = getNextReaction(step1.nextVote);
  assert.equal(step2.nextVote, -1);
  assert.equal(step2.type, 'dislike');
  assert.equal(step2.icon, 'thumbs-down');
  assert.equal(step2.label, 'Não gostei');

  // 3º duplo clique: música com dislike (-1) -> Retira (0)
  const step3 = getNextReaction(step2.nextVote);
  assert.equal(step3.nextVote, 0);
  assert.equal(step3.type, 'removed');
  assert.equal(step3.strike, true);
  assert.equal(step3.label, 'Avaliação removida');

  // 4º duplo clique: reinicia o ciclo -> Curtir (1)
  const step4 = getNextReaction(step3.nextVote);
  assert.equal(step4.nextVote, 1);
  assert.equal(step4.type, 'like');
});

test('filtro e projeção da playlist de músicas curtidas', () => {
  const reactions = {
    song1: { youtube_id: 'song1', title: 'Música 1', channel: 'Artista A', reaction: 1, updated_at: '2026-10-01T10:00:00Z' },
    song2: { youtube_id: 'song2', title: 'Música 2', channel: 'Artista B', reaction: -1, updated_at: '2026-10-02T10:00:00Z' },
    song3: { youtube_id: 'song3', title: 'Música 3', channel: 'Artista C', reaction: 1, updated_at: '2026-10-03T10:00:00Z' },
    song4: { youtube_id: 'song4', title: 'Música 4', channel: 'Artista D', reaction: 0, updated_at: '2026-10-04T10:00:00Z' },
  };

  const likedTracks = Object.values(reactions)
    .filter(row => row.reaction === 1)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  assert.equal(likedTracks.length, 2);
  assert.equal(likedTracks[0].youtube_id, 'song3'); // Mais recente primeiro
  assert.equal(likedTracks[1].youtube_id, 'song1');
});

test('uma atualização atrasada das curtidas não sobrescreve a playlist escolhida no primeiro clique', async () => {
  await withRadioFlow(async (RadioFlow, repository) => {
    const liked = { local_id: 'liked', is_liked_playlist: true };
    const playlist = { local_id: 2, name: 'Outra playlist' };
    const likedTracks = [{ youtube_id: 'liked-song' }];
    const playlistTracks = [{ youtube_id: 'playlist-song', playlist_local_id: 2 }];
    const delayed = deferred();
    const context = radioContext(RadioFlow, {
      selected_playlist: liked, tracks: likedTracks,
      get_liked_tracks: () => delayed.promise,
    });
    repository.getLocalTracks = async () => playlistTracks;
    const refresh = RadioFlow.watch.reactions.handler.call(context);
    await context.select_playlist(playlist);
    assert.deepEqual(context.tracks, playlistTracks);
    delayed.resolve(likedTracks);
    await refresh;
    assert.equal(context.selected_playlist.local_id, 2);
    assert.deepEqual(context.tracks, playlistTracks, 'A resposta das curtidas precisa ser descartada depois da troca');
  });
});

test('trocas rápidas e respostas fora de ordem mantêm as músicas da última seleção', async () => {
  await withRadioFlow(async (RadioFlow, repository) => {
    const first = deferred();
    const second = deferred();
    const liked = deferred();
    const context = radioContext(RadioFlow, { get_liked_tracks: () => liked.promise });
    repository.getLocalTracks = (id) => id === 1 ? first.promise : second.promise;
    const requestFirst = context.select_playlist({ local_id: 1 });
    const requestLiked = context.select_playlist({ local_id: 'liked', is_liked_playlist: true });
    const requestLast = context.select_playlist({ local_id: 2 });
    const finalTracks = [{ youtube_id: 'last-song' }];
    second.resolve(finalTracks); await requestLast;
    liked.resolve([{ youtube_id: 'liked-song' }]); await requestLiked;
    first.resolve([{ youtube_id: 'first-song' }]); await requestFirst;
    assert.deepEqual(context.tracks, finalTracks);
    assert.equal(context.selected_playlist.local_id, 2);
  });
});

test('atualizar curtidas não recarrega as próprias reações em um ciclo de watchers', async () => {
  await withRadioFlow(async (RadioFlow, repository) => {
    const row = { youtube_id: 'liked-song', reaction: 1, title: 'Curtida', updated_at: '2026-10-04T12:00:00Z' };
    let loads = 0;
    const context = radioContext(RadioFlow, {
      reactions: {},
      async loadLocal() {
        loads++;
        // Limita a reprodução do bug sem deixar o teste em um ciclo infinito.
        if (loads <= 3) this.reactions = { [row.youtube_id]: { ...row } };
      },
    });
    repository.getLocalTrackByYoutubeId = async () => null;
    const refreshes = [];
    const stop = watch(() => context.reactions, () => {
      refreshes.push(RadioFlow.watch.reactions.handler.call(context));
    }, { deep: true });
    try {
      await context.select_playlist({ local_id: 'liked', is_liked_playlist: true });
      await nextTick();
      await Promise.all(refreshes);
      await nextTick();
      assert.equal(loads, 1, 'Só a seleção inicial lê as reações do Dexie');
      assert.equal(context.tracks[0].youtube_id, row.youtube_id);
      context.reactions[row.youtube_id] = { ...row, reaction: 0 };
      await nextTick(); await Promise.all(refreshes);
      assert.deepEqual(context.tracks, [], 'Remover uma curtida atualiza a playlist ainda aberta');
      assert.equal(loads, 1);
    } finally { stop(); }
  });
});
