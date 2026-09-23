<template>
  <section class="panel recent-events-panel">
    <div class="panel-title">
      <div class="title-group">
        <h3>Atividade Recente</h3>
        <span v-if="events.length" class="count-badge">{{ events.length }}</span>
      </div>
      <button class="text-btn" type="button" @click="$emit('view-timeline')">
        Ver linha do tempo
      </button>
    </div>

    <div v-if="!events.length" class="empty-panel">
      <font-awesome-icon icon="clipboard-list" class="empty-icon" />
      <p>Nenhuma atividade ou registro recente.</p>
      <button class="subtle-btn" type="button" @click="$emit('new-event')">
        <font-awesome-icon icon="plus" />
        <span>Fazer primeiro registro</span>
      </button>
    </div>

    <div v-else class="compact-events-list custom-scrollbar">
      <article
        v-for="event in events.slice(0, 7)"
        :key="event.local_key"
        class="recent-event-row"
        :class="eventClass(event)"
      >
        <div class="event-icon-wrap" :class="eventClass(event)">
          <font-awesome-icon :icon="eventIcon(event)" />
        </div>

        <div class="event-copy">
          <strong class="event-title" :title="event.title">{{ event.title }}</strong>
          <span class="event-meta">
            {{ eventTypeLabel(event) }} · {{ formatDate(event.occurred_at) }}
          </span>
          <p v-if="event.notes" class="event-notes" :title="event.notes">{{ event.notes }}</p>
        </div>

        <div class="event-side">
          <span
            v-if="event.quantity !== null && event.quantity !== undefined"
            class="event-qty-pill"
            :class="qtyClass(event)"
          >
            {{ qtyPrefix(event) }}{{ formatNumber(event.quantity) }}
            <small v-if="event.metadata?.unit">{{ event.metadata.unit }}</small>
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: "HealthRecentEvents",
  props: {
    events: {
      type: Array,
      default: () => [],
    },
    formatDate: {
      type: Function,
      required: true,
    },
    formatNumber: {
      type: Function,
      default: (val) => val,
    },
  },
  emits: ["view-timeline", "new-event"],
  methods: {
    eventTypeLabel(event) {
      const labels = {
        SCHEDULE_COMPLETED: "Rotina Concluída",
        SUPPLY_RECEIVED: "Entrada em Estoque",
        SUPPLY_CONSUMED: "Consumo / Baixa",
        SUPPLY_ADJUSTED: "Ajuste de Estoque",
        OBSERVATION: "Anotação / Sintoma",
      };
      return labels[event.event_type] || "Registro";
    },
    eventIcon(event) {
      const icons = {
        SCHEDULE_COMPLETED: "check",
        SUPPLY_RECEIVED: "plus",
        SUPPLY_CONSUMED: "arrow-down",
        SUPPLY_ADJUSTED: "sliders",
        OBSERVATION: "clipboard",
      };
      return icons[event.event_type] || "heart-pulse";
    },
    eventClass(event) {
      const classes = {
        SCHEDULE_COMPLETED: "event-completed",
        SUPPLY_RECEIVED: "event-received",
        SUPPLY_CONSUMED: "event-consumed",
        SUPPLY_ADJUSTED: "event-adjusted",
        OBSERVATION: "event-observation",
      };
      return classes[event.event_type] || "event-default";
    },
    qtyClass(event) {
      if (event.event_type === "SUPPLY_RECEIVED") return "qty-positive";
      if (event.event_type === "SUPPLY_CONSUMED") return "qty-negative";
      return "qty-neutral";
    },
    qtyPrefix(event) {
      if (event.event_type === "SUPPLY_RECEIVED") return "+";
      if (event.event_type === "SUPPLY_CONSUMED") return "-";
      return "";
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
  min-height: 280px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-group h3 {
  margin: 0;
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.count-badge {
  background: rgba(141, 95, 211, 0.14);
  color: #8d5fd3;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 4px;
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.text-btn:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.6;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.empty-panel p {
  margin: 0 0 var(--space-3);
  font-size: var(--fontsize-xs);
}

.subtle-btn {
  background: var(--surface-2);
  border: 1px dashed var(--glass-border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.subtle-btn:hover {
  background: var(--surface-3);
  border-color: #8d5fd3;
}

.compact-events-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.recent-event-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.recent-event-row:hover {
  background: var(--surface-2);
  transform: translateY(-1px);
}

.event-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  flex-shrink: 0;
  background: var(--surface-2);
  color: var(--text-secondary);
}

.event-icon-wrap.event-completed {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.event-icon-wrap.event-received {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.event-icon-wrap.event-consumed {
  background: rgba(226, 83, 115, 0.15);
  color: #e25373;
}

.event-icon-wrap.event-adjusted {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.event-icon-wrap.event-observation {
  background: rgba(141, 95, 211, 0.15);
  color: #8d5fd3;
}

.event-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.event-notes {
  margin: 1px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-side {
  flex-shrink: 0;
}

.event-qty-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-xs);
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  white-space: nowrap;
}

.event-qty-pill small {
  font-size: 0.65rem;
  font-weight: 600;
}

.qty-positive {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.qty-negative {
  background: rgba(226, 83, 115, 0.15);
  color: #e25373;
}

.qty-neutral {
  background: var(--surface-2);
  color: var(--text-secondary);
}
</style>
