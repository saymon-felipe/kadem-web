import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRenderer, h, ref, nextTick, compile } from 'vue';
import { parse } from '@vue/compiler-sfc';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';

const createTestServer = () => createServer({
  configFile: false, root: process.cwd(),
  plugins: [{ name: 'stub-router', enforce: 'pre', resolveId(id) { if (/router(\/index(\.js)?)?$/.test(id)) return '\0stub-router'; }, load(id) { if (id === '\0stub-router') return 'export default { push() {}, currentRoute: { value: {} } };'; } }, vue()],
  resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, hmr: false },
  appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error',
});

for (const boundaryCase of [
  { path: '/src/components/projects/ProjectContentBoundary.vue', title: 'Não foi possível exibir esta aba', action: 'Voltar aos projetos', event: 'onBackToList' },
  { path: '/src/components/ui/ContentErrorBoundary.vue', title: 'Não foi possível exibir este conteúdo', action: 'Fechar janela', event: 'onAction' },
]) test(`erro de renderização isolado e recuperação: ${boundaryCase.path}`, async (context) => {
  context.mock.method(console, 'warn', () => {});
  const server = await createTestServer();
  try {
    const { default: component } = await server.ssrLoadModule(boundaryCase.path);
    const { descriptor } = parse(await readFile(boundaryCase.path.slice(1), 'utf8'));
    // O plugin injeta setup para registrar o módulo no SSR; o teste usa o renderer de cliente.
    const Boundary = { ...component, setup: undefined, ssrRender: undefined, render: compile(descriptor.template.content) };
    const node = (type, text = '') => ({ type, text, props: {}, children: [], parent: null });
    const renderer = createRenderer({
      createElement: type => node(type), createText: text => node('#text', text), createComment: text => node('#comment', text),
      setText: (element, text) => { element.text = text; },
      setElementText: (element, text) => { element.text = text; element.children = []; },
      patchProp: (element, key, _previous, value) => { element.props[key] = value; },
      parentNode: element => element.parent,
      nextSibling: element => element.parent?.children[element.parent.children.indexOf(element) + 1] || null,
      insert(element, parent, anchor) {
        assert.ok(parent, 'A recuperação nunca insere conteúdo em um pai ausente');
        if (element.parent) element.parent.children.splice(element.parent.children.indexOf(element), 1);
        const index = anchor ? parent.children.indexOf(anchor) : -1;
        parent.children.splice(index < 0 ? parent.children.length : index, 0, element);
        element.parent = parent;
      },
      remove(element) { if (element.parent) element.parent.children.splice(element.parent.children.indexOf(element), 1); element.parent = null; },
    });
    const text = element => element.text + element.children.map(text).join(' ');
    const find = (element, predicate) => predicate(element) ? element : element.children.map(child => find(child, predicate)).find(Boolean);
    const failed = ref(true);
    const errors = [];
    let boundary;
    let backs = 0;
    const Faulty = { render() { if (failed.value) throw new Error('Falha simulada no quadro'); return h('div', 'Quadro recuperado'); } };
    const root = node('root');
    const app = renderer.createApp({ render: () => h('section', [h('header', 'Abas dos projetos'), h('aside', 'Outra janela continua aberta'), h(Boundary, { actionLabel: boundaryCase.action, ref: value => { boundary = value; }, [boundaryCase.event]: () => { backs++; } }, () => h(Faulty))]) });
    app.component('font-awesome-icon', { render: () => h('span') });
    app.config.errorHandler = error => errors.push(error);
    app.mount(root);
    await nextTick();
    await nextTick();
    assert.deepEqual(errors, []);
    assert.equal(boundary.failed, true);
    assert.match(text(root), /Abas dos projetos/);
    assert.ok(text(root).includes(boundaryCase.title));
    assert.match(text(root), /Outra janela continua aberta/);
    assert.deepEqual(errors, []);
    failed.value = false;
    boundary.retry();
    await nextTick();
    assert.match(text(root), /Quadro recuperado/);
    assert.doesNotMatch(text(root), /Não foi possível exibir/);
    failed.value = true;
    await nextTick();
    await nextTick();
    await nextTick();
    assert.ok(text(root).includes(boundaryCase.title));
    const back = find(root, element => element.type === 'button' && text(element).trim() === boundaryCase.action);
    back.props.onClick();
    assert.equal(backs, 1);
    app.unmount();
  } finally { await server.close(); }
});

test('barra de abas sempre usa um destino existente quando o cabeçalho ainda não está pronto', async () => {
  const previousStorage = globalThis.localStorage;
  const previousDocument = globalThis.document;
  globalThis.localStorage = { getItem: () => null };
  const server = await createTestServer();
  try {
    const { default: Window } = await server.ssrLoadModule('/src/components/windows/ProjectsWindow.vue');
    let header = null;
    let afterMount;
    const fallback = {};
    globalThis.document = { querySelector: () => header };
    const context = { teleport_target: '#window-header-tabs-projects', $refs: { tabsFallback: fallback }, $nextTick: callback => { afterMount = callback; }, is_teleport_ready: false, tabs_target: null };
    Window.methods.check_teleport_target.call(context);
    assert.equal(context.tabs_target, fallback);
    assert.equal(context.is_teleport_ready, false);
    header = {};
    afterMount();
    assert.equal(context.tabs_target, header);
    assert.equal(context.is_teleport_ready, true);
  } finally { await server.close(); globalThis.localStorage = previousStorage; globalThis.document = previousDocument; }
});
