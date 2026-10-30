<template>
  <div class="list-view custom-scrollbar">
    <section v-if="overdue.length" class="group group--overdue">
      <header class="group-header">
        <font-awesome-icon icon="triangle-exclamation" class="group-icon text-danger" />
        <div class="group-header-text">
          <h3>Atrasados</h3>
          <span class="count-badge danger">{{ overdue.length }} {{ overdue.length === 1 ? "compromisso" : "compromissos" }}</span>
        </div>
      </header>
      <ul class="items-list">
        <li v-for="item in overdue" :key="item.key">
          <button type="button" class="list-card is-overdue" :style="{ '--src': color(item.source) }" @click="$emit('open-item', item)">
            <span class="card-time danger-time">{{ shortDate(item.span.start) }}</span>
            <span class="card-body">
              <span class="card-top-row">
                <strong class="card-title">{{ item.title }}</strong>
                <span v-if="item.source === 'health'" class="source-tag" :style="{ '--src': color(item.source) }">
                  <span class="source-dot" aria-hidden="true"></span>
                  <span>{{ sourceLabel(item.source) }}</span>
                </span>
              </span>
              <span v-if="item.location" class="card-meta">
                <font-awesome-icon icon="location-dot" class="meta-icon" />
                <span>{{ item.location }}</span>
              </span>
            </span>
            <font-awesome-icon icon="chevron-right" class="card-arrow" />
          </button>
        </li>
      </ul>
    </section>

    <section v-for="group in groups" :key="group.key" class="group">
      <header class="group-header">
        <font-awesome-icon icon="calendar-check" class="group-icon" />
        <div class="group-header-text">
          <h3>{{ group.label }}</h3>
          <span class="count-badge neutral">{{ group.items.length }}</span>
        </div>
      </header>
      <ul class="items-list">
        <li v-for="item in group.items" :key="item.key">
          <button
            type="button"
            class="list-card"
            :class="`state-${item.state || 'none'}`"
            :style="{ '--src': color(item.source) }"
            @click="$emit('open-item', item)"
          >
            <span class="card-time" :class="{ 'is-allday': item.span.allDay }">
              {{ item.span.allDay ? "Dia todo" : time(item.span.start) }}
            </span>
            <span class="card-body">
              <span class="card-top-row">
                <strong class="card-title">{{ item.title }}</strong>
                <span v-if="item.source === 'health'" class="source-tag" :style="{ '--src': color(item.source) }">
                  <span class="source-dot" aria-hidden="true"></span>
                  <span>{{ sourceLabel(item.source) }}</span>
                </span>
              </span>
              <span v-if="item.location" class="card-meta">
                <font-awesome-icon icon="location-dot" class="meta-icon" />
                <span>{{ item.location }}</span>
              </span>
            </span>
            <font-awesome-icon icon="chevron-right" class="card-arrow" />
          </button>
        </li>
      </ul>
    </section>

    <div v-if="!groups.length && !overdue.length" class="empty-state-card">
      <div class="empty-icon-circle">
        <font-awesome-icon icon="calendar-days" />
      </div>
      <h4>Nenhum compromisso próximo</h4>
      <p>Não há compromissos agendados para os próximos {{ days }} dias.</p>
      <button type="button" class="primary-action-btn" @click="$emit('create')">
        <font-awesome-icon icon="plus" />
        <span>Criar compromisso</span>
      </button>
    </div>

    <div v-else class="more-container">
      <button type="button" class="load-more-btn" @click="$emit('load-more')">
        <font-awesome-icon icon="chevron-down" />
        <span>Ver mais dias</span>
      </button>
    </div>
  </div>
</template>

<script>
import { SOURCE_COLORS, SOURCE_LABELS, addDays, capitalizeFirst, dayKey, formatTime, isSameDay, itemsForDay, startOfDay } from "@/utils/agendaCalendar";

