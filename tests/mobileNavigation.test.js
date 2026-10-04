import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { createRenderer, h, nextTick, reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useAppStore } from "../src/stores/app.js";
import { createWindowNavigation, mobileNavigationMixin, windowNavigationKey } from "../src/utils/mobileNavigation.js";
import { overlayScopeMixin } from "../src/utils/overlayScope.js";

const settled = () => setTimeout(0);

async function browserHistory(run, { restored = false } = {}) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const listeners = {};
  const routerState = { position: 7, current: "/", back: "/auth", forward: null, scroll: null };
  const entries = [
    { url: "http://kadem.test/auth", state: { position: 6, current: "/auth" } },
    { url: "http://kadem.test/", state: routerState },
  ];
  if (restored) entries.push({ url: "http://kadem.test/", state: { ...routerState, kademNavigation: true } });
  let index = entries.length - 1;
  let pending = false;
  let backs = 0;
  const classes = new Set();
  const browser = {
    location: { href: entries[index].url },
    innerWidth: 390,
    matchMedia: () => ({ matches: false }),
    addEventListener(name, handler) { listeners[name] = handler; },
    history: {
      get state() { return entries[index].state; },
      get length() { return entries.length; },
      pushState(state) {
        assert.equal(pending, false, "Não inserir entradas enquanto uma volta está em curso");
        entries.splice(index + 1);
        entries.push({ url: browser.location.href, state });
        index++;
      },
      back() { backs++; pending = true; },
    },
  };
  const move = (delta) => {
    pending = false;
    index += delta;
    assert.ok(index >= 0 && index < entries.length);
    browser.location.href = entries[index].url;
    listeners.popstate({ state: entries[index].state });
  };
  globalThis.window = browser;
  globalThis.document = { body: { classList: {
    add: (name) => classes.add(name), remove: (name) => classes.delete(name),
  } } };
  // Cada cenário usa uma instância isolada, como uma nova página do navegador.
  const api = await import(`../src/utils/modalHistory.js?scenario=${Math.random()}`);
  const registrations = [];
  const register = (name, callback, options) => {
    const unregister = api[name](callback, options);
    registrations.push(unregister);
    return unregister;
  };
  try {
    await run({
      ...api, browser, classes, routerState, register,
      back: () => move(-1), forward: () => move(1), finishBack: () => move(-1),
      get backs() { return backs; }, get index() { return index; },
    });
  } finally {
    registrations.forEach((unregister) => unregister());
    await settled();
    if (pending) move(-1);
    await settled();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
}

test("voltar fecha confirmação, painel, tela interna e minimiza só a janela ativa", async () => {
  await browserHistory(async ({ register, back, browser, classes, routerState }) => {
    const actions = [];
    let minimize;
    minimize = register("registerNavigation", () => { actions.push("minimize"); minimize(); }, { priority: 0 });
    let internal;
    internal = register("registerNavigation", () => { actions.push("list"); internal(); });
    register("registerModal", () => actions.push("task"));
    register("registerModal", () => actions.push("confirmation"));
    assert.equal(browser.history.length, 3, "Todas as camadas compartilham uma entrada");
    assert.deepEqual(browser.history.state, { ...routerState, kademNavigation: true });
    back(); await settled();
    assert.deepEqual(actions, ["confirmation"]);
    assert.equal(classes.has("modal-open-scroll-locked"), true);
    back(); await settled();
    assert.deepEqual(actions, ["confirmation", "task"]);
    assert.equal(classes.has("modal-open-scroll-locked"), false);
    back(); await settled();
    assert.deepEqual(actions, ["confirmation", "task", "list"]);
    back(); await settled();
    assert.deepEqual(actions, ["confirmation", "task", "list", "minimize"]);
    assert.equal(browser.location.href, "http://kadem.test/");
    back(); await settled();
    assert.equal(browser.location.href, "http://kadem.test/auth", "Sem camadas abertas, a navegação normal continua");
  });
});

test("fechar manualmente e trocar abas não fecha nem cria histórico para a camada seguinte", async () => {
  await browserHistory(async (context) => {
    const { register, back, browser } = context;
    let closed = 0;
    const oldWindow = register("registerNavigation", () => closed++);
    const task = register("registerModal", () => closed++);
    const confirmation = register("registerModal", () => closed++);
    task(); // Remove uma camada que não é o topo.
    oldWindow();
    const newWindow = register("registerNavigation", () => closed++);
    confirmation();
    await settled();
    assert.equal(context.backs, 0);
    assert.equal(browser.history.length, 3);
    assert.equal(closed, 0);
    back(); await settled();
    assert.equal(closed, 1);
    newWindow(); await settled();
    context.finishBack(); await settled();
  });
});

