import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp, nextTick, reactive, computed } from "vue";
import { createPinia, defineStore, disposePinia } from "pinia";
import { selectivePersistence } from "../src/plugins/selectivePersistence.js";
import { decode_html_entities } from "../src/utils/string_helpers.js";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import process from "node:process";

function makeStore(storage) {
  const pinia = createPinia().use(selectivePersistence);
  createApp({}).use(pinia);
  const useStore = defineStore("player", {
    state: () => ({ queue: [], playback_position: 0, is_playing: false, audio: null }),
    localPersist: {
      storage,
      pick: ["queue", "playback_position"],
      separate: ["playback_position"],
    },
  });
  return { store: useStore(pinia), pinia };
}

test("ticks e estado transitório não serializam uma fila de mil faixas", async () => {
  const items = new Map();
  const writes = [];
  const storage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); items.set(key, value); },
  };
  const { store, pinia } = makeStore(storage);
  let serializations = 0;
  store.queue = Array.from({ length: 1000 }, (_, id) => ({
    id, title: `Faixa ${id}`, toJSON() { serializations++; return { id }; },
  }));
  await nextTick();
  assert.equal(serializations, 1000);
  writes.length = 0;
  for (let tick = 1; tick <= 10; tick++) {
    store.playback_position = tick / 2;
    store.is_playing = !store.is_playing;
    await nextTick();
  }
  assert.equal(serializations, 1000);
  assert.deepEqual(writes, Array(10).fill("player:playback_position"));
  store.queue.splice(0, 1);
  await nextTick();
  assert.equal(JSON.parse(items.get("player")).queue.length, 999);
  assert.equal(writes.at(-1), "player");
  disposePinia(pinia);
});

