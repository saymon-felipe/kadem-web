import { test } from 'node:test';
import assert from 'node:assert/strict';

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
