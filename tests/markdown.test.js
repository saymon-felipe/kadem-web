import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, hasMarkdown } from "../src/utils/markdown.js";

test("texto comum não oferece o modo Markdown, mesmo com parágrafos, URLs ou símbolos escapados", () => {
  for (const source of [
    "",
    null,
    undefined,
    "Descrição normal",
    "Linha 1\nLinha 2\n\nOutro parágrafo",
    "Veja https://example.com",
    "Preço R$ 10 * 2 = 20",
    "nome_do_arquivo",
    "\\*texto\\*",
    "<script>alert(1)</script>",
  ]) {
    assert.equal(hasMarkdown(source), false, String(source));
  }
});

test("detecta Markdown digitado ou colado com o mesmo parser usado na prévia", () => {
  for (const source of [
    "# Título",
    "**Negrito**",
    "*Itálico*",
    "~~Removido~~",
    "`código`",
    "- Item\n- Outro",
    "1. Passo",
    "- [ ] Fazer",
    "> Citação",
    "```js\nconst x = 1;\n```",
    "[Link](https://example.com)",
    "![Imagem](https://example.com/a.png)",
    "| A | B |\n| --- | --- |\n| 1 | 2 |",
    "Título\n===",
    "---",
  ]) {
    assert.equal(hasMarkdown(source), true, source);
  }
});

test("renderiza títulos, ênfase, listas, citações, tabelas e código", () => {
  const source =
    '# Entrega\n\n**Negrito** e *itálico* com ~~removido~~ e `código`.\n\n- Item\n  - Filho\n\n1. Passo\n\n> Observação\n\n```js\nconst x = "<tag>";\n```\n\n| Nome | Valor |\n| --- | --- |\n| A | 1 |';
  const html = renderMarkdown(source);
  for (const fragment of [
    "<h1>Entrega</h1>",
    "<strong>Negrito</strong>",
    "<em>itálico</em>",
    "<s>removido</s>",
    "<code>código</code>",
    "<ul>",
    "<ol>",
    "<blockquote>",
    "<table>",
    "<th>Nome</th>",
    '<code class="language-js">const x = &quot;&lt;tag&gt;&quot;;',
  ]) {
    assert.ok(html.includes(fragment), fragment);
  }
});

test("preserva acentos, quebras simples de linha e descrições vazias", () => {
  assert.equal(renderMarkdown("Descrição antiga\nSegunda linha"), "<p>Descrição antiga<br>\nSegunda linha</p>\n");
  for (const source of ["", null, undefined]) assert.equal(renderMarkdown(source), "");
});

test("checklists mostram caixas marcadas e desmarcadas sem permitir alterações na prévia", () => {
  const html = renderMarkdown("- [ ] Fazer\n- [x] Feito\n- [X] Revisado");
  assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
  assert.equal((html.match(/checked=""/g) || []).length, 2);
});

test("links explícitos e automáticos abrem em outra aba com isolamento", () => {
  const html = renderMarkdown("[Documentação](https://example.com/docs) e https://example.com");
  assert.equal((html.match(/target="_blank"/g) || []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
});

test("links de cartões truncados não entram na navegação por teclado", () => {
  const source = "[Documentação](https://example.com)";
  assert.match(renderMarkdown(source, { interactive: false }), /tabindex="-1"/);
  assert.doesNotMatch(renderMarkdown(source), /tabindex=/);
});

test("HTML, SVG e eventos fornecidos pelo usuário são exibidos como texto", () => {
  const html = renderMarkdown(
    "<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n\n- [ ] <img src=x onerror=alert(1)>",
  );
  assert.doesNotMatch(html, /<(script|img|svg)\b/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});

test("bloqueia links e imagens com protocolos executáveis, inclusive codificados", () => {
  for (const url of [
    "javascript:alert%281%29",
    "JaVaScRiPt:alert%281%29",
    "javascript&#58;alert%281%29",
    "vbscript:msgbox%281%29",
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zz4=",
  ]) {
    const html = renderMarkdown(`[Abrir](${url}) ![Imagem](${url})`);
    assert.doesNotMatch(html, /<(a|img)\b/i, url);
  }
});

test("escapa tentativas de injeção em atributos de links e imagens", () => {
  const html = renderMarkdown(
    '[Link](https://example.com "&quot; onclick=&quot;alert(1)")\n![Imagem](https://example.com/a.png "&quot; onerror=&quot;alert(1)")',
  );
  assert.doesNotMatch(html, /"\s+(onclick|onerror)=/i);
  assert.match(html, /&quot;/);
});