test("uma abertura durante history.back() aguarda o retorno sem fechar o novo modal", async () => {
  await browserHistory(async (context) => {
    const first = context.register("registerModal", () => {});
    first(); await settled();
    assert.equal(context.backs, 1);
    let closed = 0;
    context.register("registerModal", () => closed++);
    context.finishBack(); await settled();
    assert.equal(closed, 0);
    context.back(); await settled();
    assert.equal(closed, 1);
  });
});

test("menus de um modal fecham antes dele e modais protegidos bloqueiam ações inferiores", async () => {
  await browserHistory(async ({ register, back, navigateBack, browser }) => {
    const actions = [];
    register("registerNavigation", () => actions.push("minimize"), { priority: 0 });
    const locked = register("registerModal", () => actions.push("locked"), { handleHistory: false });
    let dropdown;
    dropdown = register("registerNavigation", () => { actions.push("dropdown"); dropdown(); }, { priority: 200 });
    back(); await settled();
    assert.deepEqual(actions, ["dropdown"]);
    back(); await settled();
    assert.deepEqual(actions, ["dropdown"]);
    assert.equal(navigateBack(), true);
    assert.equal(browser.location.href, "http://kadem.test/");
    locked();
    navigateBack(); await settled();
    assert.deepEqual(actions, ["dropdown", "minimize"]);
  });
});

test("voltar pela interface usa a mesma prioridade e remove a entrada ao fechar a última camada", async () => {
  await browserHistory(async (context) => {
    const actions = [];
    let root;
    root = context.register("registerNavigation", () => { actions.push("root"); root(); }, { priority: 0 });
    let menu;
    menu = context.register("registerNavigation", () => { actions.push("menu"); menu(); }, { priority: 40 });
    context.register("registerModal", () => actions.push("modal"));
    context.navigateBack(); await settled();
    context.navigateBack(); await settled();
    context.navigateBack(); await settled();
    assert.deepEqual(actions, ["modal", "menu", "root"]);
    assert.equal(context.backs, 1);
    context.finishBack(); await settled();
    assert.equal(context.navigateBack(), false);
    assert.deepEqual(context.browser.history.state, context.routerState);
  });
});

test("restaurar a página reutiliza a entrada de proteção existente", async () => {
  await browserHistory(async ({ register, back, browser }) => {
    let closed = 0;
    register("registerModal", () => closed++);
    assert.equal(browser.history.length, 3);
    back(); await settled();
    assert.equal(closed, 1);
  }, { restored: true });
});

test("desmontar após uma navegação real não desfaz a rota de destino", async () => {
  await browserHistory(async (context) => {
    const modal = context.register("registerModal", () => {});
    context.browser.location.href = "http://kadem.test/logout";
    modal(); await settled();
    assert.equal(context.backs, 0);
    assert.equal(context.browser.location.href, "http://kadem.test/logout");
  });
});

test("o mixin suspende janelas e abas ocultas, restaura a navegação e preserva os rascunhos", async () => {
  await browserHistory(async () => {
    // O mixin usa a instância normal do módulo, fora dos cenários isolados acima.
    const { navigateBack } = await import("../src/utils/modalHistory.js");
    const renderer = createRenderer({
      createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
      insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
      parentNode: () => null, nextSibling: () => null,
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const appStore = useAppStore();
    const state = reactive({ active: true, visible: true, tab: true, draft: "Edição não salva" });
    const actions = [];
    const scope = createWindowNavigation(() => state.active, () => state.visible);
    const consumer = {
      mixins: [mobileNavigationMixin],
      computed: { mobile_back_active: () => state.tab },
      methods: { mobile_back: () => actions.push(state.draft) },
      render: () => null,
    };
    const app = renderer.createApp({
      provide: () => ({ [windowNavigationKey]: scope }),
      render: () => h(consumer),
    });
    app.use(pinia);
    app.mount({});
    try {
      assert.equal(navigateBack(), true);
      state.active = false; await nextTick();
      assert.equal(navigateBack(), false, "Janela sem foco não recebe Voltar");
      assert.equal(state.draft, "Edição não salva");
      assert.equal(overlayScopeMixin.computed.is_modal_active.call({
        modelValue: true, overlay_active: true, windowNavigation: scope,
      }), false);
      state.active = true; state.tab = false; await nextTick();
      assert.equal(navigateBack(), false, "Aba oculta não recebe Voltar");
      state.visible = false;
      assert.equal(overlayScopeMixin.computed.overlay_active.call({ windowNavigation: scope }), false);
      state.tab = true; state.visible = true; await nextTick();
      assert.equal(navigateBack(), true);
      appStore.isMobile = false; await nextTick();
      assert.equal(navigateBack(), false, "O desktop mantém sua navegação normal");
      assert.deepEqual(actions, ["Edição não salva", "Edição não salva"]);
    } finally {
      app.unmount();
      await settled();
    }
  });
});
