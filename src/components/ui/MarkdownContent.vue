<template>
  <div class="markdown-content" :class="{ 'is-compact': compact }" v-html="rendered_content"></div>
</template>

<script>
import { renderMarkdown } from "@/utils/markdown";

export default {
  name: "MarkdownContent",
  props: {
    source: { type: String, default: "" },
    compact: { type: Boolean, default: false },
  },
  computed: {
    rendered_content() {
      return renderMarkdown(this.source, { interactive: !this.compact });
    },
  },
};
</script>

<style scoped>
.markdown-content {
  min-width: 0;
  color: var(--text-primary);
  font-size: var(--fontsize-sm);
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: normal;
}

.markdown-content :deep(:is(p, ul, ol, blockquote, pre, table, hr)) {
  margin: 0 0 0.75em;
}

.markdown-content :deep(:is(h1, h2, h3, h4, h5, h6)) {
  margin: 1em 0 0.5em;
  font-weight: 700;
  line-height: 1.3;
  user-select: text;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
}
.markdown-content :deep(h2) {
  font-size: 1.3em;
}
.markdown-content :deep(h3) {
  font-size: 1.15em;
}
.markdown-content :deep(:is(h4, h5, h6)) {
  font-size: 1em;
}
.markdown-content :deep(> :first-child) {
  margin-top: 0;
}
.markdown-content :deep(> :last-child) {
  margin-bottom: 0;
}
.markdown-content :deep(:is(ul, ol)) {
  padding-left: 1.5em;
}
.markdown-content :deep(li > :is(ul, ol, p)) {
  margin-bottom: 0;
}
.markdown-content :deep(a) {
  color: var(--color-info);
  text-decoration: underline;
}
.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--color-info);
  padding-left: 1em;
  color: var(--text-secondary);
}

.markdown-content :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
  background: var(--surface-3);
  border-radius: 3px;
  padding: 0.15em 0.3em;
}

.markdown-content :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  padding: 0.75em;
  background: var(--surface-3);
  border-radius: var(--radius-sm);
  white-space: pre;
}

.markdown-content :deep(pre code) {
  padding: 0;
  background: transparent;
}
.markdown-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}
.markdown-content :deep(:is(th, td)) {
  border: 1px solid var(--glass-border);
  padding: 0.4em 0.65em;
}
.markdown-content :deep(th) {
  background: var(--surface-3);
  font-weight: 700;
}
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}
.markdown-content :deep(hr) {
  border: 0;
  border-top: 1px solid var(--glass-border);
}
.markdown-content :deep(.task-list-item) {
  list-style: none;
}
.markdown-content :deep(.task-list-item-checkbox) {
  margin-right: 0.4em;
  accent-color: var(--color-info);
}

.is-compact {
  line-height: 1.4;
}
.is-compact :deep(:is(h1, h2, h3, h4, h5, h6)) {
  font-size: 1em;
  line-height: inherit;
}
.is-compact :deep(:is(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6)) {
  margin: 0;
}
</style>
