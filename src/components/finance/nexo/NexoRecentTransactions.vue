<template>
  <section class="panel">
    <div class="panel-title">
      <div class="title-group">
        <h3>Recentes</h3>
        <Transition name="fade-scale">
          <span
            v-if="selectedCategory"
            class="filter-pill"
            :style="{ '--pill-color': activeCategoryColor }"
          >
            {{ selectedCategory }}
            <button class="clear-pill-btn" @click="$emit('clear-filter')" title="Remover filtro">
              &times;
            </button>
          </span>
        </Transition>
      </div>
      <button class="text-btn" @click="$emit('view-all')">Ver todos</button>
    </div>
    <div class="compact-list">
      <article
        v-for="transaction in recentTransactions.slice(0, 8)"
        :key="transaction.local_id || transaction.id"
        class="movement-row"
        :class="{ ignored: transaction.is_ignored }"
      >
        <div class="movement-copy">
          <strong>{{ transaction.description }}</strong>
          <span>{{ categoryLabel(transaction) }} | {{ formatShortDate(transaction.transaction_date) }}</span>
        </div>
        <div class="movement-actions">
          <b :class="transaction.type">{{ formatSignedMoney(transaction) }}</b>
          <div class="row-actions">
            <button
              type="button"
              class="icon-btn"
              :title="transaction.is_ignored ? 'Reexibir' : 'Ignorar'"
              @click="$emit('toggle-ignored', transaction)"
            >
              <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
            </button>
            <button
              type="button"
              class="icon-btn danger"
              title="Excluir"
              @click="$emit('delete-transaction', transaction)"
            >
              <font-awesome-icon icon="trash" />
            </button>
          </div>
        </div>
      </article>
      <p v-if="recentTransactions.length === 0" class="empty-line">Nenhum lancamento.</p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NexoRecentTransactions',
  emits: ['view-all', 'clear-filter', 'toggle-ignored', 'delete-transaction'],
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
    selectedCategory: {
      type: String,
      default: null,
    },
  },
  computed: {
    activeCategoryColor() {
      if (!this.selectedCategory) return '#eab308'
      const category = this.categories.find(
        (current) =>
          String(current.macro_category || '').toLowerCase() === this.selectedCategory.toLowerCase(),
      )
      return category?.macro_color || category?.color || '#eab308'
    },
  },
  methods: {
    categoryLabel(transaction) {
      return (
        transaction.category_name ||
        this.categories.find(
          (category) => String(category.id || '') === String(transaction.category_id || ''),
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
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.title-group h3 {
  margin: 0;
  line-height: 1.2;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: color-mix(in srgb, var(--pill-color, #eab308) 12%, transparent);
  color: var(--pill-color, #eab308);
  border: 1px solid color-mix(in srgb, var(--pill-color, #eab308) 40%, transparent);
  padding: 4px var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.clear-pill-btn {
  background: color-mix(in srgb, var(--pill-color, #eab308) 15%, transparent);
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  transition: all 0.2s ease;
}

.clear-pill-btn:hover {
  background: var(--color-expense, #ef4444);
  color: #ffffff !important;
  transform: scale(1.1);
}

[data-theme='dark'] .clear-pill-btn:hover {
  background: var(--color-expense, #ef4444);
  color: #ffffff !important;
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

.movement-row.ignored {
  opacity: 0.5;
}

.movement-copy {
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

.movement-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-left: auto;
}

.movement-row b {
  margin-left: auto;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.icon-btn {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  min-height: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.icon-btn:hover {
  background: var(--dark-yellow-2);
}

.icon-btn.danger:hover {
  background: rgba(231, 76, 60, 0.12);
  color: var(--red);
}

.icon-btn:active {
  transform: scale(0.97);
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

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }

  .movement-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .movement-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
