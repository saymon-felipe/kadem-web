<template>
  <div class="summary-grid">
    <div class="metric income">
      <span>Entradas</span>
      <strong>{{ formatMoney(totals.income) }}</strong>
    </div>
    <div class="metric expense">
      <span>Saídas</span>
      <strong>{{ formatMoney(totals.expense) }}</strong>
    </div>
    <div class="metric balance">
      <span>Saldo</span>
      <strong :class="{ negative: totals.balance < 0 }">{{ formatMoney(totals.balance) }}</strong>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NexoSummaryCards',
  props: {
    totals: {
      type: Object,
      required: true,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
  },
}
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
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
}

.metric.income strong {
  color: var(--color-income);
}

.metric.expense strong,
.negative {
  color: var(--color-expense);
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
