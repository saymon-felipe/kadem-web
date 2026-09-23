<template>
  <div class="health-activity-tab">
    <div class="activity-header">
      <div class="heading-copy">
        <span class="eyebrow">HISTÓRICO & AUDITORIA</span>
        <h3>Linha do Tempo de Eventos</h3>
      </div>

      <!-- Filtros e Ação -->
      <div class="header-actions">
        <div class="filter-pills" v-if="events.length">
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'ALL' }"
            type="button"
            @click="setFilter('ALL')"
          >
            Todos ({{ events.length }})
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'SCHEDULE' }"
            type="button"
            @click="setFilter('SCHEDULE')"
          >
            <font-awesome-icon icon="check" />
            <span>Rotinas ({{ scheduleEventsCount }})</span>
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'ENTRY' }"
            type="button"
            @click="setFilter('ENTRY')"
          >
            <font-awesome-icon icon="plus" />
            <span>Entradas ({{ entryEventsCount }})</span>
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'USAGE' }"
            type="button"
            @click="setFilter('USAGE')"
          >
            <font-awesome-icon icon="arrow-down" />
            <span>Consumos ({{ usageEventsCount }})</span>
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'NOTES' }"
            type="button"
            @click="setFilter('NOTES')"
          >
            <font-awesome-icon icon="clipboard" />
            <span>Anotações ({{ notesEventsCount }})</span>
          </button>
        </div>

        <button class="primary-action compact-btn" type="button" @click="$emit('new-event')">
          <font-awesome-icon icon="plus" />
          <span>Novo Evento</span>
        </button>
      </div>
    </div>

    <HealthEmptyState
      v-if="!filteredEvents.length"
      icon="clipboard"
      :title="emptyTitle"
      :text="emptyText"
      :action-label="emptyActionLabel"
      @action="handleEmptyAction"
    />

    <ol v-else class="timeline-list">
      <li
        v-for="event in filteredEvents"
        :key="event.local_key"
        class="timeline-item"
        :class="eventClass(event)"
      >
        <div class="timeline-badge" :class="eventClass(event)">
          <font-awesome-icon :icon="eventIcon(event)" />
        </div>
        <div class="timeline-card">
          <div class="timeline-top">
            <span class="timeline-type">{{ eventLabel(event) }}</span>
            <div class="timeline-meta">
              <time class="timeline-time">{{ formatDate(event.occurred_at) }}</time>
              <button
                class="delete-event-btn"
                type="button"
                title="Excluir movimentação"
                aria-label="Excluir movimentação"
                @click="$emit('delete-event', event)"
              >
                <font-awesome-icon icon="trash-can" />
              </button>
            </div>
          </div>
          <h4 class="timeline-title">{{ event.title }}</h4>
          <p v-if="event.notes" class="timeline-notes">{{ event.notes }}</p>
          <div v-if="event.quantity !== null && event.quantity !== undefined" class="timeline-qty-wrap">
            <span
              class="qty-tag"
              :class="qtyClass(event)"
            >
              {{ qtyPrefix(event) }}{{ formatNumber(event.quantity) }}
              <small v-if="event.metadata?.unit">{{ event.metadata.unit }}</small>
            </span>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script>
import HealthEmptyState from "./HealthEmptyState.vue";

