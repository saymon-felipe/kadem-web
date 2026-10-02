<template>
  <section class="csv-import-card">
    <div class="csv-import-header">
      <div class="header-main-info">
        <div class="csv-icon-avatar">
          <font-awesome-icon icon="file-import" />
        </div>
        <div class="csv-title-group">
          <div class="csv-title-row">
            <strong>Importar CSV</strong>
            <span v-if="!isPaidPlan" class="pro-tag">PRO</span>
          </div>
          <span v-if="csvImportFileName" class="csv-filename-pill">
            <font-awesome-icon icon="receipt" /> {{ csvImportFileName }}
          </span>
          <span v-else class="csv-subtitle">Extrato bancário, fatura de cartão ou planilha</span>
        </div>
      </div>
      <div class="header-actions">
        <button
          v-if="hasPreview"
          class="icon-btn"
          type="button"
          :disabled="loadingSchema"
          title="Expandir preview"
          @click="$emit('open-preview')"
        >
          <font-awesome-icon icon="up-right-from-square" />
        </button>
        <button
          class="csv-trigger-btn"
          type="button"
          :disabled="importingCsv || loadingSchema"
          @click="pickFile"
        >
          <font-awesome-icon :icon="!isPaidPlan ? 'lock' : 'file-import'" />
          <span>{{ csvImportFileName ? 'Trocar arquivo' : 'Selecionar arquivo CSV' }}</span>
        </button>
      </div>
      <input ref="csvInput" class="visually-hidden" type="file" accept=".csv,text/csv" @change="handleFileChange" />
    </div>

    <p v-if="csvImportError" class="import-feedback error">{{ csvImportError }}</p>
    <p v-if="loadingSchema" class="import-feedback">
      <font-awesome-icon icon="circle-notch" spin /> Preparando prévia do CSV...
    </p>

    <div v-if="hasPreview" class="csv-preview">
      <div class="csv-preview-summary">
        <div class="summary-copy">
          <span>{{ csvImportSummary.total }} movimentações válidas no arquivo</span>
          <strong> {{ csvImportSummary.ready }} novas | {{ csvImportSummary.duplicates }} duplicadas </strong>
        </div>
        <strong class="summary-balance">
          {{ formatMoney(csvImportTotals.expense) }} saídas | {{ formatMoney(csvImportTotals.income) }} entradas
        </strong>
      </div>

      <p v-if="monthBreakdown" class="import-feedback">{{ monthBreakdown }}</p>
      <NexoCsvMonthNotice
        :summary="csvImportSummary"
        :importing-csv="importingCsv"
        @confirm="$emit('confirm', $event)"
      />
      <p v-if="allRowsAlreadyImported" class="import-feedback">
        Todas as linhas válidas deste arquivo já existem no sistema ou estão repetidas no próprio CSV.
      </p>

      <div class="csv-preview-table">
        <table>
          <tbody>
            <tr v-for="(row, index) in compactRows" :key="`${row.csv_line_number}-${index}`">
              <td class="date-cell">{{ formatDateTime(row.transaction_date) }}</td>
              <td class="description-cell">
                <strong>{{ row.description }}</strong>
                <small>{{ statusLabel(row.csv_status) }}</small>
              </td>
              <td class="right">
                <strong :class="row.type">
                  {{ row.type === "EXPENSE" ? "-" : "+" }} {{ formatMoney(row.amount) }}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="hiddenCount > 0" class="import-feedback">
        +{{ hiddenCount }} movimentações no arquivo. Use o expandir para ver tudo.
      </p>

      <div class="csv-import-actions">
        <button class="text-btn" type="button" :disabled="importingCsv" @click="reset">Limpar</button>
        <button
          class="primary-action compact"
          type="button"
          :disabled="importingCsv || csvImportRows.length === 0"
          @click="$emit('confirm')"
        >
          <font-awesome-icon :icon="importingCsv ? 'circle-notch' : 'file-import'" :spin="importingCsv" />
          Importar
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import NexoCsvMonthNotice from "./NexoCsvMonthNotice.vue";

