<template>
  <div class="summary-grid">
    <div class="metric schedule-metric" :class="dueClass">
      <span class="metric-label">Próxima rotina</span>
      <strong class="metric-value" :title="scheduleStatusTitle">
        {{ scheduleStatusTitle }}
      </strong>
      <span class="metric-sub" :class="dueClass">
        <template v-if="nextDueCategory">
          <font-awesome-icon :icon="dueIcon" />
          {{ dueLabel(nextDueAt(nextDueCategory)) }}
        </template>
        <template v-else>{{ totalSchedules ? "Nenhuma pendência" : "Cadastre uma rotina para acompanhar prazos" }}</template>
      </span>
    </div>

    <div class="metric stock-metric" :class="{ 'has-warning': lowStockCount > 0 }">
      <span class="metric-label">Saúde do estoque</span>
      <strong class="metric-value" :title="stockStatusTitle">
        {{ stockStatusTitle }}
      </strong>
      <span class="metric-sub">
        <template v-if="totalSupplies">
          {{ totalSupplies }} insumo{{ totalSupplies === 1 ? "" : "s" }} cadastrado{{ totalSupplies === 1 ? "" : "s" }}
        </template>
        <template v-else>Cadastre insumos para monitorar o saldo</template>
      </span>
    </div>

    <div class="metric active-metric">
      <span class="metric-label">Rotinas ativas</span>
      <strong class="metric-value">{{ totalSchedules }}</strong>
      <span class="metric-sub">Agendas configuradas</span>
    </div>

    <div class="metric history-metric">
      <span class="metric-label">Registros</span>
      <strong class="metric-value">{{ totalEvents }}</strong>
      <span class="metric-sub">Ações registradas</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "HealthSummaryCards",
  computed: {
    scheduleStatusTitle() {
      if (!this.totalSchedules) return "Sem rotinas cadastradas";
      return this.nextDueCategory ? this.nextDueCategory.name : "Tudo em dia";
    },
    stockStatusTitle() {
      if (!this.totalSupplies) return "Sem insumos";
      return this.lowStockCount > 0 ? `${this.lowStockCount} em alerta` : "Estoque saudável";
    },
  },
  props: {
    nextDueCategory: {
      type: Object,
      default: null,
    },
    nextDueAt: {
      type: Function,
      required: true,
    },
    dueLabel: {
      type: Function,
      required: true,
    },
    dueClass: {
      type: String,
      default: "",
    },
    dueIcon: {
      type: String,
      default: "circle-check",
    },
    lowStockCount: {
      type: Number,
      default: 0,
    },
    totalSupplies: {
      type: Number,
      default: 0,
    },
    totalSchedules: {
      type: Number,
      default: 0,
    },
    totalEvents: {
      type: Number,
      default: 0,
    },
  },
};
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.metric {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-fast);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.metric-label {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
}

.metric-value {
  font-size: var(--fontsize-md);
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.metric-sub {
  font-size: 0.74rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-urgent,
.metric-sub.status-urgent {
  color: #ef4444 !important;
  font-weight: 700;
}

.status-today,
.metric-sub.status-today {
  color: #d97706 !important;
  font-weight: 700;
}

.metric.has-warning .metric-value {
  color: #ef4444;
}

.metric.has-warning {
  border-color: rgba(239, 68, 68, 0.3);
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
