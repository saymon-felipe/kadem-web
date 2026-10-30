<template>
  <div class="week" ref="root">
    <div class="week-scroll custom-scrollbar" ref="scroller">
      <div class="week-inner">
        <div class="week-sticky">
          <div class="week-head">
            <span class="week-gutter-head"><font-awesome-icon icon="clock" /></span>
            <div v-for="day in columns" :key="day.key" class="week-head-day" :class="{ 'is-today': day.isToday }">
              <small class="head-weekday">{{ day.weekday }}</small>
              <strong class="head-date" :class="{ 'today-badge': day.isToday }">{{ day.date.getDate() }}</strong>
            </div>
          </div>

          <div class="week-allday" :class="{ 'is-empty': !hasAllDay }">
            <span class="week-gutter allday-label">Dia todo</span>
            <div v-for="day in columns" :key="day.key" class="week-allday-cell" @dblclick="$emit('create-day', day.date)">
              <button
                v-for="item in day.allDay"
                :key="item.key"
                type="button"
                class="allday-chip"
                :style="{ '--src': color(item.source) }"
                :title="item.title"
                @click="$emit('open-item', item)"
              >
                {{ item.title }}
              </button>
            </div>
          </div>
        </div>

        <div class="week-body" :style="{ height: `${HOUR_PX * 24}px` }">
          <div class="week-gutter week-hours" aria-hidden="true">
            <span v-for="hour in 24" :key="hour" :style="{ top: `${(hour - 1) * HOUR_PX}px` }">
              {{ hour > 1 ? `${String(hour - 1).padStart(2, "0")}:00` : "" }}
            </span>
          </div>
          <div
            v-for="day in columns"
            :key="day.key"
            class="week-col"
            :class="{ 'is-today': day.isToday }"
            @click.self="createAt(day.date, $event)"
          >
            <div v-for="line in 24" :key="line" class="week-line" :style="{ top: `${(line - 1) * HOUR_PX}px` }"></div>
            <button
              v-for="block in day.blocks"
              :key="block.item.key"
              type="button"
              class="week-block"
              :class="[`state-${block.item.state || 'none'}`, { 'is-short': isShort(block) }]"
              :style="blockStyle(block)"
              :title="`${block.item.title}`"
              @click.stop="$emit('open-item', block.item)"
            >
              <strong class="block-title">{{ block.item.title }}</strong>
              <span class="block-time">{{ time(block.item.span.start) }}</span>
            </button>
            <div v-if="day.isToday" class="week-now" :style="{ top: `${nowOffset}px` }">
              <span class="now-pulse-dot" aria-hidden="true"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  SOURCE_COLORS,
  dayKey,
  formatTime,
  isSameDay,
  itemsForDay,
  layoutDay,
  weekDays,
} from "@/utils/agendaCalendar";

const HOUR_PX = 52;

