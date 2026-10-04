<template>
  <fieldset class="preset-picker" :disabled="disabled">
    <div class="preset-header">
      <div class="preset-title-row">
        <span class="preset-title-icon" aria-hidden="true">
          <font-awesome-icon icon="table-cells-large" />
        </span>
        <legend class="preset-legend">Modelo do kanban</legend>
      </div>
      <p class="preset-intro">
        Configure colunas e regras em um clique. Você pode ajustá-las depois.
      </p>
    </div>

    <div class="preset-options" role="radiogroup" aria-label="Modelos de fluxo Kanban">
      <label
        v-for="preset in presets"
        :key="preset.id"
        class="preset-option"
        :class="{
          'is-selected': modelValue === preset.id,
          'is-empty': preset.id === 'empty',
        }"
      >
        <input
          type="radio"
          class="preset-radio-input"
          :name="radioName"
          :value="preset.id"
          :checked="modelValue === preset.id"
          :disabled="disabled"
          @change="$emit('update:modelValue', preset.id)"
        />

        <!-- Custom Radio Indicator (strictly round, never square outline) -->
        <span class="custom-radio-indicator" aria-hidden="true">
          <span class="radio-outer-ring">
            <span class="radio-inner-dot"></span>
          </span>
        </span>

        <span class="preset-option-body">
          <span class="preset-card-header">
            <span class="preset-info-left">
              <span
                class="preset-icon-badge"
                :style="{
                  '--accent-color': getPresetMeta(preset.id).accent,
                }"
              >
                <font-awesome-icon :icon="getPresetMeta(preset.id).icon" />
              </span>
              <span class="preset-name">{{ preset.name }}</span>
            </span>

            <span
              class="preset-count-pill"
              :class="{ 'is-zero': preset.columns.length === 0 }"
            >
              {{ preset.columns.length }} {{ preset.columns.length === 1 ? 'coluna' : 'colunas' }}
            </span>
          </span>

          <span class="preset-description">{{ preset.description }}</span>
        </span>
      </label>
    </div>

    <transition name="preview-fade" mode="out-in">
      <div
        v-if="selectedPreset"
        :key="selectedPreset.id"
        class="preset-preview"
        aria-live="polite"
        aria-atomic="true"
      >
        <template v-if="selectedPreset.columns.length">
          <!-- Colunas / Pipeline -->
          <div class="preview-section">
            <div class="preview-heading">
              <span class="preview-heading-title">
                <font-awesome-icon icon="list-check" class="heading-icon" />
                Colunas prontas
              </span>
              <span class="preview-counter-badge">
                {{ selectedPreset.columns.length }} etapas
              </span>
            </div>

            <ol class="preset-columns-pipeline">
              <li
                v-for="(column, idx) in selectedPreset.columns"
                :key="column.title"
                class="pipeline-item"
                :title="getColumnType(column.type)?.label || column.title"
              >
                <div class="column-pill">
                  <span
                    class="column-dot"
                    :style="{ backgroundColor: getColumnType(column.type)?.color || 'var(--color-info)' }"
                  ></span>
                  <span class="column-name">{{ column.title }}</span>
                </div>
                <span
                  v-if="idx < selectedPreset.columns.length - 1"
                  class="pipeline-arrow"
                  aria-hidden="true"
                >
                  <font-awesome-icon icon="arrow-right" />
                </span>
              </li>
            </ol>
          </div>

          <!-- Regras Automáticas -->
          <div v-if="selectedRules.length" class="preview-section rules-section">
            <div class="preview-heading">
              <span class="preview-heading-title">
                <font-awesome-icon icon="bolt" class="heading-icon bolt-color" />
                Regras automáticas
              </span>
            </div>

            <ul class="preset-rules-list">
              <li v-for="rule in selectedRules" :key="rule" class="rule-item">
                <span class="rule-icon-wrapper" aria-hidden="true">
                  <font-awesome-icon icon="wand-magic-sparkles" />
                </span>
                <span class="rule-text">{{ rule }}</span>
              </li>
            </ul>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="empty-preview-card">
          <div class="empty-preview-icon" aria-hidden="true">
            <font-awesome-icon icon="folder-plus" />
          </div>
          <div class="empty-preview-text">
            <h4>Quadro em branco</h4>
            <p>
              O projeto começará sem colunas. Monte seu fluxo personalizado no Kanban quando quiser.
            </p>
          </div>
        </div>
      </div>
    </transition>
  </fieldset>
</template>

<script>
import { useId } from "vue";
import {
  KANBAN_PRESETS,
  getKanbanPreset,
  getKanbanPresetRules,
  getPresetColumnType,
} from "@/utils/kanbanPresets";

const PRESET_META = {
  simple: {
    icon: "list-check",
    accent: "#355AFD",
  },
  development: {
    icon: "screwdriver-wrench",
    accent: "#6366f1",
  },
  content: {
    icon: "pencil",
    accent: "#ec4899",
  },
  support: {
    icon: "life-ring",
    accent: "#06b6d4",
  },
  empty: {
    icon: "folder-plus",
    accent: "#8b5cf6",
  },
};

