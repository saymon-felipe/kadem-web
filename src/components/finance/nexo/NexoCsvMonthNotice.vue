<template>
  <div v-if="summary.outsideSelectedMonth > 0" class="csv-month-notice" role="status">
    <p v-if="summary.importMonths.length === 1">
      As novas movimentações deste CSV são de <strong>{{ summary.importMonths[0].label }}</strong>,
      mas o filtro está em <strong>{{ summary.selectedMonthLabel }}</strong>.
      Após importar, elas não aparecerão na lista deste mês.
    </p>
    <p v-else>
      <strong>{{ summary.outsideSelectedMonth }} de {{ summary.ready }} novas movimentações</strong>
      são de outros meses e não aparecerão com o filtro em <strong>{{ summary.selectedMonthLabel }}</strong>.
      A importação mantém as datas de cada movimentação.
    </p>
    <button
      v-if="summary.outsideSelectedMonth === summary.ready"
      type="button"
      :disabled="importingCsv"
      @click="$emit('confirm', summary.importMonths[0].key)"
    >
      Importar e ver {{ summary.importMonths[0].label }}
    </button>
  </div>
</template>

<script>
export default {
  name: "NexoCsvMonthNotice",
  emits: ["confirm"],
  props: {
    summary: { type: Object, required: true },
    importingCsv: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.csv-month-notice {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-warning) 10%, var(--surface-1));
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
}

p {
  margin: 0;
}

button {
  justify-self: start;
  max-width: 100%;
  min-height: 40px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: var(--surface-2);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
