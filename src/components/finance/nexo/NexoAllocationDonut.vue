<template>
  <section class="panel allocation-panel">
    <div class="panel-title">
      <h3>Distribuição</h3>
    </div>
    <div class="allocation-body">
      <div class="donut" :style="{ background: donutGradient }">
        <div class="donut-hole">
          <span>{{ expensePercent }}%</span>
          <small>uso</small>
        </div>
      </div>
      <div class="legend-list">
        <div v-for="segment in macroDistribution" :key="segment.macro_category" class="legend-row">
          <span class="swatch" :style="{ background: segment.color || '#999999' }"></span>
          <span>{{ segment.macro_category || 'Geral' }}</span>
          <strong>{{ formatMoney(segment.total) }}</strong>
        </div>
        <p v-if="macroDistribution.length === 0" class="empty-line">Sem gastos no mês.</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NexoAllocationDonut',
  props: {
    macroDistribution: {
      type: Array,
      required: true,
    },
    totals: {
      type: Object,
      required: true,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
  },
  computed: {
    expensePercent() {
      if (!this.totals.income) return 0
      return Math.min(100, Math.round((this.totals.expense / this.totals.income) * 100))
    },
    donutGradient() {
      const total = this.macroDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0)
      if (!total) return 'conic-gradient(var(--gray-600) 0deg 360deg)'

      let cursor = 0
      const parts = this.macroDistribution.map((item) => {
        const degrees = (Number(item.total || 0) / total) * 360
        const part = `${item.color || '#999999'} ${cursor}deg ${cursor + degrees}deg`
        cursor += degrees
        return part
      })
      return `conic-gradient(${parts.join(', ')})`
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
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.panel-title h3 {
  margin: 0;
}

.allocation-body {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-5);
  align-items: center;
}

.donut {
  width: 180px;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.donut-hole {
  width: 116px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--surface-0);
  display: grid;
  place-items: center;
  align-content: center;
  transition: background var(--transition-base);
}

.donut-hole span {
  font-weight: 900;
  font-size: var(--fontsize-md);
  color: var(--text-primary);
}

.donut-hole small,
.empty-line,
.legend-row span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.donut-hole small {
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.legend-row strong {
  margin-left: auto;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
}

@media (max-width: 900px) {
  .allocation-body {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
