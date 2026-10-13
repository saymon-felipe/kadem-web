import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

test("altura do modal inclui cabeçalhos personalizados e respeita o espaço disponível", async (t) => {
  const server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  const previousWindow = globalThis.window;
  try {
    const { default: BaseModal } = await server.ssrLoadModule("/src/components/BaseModal.vue");
    const styles = new Map();
    globalThis.window = { getComputedStyle: (element) => styles.get(element) || {} };

    const header = { offsetHeight: 55 };
    const content = { offsetHeight: 270 };
    const body = { children: [content], querySelector: () => null };
    const card = { children: [header, body] };
    styles.set(body, { paddingTop: "16px", paddingBottom: "16px" });
    styles.set(card, { borderTopWidth: "1px", borderBottomWidth: "1px" });
    const context = {
      is_modal_active: true,
      overlay_height: 720,
      overlay_scoped: false,
      $refs: { cardRef: card, bodyRef: body },
    };
    const measure = () => BaseModal.methods.updateModalHeight.call(context, false);

    await t.test("o header do slot não precisa de headerRef e a altura não encolhe ao medir novamente", () => {
      for (let pass = 0; pass < 5; pass++) {
        measure();
        assert.equal(context.modalHeight, 359);
      }
    });

    await t.test("conteúdo grande fica limitado à viewport ou à janela do projeto", () => {
      content.offsetHeight = 1000;
      measure();
      assert.equal(context.modalHeight, 644);
      context.overlay_scoped = true;
      context.overlay_height = 320;
      measure();
      assert.equal(context.modalHeight, 296);
    });

    await t.test("um diálogo curto conserva sua altura natural", () => {
      content.offsetHeight = 20;
      measure();
      assert.equal(context.modalHeight, 109);
    });
  } finally {
    globalThis.window = previousWindow;
    await server.close();
  }
});
