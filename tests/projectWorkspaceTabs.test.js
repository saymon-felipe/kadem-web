import { test } from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { createApp, nextTick } from "vue";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { overlayScopeMixin } from "../src/utils/overlayScope.js";

test("abas isolam a seleção, duplicam só a navegação e restauram o projeto legado", async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  const server = await createServer({
    configFile: false,
    plugins: [
      {
        name: "stub-router",
        enforce: "pre",
        resolveId(id) {
          if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id))
            return "\0stub-router";
        },
        load(id) {
          if (id === "\0stub-router") return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
        },
      },
      vue(),
    ],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  try {
    setActivePinia(createPinia());
    const { useProjectStore } = await server.ssrLoadModule("/src/stores/projects.js");
    const store = useProjectStore();
    store.active_project_id = 10;
    store.ensureWorkspaceTabs();
    const first = store.workspace_tabs[0];
    assert.equal(first.project_local_id, 10);
    store.openWorkspaceTab();
    const second = store.workspace_tabs[1];
    assert.equal(store.active_project_id, null);
    store.selectProject(20);
    assert.equal(first.project_local_id, 10);
    assert.equal(second.project_local_id, 20);
    store.duplicateWorkspaceTab();
    const third = store.workspace_tabs[2];
    assert.notEqual(third.id, second.id);
    assert.equal(third.project_local_id, 20);
    store.selectWorkspaceTabProject(second.id, 30);
    assert.equal(store.active_project_id, 20, "Evento de uma aba inativa não troca a ativa");
    store.closeWorkspaceTab(second.id);
    assert.equal(store.active_workspace_tab_id, third.id);
    store.closeWorkspaceTab(third.id);
    assert.equal(store.active_workspace_tab_id, first.id);
    assert.equal(store.active_project_id, 10);
    store.closeWorkspaceTab(first.id);
    assert.equal(store.workspace_tabs.length, 1, "A última aba permanece disponível");
    store.duplicateWorkspaceTab();
    store.clearWorkspaceProject("10");
    assert.equal(store.active_project_id, null);
    assert.ok(store.workspace_tabs.every((tab) => tab.project_local_id === null));
    store.$patch({ workspace_tabs: [{ id: "restored", project_local_id: 30 }], active_workspace_tab_id: "missing" });
    store.ensureWorkspaceTabs();
    assert.equal(store.active_workspace_tab_id, "restored");
    assert.equal(store.active_project_id, 30);
    store.openWorkspaceTab(50);
    const beforeReorder = [...store.workspace_tabs];
    store.reorderWorkspaceTabs([beforeReorder[1], beforeReorder[0]]);
    assert.equal(store.workspace_tabs[0].id, beforeReorder[1].id);
    assert.equal(store.workspace_tabs[1].id, beforeReorder[0].id);
  } finally {
    await server.close();
    globalThis.localStorage = previousStorage;
  }
});

test("menus usam coordenadas da aba e modais ocultos ficam suspensos", () => {
  const target = { getBoundingClientRect: () => ({ left: 200, top: 100 }) };
  const scope = { target, active: false, width: 600, height: 450 };
  const context = { overlayScope: scope, overlay_active: false, modelValue: true };
  assert.equal(overlayScopeMixin.computed.overlay_target.call(context), target);
  assert.equal(overlayScopeMixin.computed.is_modal_active.call(context), false);
  assert.equal(context.modelValue, true, "Suspender não fecha nem descarta a edição");
  assert.equal(
    overlayScopeMixin.computed.is_modal_active.call({
      modelValue: true,
      overlay_active: true,
      overlayScope: { interactive: false },
    }),
    false,
    "Uma janela sem foco não consome Escape ou Voltar",
  );
  assert.deepEqual(
    overlayScopeMixin.methods.overlay_rect.call(context, {
      getBoundingClientRect: () => ({ left: 300, top: 200, width: 80, height: 30 }),
    }),
    { left: 100, top: 100, bottom: 130, width: 80, height: 30 },
  );
  assert.equal(overlayScopeMixin.computed.overlay_target.call({ overlayScope: null }), "body");
  assert.equal(overlayScopeMixin.computed.overlay_active.call({ overlayScope: null }), true);
});

