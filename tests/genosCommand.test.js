import { test } from "node:test";
import assert from "node:assert/strict";
import {
  edit_distance,
  genos_failure_message,
  has_genos_query,
  is_liked_playlist_request,
  match_playlist,
  match_downloaded_track,
  match_track,
  normalize_spoken,
  parse_genos_command,
  score_name,
  strip_genos_query,
} from "../src/utils/genos_command.js";

const KEY = "k7Qp2xVn9LmR4sTw";

test("lê o comando de playlist e de música da URL", () => {
  assert.deepEqual(parse_genos_command({ genos: "play", playlist: " Foco ", shuffle: "1", key: KEY, nonce: "n1" }), {
    action: "play", kind: "playlist", name: "Foco", shuffle: true, key: KEY, nonce: "n1",
  });
  const track = parse_genos_command({ genos: ["play"], track: ["Evidências"], key: [KEY] });
  assert.equal(track.kind, "track");
  assert.equal(track.name, "Evidências");
  assert.equal(track.shuffle, false);
});

test("recusa comando sem chave forte, sem alvo ou de outra ação", () => {
  assert.equal(parse_genos_command({ genos: "play", playlist: "Foco", key: "curta" }), null);
  assert.equal(parse_genos_command({ genos: "play", key: KEY }), null);
  assert.equal(parse_genos_command({ genos: "delete", playlist: "Foco", key: KEY }), null);
  assert.equal(parse_genos_command({ playlist: "Foco", key: KEY }), null);
  assert.equal(parse_genos_command(null), null);
  assert.equal(parse_genos_command({ genos: "play", playlist: "x".repeat(500), key: KEY }).name.length, 120);
});

test("detecta e remove os parâmetros do Genos sem perder os outros", () => {
  assert.equal(has_genos_query({ genos: "play" }), true);
  assert.equal(has_genos_query({ source: "site_landing" }), false);
  assert.deepEqual(strip_genos_query({ genos: "play", playlist: "a", track: "b", shuffle: "1", key: KEY, nonce: "n", source: "x" }), { source: "x" });
});

test("normaliza acentos, caixa e pontuação da fala", () => {
  assert.equal(normalize_spoken("  Músicas   p/ FOCO!! 🎧 "), "musicas p foco");
  assert.equal(normalize_spoken(null), "");
});

test("distância de edição respeita o limite", () => {
  assert.equal(edit_distance("foco", "foco"), 0);
  assert.equal(edit_distance("treino", "treinos", 2), 1);
  assert.equal(edit_distance("abc", "xyzuvw", 2), 3);
});

test("pedidos da playlist de curtidas", () => {
  for (const name of ["curtidas", "Músicas curtidas", "minhas favoritas", "playlist favoritas", "que eu curti"]) {
    assert.equal(is_liked_playlist_request(name), true, name);
  }
  assert.equal(is_liked_playlist_request("rock curtido no carro"), false);
});

const playlists = Object.freeze([
  { local_id: 1, name: "Foco 🎧" },
  { local_id: 2, name: "Treino Pesado" },
  { local_id: 3, name: "Rock Nacional Anos 80" },
  { local_id: 4, name: "Foco Profundo para Estudar" },
  { local_id: 5, name: "Lo-fi" },
]);
const id = (item) => item?.local_id ?? null;

test("encontra a playlist pelo nome falado, com acento, emoji e pequenos erros", () => {
  assert.equal(id(match_playlist(playlists, "foco")), 1);
  assert.equal(id(match_playlist(playlists, "treino pesado")), 2);
  assert.equal(id(match_playlist(playlists, "treinos pesado")), 2);
  assert.equal(id(match_playlist(playlists, "rock nacional")), 3);
  assert.equal(id(match_playlist(playlists, "foco profundo")), 4);
  assert.equal(id(match_playlist(playlists, "lofi")), 5);
  assert.equal(id(match_playlist(playlists, "low fi")), 5);
  assert.equal(match_playlist(playlists, "sertanejo"), null);
  assert.equal(match_playlist([], "foco"), null);
});

test("pontuação do nome: igual > quase igual > contém", () => {
  assert.ok(score_name("Foco", "foco") > score_name("Foco Profundo", "foco"));
  assert.ok(score_name("Treino Pesado", "treino pesadu") >= 90);
  assert.equal(score_name("", "foco"), 0);
});

const tracks = Object.freeze([
  { local_id: 10, title: "Chitãozinho & Xororó - Evidências (Ao Vivo)", channel: "Chitãozinho & Xororó" },
  { local_id: 11, title: "Evidências", channel: "Cover Acústico" },
  { local_id: 12, title: "Tempo Perdido", channel: "Legião Urbana" },
  { local_id: 13, title: "Bohemian Rhapsody (Remastered 2011)", channel: "Queen Official" },
]);

test("encontra a música por título, título + artista e com leve erro de fala", () => {
  assert.equal(id(match_track(tracks, "Evidências")), 11);
  assert.equal(id(match_track(tracks, "evidências do chitãozinho e xororó")), 10);
  assert.equal(id(match_track(tracks, "tempo perdido legião urbana")), 12);
  assert.equal(id(match_track(tracks, "bohemian rapsody")), 13);
  assert.equal(id(match_track(tracks, "legiao urbana")), 12);
  assert.equal(match_track(tracks, "garota de ipanema"), null);
  assert.equal(match_track(tracks, "a"), null);
});

test("prefere a faixa baixada quando as duas correspondem igual", () => {
  const twins = [
    { local_id: 20, title: "Tempo Perdido", channel: "Legião Urbana" },
    { local_id: 21, title: "Tempo Perdido", channel: "Legião Urbana Ao Vivo" },
  ];
  assert.equal(id(match_track(twins, "tempo perdido", { prefer: (track) => track.local_id === 21 })), 21);
});

test("prioriza correspondência forte com arquivo confirmado pelo youtubeId", async () => {
  const candidates = [
    { local_id: 30, title: "Tempo Perdido", channel: "Legião Urbana", youtube_id: "stream" },
    { local_id: 31, title: "Tempo Perdido ao vivo", channel: "Legião Urbana", youtube_id: "download" },
    { local_id: 32, title: "Outra música", channel: "Outro", youtube_id: "other" },
  ];
  const checked = [];
  const result = await match_downloaded_track(candidates, "tempo perdido", async (track) => {
    checked.push(track.youtube_id);
    return track.youtube_id === "download" || track.youtube_id === "other";
  });
  assert.equal(result.local_id, 31);
  assert.deepEqual(checked, ["stream", "download"]);
  assert.equal(await match_downloaded_track(candidates, "música inexistente", async () => true), null);
  assert.equal(await match_downloaded_track(candidates, "tempo perdido", async () => false), null);
});

test("mensagens de falha citam o pedido", () => {
  assert.equal(genos_failure_message("playlist_not_found", "Foco"), 'Não encontrei a playlist "Foco".');
  assert.match(genos_failure_message("offline_not_downloaded", "Treino"), /Sem internet/);
  assert.equal(genos_failure_message("qualquer"), "Não consegui tocar o pedido.");
});
