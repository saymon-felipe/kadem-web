<template>
  <div class="table-stack">
    <div class="table-wrap desktop-table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-date">Data</th>
            <th class="col-desc">Descrição</th>
            <th class="col-cat">Categoria</th>
            <th class="col-source">Origem</th>
            <th class="col-amount right">Valor</th>
            <th class="col-actions right"></th>
          </tr>
        </thead>
        <tbody v-if="paginatedTransactions.length > 0">
          <tr
            v-for="transaction in paginatedTransactions"
            :key="transaction.local_id || transaction.id"
            :class="{ ignored: transaction.is_ignored }"
          >
            <td class="col-date date-cell">
              <strong>{{ formatShortDate(transaction.transaction_date) }}</strong>
              <small v-if="timeLabel(transaction.transaction_date)">{{
                timeLabel(transaction.transaction_date)
              }}</small>
            </td>
            <td class="col-desc transaction-description-cell">
              <strong class="desc-text">{{ transaction.description }}</strong>
              <small v-if="transaction.observation" class="transaction-observation">
                {{ transaction.observation }}
              </small>
              <small v-if="transaction.goal_name" class="transaction-goal">
                <font-awesome-icon icon="clipboard" /> Meta: {{ transaction.goal_name }}
              </small>
            </td>
            <td class="col-cat">
              <span v-if="categorizingIds.includes(transaction.id)" class="categorizing-loading-text">
                <font-awesome-icon icon="circle-notch" spin /> Categorizando...
              </span>
              <CategoryCombo
                v-else
                :model-value="transaction.category_id"
                :categories="categories"
                allow-create
                size="sm"
                placeholder="Sem categoria"
                @update:modelValue="$emit('select-category', transaction, $event)"
                @create="$emit('create-category-for-transaction', transaction, $event)"
              />
            </td>
            <td class="col-source">
              <span class="source-tag" :class="transaction.source ? transaction.source.toLowerCase() : ''">
                {{ sourceLabel(transaction.source) }}
              </span>
            </td>
            <td class="col-amount right value-cell">
              <strong :class="transaction.type">{{ formatSignedMoney(transaction) }}</strong>
              <small
                v-if="transaction.original_type && transaction.original_type !== transaction.type"
                class="original-type-label"
              >
                Original: {{ polarityLabel(transaction.original_type) }}
              </small>
            </td>
            <td class="col-actions right">
              <div class="row-actions">
                <button class="icon-btn small" title="Editar" @click="$emit('edit', transaction)">
                  <font-awesome-icon icon="pencil" />
                </button>
                <button
                  class="icon-btn small"
                  :title="transaction.is_ignored ? 'Reexibir' : 'Ignorar'"
                  @click="$emit('toggle-ignored', transaction)"
                >
                  <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
                </button>
                <button class="icon-btn small danger" title="Excluir" @click="$emit('delete', transaction)">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="6" class="empty-table-cell">
              <div class="empty-state-card">
                <div class="empty-icon-circle">
                  <font-awesome-icon icon="receipt" />
                </div>
                <h4>Nenhum lançamento encontrado</h4>
                <p v-if="hasActiveFilters">
                  Não encontramos nenhuma movimentação com os filtros aplicados.
                </p>
                <p v-else>
                  Ainda não há lançamentos registrados neste período.
                </p>
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="empty-reset-btn"
                  @click="$emit('clear-filters')"
                >
                  <font-awesome-icon icon="xmark" />
                  <span>Limpar filtros</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="mobile-transactions-list">
      <template v-if="paginatedTransactions.length > 0">
        <article
          v-for="transaction in paginatedTransactions"
          :key="transaction.local_id || transaction.id"
          class="transaction-mobile-card"
          :class="{ ignored: transaction.is_ignored }"
        >
          <div class="card-top-row">
            <div class="date-badge">
              <strong>{{ formatShortDate(transaction.transaction_date) }}</strong>
              <small v-if="timeLabel(transaction.transaction_date)">{{
                timeLabel(transaction.transaction_date)
              }}</small>
              <span class="source-tag" :class="transaction.source ? transaction.source.toLowerCase() : ''">
                {{ sourceLabel(transaction.source) }}
              </span>
            </div>
            <div class="amount-badge">
              <strong :class="transaction.type">{{ formatSignedMoney(transaction) }}</strong>
              <small
                v-if="transaction.original_type && transaction.original_type !== transaction.type"
                class="original-type-label"
              >
                Original: {{ polarityLabel(transaction.original_type) }}
              </small>
            </div>
          </div>

          <div class="card-main-row">
            <strong class="desc-text">{{ transaction.description }}</strong>
            <small v-if="transaction.observation" class="transaction-observation">
              {{ transaction.observation }}
            </small>
            <small v-if="transaction.goal_name" class="transaction-goal">
              <font-awesome-icon icon="clipboard" /> Meta: {{ transaction.goal_name }}
            </small>
          </div>

          <div class="card-category-row">
            <span v-if="categorizingIds.includes(transaction.id)" class="categorizing-loading-text">
              <font-awesome-icon icon="circle-notch" spin /> Categorizando...
            </span>
            <CategoryCombo
              v-else
              :model-value="transaction.category_id"
              :categories="categories"
              allow-create
              size="sm"
              placeholder="Sem categoria"
              @update:modelValue="$emit('select-category', transaction, $event)"
              @create="$emit('create-category-for-transaction', transaction, $event)"
            />
          </div>

          <div class="card-bottom-row">
            <div class="row-actions">
              <button class="icon-btn small" title="Editar" @click="$emit('edit', transaction)">
                <font-awesome-icon icon="pencil" />
              </button>
              <button
                class="icon-btn small"
                :title="transaction.is_ignored ? 'Reexibir' : 'Ignorar'"
                @click="$emit('toggle-ignored', transaction)"
              >
                <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
              </button>
              <button class="icon-btn small danger" title="Excluir" @click="$emit('delete', transaction)">
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </div>
        </article>
      </template>

      <div v-else class="mobile-empty-container">
        <div class="empty-state-card">
          <div class="empty-icon-circle">
            <font-awesome-icon icon="receipt" />
          </div>
          <h4>Nenhum lançamento encontrado</h4>
          <p v-if="hasActiveFilters">
            Não encontramos nenhuma movimentação com os filtros aplicados.
          </p>
          <p v-else>
            Ainda não há lançamentos registrados neste período.
          </p>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="empty-reset-btn"
            @click="$emit('clear-filters')"
          >
            <font-awesome-icon icon="xmark" />
            <span>Limpar filtros</span>
          </button>
        </div>
      </div>
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
  emits: ["clear-filters", "create-category-for-transaction", "delete", "edit", "select-category", "toggle-ignored"],
  props: {
    hasActiveFilters: {
      type: Boolean,
      default: false,
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
      const rawTime = raw.match(/^\d{4}-\d{2}-\d{2}[T\s](\d{2}:\d{2})/);
      if (rawTime) return rawTime[1] === "00:00" ? "" : rawTime[1];

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
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th,
td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-1);
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}

