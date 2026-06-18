<template>
  <section class="panel">
    <div class="panel-title">
      <h3>Movimentos</h3>
      <button
        class="text-btn"
        :disabled="!canUseAi || categorizingAi"
        @click="$emit('auto-categorize')"
      >
        <font-awesome-icon
          :icon="categorizingAi ? 'circle-notch' : 'chart-simple'"
          :spin="categorizingAi"
        />
        {{ categorizingAi ? 'Categorizando...' : 'Categorizar IA' }}
      </button>
    </div>
    <div class="transaction-tools">
      <NexoCsvImportCard
        :is-paid-plan="isPaidPlan"
        :importing-csv="importingCsv"
        :loading-schema="loadingSchema"
        :csv-import-error="csvImportError"
        :csv-import-file-name="csvImportFileName"
        :csv-import-rows="csvImportRows"
        :csv-import-totals="csvImportTotals"
        :format-money="formatMoney"
        :format-short-date="formatShortDate"
        @upgrade="$emit('upgrade')"
        @file-change="$emit('csv-file-change', $event)"
        @reset="$emit('reset-csv')"
        @confirm="$emit('confirm-csv')"
      />
    </div>
    <NexoTransactionsTable
      :transactions="transactions"
      :categories="categories"
      :categorizing-ids="categorizingIds"
      :format-signed-money="formatSignedMoney"
      :format-short-date="formatShortDate"
      @edit="$emit('edit-transaction', $event)"
      @toggle-ignored="$emit('toggle-ignored', $event)"
      @delete="$emit('delete-transaction', $event)"
      @select-category="emitSelectCategory"
      @create-category-for-transaction="emitCreateCategoryForTransaction"
    />
  </section>
</template>

<script>
import NexoCsvImportCard from './NexoCsvImportCard.vue'
import NexoTransactionsTable from './NexoTransactionsTable.vue'

export default {
  name: 'NexoTransactionsTab',
  components: {
    NexoCsvImportCard,
    NexoTransactionsTable,
  },
  emits: [
    'auto-categorize',
    'confirm-csv',
    'create-category-for-transaction',
    'csv-file-change',
    'delete-transaction',
    'edit-transaction',
    'reset-csv',
    'select-category',
    'toggle-ignored',
    'upgrade',
  ],
  props: {
    isPaidPlan: {
      type: Boolean,
      default: false,
    },
    canUseAi: {
      type: Boolean,
      default: false,
    },
    categorizingAi: {
      type: Boolean,
      default: false,
    },
    importingCsv: {
      type: Boolean,
      default: false,
    },
    loadingSchema: {
      type: Boolean,
      default: false,
    },
    csvImportError: {
      type: String,
      default: '',
    },
    csvImportFileName: {
      type: String,
      default: '',
    },
    csvImportRows: {
      type: Array,
      required: true,
    },
    csvImportTotals: {
      type: Object,
      required: true,
    },
    transactions: {
      type: Array,
      required: true,
    },
    categories: {
      type: Array,
      required: true,
    },
    categorizingIds: {
      type: Array,
      required: true,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
    formatSignedMoney: {
      type: Function,
      required: true,
    },
    formatShortDate: {
      type: Function,
      required: true,
    },
  },
  methods: {
    emitSelectCategory(transaction, categoryId) {
      this.$emit('select-category', transaction, categoryId)
    },
    emitCreateCategoryForTransaction(transaction, suggestedName) {
      this.$emit('create-category-for-transaction', transaction, suggestedName)
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
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.panel-title h3 {
  margin: 0;
}

.transaction-tools {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.text-btn {
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  padding: 0;
  transition:
    transform var(--transition-fast),
    color var(--transition-fast);
}

.text-btn:hover {
  color: var(--deep-blue);
}

.text-btn:active {
  transform: scale(0.97);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
