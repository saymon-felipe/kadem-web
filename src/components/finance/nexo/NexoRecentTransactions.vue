<template>
  <section class="panel">
    <div class="panel-title">
      <h3>Recentes</h3>
      <button class="text-btn" @click="$emit('view-all')">Ver todos</button>
    </div>
    <div class="compact-list">
      <article
        v-for="transaction in recentTransactions.slice(0, 8)"
        :key="transaction.local_id || transaction.id"
        class="movement-row"
      >
        <div>
          <strong>{{ transaction.description }}</strong>
          <span
            >{{ categoryLabel(transaction) }} ·
            {{ formatShortDate(transaction.transaction_date) }}</span
          >
        </div>
        <b :class="transaction.type">{{ formatSignedMoney(transaction) }}</b>
      </article>
      <p v-if="recentTransactions.length === 0" class="empty-line">Nenhum lançamento.</p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NexoRecentTransactions',
  emits: ['view-all'],
  props: {
    recentTransactions: {
      type: Array,
      required: true,
    },
    categories: {
      type: Array,
      required: true,
    },
    formatShortDate: {
      type: Function,
      required: true,
    },
    formatSignedMoney: {
      type: Function,
      required: true,
    },
  },
  methods: {
    categoryLabel(transaction) {
      return (
        transaction.category_name ||
        this.categories.find(
          (category) => String(category.id ?? '') === String(transaction.category_id ?? ''),
        )?.name ||
        'Sem categoria'
      )
    },
  },
}
</script>

<style scoped>
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
  padding: var(--space-5);
  min-height: 0;
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.panel-title h3 {
  margin: 0;
}

.compact-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.movement-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--glass-border);
  transition: background var(--transition-fast);
  border-radius: var(--radius-xs);
}

.movement-row:hover {
  background: var(--surface-2);
}

.movement-row div {
  min-width: 0;
}

.movement-row strong,
.movement-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.movement-row span,
.empty-line {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.movement-row b {
  margin-left: auto;
}

.INCOME {
  color: var(--color-income);
}

.EXPENSE {
  color: var(--color-expense);
}

.text-btn {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  background: transparent;
  color: var(--text-primary);
  padding: 0 var(--space-3);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.text-btn:hover {
  background: var(--dark-yellow-2);
}

.text-btn:active {
  transform: scale(0.97);
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