test("restaura formato antigo, prefere posição separada e ignora campos transitórios", () => {
  const items = new Map([
    ["player", JSON.stringify({ queue: [{ id: 3 }], playback_position: 42, is_playing: true, audio: {} })],
  ]);
  const storage = { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
  const first = makeStore(storage);
  assert.equal(first.store.playback_position, 42);
  assert.equal(first.store.is_playing, false);
  assert.equal(first.store.audio, null);
  first.store.playback_position = 75.5;
  first.store.$persist(); // Flush explícito lê o estado atual, mesmo antes do próximo tick.
  const second = makeStore(storage);
  assert.equal(second.store.playback_position, 75.5);
  assert.deepEqual(second.store.queue, [{ id: 3 }]);
  first.store.$reset();
  first.store.$persist();
  const third = makeStore(storage);
  assert.equal(third.store.playback_position, 0);
  assert.deepEqual(third.store.queue, []);
  disposePinia(first.pinia);
  disposePinia(second.pinia);
  disposePinia(third.pinia);
});

test("títulos comuns dispensam DOMParser; entidades repetidas usam cache", () => {
  const original = globalThis.DOMParser;
  let parses = 0;
  globalThis.DOMParser = class {
    parseFromString(value) {
      parses++;
      return { documentElement: { textContent: value.replaceAll("&amp;", "&") } };
    }
  };
  try {
    assert.equal(decode_html_entities("Música brasileira"), "Música brasileira");
    assert.equal(parses, 0);
    assert.equal(decode_html_entities("Rock &amp; Jazz"), "Rock & Jazz");
    assert.equal(decode_html_entities("Rock &amp; Jazz"), "Rock & Jazz");
    assert.equal(parses, 1);
  } finally {
    globalThis.DOMParser = original;
  }
});

test("digitação não reprocessa relações; fila longa mantém animações com leituras em lote", async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  const server = await createServer({
    configFile: false,
    plugins: [{
      name: "stub-router", enforce: "pre",
      resolveId(id) {
        if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id)) return "\0stub-router";
      },
      load(id) {
        if (id === "\0stub-router") return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
      },
    }, vue()],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  try {
    const { default: Form } = await server.ssrLoadModule("/src/components/projects/TaskDetailForm.vue");
    const task = { description: "Original", priority: "Normal", responsible: { type: "any" } };
    for (const key of ["comments", "attachments"]) {
      Object.defineProperty(task, key, { enumerable: true, get() { throw new Error(`Não deve ler ${key}`); } });
    }
    const context = { editable_task: task, get_clean_task_data: Form.methods.get_clean_task_data };
    context.original_snapshot = JSON.stringify(context.get_clean_task_data(task));
    assert.equal(Form.computed.is_dirty.call(context), false);
    task.description = "Editado";
    assert.equal(Form.computed.is_dirty.call(context), true);
    task.description = "Original";
    assert.equal(Form.computed.is_dirty.call(context), false);
    task.responsible.id = 9;
    assert.equal(Form.computed.is_dirty.call(context), true);

    const editable_task = reactive({ description: "Original", comments: [{
      local_id: 1, content: "Comentário", author: { name: "Ana" }, likes_count: 0,
    }] });
    const dependencies = computed(() => Form.computed.comment_render_dependencies.call({ editable_task }));
    const initial = dependencies.value;
    editable_task.description = "Outra descrição";
    assert.equal(dependencies.value, initial);
    editable_task.comments[0].likes_count++;
    assert.notEqual(dependencies.value, initial);
    const liked = dependencies.value;
    editable_task.comments[0].author.name = "Maria";
    assert.notEqual(dependencies.value, liked);

    const { default: Queue } = await server.ssrLoadModule("/src/components/radio/QueueSidebar.vue");
    let reads = 0;
    let animations = 0;
    const rows = Array.from({ length: 1000 }, () => ({
      getBoundingClientRect() { reads++; return { top: 1 }; },
      animate(_frames, options) {
        assert.equal(reads, 1000, "Todas as leituras devem preceder as animações");
        assert.equal(options.duration, 220, "Preserva a duração original");
        animations++;
        return { cancel() {} };
      },
    }));
    const queue_animation = { positions: new Map(rows.map((row) => [row, 0])), running: new Map() };
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.document = { body: { classList: { contains: () => false } } };
    try {
      Queue.methods.animate_queue_changes.call({
        queue_animation,
        queue_rows: () => [...rows].reverse(),
        stop_queue_animations: Queue.methods.stop_queue_animations,
      });
      assert.equal(animations, 1000, "Não corta animações pela quantidade de itens");
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    }

    let lookup_reads = 0;
    const existing = Array.from({ length: 1000 }, (_, id) => ({
      get local_id() { lookup_reads++; return id; },
      likes: 0, liked_by_me: false, local_content: "Preservado",
    }));
    const commentsContext = { editable_task: { comments: existing }, editing_comment_id: 500 };
    const incoming = Array.from({ length: 1000 }, (_, local_id) => ({ local_id, likes: 10, liked_by_me: true })).reverse();
    incoming.push({ local_id: 1001, content: "Novo" }, { local_id: 1001, likes: 2 });
    Form.watch["task.comments"].handler.call(commentsContext, incoming);
    assert.ok(lookup_reads < 4000, "Busca de comentários deve crescer linearmente");
    assert.equal(existing.length, 1001);
    assert.equal(existing[0].likes, 10);
    assert.equal(existing[500].likes, 0, "Preserva o comentário em edição");
    assert.equal(existing[0].local_content, "Preservado");
    assert.equal(existing.at(-1).likes, 2);

    lookup_reads = 0;
    const attachments = Array.from({ length: 1000 }, (_, id) => ({
      get local_id() { lookup_reads++; return id; },
      name: "Preservado", upload_status: "pending",
    }));
    const attachmentsContext = { editable_task: { attachments } };
    const incomingAttachments = Array.from({ length: 1000 }, (_, local_id) => ({ local_id, upload_status: "synced" })).reverse();
    incomingAttachments.push({ local_id: 1001, name: "Novo" }, { local_id: 1001, upload_status: "synced" });
    Form.watch["task.attachments"].handler.call(attachmentsContext, incomingAttachments);
    assert.ok(lookup_reads < 5000, "Busca de anexos deve crescer linearmente");
    assert.equal(attachments.length, 1001);
    assert.equal(attachments[0].name, "Preservado");
    assert.equal(attachments[0].upload_status, "synced");
    assert.equal(attachments.at(-1).upload_status, "synced");
  } finally {
    await server.close();
    globalThis.localStorage = previousStorage;
  }
});
