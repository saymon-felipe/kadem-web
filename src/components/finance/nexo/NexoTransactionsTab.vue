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
      <div class="transaction-filters">
        <label class="filter-field">
          <span>Buscar</span>
          <input
            :value="transactionSearch"
            type="search"
            placeholder="Buscar por valor, texto ou descricao"
            @input="$emit('update:transactionSearch', $event.target.value)"
          />
        </label>
        <label class="filter-field">
          <span>Categoria</span>
          <CategoryCombo
            :model-value="categoryComboValue"
            :categories="categoryOptions"
            :placeholder="categoryFilterPlaceholder"
            clear-option-label="Todas as categorias"
            clear-option-value=""
            @update:modelValue="handleCategoryFilterChange"
          />
        </label>
      </div>
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
import CategoryCombo from '../CategoryCombo.vue'
import NexoCsvImportCard from './NexoCsvImportCard.vue'
import NexoTransactionsTable from './NexoTransactionsTable.vue'

export default {
  name: 'NexoTransactionsTab',
  components: {
    CategoryCombo,
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
    'update:transactionCategoryFilter',
    'update:transactionSearch',
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
    transactionSearch: {
      type: String,
      default: '',
    },
    transactionCategoryFilter: {
      type: String,
      default: '',
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
  computed: {
    categoryComboValue() {
      return this.transactionCategoryFilter || null
    },
    categoryFilterPlaceholder() {
      return 'Todas as categorias'
    },
    categoryOptions() {
      return [...this.categories].sort((left, right) =>
        `${left.macro_category || ''} ${left.name || ''}`.localeCompare(
          `${right.macro_category || ''} ${right.name || ''}`,
          'pt-BR',
        ),
      )
    },
  },
  methods: {
    categoryOptionValue(category) {
      return String(
        category?.server_id || category?.id || category?.local_key || category?.local_id || '',
      )
    },
    handleCategoryFilterChange(categoryId) {
      this.$emit('update:transactionCategoryFilter', categoryId || '')
    },
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

.transaction-filters {
  display: grid;
  grid-template-columns: minmax(260px, 1.3fr) minmax(220px, 1fr);
  gap: var(--space-3);
}

.filter-field {
  display: grid;
  gap: var(--space-2);
}

.filter-field span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-field input {
  width: 100%;
  min-height: 42px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  outline: none;
  box-sizing: border-box;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.filter-field input:focus,
.filter-field :deep(.combo-trigger.open) {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(44, 98, 246, 0.14);
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

  .transaction-filters {
    grid-template-columns: 1fr;
  }
}
</style>
