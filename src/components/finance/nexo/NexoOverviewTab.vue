<template>
  <div>
    <NexoSummaryCards
      :totals="totals"
      :investment-summary="investmentSummary"
      :format-money="formatMoney"
    />

    <div class="overview-grid">
      <NexoAllocationDonut
        :totals="totals"
        :macro-distribution="macroDistribution"
        :format-money="formatMoney"
        :selected-category="selectedCategory"
        @category-selected="toggleCategoryFilter"
      />
      <NexoRecentTransactions
        :categories="categories"
        :recent-transactions="filteredRecentTransactions"
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

export default {
  name: 'NexoOverviewTab',
  components: {
    NexoAllocationDonut,
    NexoRecentTransactions,
    NexoSummaryCards,
  },
  emits: ['view-transactions', 'toggle-ignored', 'delete-transaction'],
  props: {
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
.overview-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
