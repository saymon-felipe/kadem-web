<template>
  <button type="button" class="normalization-toggle"
    :class="{ active: enabled && !is_unavailable }" :disabled="is_unavailable"
    :aria-pressed="enabled" :aria-busy="enabled && status === 'measuring'"
    aria-label="Normalizar volume" :title="tooltip" @click="$emit('toggle', !enabled)">
    <font-awesome-icon :icon="normalization_icon" aria-hidden="true" />
  </button>
</template>

<script>
import { faSliders } from '@fortawesome/free-solid-svg-icons';
export default {
  props: {
    enabled: Boolean,
    status: { type: String, default: 'disabled' },
    detail: { type: String, default: '' },
  },
  emits: ['toggle'],
  setup: () => ({ normalization_icon: faSliders }),
  computed: {
    is_unavailable() {
      return this.status === 'unavailable';
    },
    tooltip() {
      const explanation = 'Normalizar volume: equilibra o volume entre músicas, mantendo seu ajuste manual.';
      if (this.is_unavailable) return `${explanation} ${this.detail || 'Indisponível para esta faixa.'}`;
      if (!this.enabled) return `${explanation} Clique para ativar.`;
      const state = this.status === 'measuring' ? 'Analisando a música.' : 'Ativada.';
      return `${explanation} ${state} ${this.detail || 'Clique para desativar.'}`;
    },
  },
};
</script>

<style scoped>
.normalization-toggle { display: grid; place-items: center; width: 28px; height: 28px; flex-shrink: 0; padding: 0; background: none; border: none; color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; opacity: 0.8; transition: color 0.2s, opacity 0.2s; }
.normalization-toggle:hover { opacity: 1; }
.normalization-toggle.active { color: var(--color-info); opacity: 1; }
.normalization-toggle:focus-visible { outline: 2px solid var(--color-info); outline-offset: 2px; border-radius: 3px; }
.normalization-toggle:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
