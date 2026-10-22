import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

async function modules(run) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {
      throw Error("Pareamento não pode ser persistido");
    },
    removeItem() {},
  };
  setActivePinia(createPinia());
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [
      {
        name: "stub-router",
        enforce: "pre",
        resolveId(id) {
          if (/router(\/index(\.js)?)?$/.test(id)) return "\0router";
        },
        load(id) {
          if (id === "\0router") return "export default {push(){},currentRoute:{value:{}}}";
        },
      },
      vue(),
    ],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { default: Component } = await server.ssrLoadModule("/src/components/finance/nexo/NexoGenosPairing.vue");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    const sync = await server.ssrLoadModule("/src/utils/syncState.js");
    await run({ Component, financeService, api, sync });
  } finally {
    db?.close();
    await server.close();
  }
}
const context = (Component) => {
  const ctx = { ...Component.data(), active: true, userId: 24 };
  for (const [name, fn] of Object.entries(Component.methods)) ctx[name] = fn.bind(ctx);
  for (const [name, fn] of Object.entries(Component.computed))
    if (name !== "userId") Object.defineProperty(ctx, name, { get: () => fn.call(ctx) });
  return ctx;
};
const fixture = () => ({
  api_url: "https://api.example.com/api",
  pairing_code: "synthetic-only-not-a-real-pairing",
  expires_at: new Date(Date.now() + 600000).toISOString(),
});

test("pareamento fica oculto para usuário comum e código não aparece fora da aba ativa", async () =>
  modules(async ({ Component }) => {
    for (const [enabled, active, visible] of [
      [false, true, false],
      [true, false, false],
      [true, true, true],
    ]) {
      const Tested = { ...Component, watch: {}, data: () => ({ ...Component.data(), enabled, pairing: fixture() }) };
      const app = createSSRApp(Tested, { active });
      app.component("font-awesome-icon", { render: () => null });
      const html = await renderToString(app);
      assert.equal(html.includes("synthetic-only"), visible);
      assert.equal(html.includes("Parear com o Kadem"), visible);
    }
  }));

test("troca de usuário/aba descarta configuração e ignora resposta antiga; expiração limpa o código", async () =>
  modules(async ({ Component, financeService }) => {
    const ctx = context(Component);
    financeService.getGenosPairingAccess = async () => ({ data: { enabled: ctx.userId === 24 } });
    await ctx.loadAccess();
    assert.equal(ctx.enabled, true);
    let release;
    financeService.createGenosPairing = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const generating = ctx.generate();
    assert.equal(ctx.generating, true);
    ctx.userId = 25;
    await ctx.loadAccess();
    release({ data: fixture() });
    await generating;
    assert.equal(ctx.enabled, false);
    assert.equal(ctx.pairing, null);
    ctx.userId = 24;
    await ctx.loadAccess();
    financeService.createGenosPairing = async () => ({ data: fixture() });
    await ctx.generate();
    assert.equal(ctx.configuration.includes("api.example.com"), true);
    ctx.pairing.expires_at = new Date(Date.now() - 1000).toISOString();
    ctx.tick();
    assert.equal(ctx.pairing, null);
    assert.equal(ctx.expired, true);
    ctx.pairing = fixture();
    ctx.active = false;
    await ctx.loadAccess();
    assert.equal(ctx.pairing, null);
    assert.equal(ctx.enabled, false);
    ctx.reset();
  }));

test("service usa a sessão atual e endpoint online; não reaproveita resposta de outra sessão", async () =>
  modules(async ({ financeService, api, sync }) => {
    let release;
    api.post = async (url, body) => {
      assert.equal(url, "/finance/genos/pair");
      assert.deepEqual(body, {});
      return new Promise((resolve) => {
        release = resolve;
      });
    };
    const result = financeService.createGenosPairing();
    sync.invalidateSyncSession();
    release({ data: fixture() });
    await assert.rejects(result, /troca de sessão/);
  }));