export default {
  name: "KanbanPresetPicker",
  props: {
    modelValue: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup() {
    return { radioName: `kanban-preset-${useId()}` };
  },
  data() {
    return { presets: KANBAN_PRESETS };
  },
  computed: {
    selectedPreset() {
      return getKanbanPreset(this.modelValue);
    },
    selectedRules() {
      return getKanbanPresetRules(this.modelValue);
    },
  },
  methods: {
    getColumnType: getPresetColumnType,
    getPresetMeta(id) {
      return PRESET_META[id] || { icon: "table-cells-large", accent: "#355AFD" };
    },
  },
};
</script>

<style scoped>
.preset-picker {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
  color: var(--text-primary);
}

.preset-header {
  margin-bottom: var(--space-3);
}

.preset-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.preset-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-info);
  font-size: var(--fontsize-xs);
}

.preset-legend {
  font-size: var(--fontsize-sm);
  font-weight: 600;
  padding: 0;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.preset-intro {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  margin: var(--space-1) 0 0;
  line-height: 1.45;
}

/* Opções de Preset em Grid */
.preset-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.preset-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  cursor: pointer;
  outline: none !important;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  user-select: none;
}

.preset-option.is-empty {
  grid-column: 1 / -1;
}

.preset-option:hover {
  border-color: rgba(95, 124, 255, 0.45);
  background: var(--surface-2);
  transform: translateY(-1.5px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.preset-option:active {
  transform: translateY(0) scale(0.99);
}

.preset-option.is-selected {
  border-color: var(--color-info);
  background: var(--surface-2);
  box-shadow:
    0 0 0 1px var(--color-info),
    0 4px 18px rgba(53, 90, 253, 0.16);
}

[data-theme="dark"] .preset-option.is-selected {
  background: rgba(95, 124, 255, 0.1);
  box-shadow:
    0 0 0 1px var(--color-info),
    0 4px 20px rgba(95, 124, 255, 0.22);
}

/* Teclado e Acessibilidade — Anel circular suave SEM outline quadrado */
.preset-option:focus-within:has(.preset-radio-input:focus-visible) {
  box-shadow:
    0 0 0 2px var(--surface-0, #1a1d2e),
    0 0 0 4px var(--color-info) !important;
  outline: none !important;
}

/* Radio nativo escondido de forma acessível */
.preset-radio-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
  outline: none !important;
  box-shadow: none !important;
}

/* Indicador de Rádio Customizado — Circular */
.custom-radio-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 3px;
}

.radio-outer-ring {
  width: 18px;
  height: 18px;
  border-radius: 50% !important;
  border: 2px solid var(--gray-400);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  outline: none !important;
  box-shadow: none !important;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.preset-option:hover .radio-outer-ring {
  border-color: var(--color-info);
}

.preset-option.is-selected .radio-outer-ring {
  border-color: var(--color-info);
  background: rgba(95, 124, 255, 0.12);
}

.radio-inner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50% !important;
  background-color: var(--color-info);
  transform: scale(0);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.preset-option.is-selected .radio-inner-dot {
  transform: scale(1);
}

.preset-radio-input:focus-visible ~ .custom-radio-indicator .radio-outer-ring {
  box-shadow: 0 0 0 3px rgba(95, 124, 255, 0.45) !important;
  border-radius: 50% !important;
  outline: none !important;
}

/* Conteúdo do Card */
.preset-option-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.preset-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.preset-info-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.preset-icon-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(95, 124, 255, 0.08);
  color: var(--accent-color, var(--color-info));
  font-size: 11px;
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.preset-option.is-selected .preset-icon-badge {
  background: var(--accent-color, var(--color-info));
  color: #ffffff;
  transform: scale(1.05);
}

.preset-name {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-count-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.preset-count-pill.is-zero {
  opacity: 0.75;
}

.preset-option.is-selected .preset-count-pill {
  background: rgba(95, 124, 255, 0.2);
  color: var(--color-info);
}

[data-theme="dark"] .preset-option.is-selected .preset-count-pill {
  background: rgba(95, 124, 255, 0.25);
  color: #c5cae9;
}

.preset-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 0;
}

.preset-picker:disabled .preset-option {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

/* Painel de Pré-visualização do Modelo */
.preset-preview {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.preview-heading-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.heading-icon {
  font-size: 11px;
  color: var(--color-info);
}

.heading-icon.bolt-color {
  color: var(--yellow);
}

.preview-counter-badge {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Pipeline visual de Colunas */
.preset-columns-pipeline {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 0;
  margin: 0;
}

.pipeline-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.column-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--surface-3);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  transition:
    transform var(--transition-fast),
    background-color var(--transition-fast);
}

.column-pill:hover {
  transform: translateY(-1px);
}

.column-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-name {
  line-height: 1.2;
}

.pipeline-arrow {
  color: var(--text-muted);
  font-size: 10px;
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
}

/* Regras Automáticas */
.preset-rules-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--surface-2);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
  transition: background-color var(--transition-fast);
}

.rule-icon-wrapper {
  color: var(--color-info);
  margin-top: 2px;
  font-size: 11px;
  flex-shrink: 0;
}

/* Estado de Quadro Vazio */
.empty-preview-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.empty-preview-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.empty-preview-text h4 {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  margin: 0 0 2px;
  color: var(--text-primary);
}

.empty-preview-text p {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
}

/* Transições do Preview */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.preview-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 580px) {
  .preset-options {
    grid-template-columns: 1fr;
  }

  .preset-option.is-empty {
    grid-column: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .preset-option,
  .radio-inner-dot,
  .column-pill,
  .preview-fade-enter-active,
  .preview-fade-leave-active {
    transition: none !important;
  }
}
</style>