export default {
  name: "AgendaListView",
  props: {
    items: { type: Array, default: () => [] },
    today: { type: Date, required: true },
    days: { type: Number, default: 60 },
  },
  emits: ["open-item", "load-more", "create"],
  computed: {
    overdue() {
      const start = startOfDay(this.today);
      return this.items
        .filter((item) => item.state === "overdue" && item.span.start < start)
        .sort((left, right) => left.span.start - right.span.start);
    },
    groups() {
      const groups = [];
      for (let offset = 0; offset < this.days; offset += 1) {
        const date = addDays(startOfDay(this.today), offset);
        const dayItems = itemsForDay(this.items, date);
        if (dayItems.length) groups.push({ key: dayKey(date), label: this.dayLabel(date), items: dayItems });
      }
      return groups;
    },
  },
  methods: {
    color: (source) => SOURCE_COLORS[source] || SOURCE_COLORS.manual,
    sourceLabel: (source) => SOURCE_LABELS[source] || SOURCE_LABELS.manual,
    time: (date) => formatTime(date),
    shortDate: (date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date),
    dayLabel(date) {
      const formatted = capitalizeFirst(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date));
      if (isSameDay(date, this.today)) return `Hoje · ${formatted}`;
      if (isSameDay(date, addDays(this.today, 1))) return `Amanhã · ${formatted}`;
      return formatted;
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   VISUALIZAÇÃO EM LISTA DE COMPROMISSOS
   ========================================================================== */
.list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: var(--space-2);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 4px 2px;
}

.group-icon {
  font-size: 0.95rem;
  color: var(--color-info);
}

.group-icon.text-danger {
  color: var(--color-expense, #d64a2e);
}

.group-header-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.group-header-text h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text-primary);
}

.group--overdue .group-header-text h3 {
  color: var(--color-expense, #d64a2e);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  font-size: 0.68rem;
  font-weight: 700;
}

.count-badge.neutral {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.count-badge.danger {
  background: rgba(214, 74, 46, 0.12);
  color: var(--color-expense, #d64a2e);
  border: 1px solid rgba(214, 74, 46, 0.28);
}

.items-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Card do Item na Lista */
.list-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: 12px var(--space-4);
  border: 1px solid var(--glass-border);
  border-left: 4px solid var(--src);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

[data-theme="dark"] .list-card {
  background: var(--surface-1);
}

.list-card:hover {
  transform: translateY(-1px);
  background: var(--surface-2);
  border-color: rgba(53, 90, 253, 0.35);
  box-shadow: var(--shadow-card);
}

.list-card:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

.list-card.is-overdue {
  border-color: rgba(214, 74, 46, 0.3);
  background: rgba(214, 74, 46, 0.04);
}

.card-time {
  flex: 0 0 76px;
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  text-align: center;
}

.card-time.is-allday {
  font-size: 0.72rem;
  color: var(--color-info);
  background: rgba(53, 90, 253, 0.08);
}

.card-time.danger-time {
  color: var(--color-expense, #d64a2e);
  background: rgba(214, 74, 46, 0.12);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}

.card-top-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex-wrap: wrap;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 0.68rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--src) 12%, transparent);
  color: var(--text-secondary);
  border: 1px solid color-mix(in srgb, var(--src) 25%, transparent);
}

.source-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--src);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.meta-icon {
  font-size: 0.72rem;
}

.card-arrow {
  color: var(--text-muted);
  font-size: 0.8rem;
  opacity: 0.55;
  flex-shrink: 0;
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.list-card:hover .card-arrow {
  transform: translateX(2px);
  opacity: 1;
  color: var(--color-info);
}

.list-card.state-done .card-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.list-card.state-projected {
  opacity: 0.75;
  border-left-style: dashed;
}

/* ==========================================================================
   ESTADO VAZIO & CARREGAR MAIS
   ========================================================================== */
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  text-align: center;
  margin: var(--space-4) 0;
}

.empty-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.empty-state-card h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  max-width: 380px;
}

.primary-action-btn {
  margin-top: var(--space-3);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: #ffffff;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.28);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.primary-action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.more-container {
  display: flex;
  justify-content: center;
  padding: var(--space-4) 0 var(--space-6);
}

.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .list-card,
  .primary-action-btn,
  .load-more-btn {
    transition: none !important;
    transform: none !important;
  }
}
</style>
