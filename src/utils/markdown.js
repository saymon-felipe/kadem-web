import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";

// HTML fornecido pelo usuário permanece texto; o parser também bloqueia URLs perigosas.
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true }).use(taskLists);

markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  if (!env.interactive) tokens[index].attrSet("tabindex", "-1");
  return renderer.renderToken(tokens, index, options);
};

export function renderMarkdown(source, { interactive = true } = {}) {
  return markdown.render(typeof source === "string" ? source : "", { interactive });
}

export function hasMarkdown(source) {
  if (typeof source !== "string" || !source.trim()) return false;
  return markdown.parse(source, {}).some((token) => {
    if (token.type === "inline") {
      return token.children.some(
        (child) => child.type !== "text" && child.type !== "softbreak" && child.markup !== "linkify",
      );
    }
    return token.type !== "paragraph_open" && token.type !== "paragraph_close";
  });
}
