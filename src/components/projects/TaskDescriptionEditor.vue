<template>
  <section class="description-card">
    <div class="description-toolbar">
      <label :id="`description-label-${$.uid}`" :for="mode !== 'preview' ? `task-description-${$.uid}` : undefined"
        >Descrição</label
      >
      <button
        v-if="has_markdown || mode !== 'text'"
        ref="toggleButton"
        type="button"
        class="description-toggle"
        :aria-pressed="mode === 'markdown'"
        :aria-controls="`task-description-${$.uid}`"
        @click="toggle_editing"
      >
        <font-awesome-icon :icon="mode === 'markdown' ? 'eye' : 'pencil'" />
        {{ mode === "markdown" ? "Visualizar" : "Editar Markdown" }}
      </button>
    </div>

    <textarea
      v-if="mode !== 'preview'"
      :id="`task-description-${$.uid}`"
      ref="descriptionInput"
      :value="modelValue"
      rows="7"
      class="description-input custom-scrollbar"
      :class="{ 'is-markdown': mode === 'markdown' }"
      :aria-describedby="mode === 'markdown' ? `description-help-${$.uid}` : undefined"
      :placeholder="mode === 'markdown' ? 'Escreva a descrição em Markdown…' : 'Descreva a tarefa…'"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    <div
      v-else
      :id="`task-description-${$.uid}`"
      class="description-preview custom-scrollbar"
      :aria-labelledby="`description-label-${$.uid}`"
    >
      <MarkdownContent v-if="modelValue" :source="modelValue" />
      <p v-else class="description-empty">Nenhuma descrição. Clique em Editar Markdown para escrever.</p>
    </div>

    <p v-if="mode === 'markdown'" :id="`description-help-${$.uid}`" class="description-help">
      Markdown: **negrito**, *itálico*, # título, - lista, - [ ] checklist e `código`.
    </p>
  </section>
</template>

<script>
import MarkdownContent from "../ui/MarkdownContent.vue";
import { hasMarkdown } from "@/utils/markdown";

export default {
  name: "TaskDescriptionEditor",
  components: { MarkdownContent },
  props: { modelValue: { type: String, default: "" } },
  emits: ["update:modelValue"],
  data() {
    return { mode: "text" };
  },
  computed: {
    has_markdown() {
      return hasMarkdown(this.modelValue);
    },
  },
  methods: {
    async toggle_editing() {
      this.mode = this.mode === "markdown" ? "preview" : "markdown";
      await this.$nextTick();
      if (this.mode !== "preview") this.$refs.descriptionInput?.focus();
      else this.$refs.toggleButton?.focus();
    },
  },
};
</script>

<style scoped>
.description-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 0 0 auto;
  min-width: 0;
}
.description-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.description-toolbar label {
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 800;
  position: static;
  transform: none;
}
.description-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--color-info);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
}
.description-toggle:hover {
  background: var(--surface-3);
}
.description-toggle:focus-visible,
.description-input:focus-visible {
  outline: 3px solid var(--color-info);
  outline-offset: 2px;
}
.description-input,
.description-preview {
  width: 100%;
  height: clamp(160px, 30vh, 260px);
  min-height: 160px;
  max-height: 280px;
  flex: 0 0 auto;
  overflow: auto;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
  font-size: var(--fontsize-sm);
  line-height: 1.5;
  color: var(--text-primary);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
.description-input {
  resize: vertical;
  font-family: inherit;
}
.description-input.is-markdown {
  font-family: ui-monospace, Consolas, monospace;
}
.description-empty,
.description-help {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
}
@media (max-width: 768px) {
  .description-input,
  .description-preview {
    height: clamp(130px, 28vh, 190px);
    min-height: 130px;
    max-height: 190px;
  }
  .description-toggle {
    min-height: 44px;
  }
}
</style>
