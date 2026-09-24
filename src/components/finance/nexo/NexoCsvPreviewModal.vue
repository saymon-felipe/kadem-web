<template>
  <BaseModal
    :model-value="visible"
    title="Preview do CSV"
    size="xl"
    @close="$emit('close')"
  >
    <template #header>
      <header class="modal-header-custom">
        <div>
          <h3 class="modal-title-bold">Preview do CSV</h3>
          <p class="summary-sub">{{ summary.total }} linhas válidas | {{ summary.ready }} novas | {{ summary.duplicates }} duplicadas</p>
        </div>
        <button class="icon-btn-close" type="button" title="Fechar" @click="$emit('close')">
          <font-awesome-icon icon="xmark" />
        </button>
      </header>
    </template>

        <div class="modal-summary">
          <strong>
            {{ formatMoney(summaryTotals.expense) }} saídas | {{ formatMoney(summaryTotals.income) }} entradas
          </strong>
          <span v-if="monthBreakdown">{{ monthBreakdown }}</span>
        </div>

        <div class="preview-table-wrap custom-scrollbar">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th class="right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.csv_line_number" :class="rowClass(row)">
                <td>{{ formatDateTime(row.transaction_date) }}</td>
                <td>{{ row.csv_original_type || typeLabel(row.type) }}</td>
                <td class="description-cell">
                  <strong>{{ row.description }}</strong>
                  <small v-if="row.observation">{{ row.observation }}</small>
                </td>
                <td class="right">
                  <strong :class="row.type">
                    {{ row.type === "EXPENSE" ? "-" : "+" }} {{ formatMoney(row.amount) }}
                  </strong>
                </td>
                <td>
                  <span class="status-chip" :class="row.csv_status">
                    {{ statusLabel(row.csv_status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-actions">
          <button type="button" class="text-btn" @click="$emit('close')">Cancelar</button>
          <button
            type="button"
            class="primary-action"
            :disabled="importingCsv || summary.ready === 0"
            @click="$emit('confirm')"
          >
            <font-awesome-icon :icon="importingCsv ? 'circle-notch' : 'file-import'" :spin="importingCsv" />
            Importar
          </button>
        </div>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

export default {
  name: "NexoCsvPreviewModal",
  components: {
    BaseModal,
  },
  emits: ["close", "confirm"],
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    rows: {
      type: Array,
      required: true,
    },
    summary: {
      type: Object,
      required: true,
    },
    importingCsv: {
      type: Boolean,
      default: false,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
    formatDateTime: {
      type: Function,
      required: true,
    },
  },
  computed: {
    summaryTotals() {
      return this.rows.reduce(
        (acc, row) => {
          if (!row) return acc;
          if (row.type === "INCOME") acc.income += Number(row.amount || 0);
          else acc.expense += Number(row.amount || 0);
          return acc;
        },
        { income: 0, expense: 0 },
      );
    },
    monthBreakdown() {
      if (!Array.isArray(this.summary.months) || this.summary.months.length < 2) return "";
      return this.summary.months.map((month) => `${month.count} em ${month.label}`).join(" | ");
    },
  },
  methods: {
    typeLabel(type) {
      return type === "INCOME" ? "Entrada" : "Saída";
    },
    statusLabel(status) {
      const labels = {
        new: "Nova",
        duplicate_exact: "Já existe",
        duplicate_legacy: "Já importada",
        duplicate_legacy_conflict: "Duplicada legado",
        duplicate_file: "Repetida no arquivo",
      };
      return labels[status] || "Nova";
    },
    rowClass(row) {
      return {
        duplicate: row.csv_status !== "new",
        conflict: row.csv_status === "duplicate_legacy_conflict",
      };
    },
  },
};
</script>

<style scoped>
.modal-header-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--glass-border);
  width: 100%;
}

.modal-title-bold {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.summary-sub {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.icon-btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--surface-2);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--transition-fast);
}

.icon-btn-close:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}

.modal-header,
.modal-summary,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.modal-header h3,
.modal-header p,
.modal-summary span {
  margin: 0;
}

.modal-header p,
.modal-summary span,
.description-cell small {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.preview-table-wrap {
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

th,
td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  vertical-align: middle;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  text-transform: uppercase;
}

.description-cell strong,
.description-cell small {
  display: block;
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

tr.duplicate td {
  opacity: 0.72;
}

tr.conflict td {
  opacity: 1;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  white-space: nowrap;
}

.status-chip.new {
  color: var(--color-income);
}

.status-chip.duplicate_exact,
.status-chip.duplicate_legacy,
.status-chip.duplicate_file {
  color: var(--text-secondary);
}

.status-chip.duplicate_legacy_conflict {
  color: var(--yellow);
}

.primary-action,
.text-btn,
.icon-btn {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
}

.text-btn {
  background: transparent;
  color: var(--text-primary);
}

.icon-btn {
  width: 36px;
  min-width: 36px;
  background: var(--surface-1);
  color: var(--text-primary);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .nexo-modal {
    width: min(94vw, 94vw);
    padding: var(--space-4);
  }

  .modal-header,
  .modal-summary,
  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