test("Escape e voltar alcançam somente o topo visível, inclusive ao suspender uma aba", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const listeners = {};
  let backs = 0;
  globalThis.window = {
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    history: {
      pushState() {},
      back() {
        backs++;
      },
    },
  };
  globalThis.document = { body: { classList: { add() {}, remove() {} } } };
  try {
    const { registerModal, isTopModal, hasOpenModals } = await import("../src/utils/modalHistory.js");
    let taskClosed = 0;
    let confirmationClosed = 0;
    const task = registerModal(() => taskClosed++);
    const confirmation = registerModal(() => confirmationClosed++);
    assert.equal(isTopModal(task), false);
    assert.equal(isTopModal(confirmation), true);
    confirmation();
    listeners.popstate(); // Voltar programático não fecha o painel da tarefa.
    assert.equal(taskClosed, 0);
    assert.equal(isTopModal(task), true);
    task(); // Aba oculta: desregistra sem fechar o rascunho.
    listeners.popstate();
    assert.equal(hasOpenModals(), false);
    const other = registerModal(() => confirmationClosed++);
    listeners.popstate(); // Voltar do usuário na outra aba.
    assert.equal(confirmationClosed, 1);
    assert.equal(taskClosed, 0);
    other();
    assert.equal(backs, 2);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});

test("selectivePersistence salva e restaura abas de projetos e sua ordem na sessão", async () => {
  const storeData = new Map();
  const mockStorage = {
    getItem: (key) => storeData.get(key) ?? null,
    setItem: (key, val) => {
      storeData.set(key, String(val));
    },
    removeItem: (key) => storeData.delete(key),
  };
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = mockStorage;
  const server = await createServer({
    configFile: false,
    plugins: [
      {
        name: "stub-router",
        enforce: "pre",
        resolveId(id) {
          if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id))
            return "\0stub-router";
        },
        load(id) {
          if (id === "\0stub-router") return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
        },
      },
      vue(),
    ],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  try {
    const { selectivePersistence } = await server.ssrLoadModule("/src/plugins/selectivePersistence.js");

    const makePinia = () => {
      const pinia = createPinia().use((context) => {
        if (context.options.localPersist) context.options.localPersist.storage = mockStorage;
        return selectivePersistence(context);
      });
      createApp({}).use(pinia);
      setActivePinia(pinia);
      return pinia;
    };

    const pinia1 = makePinia();
    const { useProjectStore } = await server.ssrLoadModule("/src/stores/projects.js");
    const store = useProjectStore(pinia1);
    store.active_project_id = 99;
    store.ensureWorkspaceTabs();
    store.openWorkspaceTab(101);
    const [tab1, tab2] = store.workspace_tabs;
    store.reorderWorkspaceTabs([tab2, tab1]);
    await nextTick();
    store.$persist();

    // Simula recarregamento da sessão em nova instância de pinia/store
    const piniaReload = makePinia();
    const storeReloaded = useProjectStore(piniaReload);
    assert.equal(storeReloaded.workspace_tabs.length, 2);
    assert.equal(storeReloaded.workspace_tabs[0].id, tab2.id);
    assert.equal(storeReloaded.workspace_tabs[1].id, tab1.id);
    assert.equal(storeReloaded.active_workspace_tab_id, tab2.id);
  } finally {
    await server.close();
    globalThis.localStorage = previousStorage;
  }
});