export default {
  name: "HealthActivityTab",
  components: {
    HealthEmptyState,
  },
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
  emits: ["new-event", "delete-event"],
  data() {
    return {
      currentFilter: "ALL",
    };
  },
  computed: {
    scheduleEventsCount() {
      return this.events.filter((e) => e.event_type === "SCHEDULE_COMPLETED").length;
    },
    entryEventsCount() {
      return this.events.filter((e) => e.event_type === "SUPPLY_RECEIVED").length;
    },
    usageEventsCount() {
      return this.events.filter((e) => e.event_type === "SUPPLY_CONSUMED").length;
    },
    notesEventsCount() {
      return this.events.filter(
        (e) => ["OBSERVATION", "SUPPLY_ADJUSTED"].includes(e.event_type) || Boolean(e.notes),
      ).length;
    },
    filteredEvents() {
      if (this.currentFilter === "SCHEDULE") {
        return this.events.filter((e) => e.event_type === "SCHEDULE_COMPLETED");
      }
      if (this.currentFilter === "ENTRY") {
        return this.events.filter((e) => e.event_type === "SUPPLY_RECEIVED");
      }
      if (this.currentFilter === "USAGE") {
        return this.events.filter((e) => e.event_type === "SUPPLY_CONSUMED");
      }
      if (this.currentFilter === "NOTES") {
        return this.events.filter(
          (e) => ["OBSERVATION", "SUPPLY_ADJUSTED"].includes(e.event_type) || Boolean(e.notes),
        );
      }
      return this.events;
    },
    filterLabelName() {
      const map = {
        ALL: "Todos",
        SCHEDULE: "Rotinas",
        ENTRY: "Entradas",
        USAGE: "Consumos",
        NOTES: "Anotações",
      };
      return map[this.currentFilter] || "Filtro";
    },
    emptyTitle() {
      if (!this.events.length) return "Nenhum evento encontrado";
      return `Nenhum registro em '${this.filterLabelName}'`;
    },
    emptyText() {
      if (!this.events.length) {
        return "Eventos são a fonte de verdade do Health: rotinas concluídas, entradas e baixas aparecerão aqui.";
      }
      return `Não há registros nesta categoria. Você tem ${this.events.length} registro(s) na Linha do Tempo.`;
    },
    emptyActionLabel() {
      if (!this.events.length) return "Registrar Evento";
      return `Ver todos os eventos (${this.events.length})`;
    },
  },
  methods: {
    setFilter(filter) {
      if (this.currentFilter === filter) {
        this.currentFilter = "ALL";
      } else {
        this.currentFilter = filter;
      }
    },
    handleEmptyAction() {
      if (!this.events.length) {
        this.$emit("new-event");
      } else {
        this.currentFilter = "ALL";
      }
    },
    eventLabel(event) {
      return (
        {
          SCHEDULE_COMPLETED: "Rotina Concluída",
          SUPPLY_RECEIVED: "Entrada em Estoque",
          SUPPLY_CONSUMED: "Consumo / Baixa",
          SUPPLY_ADJUSTED: "Ajuste de Estoque",
          OBSERVATION: "Anotação / Sintoma",
        }[event.event_type] || "Evento"
      );
    },
    eventIcon(event) {
      return (
        {
          SCHEDULE_COMPLETED: "check",
          SUPPLY_RECEIVED: "plus",
          SUPPLY_CONSUMED: "arrow-down",
          SUPPLY_ADJUSTED: "sliders",
          OBSERVATION: "clipboard",
        }[event.event_type] || "heart-pulse"
      );
    },
    eventClass(event) {
      return (
        {
          SCHEDULE_COMPLETED: "is-schedule",
          SUPPLY_RECEIVED: "is-entry",
          SUPPLY_CONSUMED: "is-usage",
          SUPPLY_ADJUSTED: "is-adjusted",
          OBSERVATION: "is-observation",
        }[event.event_type] || "is-generic"
      );
    },
    qtyClass(event) {
      if (event.event_type === "SUPPLY_RECEIVED") return "tag-in";
      if (event.event_type === "SUPPLY_CONSUMED") return "tag-out";
      return "tag-neutral";
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
.health-activity-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.heading-copy h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.eyebrow {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e25373;
  margin-bottom: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--surface-1);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.filter-pill.active {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(226, 83, 115, 0.3);
}

.primary-action.compact-btn {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 10px rgba(226, 83, 115, 0.2);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.primary-action.compact-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.timeline-list::before {
  content: "";
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 17px;
  width: 2px;
  background: var(--glass-border);
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.timeline-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  flex-shrink: 0;
  z-index: 1;
  background: var(--surface-1);
  border: 2px solid var(--glass-border);
}

.timeline-badge.is-schedule {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border-color: #10b981;
}

.timeline-badge.is-entry {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border-color: #3b82f6;
}

.timeline-badge.is-usage {
  background: rgba(226, 83, 115, 0.15);
  color: #e25373;
  border-color: #e25373;
}

.timeline-badge.is-adjusted {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border-color: #d97706;
}

.timeline-badge.is-observation {
  background: rgba(141, 95, 211, 0.15);
  color: #8d5fd3;
  border-color: #8d5fd3;
}

.timeline-card {
  flex-grow: 1;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.timeline-card:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-sm);
}

.timeline-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeline-type {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.timeline-item.is-schedule .timeline-type {
  color: #10b981;
}

.timeline-item.is-entry .timeline-type {
  color: #3b82f6;
}

.timeline-item.is-usage .timeline-type {
  color: #e25373;
}

.timeline-item.is-adjusted .timeline-type {
  color: #d97706;
}

.timeline-item.is-observation .timeline-type {
  color: #8d5fd3;
}

.timeline-time {
  font-size: 0.76rem;
  font-weight: 500;
  color: var(--text-muted);
}

.timeline-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.delete-event-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.delete-event-btn:hover,
.delete-event-btn:focus-visible {
  color: #e25373;
  border-color: rgba(226, 83, 115, 0.35);
  background: rgba(226, 83, 115, 0.1);
}

.timeline-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.timeline-notes {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.timeline-qty-wrap {
  margin-top: var(--space-2);
}

.qty-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.76rem;
  font-weight: 700;
}

.qty-tag small {
  font-size: 0.68rem;
  font-weight: 600;
}

.tag-in {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.tag-out {
  background: rgba(226, 83, 115, 0.15);
  color: #e25373;
}

.tag-neutral {
  background: var(--surface-2);
  color: var(--text-secondary);
}
</style>
