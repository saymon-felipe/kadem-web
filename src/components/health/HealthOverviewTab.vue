<template>
  <div class="health-overview-tab">
    <HealthTrackingOverview :trackers="trackers" :widgets="widgets" :checkins="checkins" @view-tracking="$emit('view-tracking')" />
    <!-- Faixa de Métricas (KPI Ribbon) -->
    <HealthSummaryCards
      :next-due-category="nextDueSchedule"
      :next-due-at="nextDueAt"
      :due-label="dueLabel"
      :due-class="dueClass"
      :due-icon="dueIcon"
      :low-stock-count="lowStockCount"
      :total-supplies="supplies.length"
      :total-schedules="schedules.length"
      :total-events="events.length"
    />

    <!-- Grade 2-Colunas estilo Nexo Dashboard -->
    <div class="overview-grid">
      <!-- Coluna Esquerda: Operacional (Rotinas & Estoque) -->
      <div class="overview-col">
        <HealthUpcomingSchedules
          :schedules="schedules"
          :next-due-at="nextDueAt"
          :due-label="dueLabel"
          :schedule-due-class="scheduleDueClass"
          :schedule-due-icon="scheduleDueIcon"
          :frequency-label="frequencyLabel"
          :linked-supply-text="linkedSupplyText"
          @complete-schedule="$emit('complete-schedule', $event)"
          @view-objects="$emit('view-schedules')"
          @new-schedule="$emit('new-schedule')"
        />

        <HealthStockMonitor
          :supplies="supplies"
          :supply-balance="supplyBalance"
          :is-low-stock="isLowStock"
          :stock-percentage="stockPercentage"
          :format-number="formatNumber"
          :low-stock-count="lowStockCount"
          @quick-consume="$emit('quick-consume', $event)"
          @quick-receive="$emit('quick-receive', $event)"
          @view-objects="$emit('view-supplies')"
          @new-supply="$emit('new-supply')"
        />
      </div>

      <!-- Coluna Direita: Analítica (Aderência Donut & Atividade Recente) -->
      <div class="overview-col">
        <HealthStatusDonut
          :schedules="schedules"
          :supplies="supplies"
          :due-days="dueDays"
          :is-low-stock="isLowStock"
        />

        <HealthRecentEvents
          :events="events"
          :format-date="formatDate"
          :format-number="formatNumber"
          @view-timeline="$emit('view-timeline')"
          @new-event="$emit('new-event')"
        />
      </div>
    </div>
  </div>
</template>

<script>
import HealthSummaryCards from "./HealthSummaryCards.vue";
import HealthUpcomingSchedules from "./HealthUpcomingSchedules.vue";
import HealthStockMonitor from "./HealthStockMonitor.vue";
import HealthStatusDonut from "./HealthStatusDonut.vue";
import HealthRecentEvents from "./HealthRecentEvents.vue";
import HealthTrackingOverview from "./HealthTrackingOverview.vue";

export default {
  name: "HealthOverviewTab",
  components: {
    HealthSummaryCards,
    HealthUpcomingSchedules,
    HealthStockMonitor,
    HealthStatusDonut,
    HealthRecentEvents,
    HealthTrackingOverview,
  },
  props: {
    trackers: { type: Array, default: () => [] },
    widgets: { type: Array, default: () => [] },
    checkins: { type: Array, default: () => [] },
    schedules: {
      type: Array,
      default: () => [],
    },
    supplies: {
      type: Array,
      default: () => [],
    },
    events: {
      type: Array,
      default: () => [],
    },
    nextDueSchedule: {
      type: Object,
      default: null,
    },
    nextDueAt: {
      type: Function,
      required: true,
    },
    dueLabel: {
      type: Function,
      required: true,
    },
    dueDays: {
      type: Function,
      required: true,
    },
    dueClass: {
      type: String,
      default: "",
    },
    dueIcon: {
      type: String,
      default: "circle-check",
    },
    scheduleDueClass: {
      type: Function,
      required: true,
    },
    scheduleDueIcon: {
      type: Function,
      required: true,
    },
    frequencyLabel: {
      type: Function,
      required: true,
    },
    linkedSupplyText: {
      type: Function,
      required: true,
    },
    supplyBalance: {
      type: Function,
      required: true,
    },
    isLowStock: {
      type: Function,
      required: true,
    },
    stockPercentage: {
      type: Function,
      required: true,
    },
    lowStockCount: {
      type: Number,
      default: 0,
    },
    formatNumber: {
      type: Function,
      required: true,
    },
    formatDate: {
      type: Function,
      required: true,
    },
  },
  emits: [
    "complete-schedule",
    "quick-consume",
    "quick-receive",
    "view-schedules",
    "view-supplies",
    "view-timeline",
    "new-schedule",
    "new-supply",
    "new-event",
    "view-tracking",
  ],
};
</script>

<style scoped>
.health-overview-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1.15fr) minmax(280px, 0.85fr);
  gap: var(--space-4);
  align-items: start;
}

.overview-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

@media (max-width: 960px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