export default {
  name: "AgendaWeekView",
  props: {
    anchor: { type: Date, required: true },
    items: { type: Array, default: () => [] },
    today: { type: Date, required: true },
  },
  emits: ["open-item", "create-slot", "create-day"],
  data() {
    return { HOUR_PX, now: new Date(), timer: null };
  },
  computed: {
    columns() {
      return weekDays(this.anchor).map((date) => {
        const dayItems = itemsForDay(this.items, date);
        return {
          key: dayKey(date),
          date,
          isToday: isSameDay(date, this.today),
          weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
          allDay: dayItems.filter((item) => item.span.allDay),
          blocks: layoutDay(dayItems, date),
        };
      });
    },
    hasAllDay() {
      return this.columns.some((day) => day.allDay.length);
    },
    nowOffset() {
      return ((this.now.getHours() * 60 + this.now.getMinutes()) / 60) * HOUR_PX;
    },
  },
  mounted() {
    this.timer = setInterval(() => { this.now = new Date(); }, 60000);
    this.$nextTick(this.scrollToWorkday);
  },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  methods: {
    color: (source) => SOURCE_COLORS[source] || SOURCE_COLORS.manual,
    time: (date) => formatTime(date),

    scrollToWorkday() {
      const scroller = this.$refs.scroller;
      if (!scroller) return;
      const hour = this.columns.some((day) => day.isToday) ? Math.max(this.now.getHours() - 1, 0) : 7;
      scroller.scrollTop = hour * HOUR_PX;
    },

    // Blocos baixos (30 min) mostram título e hora na mesma linha para o título não ser cortado.
    isShort(block) {
      return ((block.bottom - block.top) / 60) * HOUR_PX < 40;
    },

    blockStyle(block) {
      const top = (block.top / 60) * HOUR_PX;
      const height = Math.max(((block.bottom - block.top) / 60) * HOUR_PX, 22);
      const width = 100 / block.columns;
      return {
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${block.column * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        "--src": this.color(block.item.source),
      };
    },

    // Clique em um espaço vazio da coluna cria um compromisso naquele meio de hora.
    createAt(date, event) {
      const minutes = Math.floor(event.offsetY / (HOUR_PX / 2)) * 30;
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, minutes);
      this.$emit("create-slot", start);
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   VISUALIZAÇÃO EM SEMANA & TIMELINE
   ========================================================================== */
.week {
  height: 100%;
  min-height: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.week-scroll {
  height: 100%;
  overflow: auto;
}

.week-inner {
  min-width: 680px;
}

.week-sticky {
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--surface-1);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}

.week-head,
.week-allday {
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(0, 1fr));
}

.week-head {
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-2);
}

.week-gutter-head {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.week-head-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  border-left: 1px solid var(--glass-border);
}

.head-weekday {
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.head-date {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-pill);
}

.head-date.today-badge {
  color: #ffffff;
  background: var(--color-info);
  box-shadow: 0 2px 8px rgba(53, 90, 253, 0.4);
}

/* Faixa de dia todo */
.week-allday {
  background: var(--surface-1);
  border-bottom: 1px solid var(--glass-border);
}

.week-allday.is-empty .week-allday-cell {
  min-height: 0;
}

.allday-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 6px 8px 0 0;
  text-align: right;
  letter-spacing: 0.04em;
}

.week-allday-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 28px;
  padding: 4px;
  border-left: 1px solid var(--glass-border);
}

.allday-chip {
  border: 0;
  border-radius: var(--radius-xs);
  padding: 2px 8px;
  background: var(--src);
  color: #ffffff;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.allday-chip:hover {
  transform: translateY(-0.5px);
  filter: brightness(1.08);
}

/* Corpo da grade (24 horas) */
.week-body {
  position: relative;
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(0, 1fr));
  background: var(--surface-0);
}

[data-theme="dark"] .week-body {
  background: var(--surface-1);
}

.week-hours {
  position: relative;
  background: var(--surface-1);
  border-right: 1px solid var(--glass-border);
}

.week-hours span {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.week-col {
  position: relative;
  border-left: 1px solid var(--glass-border);
  cursor: cell;
}

.week-col.is-today {
  background: color-mix(in srgb, var(--color-info) 4%, transparent);
}

.week-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid var(--glass-border);
  pointer-events: none;
}

/* Blocos de evento na timeline */
.week-block {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--src) 35%, transparent);
  border-left: 3px solid var(--src);
  border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--src) 16%, var(--surface-0));
  color: var(--text-primary);
  font: inherit;
  font-size: 0.74rem;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  z-index: 1;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    filter var(--transition-fast),
    box-shadow var(--transition-fast);
}

[data-theme="dark"] .week-block {
  background: color-mix(in srgb, var(--src) 24%, var(--surface-1));
}

.week-block:hover {
  z-index: 3;
  transform: scale(1.01);
  filter: brightness(1.08);
  box-shadow: var(--shadow-elevated);
}

.block-title {
  flex: 0 0 auto;
  max-width: 100%;
  font-size: 0.78rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-time {
  flex: 0 0 auto;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
}

.week-block.is-short {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.week-block.is-short .block-title {
  flex: 0 1 auto;
  min-width: 0;
}

.week-block.state-done .block-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.week-block.state-projected {
  border-left-style: dashed;
  opacity: 0.75;
}

.week-block.state-overdue {
  box-shadow: inset 0 0 0 1px var(--red);
}

/* Linha do horário atual */
.week-now {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--red);
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(214, 74, 46, 0.6);
}

.now-pulse-dot {
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 6px var(--red);
}

@media (prefers-reduced-motion: reduce) {
  .allday-chip,
  .week-block {
    transition: none !important;
    transform: none !important;
  }
}
</style>
