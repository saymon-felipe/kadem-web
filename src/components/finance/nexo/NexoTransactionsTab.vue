<template>
  <section class="panel">
    <div class="panel-title">
      <div class="title-with-badge">
        <h3>Movimentos</h3>
        <span v-if="transactions.length > 0" class="count-pill">
          {{ transactions.length }} {{ transactions.length === 1 ? 'lançamento' : 'lançamentos' }}
        </span>
      </div>
      <button
        class="ai-action-btn"
        :disabled="!canUseAi || categorizingAi"
        :title="!canUseAi ? 'Disponível no plano PRO' : 'Categorizar lançamentos pendentes com IA'"
        @click="$emit('auto-categorize')"
      >
        <font-awesome-icon :icon="categorizingAi ? 'circle-notch' : 'wand-magic-sparkles'" :spin="categorizingAi" class="ai-btn-icon" />
        <span>{{ categorizingAi ? "Categorizando..." : "Categorizar IA" }}</span>
      </button>
    </div>
    <div class="transaction-tools">
      <NexoCsvImportCard
        :is-paid-plan="isPaidPlan"
        :importing-csv="importingCsv"
        :loading-schema="loadingSchema"
        :csv-import-error="csvImportError"
        :csv-import-file-name="csvImportFileName"
        :csv-preview-rows="csvPreviewRows"
        :csv-import-rows="csvImportRows"
        :csv-import-totals="csvImportTotals"
        :csv-import-summary="csvImportSummary"
        :format-money="formatMoney"
        :format-date-time="formatDateTime"
        @upgrade="$emit('upgrade')"
        @file-change="$emit('csv-file-change', $event)"
        @open-preview="$emit('open-csv-preview')"
        @reset="$emit('reset-csv')"
        @confirm="$emit('confirm-csv')"
      />
      <div class="transaction-filters-bar">
        <div class="filter-field search-filter">
          <label for="transaction-search-input">Buscar</label>
          <div class="input-with-icon">
            <font-awesome-icon icon="magnifying-glass" class="field-icon" />
            <input
              id="transaction-search-input"
              :value="transactionSearch"
              type="search"
              placeholder="Buscar por valor, texto ou descrição..."
              @input="$emit('update:transactionSearch', $event.target.value)"
            />
            <button
              v-if="transactionSearch"
              type="button"
              class="clear-search-btn"
              title="Limpar busca"
              @click="$emit('update:transactionSearch', '')"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
        </div>
        <div class="filter-field category-filter">
          <label>Categoria</label>
          <CategoryCombo
            :model-value="categoryComboValue"
            :categories="categoryOptions"
            :placeholder="categoryFilterPlaceholder"
            clear-option-label="Todas as categorias"
            clear-option-value=""
            size="md"
            @update:modelValue="handleCategoryFilterChange"
          />
        </div>
        <div v-if="hasActiveFilters" class="filter-reset-col">
          <button
            type="button"
            class="reset-filters-btn"
            title="Limpar todos os filtros"
            @click="clearAllFilters"
          >
            <font-awesome-icon icon="xmark" />
            <span>Limpar filtros</span>
          </button>
        </div>
      </div>
    </div>
    <NexoTransactionsTable
      :transactions="transactions"
      :categories="categories"
      :categorizing-ids="categorizingIds"
      :format-signed-money="formatSignedMoney"
      :format-short-date="formatShortDate"
      :pagination-reset-key="paginationResetKey"
      :has-active-filters="hasActiveFilters"
      @edit="$emit('edit-transaction', $event)"
      @toggle-ignored="$emit('toggle-ignored', $event)"
      @delete="$emit('delete-transaction', $event)"
      @select-category="emitSelectCategory"
      @create-category-for-transaction="emitCreateCategoryForTransaction"
      @clear-filters="clearAllFilters"
    />
  </section>
</template>

<script>
import CategoryCombo from "../CategoryCombo.vue";
import NexoCsvImportCard from "./NexoCsvImportCard.vue";
import NexoTransactionsTable from "./NexoTransactionsTable.vue";

