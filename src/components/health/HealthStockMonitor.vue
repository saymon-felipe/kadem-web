<template>
  <section class="panel stock-panel">
    <div class="panel-title">
      <div class="title-group">
        <h3>Monitor de Insumos & Estoque</h3>
        <span
          v-if="lowStockCount > 0"
          class="alert-badge"
          :title="lowStockCount + ' insumo(s) abaixo do estoque mínimo'"
        >
          {{ lowStockCount }} alerta{{ lowStockCount === 1 ? "" : "s" }}
        </span>
        <span v-else class="ok-badge">Estoque em dia</span>
      </div>
      <button class="text-btn" type="button" @click="$emit('view-objects')">
        Ver todos
      </button>
    </div>

    <div v-if="!supplies.length" class="empty-panel">
      <font-awesome-icon icon="boxes-stacked" class="empty-icon" />
      <p>Nenhum insumo ou medicação cadastrada.</p>
      <button class="subtle-btn" type="button" @click="$emit('new-supply')">
        <font-awesome-icon icon="plus" />
        <span>Cadastrar primeiro insumo</span>
      </button>
    </div>

    <div v-else class="supplies-list custom-scrollbar">
      <article
        v-for="supply in sortedSupplies"
        :key="supply.local_key"
        class="supply-row"
        :class="{ 'is-low': isLowStock(supply) }"
      >
        <div class="supply-icon-wrap" :class="{ 'is-low': isLowStock(supply) }">
          <font-awesome-icon :icon="isLowStock(supply) ? 'triangle-exclamation' : 'box-archive'" />
        </div>

        <div class="supply-info">
          <div class="supply-top-line">
            <strong class="supply-name">{{ supply.name }}</strong>
            <span class="supply-balance-pill" :class="{ 'is-low': isLowStock(supply) }">
              <strong>{{ formatNumber(supplyBalance(supply.local_key)) }}</strong>
              <small>{{ supply.unit }}</small>
            </span>
          </div>

          <div class="gauge-container">
            <div class="gauge-track">
              <div
                class="gauge-fill"
                :class="{ 'is-low': isLowStock(supply) }"
                :style="{ width: stockPercentage(supply) + '%' }"
              ></div>
            </div>
            <div class="gauge-caption">
              <span>Mínimo: {{ formatNumber(supply.minimum_quantity || 0) }} {{ supply.unit }}</span>
              <span v-if="isLowStock(supply)" class="repor-tag">Repor urgente</span>
              <span v-else class="status-ok">Adequado</span>
            </div>
          </div>
        </div>

        <div class="supply-actions">
          <button
            class="action-pill-btn consume"
            type="button"
            title="Registrar consumo deste insumo"
            @click="$emit('quick-consume', supply.local_key)"
          >
            <font-awesome-icon icon="arrow-down" />
            <span>Baixa</span>
          </button>
          <button
            class="action-pill-btn receive"
            type="button"
            title="Registrar entrada no estoque"
            @click="$emit('quick-receive', supply.local_key)"
          >
            <font-awesome-icon icon="plus" />
            <span>Repor</span>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: "HealthStockMonitor",
  props: {
    supplies: {
      type: Array,
      default: () => [],
    },
    supplyBalance: {
      type: Function,
      required: true,
    },
    isLowStock: {
      type: Function,
      required: true,
    },
    stockPercentage: {
      type: Function,
      required: true,
    },
    formatNumber: {
      type: Function,
      required: true,
    },
    lowStockCount: {
      type: Number,
      default: 0,
    },
  },
  emits: ["quick-consume", "quick-receive", "view-objects", "new-supply"],
  computed: {
    sortedSupplies() {
      return [...this.supplies].sort((a, b) => {
        const aLow = this.isLowStock(a);
        const bLow = this.isLowStock(b);
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    },
  },
};
</script>

<style scoped>
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  min-height: 280px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-group h3 {
  margin: 0;
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.alert-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 4px;
}

.ok-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 4px;
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.text-btn:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.6;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.empty-panel p {
  margin: 0 0 var(--space-3);
  font-size: var(--fontsize-xs);
}

.subtle-btn {
  background: var(--surface-2);
  border: 1px dashed var(--glass-border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.subtle-btn:hover {
  background: var(--surface-3);
  border-color: #e25373;
}

.supplies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.supply-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.supply-row:hover {
  background: var(--surface-2);
  transform: translateY(-1px);
}

.supply-row.is-low {
  border-left: 3px solid #ef4444;
}

.supply-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 0.88rem;
  flex-shrink: 0;
  background: var(--surface-2);
  color: var(--text-secondary);
}

.supply-icon-wrap.is-low {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.supply-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.supply-top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.supply-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.supply-balance-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 0.84rem;
  color: var(--text-primary);
  background: var(--surface-2);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}

.supply-balance-pill.is-low {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.supply-balance-pill strong {
  font-weight: 800;
}

.supply-balance-pill small {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.gauge-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gauge-track {
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  overflow: hidden;
}

.gauge-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  transition: width 0.35s ease;
}

.gauge-fill.is-low {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
}

.gauge-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.repor-tag {
  color: #ef4444;
  font-weight: 700;
}

.status-ok {
  color: #10b981;
}

.supply-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-pill-btn {
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 5px 9px;
  border-radius: var(--radius-xs);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all var(--transition-fast);
}

.action-pill-btn.consume:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.action-pill-btn.receive:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
}

.action-pill-btn:active {
  transform: scale(0.96);
}
</style>
