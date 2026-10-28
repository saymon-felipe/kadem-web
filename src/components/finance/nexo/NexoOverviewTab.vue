<template>
  <div>
    <NexoSummaryCards
      :credit-expense="creditSummary.expense || 0"
      :totals="totals"
      :investment-summary="investmentSummary"
      :format-money="formatMoney"
    />
    <div v-if="creditSummary.review_count" class="payment-review-banner">
      <div class="banner-info">
        <span class="banner-icon">
          <font-awesome-icon icon="triangle-exclamation" />
        </span>
        <div class="banner-copy">
          <strong>
            {{ creditSummary.review_count }}
            {{ creditSummary.review_count === 1 ? 'pagamento pendente de revisão' : 'pagamentos pendentes de revisão' }}
          </strong>
          <span>Gastos sem modalidade definida permanecem na conta até a confirmação na aba Crédito.</span>
        </div>
      </div>
      <button type="button" class="banner-action-btn" @click="$emit('view-credit')">
        <span>Revisar na aba Crédito</span>
        <font-awesome-icon icon="arrow-right" />
      </button>
    </div>

    <div class="overview-grid">
      <NexoAllocationDonut
        title="Gastos da conta"
        :show-total="true"
        :totals="totals"
        :macro-distribution="macroDistribution"
        :format-money="formatMoney"
        :selected-category="selectedCategory"
        @category-selected="toggleCategoryFilter"
      />
      <NexoCreditChart :summary="creditSummary" :format-money="formatMoney" />
      <NexoRecentTransactions
        class="overview-recent"
        :categories="categories"
        :recent-transactions="filteredRecentTransactions"
        :credit-cards="creditCards"
        :selected-category="selectedCategory"
        :format-short-date="formatShortDate"
        :format-signed-money="formatSignedMoney"
        @view-all="$emit('view-transactions')"
        @clear-filter="selectedCategory = null"
        @toggle-ignored="$emit('toggle-ignored', $event)"
        @delete-transaction="$emit('delete-transaction', $event)"
      />
    </div>
  </div>
</template>

<script>
import NexoAllocationDonut from './NexoAllocationDonut.vue'
import NexoRecentTransactions from './NexoRecentTransactions.vue'
import NexoSummaryCards from './NexoSummaryCards.vue'
import NexoCreditChart from './NexoCreditChart.vue'

export default {
  name: 'NexoOverviewTab',
  components: {
    NexoAllocationDonut,
    NexoRecentTransactions,
    NexoSummaryCards,
    NexoCreditChart,
  },
  emits: ['view-transactions', 'view-credit', 'toggle-ignored', 'delete-transaction'],
  props: {
    creditCards: { type: Array, default: () => [] },
    creditSummary: { type: Object, default: () => ({expense:0,categories:[]}) },
    totals: {
      type: Object,
      required: true,
    },
    categories: {
      type: Array,
      required: true,
    },
    recentTransactions: {
      type: Array,
      required: true,
    },
    macroDistribution: {
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
    investmentSummary: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      selectedCategory: null,
    }
  },
  computed: {
    filteredRecentTransactions() {
      if (!this.selectedCategory) return this.recentTransactions

      return this.recentTransactions.filter((transaction) => {
        const category = this.categories.find(
          (current) => String(current.id || '') === String(transaction.category_id || ''),
        )
        const macroName = category?.macro_category || 'Geral'
        return macroName.toLowerCase() === this.selectedCategory.toLowerCase()
      })
    },
  },
  methods: {
    toggleCategoryFilter(categoryName) {
      this.selectedCategory = this.selectedCategory === categoryName ? null : categoryName
    },
  },
}
</script>

<style scoped>
.payment-review-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  margin: 0 0 var(--space-4);
  background: var(--surface-0);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-left: 4px solid #f59e0b;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.banner-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.banner-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.9rem;
}

[data-theme='dark'] .banner-icon {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.banner-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.banner-copy strong {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 700;
}

.banner-copy span {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.35;
}

.banner-action-btn {
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.banner-action-btn:hover {
  background: rgba(245, 158, 11, 0.18);
  transform: translateY(-1px);
}

[data-theme='dark'] .banner-action-btn {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.12);
}

[data-theme='dark'] .banner-action-btn:hover {
  background: rgba(251, 191, 36, 0.2);
}

.overview-recent {
  grid-column: 1 / -1;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@container (max-width: 720px) {
  .payment-review-banner {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .banner-action-btn {
    justify-content: center;
    width: 100%;
  }
}

@container (max-width: 960px) {
  .overview-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}

@container (max-width: 480px) {
  .overview-grid {
    gap: var(--space-2);
  }
}

@media (max-width: 960px) {
  .overview-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}

@media (max-width: 480px) {
  .overview-grid {
    gap: var(--space-2);
  }
}
</style>
