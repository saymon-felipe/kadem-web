<template>
  <section class="panel allocation-panel">
    <div class="panel-title">
      <h3>Distribuição</h3>
    </div>
    <div class="allocation-body">
      <div class="donut">
        <svg v-if="totalAmount === 0" viewBox="0 0 100 100" class="donut-svg">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--gray-600, #95a5a6)"
            stroke-width="16"
          />
        </svg>
        <svg v-else viewBox="0 0 100 100" class="donut-svg">
          <circle
            v-for="segment in svgSegments"
            :key="segment.key"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            :stroke="segment.color"
            :stroke-dasharray="segment.dashArray"
            :stroke-dashoffset="segment.dashOffset"
            :class="{
              'segment-active': hoveredCategory === segment.macro_category || selectedCategory === segment.macro_category,
              'segment-dimmed': (hoveredCategory && hoveredCategory !== segment.macro_category) || (selectedCategory && selectedCategory !== segment.macro_category && !hoveredCategory)
            }"
            @mouseenter="hoveredCategory = segment.macro_category"
            @mouseleave="hoveredCategory = null"
            @click="$emit('category-selected', segment.macro_category)"
          >
            <title>{{ segment.macro_category }}: {{ formatMoney(segment.total) }} ({{ Math.round(segment.percentage * 100) }}%)</title>
          </circle>
        </svg>
        <div class="donut-hole">
          <Transition name="fade-quick" mode="out-in">
            <div :key="hoveredCategory || 'default'" class="hole-content">
              <template v-if="hoveredCategory">
                <span class="hover-title">{{ hoveredCategory }}</span>
                <small class="hover-value">{{ hoveredCategoryTotal }}</small>
              </template>
              <template v-else>
                <span>{{ expensePercent }}%</span>
                <small>uso</small>
              </template>
            </div>
          </Transition>
        </div>
      </div>
      <div class="legend-list">
        <div
          v-for="segment in svgSegments"
          :key="segment.key"
          class="legend-row"
          :class="{
            'legend-active': hoveredCategory === segment.macro_category || selectedCategory === segment.macro_category,
            'legend-dimmed': (hoveredCategory && hoveredCategory !== segment.macro_category) || (selectedCategory && selectedCategory !== segment.macro_category && !hoveredCategory)
          }"
          @mouseenter="hoveredCategory = segment.macro_category"
          @mouseleave="hoveredCategory = null"
          @click="$emit('category-selected', segment.macro_category)"
        >
          <span class="swatch" :style="{ background: segment.color || '#999999' }"></span>
          <span class="category-name">{{ segment.macro_category || 'Geral' }}</span>
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
    selectedCategory: {
      type: String,
      default: null,
    },
  },
  emits: ['category-selected'],
  data() {
    return {
      hoveredCategory: null,
    }
  },
  computed: {
    expensePercent() {
      if (!this.totals.income) return 0
      return Math.min(100, Math.round((this.totals.expense / this.totals.income) * 100))
    },
    totalAmount() {
      return this.macroDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0)
    },
    svgSegments() {
      const total = this.totalAmount
      if (!total) return []

      const circumference = 2 * Math.PI * 40 // ~251.327
      let currentOffset = 0

      return this.macroDistribution.map((item, index) => {
        const value = Number(item.total || 0)
        const percentage = value / total
        const dashArray = `${percentage * circumference} ${circumference}`
        const dashOffset = -currentOffset
        currentOffset += percentage * circumference

        return {
          ...item,
          percentage,
          dashArray,
          dashOffset,
          key: item.macro_category || `index-${index}`,
        }
      })
    },
    hoveredCategoryTotal() {
      if (!this.hoveredCategory) return ''
      const segment = this.macroDistribution.find(
        (s) => s.macro_category === this.hoveredCategory
      )
      return segment ? this.formatMoney(segment.total) : ''
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
  position: relative;
}

.donut-svg {
  grid-area: 1 / 1;
  width: 180px;
  height: 180px;
  transform: rotate(-90deg);
  pointer-events: auto;
}

.donut-svg circle {
  transition: stroke-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  stroke-width: 16;
}

.donut-svg circle.segment-active {
  stroke-width: 20;
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.3));
}

[data-theme="dark"] .donut-svg circle.segment-active {
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.15));
}

.donut-svg circle.segment-dimmed {
  opacity: 0.45;
}

.donut-hole {
  grid-area: 1 / 1;
  width: 116px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--surface-0);
  display: grid;
  place-items: center;
  align-content: center;
  transition: background var(--transition-base);
  z-index: 1;
  pointer-events: none;
}

.hole-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  padding: 0 var(--space-2);
}

.donut-hole span {
  font-weight: 900;
  font-size: var(--fontsize-md);
  color: var(--text-primary);
}

.hover-title {
  font-weight: 700;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hover-value {
  font-weight: 800;
  font-size: var(--fontsize-xs);
  color: var(--primary-color, var(--yellow-500));
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
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: transform 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
}

.legend-row:hover,
.legend-row.legend-active {
  background-color: var(--surface-2, rgba(0, 0, 0, 0.03));
  transform: translateX(4px);
}

[data-theme="dark"] .legend-row:hover,
[data-theme="dark"] .legend-row.legend-active {
  background-color: rgba(255, 255, 255, 0.05);
}

.legend-row.legend-dimmed {
  opacity: 0.45;
}

.category-name {
  color: var(--text-primary) !important;
  font-weight: 500;
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

.fade-quick-enter-active,
.fade-quick-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-quick-enter-from,
.fade-quick-leave-to {
  opacity: 0;
  transform: scale(0.95);
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