export default {
  name: "NexoTransactionsTab",
  components: {
    CategoryCombo,
    NexoCsvImportCard,
    NexoTransactionsTable,
  },
  emits: [
    "auto-categorize",
    "confirm-csv",
    "create-category-for-transaction",
    "csv-file-change",
    "delete-transaction",
    "edit-transaction",
    "open-csv-preview",
    "reset-csv",
    "select-category",
    "toggle-ignored",
    "update:transactionCategoryFilter",
    "update:transactionSearch",
    "upgrade",
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
      default: "",
    },
    csvImportFileName: {
      type: String,
      default: "",
    },
    csvPreviewRows: {
      type: Array,
      required: true,
    },
    csvImportRows: {
      type: Array,
      required: true,
    },
    csvImportTotals: {
      type: Object,
      required: true,
    },
    csvImportSummary: {
      type: Object,
      required: true,
    },
    transactionSearch: {
      type: String,
      default: "",
    },
    transactionCategoryFilter: {
      type: String,
      default: "",
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
    formatDateTime: {
      type: Function,
      required: true,
    },
    paginationResetKey: {
      type: String,
      default: "",
    },
  },
  computed: {
    categoryComboValue() {
      return this.transactionCategoryFilter || null;
    },
    categoryFilterPlaceholder() {
      return "Todas as categorias";
    },
    hasActiveFilters() {
      return Boolean((this.transactionSearch && this.transactionSearch.trim()) || this.transactionCategoryFilter);
    },
    categoryOptions() {
      return [...this.categories].sort((left, right) =>
        `${left.macro_category || ""} ${left.name || ""}`.localeCompare(
          `${right.macro_category || ""} ${right.name || ""}`,
          "pt-BR",
        ),
      );
    },
  },
  methods: {
    clearAllFilters() {
      this.$emit("update:transactionSearch", "");
      this.$emit("update:transactionCategoryFilter", "");
    },
    categoryOptionValue(category) {
      return String(category?.server_id || category?.id || category?.local_key || category?.local_id || "");
    },
    handleCategoryFilterChange(categoryId) {
      this.$emit("update:transactionCategoryFilter", categoryId || "");
    },
    emitSelectCategory(transaction, categoryId) {
      this.$emit("select-category", transaction, categoryId);
    },
    emitCreateCategoryForTransaction(transaction, suggestedName) {
      this.$emit("create-category-for-transaction", transaction, suggestedName);
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
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
  padding: var(--space-6);
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.panel-title h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.count-pill {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-weight: 600;
}

.ai-action-btn {
  height: 40px;
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.84rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ai-btn-icon {
  color: var(--ai-accent, #7c3aed);
  font-size: 0.95rem;
}

.ai-action-btn:hover:not(:disabled) {
  border-color: var(--ai-accent, #7c3aed);
  background: rgba(124, 58, 237, 0.08);
  color: var(--ai-accent, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
}

.ai-action-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.transaction-tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.transaction-filters-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-field.search-filter {
  flex: 1 1 320px;
  min-width: 240px;
}

.filter-field.category-filter {
  flex: 0 1 280px;
  min-width: 220px;
}

.filter-field label {
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 2px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.field-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}

.input-with-icon input {
  width: 100%;
  height: 42px !important;
  min-height: 42px !important;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 34px 0 38px;
  outline: none;
  font-size: var(--fontsize-sx, 0.875rem);
  box-sizing: border-box;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.input-with-icon input:focus {
  border-color: var(--color-info);
  background: var(--surface-0);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  font-size: 0.8rem;
  transition: all var(--transition-fast);
}

.clear-search-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.filter-reset-col {
  display: flex;
  align-items: flex-end;
}

.reset-filters-btn {
  height: 42px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--glass-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.reset-filters-btn:hover {
  background: var(--surface-2);
  border-color: var(--color-expense, #D64A2E);
  color: var(--color-expense, #D64A2E);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@container (max-width: 680px) {
  .panel {
    padding: var(--space-4);
  }

  .transaction-filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-field.category-filter {
    flex: 1 1 auto;
  }
}

@container (max-width: 480px) {
  .panel {
    padding: var(--space-3);
  }

  .panel-title {
    margin-bottom: var(--space-3);
  }
}

@media (max-width: 680px) {
  .panel {
    padding: var(--space-4);
  }

  .transaction-filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-field.category-filter {
    flex: 1 1 auto;
  }
}

@media (max-width: 480px) {
  .panel {
    padding: var(--space-3);
  }

  .panel-title {
    margin-bottom: var(--space-3);
  }
}
</style>
