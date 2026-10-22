<template>
  <div class="summary-grid">
    <div class="metric income">
      <span>Entradas</span>
      <strong>{{ formatMoney(totals.income) }}</strong>
    </div>
    <div class="metric expense">
      <span>Gastos da conta</span>
      <strong>{{ formatMoney(totals.expense) }}</strong>
    </div>
    <div class="metric balance">
      <span>Saldo da conta</span>
      <strong :class="{ negative: totals.balance < 0 }">{{ formatMoney(totals.balance) }}</strong>
    </div>
    <div class="metric credit">
      <span>Gastos no crédito</span>
      <strong>{{ formatMoney(creditExpense) }}</strong>
    </div>
    <div v-if="investmentSummary" class="metric investment">
      <span>Investido no mês</span>
      <strong>{{ formatMoney(investmentSummary.month_invested || 0) }}</strong>
    </div>
    <div v-if="investmentSummary" class="metric investment-out">
      <span>Resgatado no mês</span>
      <strong>{{ formatMoney(investmentSummary.month_withdrawn || 0) }}</strong>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NexoSummaryCards',
  props: {
    creditExpense: { type:Number, default:0 },
    totals: {
      type: Object,
      required: true,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
    investmentSummary: {
      type: Object,
      default: null,
    },
  },
}
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.metric {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.metric strong {
  font-size: var(--fontsize-md);
  font-variant-numeric: tabular-nums;
}

.metric.income strong {
  color: var(--color-income);
}

.metric.expense strong,
.negative {
  color: var(--color-expense);
}

.metric.credit strong {
  color: #4f46e5;
}

.metric.investment strong {
  color: #0d8f6f;
}

.metric.investment-out strong {
  color: #b77900;
}

[data-theme='dark'] .metric.credit strong {
  color: #818cf8;
}

[data-theme='dark'] .metric.investment strong {
  color: #34d399;
}

[data-theme='dark'] .metric.investment-out strong {
  color: #fbbf24;
}

@container (max-width: 640px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .metric {
    padding: var(--space-3);
    gap: var(--space-1);
  }
  .metric strong {
    font-size: var(--fontsize-sm);
  }
}

@container (max-width: 360px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .metric {
    padding: var(--space-3);
    gap: var(--space-1);
  }
  .metric strong {
    font-size: var(--fontsize-sm);
  }
}

@media (max-width: 360px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
