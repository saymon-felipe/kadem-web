<template>
  <div ref="panel" class="receipt-filter-panel">
    <template v-if="compact">
      <div class="filter-trigger-row">
        <button
          type="button"
          class="filters-trigger"
          :class="{ 'has-filters': hasFilters }"
          :aria-label="title"
          :title="title"
          aria-haspopup="dialog"
          :aria-expanded="open"
          @click="open = true"
        >
          <font-awesome-icon icon="filter" />
          <span>Filtros</span>
          <span v-if="hasFilters" class="active-filter-dot" aria-label="Filtros ativos" />
        </button>
      </div>
      <BaseModal v-model="open" :title="title" size="sm">
        <slot :compact="true" :close="close" />
        <template v-if="showResultsAction" #footer>
          <button type="button" class="filter-results-btn" @click="close">Ver resultados</button>
        </template>
      </BaseModal>
    </template>
    <div v-else :class="{ 'filters-surface': surface }">
      <slot :compact="false" :close="close" />
    </div>
  </div>
</template>

<script>
import BaseModal from '@/components/BaseModal.vue';

export default {
  name: 'NexoFilterPanel',
  components: { BaseModal },
  props: {
    title: { type: String, required: true },
    hasFilters: { type: Boolean, default: false },
    surface: { type: Boolean, default: true },
    showResultsAction: { type: Boolean, default: false },
  },
  data: () => ({
    compact: typeof window !== 'undefined' && window.innerWidth <= 680,
    open: false,
    observer: null,
  }),
  mounted() {
    this.updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.updateSize);
      this.observer.observe(this.$refs.panel);
    }
    window.addEventListener('resize', this.updateSize);
  },
  beforeUnmount() {
    this.observer?.disconnect();
    window.removeEventListener('resize', this.updateSize);
  },
  methods: {
    close() {
      this.open = false;
    },
    updateSize() {
      const width = this.$refs.panel?.getBoundingClientRect().width;
      this.compact = window.innerWidth <= 680 || (width > 0 && width <= 680);
      if (!this.compact) this.close();
    },
  },
};
</script>

<style scoped>
.receipt-filter-panel {
  min-width: 0;
}

.filters-surface {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.filter-trigger-row {
  display: flex;
  justify-content: flex-end;
}

.filters-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.filters-trigger:hover,
.filters-trigger.has-filters {
  border-color: var(--color-info);
  color: var(--color-info);
}

.filters-trigger:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.active-filter-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.filter-results-btn {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-info);
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
