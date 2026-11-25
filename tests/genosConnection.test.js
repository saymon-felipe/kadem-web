import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { setActivePinia, createPinia } from "pinia";

// Conexão do Kadem aberta pelo Genos: logo depois de abrir a página a conexão ainda não foi medida e o estado precisa
// acompanhar a volta da rede sem esperar o ciclo de 30 s nem um evento do navegador que pode nunca chegar.

const listeners = {};
const browser = { onLine: true, visibilityState: "visible" };
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
Object.defineProperty(globalThis, "navigator", { value: browser, configurable: true });
globalThis.location = { pathname: "/", search: "", hash: "", origin: "http://localhost:3000", href: "http://localhost:3000/" };
globalThis.history = { state: null, pushState() {}, replaceState() {} };
globalThis.window = {
  localStorage, location, history,
  addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
  removeEventListener() {}, dispatchEvent() {},
};
globalThis.document = {
  get visibilityState() { return browser.visibilityState; },
  querySelector() { return null; }, createElement() { return {}; }, documentElement: { style: {} },
  addEventListener(name, fn) { (listeners[name] ||= []).push(fn); }, removeEventListener() {},
};
const fire = (name) => Promise.all((listeners[name] || []).map((fn) => fn()));

let server;
let api;
let useUtilsStore;
let server_up = false;
let calls = 0;

before(async () => {
  server = await createServer({
    configFile: false, root: process.cwd(), plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ api } = await server.ssrLoadModule("/src/plugins/api.js"));
  ({ useUtilsStore } = await server.ssrLoadModule("/src/stores/utils.js"));
  api.get = async () => {
    calls += 1;
    if (!server_up) throw new Error("sem rede");
    return { status: 200 };
  };
});

after(async () => { await server?.close(); });

const fresh_store = () => {
  for (const key of Object.keys(listeners)) delete listeners[key];
  setActivePinia(createPinia());
  calls = 0;
  const store = useUtilsStore();
  store.init_connection_monitor();
  return store;
};

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

test("recém-aberto, o estado só vira conectado quando o servidor responde, e o comando espera isso", async () => {
  browser.onLine = true; server_up = true;
  const store = fresh_store();
  // A página acabou de abrir: o teste de conexão ainda não terminou.
  assert.equal(store.connection.connected, false, "ainda não medido");
  assert.equal(await store.wait_for_connection(2000, 20), true);
  assert.equal(store.connection.connected, true);
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

test("a conexão que volta durante a espera é percebida sem evento do navegador", async () => {
  browser.onLine = true; server_up = false;
  const store = fresh_store();
  await settle();
  assert.equal(store.connection.connected, false);
  setTimeout(() => { server_up = true; }, 150);
  const started = Date.now();
  assert.equal(await store.wait_for_connection(3000, 50), true);
  assert.ok(Date.now() - started < 1500, "não espera o ciclo de 30 s");
  assert.equal(store.connection.connected, true);
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

test("o servidor respondendo vale mais que o aviso velho do navegador", async () => {
  browser.onLine = false; server_up = true;
  const store = fresh_store();
  assert.equal(store.is_network_online, false);
  assert.equal(await store.wait_for_connection(2000, 20), true);
  assert.equal(store.connection.connected, true);
  assert.equal(store.is_network_online, true);
  browser.onLine = true;
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

test("só desiste depois do prazo, sem rede", async () => {
  browser.onLine = true; server_up = false;
  const store = fresh_store();
  const started = Date.now();
  assert.equal(await store.wait_for_connection(400, 50), false);
  assert.ok(Date.now() - started >= 380);
  assert.equal(store.connection.connected, false);
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

test("o primeiro teste falho depois do evento online é refeito logo, não em 30 s", async () => {
  browser.onLine = true; server_up = false;
  const store = fresh_store();
  await settle();
  await fire("online");
  assert.equal(store.connection.connected, false, "DNS ainda subindo");
  server_up = true;
  const started = Date.now();
  while (!store.connection.connected && Date.now() - started < 4000) await settle(50);
  assert.equal(store.connection.connected, true);
  assert.ok(Date.now() - started < 3500, "a nova tentativa vem em poucos segundos");
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

test("voltar a ver a página refaz a conexão que estava velha", async () => {
  browser.onLine = true; server_up = false;
  const store = fresh_store();
  await settle();
  assert.equal(store.connection.connected, false);
  server_up = true;
  await fire("pageshow");
  assert.equal(store.connection.connected, true);
  store._cancel_probe_retry();
  store._stop_heartbeat_polling();
});

