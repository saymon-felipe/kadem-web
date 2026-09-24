<template>
  <section class="panel status-donut-panel">
    <div class="panel-title">
      <h3>Aderência & Balanço</h3>
    </div>

    <div class="donut-body">
      <div class="donut-wrap">
        <svg viewBox="0 0 100 100" class="donut-svg">
          <circle
            v-if="totalItems === 0"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--surface-2)"
            stroke-width="14"
          />
          <template v-else>
            <circle
              v-for="segment in segments"
              :key="segment.key"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              :stroke="segment.color"
              :stroke-dasharray="segment.dashArray"
              :stroke-dashoffset="segment.dashOffset"
              stroke-width="14"
              class="donut-segment"
              :class="{
                'is-active': hoveredKey === segment.key,
                'is-dimmed': hoveredKey && hoveredKey !== segment.key,
              }"
              @mouseenter="hoveredKey = segment.key"
              @mouseleave="hoveredKey = null"
            >
              <title>{{ segment.label }}: {{ segment.count }} ({{ segment.percentage }}%)</title>
            </circle>
          </template>
        </svg>

        <div class="donut-hole">
          <Transition name="fade-quick" mode="out-in">
            <div :key="hoveredKey || 'default'" class="hole-content">
              <template v-if="hoveredSegment">
                <span class="hover-label">{{ hoveredSegment.label }}</span>
                <strong class="hover-val">{{ hoveredSegment.count }}</strong>
              </template>
              <template v-else>
                <strong class="hole-percent">{{ adherenceRate === null ? "—" : `${adherenceRate}%` }}</strong>
                <span class="hole-sub">{{ adherenceLabel }}</span>
              </template>
            </div>
          </Transition>
        </div>
      </div>

      <div class="legend-list">
        <div
          v-for="seg in segments"
          :key="seg.key"
          class="legend-item"
          :class="{ 'is-hovered': hoveredKey === seg.key }"
          @mouseenter="hoveredKey = seg.key"
          @mouseleave="hoveredKey = null"
        >
          <span class="swatch" :style="{ backgroundColor: seg.color }"></span>
          <span class="legend-name">{{ seg.label }}</span>
          <strong class="legend-val">{{ seg.count }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "HealthStatusDonut",
  props: {
    schedules: {
      type: Array,
      default: () => [],
    },
    supplies: {
      type: Array,
      default: () => [],
    },
    dueDays: {
      type: Function,
      required: true,
    },
    isLowStock: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      hoveredKey: null,
    };
  },
  computed: {
    overdueSchedules() {
      return this.schedules.filter((s) => {
        const days = this.dueDays(s);
        return days !== null && days < 0;
      });
    },
    onTrackSchedules() {
      return this.schedules.filter((s) => {
        const days = this.dueDays(s);
        return days === null || days >= 0;
      });
    },
    lowStockSupplies() {
      return this.supplies.filter((s) => this.isLowStock(s));
    },
    healthySupplies() {
      return this.supplies.filter((s) => !this.isLowStock(s));
    },
    totalItems() {
      return this.schedules.length + this.supplies.length;
    },
    adherenceRate() {
      if (!this.schedules.length) return null;
      const onTrack = this.onTrackSchedules.length;
      return Math.round((onTrack / this.schedules.length) * 100);
    },
    adherenceLabel() {
      if (!this.schedules.length) return this.supplies.length ? "Sem rotinas" : "Sem dados";
      if (this.adherenceRate === 100) return "Tudo em dia";
      if (this.adherenceRate >= 70) return "Bom ritmo";
      return "Atenção";
    },
    hoveredSegment() {
      return this.segments.find((s) => s.key === this.hoveredKey) || null;
    },
    segments() {
      const raw = [
        { key: "on_track", label: "Rotinas em dia", count: this.onTrackSchedules.length, color: "#10b981" },
        { key: "overdue", label: "Rotinas atrasadas", count: this.overdueSchedules.length, color: "#ef4444" },
        { key: "healthy_supplies", label: "Insumos normais", count: this.healthySupplies.length, color: "#3b82f6" },
        { key: "low_supplies", label: "Insumos em alerta", count: this.lowStockSupplies.length, color: "#f59e0b" },
      ].filter((item) => item.count > 0);

      const total = raw.reduce((sum, item) => sum + item.count, 0);
      if (total === 0) return [];

      const circumference = 2 * Math.PI * 40; // ~251.327
      let accumulatedPercent = 0;

      return raw.map((item) => {
        const percent = item.count / total;
        const dashArray = `${percent * circumference} ${circumference}`;
        const dashOffset = -(accumulatedPercent * circumference);
        accumulatedPercent += percent;

        return {
          ...item,
          percentage: Math.round(percent * 100),
          dashArray,
          dashOffset,
        };
      });
    },
  },
};
</script>

<style scoped>
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
}

.panel-title h3 {
  margin: 0;
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.donut-body {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.donut-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-segment {
  cursor: pointer;
  transition: opacity var(--transition-fast), stroke-width var(--transition-fast);
}

.donut-segment.is-active {
  stroke-width: 17;
  opacity: 1;
}

.donut-segment.is-dimmed {
  opacity: 0.35;
}

.donut-hole {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.hole-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hole-percent {
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1.1;
  color: var(--text-primary);
}

.hole-sub {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hover-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hover-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
}

.legend-list {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.legend-item:hover,
.legend-item.is-hovered {
  background: var(--surface-2);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  font-size: 0.76rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-val {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.fade-quick-enter-active,
.fade-quick-leave-active {
  transition: opacity 0.12s ease;
}

.fade-quick-enter-from,
.fade-quick-leave-to {
  opacity: 0;
}

@media (max-width: 500px) {
  .donut-body {
    flex-direction: column;
  }
}
</style>