tbody tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: var(--surface-1);
}

tr.ignored {
  opacity: 0.45;
}

.col-date {
  width: 120px;
  min-width: 110px;
}

.col-desc {
  min-width: 240px;
}

.col-cat {
  width: 220px;
  min-width: 190px;
}

.col-source {
  width: 120px;
  min-width: 100px;
}

.col-amount {
  width: 140px;
  min-width: 120px;
}

.col-actions {
  width: 110px;
  min-width: 110px;
}

.right {
  text-align: right;
}

.date-cell strong {
  display: block;
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.date-cell small {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.desc-text {
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.transaction-observation {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.4;
  white-space: normal;
}

.transaction-goal {
  display: block;
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.4;
}

.value-cell strong {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.original-type-label {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.INCOME {
  color: var(--color-income);
}

.EXPENSE {
  color: var(--color-expense);
}

.source-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-weight: 600;
  border: 1px solid var(--glass-border);
  white-space: nowrap;
  display: inline-block;
}

.empty-table-cell {
  padding: var(--space-8) var(--space-4) !important;
  text-align: center !important;
  border-bottom: none !important;
}

.mobile-empty-container {
  padding: var(--space-8) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  text-align: center;
}

.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  max-width: 380px;
  margin: 0 auto;
  text-align: center;
}

.empty-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.empty-state-card h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state-card p {
  margin: 0;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.45;
}

.empty-reset-btn {
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  margin-top: var(--space-2);
  transition: all var(--transition-fast);
}

.empty-reset-btn:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.pagination-controls,
.table-pagination {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.table-pagination {
  justify-content: space-between;
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-2) var(--space-1);
}

.table-pagination span,
.table-pagination label span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.pagination-controls label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pagination-controls select {
  height: 34px;
  min-height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-2);
  font-size: var(--fontsize-xs);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.pagination-controls select:focus {
  border-color: var(--color-info);
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
  height: 32px;
  border: 1px solid transparent;
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--dark-yellow-2);
}

.icon-btn.small:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  border-color: var(--glass-border);
}

.icon-btn.danger:hover {
  background: rgba(231, 76, 60, 0.12);
  color: var(--red);
  border-color: transparent;
}

.icon-btn:active {
  transform: scale(0.97);
}

.categorizing-loading-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  font-size: var(--fontsize-xs);
  color: var(--ai-accent, #7c3aed);
}

.mobile-transactions-list {
  display: none;
}

.desktop-table-wrap {
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.transaction-mobile-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: background var(--transition-fast);
}

.transaction-mobile-card:hover {
  background: var(--surface-2);
}

.transaction-mobile-card.ignored {
  opacity: 0.45;
}

.card-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.date-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fontsize-xs);
  flex-wrap: wrap;
}

.date-badge strong {
  color: var(--text-primary);
}

.date-badge small {
  color: var(--text-secondary);
}

.amount-badge {
  text-align: right;
  flex-shrink: 0;
}

.amount-badge strong {
  font-size: var(--fontsize-sm);
  display: block;
  font-variant-numeric: tabular-nums;
}

.card-main-row strong {
  display: block;
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
  line-height: 1.35;
}

.card-category-row {
  width: 100%;
}

.card-bottom-row {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-1);
  border-top: 1px solid var(--glass-border);
}

@container (max-width: 768px) {
  .desktop-table-wrap {
    display: none;
  }

  .mobile-transactions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .table-pagination {
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}

@container (max-width: 480px) {
  .transaction-mobile-card {
    padding: var(--space-3) var(--space-2);
  }

  .card-top-row {
    flex-wrap: wrap;
  }

  .pagination-controls {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .desktop-table-wrap {
    display: none;
  }

  .mobile-transactions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .table-pagination {
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}

@media (max-width: 480px) {
  .transaction-mobile-card {
    padding: var(--space-3) var(--space-2);
  }

  .card-top-row {
    flex-wrap: wrap;
  }

  .pagination-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
