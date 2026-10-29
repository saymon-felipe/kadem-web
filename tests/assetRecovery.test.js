import { test } from "node:test";
import assert from "node:assert/strict";
import { installAssetRecovery } from "../src/utils/assetRecovery.js";

test("recupera falha de CSS em um deploy uma vez e preserva funcionamento offline", () => {
  const listeners = {}, values = new Map();
  let reloads = 0;
  const win = { addEventListener: (event, cb) => { listeners[event] = cb; }, location: { pathname: "/", reload: () => reloads++ }, sessionStorage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) } };
  const nav = { onLine: false }, doc = { querySelector: () => ({ src: "/assets/app-old.js" }) };
  installAssetRecovery(win, doc, nav);
  listeners.error({ target: { tagName: "LINK" } });
  assert.equal(reloads, 0);
  nav.onLine = true;
  let prevented = false;
  listeners['vite:preloadError']({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(reloads, 1);
  listeners.error({ target: { tagName: "LINK" } });
  assert.equal(reloads, 1);
  installAssetRecovery(win, doc, nav);
  listeners.error({ target: { tagName: "LINK" } });
  assert.equal(reloads, 1);
});
