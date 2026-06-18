<template>
  <section class="csv-import-card">
    <div class="csv-import-header">
      <div>
        <strong>Importar CSV</strong>
        <span v-if="csvImportFileName">{{ csvImportFileName }}</span>
        <span v-else>Banco, cartão ou planilha</span>
      </div>
      <button
        class="text-btn"
        type="button"
        :disabled="importingCsv || loadingSchema"
        @click="pickFile"
      >
        <font-awesome-icon :icon="!isPaidPlan ? 'lock' : 'file-import'" />
        Importar CSV
      </button>
      <input
        ref="csvInput"
        class="visually-hidden"
        type="file"
        accept=".csv,text/csv"
        @change="handleFileChange"
      />
    </div>

    <p v-if="csvImportError" class="import-feedback error">{{ csvImportError }}</p>
    <p v-if="loadingSchema" class="import-feedback">
      <font-awesome-icon icon="circle-notch" spin /> Analisando padrão do CSV com IA...
    </p>
    <div v-if="csvImportRows.length" class="csv-preview">
      <div class="csv-preview-summary">
        <span>{{ csvImportRows.length }} movimentos prontos</span>
        <strong>
          {{ formatMoney(csvImportTotals.expense) }} saídas ·
          {{ formatMoney(csvImportTotals.income) }} entradas
        </strong>
      </div>
      <div class="csv-preview-table">
        <table>
          <tbody>
            <tr
              v-for="(row, index) in csvImportRows.slice(0, 5)"
              :key="`${row.description}-${index}`"
            >
              <td>{{ formatShortDate(row.transaction_date) }}</td>
              <td>{{ row.description }}</td>
              <td class="right">
                <strong :class="row.type">
                  {{ row.type === 'EXPENSE' ? '-' : '+' }} {{ formatMoney(row.amount) }}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="csv-import-actions">
        <button class="text-btn" type="button" :disabled="importingCsv" @click="reset">
          Limpar
        </button>
        <button
          class="primary-action compact"
          type="button"
          :disabled="importingCsv"
          @click="$emit('confirm')"
        >
          <font-awesome-icon
            :icon="importingCsv ? 'circle-notch' : 'file-import'"
            :spin="importingCsv"
          />
          Importar
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NexoCsvImportCard',
  emits: ['confirm', 'file-change', 'reset', 'upgrade'],
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
    formatMoney: {
      type: Function,
      required: true,
    },
    formatShortDate: {
      type: Function,
      required: true,
    },
  },
  methods: {
    pickFile() {
      if (!this.isPaidPlan) {
        this.$emit('upgrade')
        return
      }
      this.$refs.csvInput?.click()
    },
    handleFileChange(event) {
      this.$emit('file-change', event)
      if (event.target) event.target.value = ''
    },
    reset() {
      if (this.$refs.csvInput) this.$refs.csvInput.value = ''
      this.$emit('reset')
    },
  },
}
</script>

<style scoped>
.csv-import-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
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
  gap: var(--space-3);
}

.csv-import-header strong {
  display: block;
  color: var(--text-primary);
}

.csv-import-header span,
.csv-preview-summary span,
.import-feedback {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.csv-import-header {
  flex-wrap: wrap;
}

.csv-import-header > div:first-child {
  min-width: 0;
}

.csv-preview {
  display: grid;
  gap: var(--space-3);
}

.csv-preview-table {
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.csv-preview-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
}

.csv-preview-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--glass-border);
}

.csv-import-actions {
  justify-content: flex-end;
}

.import-feedback {
  margin: 0;
}

.import-feedback.error {
  color: var(--red);
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

.text-btn:hover {
  color: var(--deep-blue);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .csv-import-header,
  .csv-preview-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
