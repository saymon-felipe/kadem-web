import test from "node:test";
import assert from "node:assert/strict";

test("a sessão informa ao Genos a fonte efetiva e não reaproveita uma fonte anterior", async () => {
  Object.defineProperty(globalThis, "navigator", { value: { mediaSession: {} }, configurable: true });
  globalThis.MediaMetadata = class { constructor(value) { Object.assign(this, value); } };
  const manager = (await import("../src/services/MediaSessionManager.js")).default;
  const track = { title: "Faixa", artist: "Artista" };
  manager.set_metadata(track, "native");
  assert.equal(navigator.mediaSession.metadata.album, "Kadem Queue · native");
  manager.set_metadata(track, "unknown");
  assert.equal(navigator.mediaSession.metadata.album, "Kadem Queue");
  manager.set_metadata(track, "youtube");
  assert.equal(navigator.mediaSession.metadata.album, "Kadem Queue · youtube");
});