export default {
  name: "NexoCsvImportCard",
  components: { NexoCsvMonthNotice },
  emits: ["confirm", "file-change", "open-preview", "reset", "upgrade"],
  props: {
    isPaidPlan: {
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
    hasPreview() {
      return this.csvPreviewRows.length > 0;
    },
    compactRows() {
      return this.csvPreviewRows.slice(0, 6);
    },
    hiddenCount() {
      return Math.max(this.csvPreviewRows.length - this.compactRows.length, 0);
    },
    allRowsAlreadyImported() {
      return this.csvImportSummary.total > 0 && this.csvImportSummary.ready === 0;
    },
    monthBreakdown() {
      if (!Array.isArray(this.csvImportSummary.months) || this.csvImportSummary.months.length < 2) {
        return "";
      }
      return this.csvImportSummary.months.map((month) => `${month.count} em ${month.label}`).join(" | ");
    },
  },
  methods: {
    pickFile() {
      if (!this.isPaidPlan) {
        this.$emit("upgrade");
        return;
      }
      this.$refs.csvInput?.click();
    },
    handleFileChange(event) {
      this.$emit("file-change", event);
      if (event.target) event.target.value = "";
    },
    reset() {
      if (this.$refs.csvInput) this.$refs.csvInput.value = "";
      this.$emit("reset");
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
  },
};
</script>

<style scoped>
.csv-import-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: var(--space-4) var(--space-5);
  display: grid;
  gap: var(--space-4);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.csv-import-header,
.csv-preview-summary,
.csv-import-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.csv-import-header {
  flex-wrap: wrap;
}

.header-main-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.csv-icon-avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-sm);
  background: rgba(53, 90, 253, 0.08);
  border: 1px solid rgba(53, 90, 253, 0.16);
  color: var(--color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

[data-theme='dark'] .csv-icon-avatar {
  background: rgba(95, 124, 255, 0.15);
  border-color: rgba(95, 124, 255, 0.25);
  color: #a5b4fc;
}

.csv-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.csv-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.csv-title-row strong {
  display: block;
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 700;
}

.pro-tag {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background: var(--deep-blue-gradient);
  color: var(--white);
  letter-spacing: 0.05em;
}

.csv-subtitle {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.csv-filename-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-info);
  background: var(--surface-2);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--glass-border);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csv-trigger-btn {
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.csv-trigger-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

.csv-trigger-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.csv-import-header span,
.import-feedback,
.summary-copy span,
.description-cell small {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.csv-preview {
  display: grid;
  gap: var(--space-3);
}

.summary-copy,
.description-cell {
  min-width: 0;
}

.summary-copy strong,
.summary-balance,
.description-cell strong,
.description-cell small {
  display: block;
}

.csv-preview-table {
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.csv-preview-table table {
  width: 100%;
  border-collapse: collapse;
}

.csv-preview-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--glass-border);
  vertical-align: middle;
}

.date-cell {
  white-space: nowrap;
  font-size: var(--fontsize-xs);
}

.description-cell {
  min-width: 0;
}

.description-cell strong,
.description-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.import-feedback {
  margin: 0;
}

.import-feedback.error {
  color: var(--red);
}

.csv-import-actions {
  justify-content: flex-end;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
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

.primary-action.compact {
  min-height: 36px;
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.text-btn {
  background: transparent;
  color: var(--text-primary);
  padding: 0;
}

.text-btn:hover,
.icon-btn:hover {
  color: var(--deep-blue);
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

@container (max-width: 700px) {
  .csv-import-header,
  .csv-preview-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .csv-import-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@container (max-width: 480px) {
  .csv-import-card {
    padding: var(--space-3);
  }

  .header-actions .text-btn {
    font-size: var(--fontsize-xs);
  }

  .csv-preview-summary {
    gap: var(--space-1);
  }
}

@media (max-width: 700px) {
  .csv-import-header,
  .csv-preview-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .csv-import-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .csv-import-card {
    padding: var(--space-3);
  }

  .header-actions .text-btn {
    font-size: var(--fontsize-xs);
  }

  .csv-preview-summary {
    gap: var(--space-1);
  }
}
</style>
