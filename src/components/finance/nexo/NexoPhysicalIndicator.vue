<template>
  <button
    type="button"
    class="physical-indicator-card"
    aria-label="Patrimônio físico: abrir o dashboard completo"
    @click="$emit('open')"
  >
    <template v-if="state?.summary">
      <div class="indicator-main">
        <div class="indicator-avatar">
          <font-awesome-icon icon="vault" />
        </div>
        <div class="indicator-info">
          <div class="indicator-title-row">
            <span class="indicator-label">Patrimônio físico estimado</span>
            <span v-if="offline" class="offline-pill" title="Sem conexão no momento">
              <font-awesome-icon icon="wifi" />
              <span>Offline</span>
            </span>
          </div>
          <strong class="indicator-total-value">{{ money(state.summary.physical_total) }}</strong>
          <small v-if="offline" class="indicator-hint">Última leitura salva localmente</small>
        </div>
      </div>

      <div class="indicator-breakdown">
        <div class="breakdown-item cash">
          <div class="breakdown-icon">
            <font-awesome-icon icon="wallet" />
          </div>
          <div class="breakdown-copy">
            <span class="breakdown-label">Dinheiro</span>
            <strong class="breakdown-val">{{ money(state.summary.cash) }}</strong>
          </div>
        </div>

        <div class="breakdown-item gold">
          <div class="breakdown-icon">
            <font-awesome-icon icon="coins" />
          </div>
          <div class="breakdown-copy">
            <span class="breakdown-label">Ouro</span>
            <strong class="breakdown-val">{{ money(metals.XAU) }}</strong>
          </div>
        </div>

        <div class="breakdown-item silver">
          <div class="breakdown-icon">
            <font-awesome-icon icon="coins" />
          </div>
          <div class="breakdown-copy">
            <span class="breakdown-label">Prata</span>
            <strong class="breakdown-val">{{ money(metals.XAG) }}</strong>
          </div>
        </div>

        <div class="indicator-action-cue" aria-hidden="true">
          <span class="cue-label">Acessar</span>
          <font-awesome-icon icon="chevron-right" />
        </div>
      </div>
    </template>

    <div v-else class="indicator-loading-state">
      <font-awesome-icon :icon="error ? 'triangle-exclamation' : 'circle-notch'" :spin="!error" class="loading-icon" />
      <span>{{ error || "Carregando patrimônio físico…" }}</span>
    </div>
  </button>
</template>

<script>
const money = (value) =>
  value === null || value === undefined
    ? "Sem estimativa"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default {
  name: "NexoPhysicalIndicator",
  props: {
    state: { type: Object, default: null },
    offline: Boolean,
    error: { type: String, default: "" },
  },
  emits: ["open"],
  computed: {
    metals() {
      const result = {};
      for (const metal of ["XAU", "XAG"]) {
        const open = (this.state?.holdings || []).filter((h) => h.metal === metal && Number(h.quantity) > 0);
        result[metal] = open.some((h) => h.estimated_value === null || h.estimated_value === undefined)
          ? null
          : open.reduce((sum, h) => sum + Number(h.estimated_value), 0);
      }
      return result;
    },
  },
  methods: { money },
};
</script>

<style scoped>
.physical-indicator-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
  margin-bottom: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-left: 4px solid #b5984b;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

[data-theme="dark"] .physical-indicator-card {
  background: var(--surface-1);
  border-left-color: #d8b75e;
}

.physical-indicator-card:hover {
  transform: translateY(-2px);
  border-color: rgba(181, 152, 75, 0.45);
  box-shadow: var(--shadow-elevated);
  background: var(--surface-0);
}

[data-theme="dark"] .physical-indicator-card:hover {
  background: var(--surface-2);
  border-color: rgba(216, 183, 94, 0.45);
}

.physical-indicator-card:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.indicator-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.indicator-avatar {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(181, 152, 75, 0.12);
  border: 1px solid rgba(181, 152, 75, 0.28);
  color: #9f8037;
  font-size: 1.2rem;
}

[data-theme="dark"] .indicator-avatar {
  background: rgba(216, 183, 94, 0.15);
  border-color: rgba(216, 183, 94, 0.32);
  color: #e4c46f;
}

.indicator-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.indicator-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.indicator-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.offline-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #d97706;
  font-size: 0.68rem;
  font-weight: 600;
}

[data-theme="dark"] .offline-pill {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.indicator-total-value {
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #9f8037;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

[data-theme="dark"] .indicator-total-value {
  color: #e4c46f;
}

.indicator-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.indicator-breakdown {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
}

[data-theme="dark"] .breakdown-item {
  background: var(--surface-2);
}

.breakdown-icon {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.breakdown-item.cash .breakdown-icon {
  color: var(--color-income, #2e9b62);
}

.breakdown-item.gold .breakdown-icon {
  color: #b5984b;
}

[data-theme="dark"] .breakdown-item.gold .breakdown-icon {
  color: #e4c46f;
}

.breakdown-item.silver .breakdown-icon {
  color: #94a3b8;
}

.breakdown-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.breakdown-label {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.breakdown-val {
  font-size: 0.88rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.indicator-action-cue {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.physical-indicator-card:hover .indicator-action-cue {
  background: var(--color-info);
  border-color: var(--color-info);
  color: #ffffff;
}

.indicator-loading-state {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.loading-icon {
  font-size: 1rem;
}

@media (max-width: 820px) {
  .physical-indicator-card {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .indicator-breakdown {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    gap: var(--space-2);
  }

  .indicator-action-cue {
    justify-content: center;
  }
}

@media (max-width: 580px) {
  .indicator-breakdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .indicator-action-cue {
    grid-column: 1 / -1;
  }
}
</style>