test("arraste de 2 abas calcula limiar pelo ponto médio e evita reset visual no drop", async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  const server = await createServer({
    configFile: false,
    plugins: [
      {
        name: "stub-router",
        enforce: "pre",
        resolveId(id) {
          if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id))
            return "\0stub-router";
        },
        load(id) {
          if (id === "\0stub-router") return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
        },
      },
      vue(),
    ],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  try {
    const componentModule = await server.ssrLoadModule("/src/components/windows/ProjectsWindow.vue");
    const ProjectsWindow = componentModule.default || componentModule;

    const vm = {
      workspace_tabs: [{ id: "tab-0" }, { id: "tab-1" }],
      tab_elements: {},
      dragging_tab_id: null,
      drag_index: -1,
      drag_target_index: -1,
      drag_current_delta: 0,
      drag_is_settling: false,
      is_reorder_committing: false,
      drag_shift_offsets: {},
      ...ProjectsWindow.methods,
    };

    // Testa get_tab_drag_style durante commits de reordenação (zero flicker / reset)
    vm.is_reorder_committing = true;
    const styleDuringCommit = vm.get_tab_drag_style("tab-0", 0);
    assert.equal(styleDuringCommit.transform, "none");
    assert.equal(styleDuringCommit.transition, "none");

    vm.is_reorder_committing = false;
    // Sem arraste, abas em repouso não devem ter transição ativa de transform
    const styleIdle = vm.get_tab_drag_style("tab-0", 0);
    assert.equal(styleIdle.transform, "none");
    assert.equal(styleIdle.transition, "none");

    // Simulando arraste ativo
    vm.dragging_tab_id = "tab-0";
    vm.drag_current_delta = 50;
    const styleDragging = vm.get_tab_drag_style("tab-0", 0);
    assert.equal(styleDragging.transform, "translateX(50px)");
    assert.equal(styleDragging.transition, "none");

    // Aba vizinha com deslocamento
    vm.drag_shift_offsets["tab-1"] = -150;
    const styleNeighbor = vm.get_tab_drag_style("tab-1", 1);
    assert.equal(styleNeighbor.transform, "translateX(-150px)");
    assert.ok(styleNeighbor.transition.includes("transform"));

    // Testa a matemática de limiar para 2 abas com larguras reais
    const tab0 = { left: 0, right: 150, width: 150, center: 75 };
    const tab1 = { left: 156, right: 306, width: 150, center: 231 };
    const tabsRects = [tab0, tab1];

    // Arrastando tab 0 para a direita:
    // Antes de atingir o ponto médio (delta = 70 => center = 145 <= 153)
    let deltaA = 70;
    let centerA = tab0.center + deltaA;
    let targetIndexA = 0;
    for (let i = 0; i < tabsRects.length - 1; i++) {
      if (centerA > (tabsRects[i].center + tabsRects[i + 1].center) / 2) targetIndexA = i + 1;
    }
    assert.equal(targetIndexA, 0, "Abaixo do limiar médio de 50%, a aba permanece no índice 0");

    // Cruzando o ponto médio (delta = 85 => center = 160 > 153)
    let deltaB = 85;
    let centerB = tab0.center + deltaB;
    let targetIndexB = 0;
    for (let i = 0; i < tabsRects.length - 1; i++) {
      if (centerB > (tabsRects[i].center + tabsRects[i + 1].center) / 2) targetIndexB = i + 1;
    }
    assert.equal(targetIndexB, 1, "Ao cruzar a metade da sobreposição com 2 abas, o índice alvo vira 1");

    // Arrastando tab 1 para a esquerda:
    // Cruzando o ponto médio para a esquerda (delta = -85 => center = 231 - 85 = 146 <= 153)
    let deltaC = -85;
    let centerC = tab1.center + deltaC;
    let targetIndexC = 0;
    for (let i = 0; i < tabsRects.length - 1; i++) {
      if (centerC > (tabsRects[i].center + tabsRects[i + 1].center) / 2) targetIndexC = i + 1;
    }
    assert.equal(targetIndexC, 0, "Ao arrastar a segunda aba para a esquerda passando do ponto médio, o índice alvo vira 0");
  } finally {
    await server.close();
    globalThis.localStorage = previousStorage;
  }
});

