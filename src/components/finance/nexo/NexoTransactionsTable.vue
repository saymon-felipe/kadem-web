<template>
  <div class="table-stack">
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
            v-for="transaction in paginatedTransactions"
            :key="transaction.local_id || transaction.id"
            :class="{ ignored: transaction.is_ignored }"
          >
            <td class="date-cell">
              <strong>{{ formatShortDate(transaction.transaction_date) }}</strong>
              <small v-if="timeLabel(transaction.transaction_date)">{{
                timeLabel(transaction.transaction_date)
              }}</small>
            </td>
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
                <button class="icon-btn small" title="Ignorar" @click="$emit('toggle-ignored', transaction)">
                  <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
                </button>
                <button class="icon-btn small danger" title="Excluir" @click="$emit('delete', transaction)">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="transactions.length === 0" class="empty-line">Nenhum lançamento encontrado.</p>
    </div>

    <div v-if="transactions.length > 0" class="table-pagination">
      <span>{{ pageStart }}-{{ pageEnd }} de {{ transactions.length }}</span>
      <div class="pagination-controls">
        <label>
          <span>Página</span>
          <select v-model.number="pageSize">
            <option v-for="option in pageSizeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <button class="icon-btn small" type="button" :disabled="page <= 1" @click="page -= 1">
          <font-awesome-icon icon="chevron-left" />
        </button>
        <strong>{{ page }} / {{ totalPages }}</strong>
        <button class="icon-btn small" type="button" :disabled="page >= totalPages" @click="page += 1">
          <font-awesome-icon icon="chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import CategoryCombo from "../CategoryCombo.vue";

export default {
  name: "NexoTransactionsTable",
  components: {
    CategoryCombo,
  },
  emits: ["create-category-for-transaction", "delete", "edit", "select-category", "toggle-ignored"],
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
    paginationResetKey: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      page: 1,
      pageSize: 25,
      pageSizeOptions: [25, 50, 100],
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.transactions.length / this.pageSize));
    },
    paginatedTransactions() {
      const start = (this.page - 1) * this.pageSize;
      return this.transactions.slice(start, start + this.pageSize);
    },
    pageStart() {
      if (this.transactions.length === 0) return 0;
      return (this.page - 1) * this.pageSize + 1;
    },
    pageEnd() {
      return Math.min(this.page * this.pageSize, this.transactions.length);
    },
  },
  watch: {
    paginationResetKey() {
      this.page = 1;
    },
    transactions() {
      if (this.page > this.totalPages) {
        this.page = this.totalPages;
      }
    },
  },
  methods: {
    polarityLabel(type) {
      return type === "INCOME" ? "positivo" : "negativo";
    },
    sourceLabel(source) {
      const labels = { MANUAL: "Manual", OPEN_FINANCE: "Open Finance", IMPORT: "CSV" };
      return labels[source] || "Não definido";
    },
    timeLabel(value) {
      const raw = String(value || "").trim();
      if (!raw || raw.length <= 10) return "";
      const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw) ? raw.replace(" ", "T") : raw;
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) return "";
      const time = parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return time === "00:00" ? "" : time;
    },
  },
};
</script>

<style scoped>
.table-stack {
  display: grid;
  gap: var(--space-3);
}

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

.date-cell strong,
.date-cell small,
.value-cell strong,
.value-cell small,
.transaction-description-cell strong,
.transaction-description-cell small {
  display: block;
}

.date-cell small,
.transaction-observation,
.original-type-label,
.empty-line,
.categorizing-loading-text,
.table-pagination span,
.table-pagination label span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.INCOME {
  color: var(--color-income);
}

.EXPENSE {
  color: var(--color-expense);
}

.transaction-observation {
  margin-top: var(--space-1);
  line-height: 1.4;
  white-space: normal;
}

.original-type-label {
  margin-top: var(--space-1);
  white-space: nowrap;
}

.row-actions,
.pagination-controls,
.table-pagination {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.row-actions {
  justify-content: flex-end;
}

.table-pagination {
  justify-content: space-between;
  flex-wrap: wrap;
}

.pagination-controls label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pagination-controls select {
  min-height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-2);
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

.categorizing-loading-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
}

@media (max-width: 760px) {
  .table-pagination,
  .pagination-controls {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
