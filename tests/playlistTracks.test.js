import { test } from "node:test";
import assert from "node:assert/strict";
import { get_visible_playlist_tracks } from "../src/utils/playlist_tracks.js";

const tracks = Object.freeze([
  Object.freeze({ local_id: 1, title: "Águas de Março", channel: "Tom Jobim", created_at: "2026-01-03T10:00:00Z", duration_seconds: "240" }),
  Object.freeze({ local_id: 2, title: "Canção 10", channel: "João", created_at: "2026-01-01T10:00:00Z", duration_seconds: 90 }),
  Object.freeze({ local_id: 3, title: "Canção 2", channel: "João", created_at: "2026-01-02T10:00:00Z", duration_seconds: 600 }),
  Object.freeze({ local_id: 4, title: "Sem metadados", source: "upload", created_at: "inválido" }),
]);
const ids = (items) => items.map((item) => item.local_id);

test("filtro combina título e canal, ignora acentos, caixa e espaços extras", () => {
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "  AGUAS   tom ")), [1]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "joao cancao")), [2, 3]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "upload")), []);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "inexistente")), []);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "   ")), [1, 2, 3, 4]);
  assert.deepEqual(get_visible_playlist_tracks([], "música"), []);
});

test("ordenação por título usa português e números naturais", () => {
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "title", "asc")), [1, 3, 2, 4]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "title", "desc")), [4, 2, 3, 1]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "joao", "title", "asc")), [3, 2]);
});

test("datas e durações ordenam pelo valor real e deixam metadados ausentes ao final", () => {
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "created_at", "asc")), [2, 3, 1, 4]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "created_at", "desc")), [1, 3, 2, 4]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "duration_seconds", "asc")), [2, 1, 3, 4]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks, "", "duration_seconds", "desc")), [3, 1, 2, 4]);
});

test("projeção preserva identidade, ordem original e ordem relativa de valores iguais", () => {
  const visible = get_visible_playlist_tracks(tracks, "", "duration_seconds", "desc");
  assert.equal(visible[0], tracks[2]);
  assert.deepEqual(ids(tracks), [1, 2, 3, 4]);
  assert.deepEqual(ids(get_visible_playlist_tracks(tracks)), [1, 2, 3, 4]);
  const ties = [{ local_id: 8, duration_seconds: 90 }, { local_id: 9, duration_seconds: 90 }];
  assert.deepEqual(ids(get_visible_playlist_tracks(ties, "", "duration_seconds", "desc")), [8, 9]);
});

test("busca e ordenação usam o título decodificado exibido ao usuário", () => {
  const original_parser = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString(text) {
      return { documentElement: { textContent: text.replaceAll("&amp;", "&").replaceAll("&#39;", "'") } };
    }
  };
  try {
    const encoded = [{ title: "Rock &amp; Roll", channel: "D&#39;Ávila" }, { title: "Samba" }];
    assert.equal(get_visible_playlist_tracks(encoded, "rock & roll d'avila")[0], encoded[0]);
    assert.deepEqual(get_visible_playlist_tracks(encoded, "", "title"), encoded);
  } finally {
    if (original_parser) globalThis.DOMParser = original_parser;
    else delete globalThis.DOMParser;
  }
});
