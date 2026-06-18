<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Origem</th>
          <th class="right">Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="transaction in transactions"
          :key="transaction.local_id || transaction.id"
          :class="{ ignored: transaction.is_ignored }"
        >
          <td>{{ formatShortDate(transaction.transaction_date) }}</td>
          <td class="transaction-description-cell">
            <strong>{{ transaction.description }}</strong>
            <small v-if="transaction.observation" class="transaction-observation">
              {{ transaction.observation }}
            </small>
          </td>
          <td>
            <span v-if="categorizingIds.includes(transaction.id)" class="categorizing-loading-text">
              <font-awesome-icon icon="circle-notch" spin /> Categorizando...
            </span>
            <CategoryCombo
              v-else
              :model-value="transaction.category_id"
              :categories="categories"
              allow-create
              placeholder="Sem categoria"
              @update:modelValue="$emit('select-category', transaction, $event)"
              @create="$emit('create-category-for-transaction', transaction, $event)"
            />
          </td>
          <td>{{ sourceLabel(transaction.source) }}</td>
          <td class="right value-cell">
            <strong :class="transaction.type">{{ formatSignedMoney(transaction) }}</strong>
            <small
              v-if="transaction.original_type && transaction.original_type !== transaction.type"
              class="original-type-label"
            >
              Original: {{ polarityLabel(transaction.original_type) }}
            </small>
          </td>
          <td>
            <div class="row-actions">
              <button class="icon-btn small" title="Editar" @click="$emit('edit', transaction)">
                <font-awesome-icon icon="pencil" />
              </button>
              <button
                class="icon-btn small"
                title="Ignorar"
                @click="$emit('toggle-ignored', transaction)"
              >
                <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
              </button>
              <button
                class="icon-btn small danger"
                title="Excluir"
                @click="$emit('delete', transaction)"
              >
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="transactions.length === 0" class="empty-line">Nenhum lançamento encontrado.</p>
  </div>
</template>

<script>
import CategoryCombo from '../CategoryCombo.vue'

export default {
  name: 'NexoTransactionsTable',
  components: {
    CategoryCombo,
  },
  emits: ['create-category-for-transaction', 'delete', 'edit', 'select-category', 'toggle-ignored'],
  props: {
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
    polarityLabel(type) {
      return type === 'INCOME' ? 'positivo' : 'negativo'
    },
    sourceLabel(source) {
      const labels = { MANUAL: 'Manual', OPEN_FINANCE: 'Open Finance', IMPORT: 'CSV' }
      return labels[source] || 'Não definido'
    },
  },
}
</script>

<style scoped>
.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th,
td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--surface-1);
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:hover td {
  background: var(--surface-1);
}

tr.ignored {
  opacity: 0.45;
}

.right {
  text-align: right;
}

.INCOME {
  color: var(--color-income);
}

.EXPENSE {
  color: var(--color-expense);
}

.value-cell strong,
.value-cell small,
.transaction-description-cell strong,
.transaction-description-cell small {
  display: block;
}

.transaction-observation {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  line-height: 1.4;
  white-space: normal;
}

.original-type-label {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  white-space: nowrap;
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
  gap: var(--space-2);
  min-height: 40px;
  width: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  background: var(--surface-2);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.icon-btn.small {
  min-height: 32px;
  width: 32px;
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

.empty-line,
.categorizing-loading-text {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.categorizing-loading-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
}
</style>
