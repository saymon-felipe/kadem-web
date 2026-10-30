<template>
  <div class="month">
    <div class="month-grid-wrap">
      <div class="month-weekdays" aria-hidden="true">
        <span v-for="label in WEEKDAY_LABELS" :key="label">{{ label }}</span>
      </div>
      <div ref="gridRef" class="month-grid" role="group" :aria-label="monthLabel">
        <div
          v-for="cell in cells"
          :key="cell.key"
          class="month-cell"
          :class="{
            'is-other-month': !cell.inMonth,
            'is-today': cell.isToday,
            'is-selected': cell.isSelected,
          }"
          @click="$emit('open-day', cell.date)"
          @dblclick="$emit('create-day', cell.date)"
        >
          <div class="cell-head">
            <button
              type="button"
              class="month-day"
              :class="{ 'today-badge': cell.isToday }"
              :aria-label="cell.label"
              :aria-pressed="cell.isSelected"
              @click.stop="$emit('open-day', cell.date)"
            >
              {{ cell.date.getDate() }}
            </button>
            <button
              type="button"
              class="cell-add-quick-btn"
              title="Novo compromisso neste dia"
              aria-label="Novo compromisso neste dia"
              @click.stop="$emit('create-day', cell.date)"
            >
              <font-awesome-icon icon="plus" />
            </button>
          </div>

          <ul class="month-chips">
            <li v-for="item in cell.visible" :key="item.key">
              <button
                type="button"
                class="chip"
                :class="[`state-${item.state || 'none'}`, { 'is-all-day': item.span.allDay }]"
                :style="{ '--src': color(item.source) }"
                :title="`${item.span.allDay ? 'Dia todo' : time(item.span.start)} - ${item.title}`"
                @click.stop="$emit('open-item', item)"
              >
                <span v-if="!item.span.allDay" class="chip-dot" aria-hidden="true"></span>
                <span v-if="!item.span.allDay" class="chip-time">{{ time(item.span.start) }}</span>
                <span class="chip-title">{{ item.title }}</span>
              </button>
            </li>
          </ul>

          <button
            v-if="cell.hidden"
            type="button"
            class="month-more-btn"
            :title="`Ver todos os ${cell.allItems.length} compromissos`"
            @click.stop="$emit('open-day', cell.date)"
          >
            +{{ cell.hidden }} mais
          </button>

          <span class="month-dots" aria-hidden="true">
            <i v-for="item in cell.dots" :key="item.key" :style="{ '--src': color(item.source) }"></i>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  SOURCE_COLORS,
  SOURCE_LABELS,
  dayKey,
  formatTime,
  isSameDay,
  itemsForDay,
  monthGrid,
} from "@/utils/agendaCalendar";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default {
  name: "AgendaMonthView",
  props: {
    anchor: { type: Date, required: true },
    items: { type: Array, default: () => [] },
    selectedDay: { type: Date, required: true },
    today: { type: Date, required: true },
  },
  emits: ["select-day", "open-day", "open-item", "create-day"],
  data() {
    return {
      WEEKDAY_LABELS,
      gridHeight: 0,
      gridObserver: null,
    };
  },
  computed: {
    monthLabel() {
      return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(this.anchor);
    },
    rowHeight() {
      return this.gridHeight > 0 ? this.gridHeight / 6 : 95;
    },
    capacity() {
      // Espaço vertical da célula: subtrai cabeçalho do dia (~24px) + margem (2px) + padding vertical (8px) = 34px
      const available = Math.max(0, this.rowHeight - 34);
      const chipSlot = 22; // 20px de altura do chip + 2px de gap
      const moreBtnSlot = 20; // 18px de altura do botão + 2px de gap

      // Quantos chips cabem diretamente sem necessidade de botão de estouro (+N):
      const maxDirect = Math.max(1, Math.floor(available / chipSlot));
      // Quantos chips cabem quando precisa reservar espaço para o botão +N:
      const maxWithMore = Math.max(1, Math.floor((available - moreBtnSlot) / chipSlot));

      return { maxDirect, maxWithMore };
    },
    cells() {
      const { maxDirect, maxWithMore } = this.capacity;
      return monthGrid(this.anchor).map((date) => {
        const dayItems = itemsForDay(this.items, date);
        const hasOverflow = dayItems.length > maxDirect;
        const visibleCount = hasOverflow ? maxWithMore : dayItems.length;
        return {
          key: dayKey(date),
          date,
          label: `${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date)}${
            dayItems.length ? `, ${dayItems.length} ${dayItems.length === 1 ? "compromisso" : "compromissos"}` : ""
          }`,
          inMonth: date.getMonth() === this.anchor.getMonth(),
          isToday: isSameDay(date, this.today),
          isSelected: isSameDay(date, this.selectedDay),
          allItems: dayItems,
          visible: dayItems.slice(0, visibleCount),
          hidden: hasOverflow ? dayItems.length - visibleCount : 0,
          dots: dayItems.slice(0, 4),
        };
      });
    },
  },
  mounted() {
    if (typeof ResizeObserver !== "undefined" && this.$refs.gridRef) {
      this.gridObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            this.gridHeight = entry.contentRect.height;
          }
        }
      });
      this.gridObserver.observe(this.$refs.gridRef);
    }
  },
  beforeUnmount() {
    if (this.gridObserver) {
      this.gridObserver.disconnect();
      this.gridObserver = null;
    }
  },
  methods: {
    color: (source) => SOURCE_COLORS[source] || SOURCE_COLORS.manual,
    sourceLabel: (source) => SOURCE_LABELS[source] || SOURCE_LABELS.manual,
    time: (date) => (date ? formatTime(date instanceof Date ? date : new Date(date)) : ""),
  },
};
</script>

<style scoped>
/* ==========================================================================
   VISUALIZAÇÃO EM MÊS - TELA CHEIA (FULLSCREEN)
   ========================================================================== */
.month {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  flex: 1 1 0;
  container-type: inline-size;
}

/* ==========================================================================
   GRADE DO MÊS
   ========================================================================== */
.month-grid-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.month-weekdays,
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.month-weekdays {
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-2);
  backdrop-filter: blur(8px);
  flex: 0 0 auto;
}

.month-weekdays span {
  padding: 10px var(--space-3);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-align: center;
}

.month-grid {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  grid-template-rows: repeat(6, 1fr);
}

.month-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 4px 6px 4px;
  border-right: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  cursor: pointer;
  overflow: hidden;
  transition: background var(--transition-fast);
}

.month-cell:nth-child(7n) {
  border-right: 0;
}

.month-cell:nth-last-child(-n + 7) {
  border-bottom: 0;
}

.month-cell:hover {
  background: var(--surface-2);
}

.month-cell.is-other-month {
  background: color-mix(in srgb, var(--surface-2) 35%, transparent);
}

.month-cell.is-other-month .month-day {
  color: var(--text-muted);
  opacity: 0.5;
}

.month-cell.is-today {
  background: color-mix(in srgb, var(--color-info) 5%, var(--surface-1));
}

.month-cell.is-selected {
  box-shadow: inset 0 0 0 1.5px var(--color-info);
}

/* Cabeçalho da célula: número do dia + botão rápido de adicionar */
.cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 24px;
  margin-bottom: 2px;
}

.month-day {
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.month-day:hover:not(.today-badge) {
  background: var(--surface-3);
}

.month-day:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

.month-day.today-badge {
  background: var(--color-info);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(53, 90, 253, 0.35);
}

.cell-add-quick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.68rem;
  opacity: 0;
  cursor: pointer;
  transition:
    opacity var(--transition-fast),
    background var(--transition-fast),
    color var(--transition-fast);
}

.month-cell:hover .cell-add-quick-btn {
  opacity: 1;
}

.cell-add-quick-btn:hover {
  background: var(--surface-3);
  color: var(--color-info);
}

/* ==========================================================================
   CHIPS DE EVENTOS NA CÉLULA DO MÊS (GOOGLE CALENDAR STYLE)
   ========================================================================== */
.month-chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.month-chips li {
  margin: 0;
  padding: 0;
}

.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  min-width: 0;
  height: 20px;
  padding: 0 6px;
  border: 1px solid color-mix(in srgb, var(--src) 24%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--src) 12%, var(--surface-2));
  color: var(--text-primary);
  font: inherit;
  font-size: 0.72rem;
  line-height: 1;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.chip:hover {
  background: color-mix(in srgb, var(--src) 22%, var(--surface-2));
  border-color: var(--src);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.chip.is-all-day {
  background: var(--src);
  border-color: transparent;
  color: #ffffff;
  font-weight: 600;
}

.chip.is-all-day:hover {
  filter: brightness(1.1);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--src) 40%, transparent);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--src);
  flex-shrink: 0;
}

.chip-time {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.chip:hover .chip-time {
  color: var(--text-primary);
}

.chip-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.chip.state-done .chip-title {
  text-decoration: line-through;
  opacity: 0.55;
}

.chip.state-projected {
  border-style: dashed;
  opacity: 0.75;
}

.chip.state-overdue {
  border-color: var(--red);
  box-shadow: inset 0 0 0 1px var(--red);
}

/* Botão "+X mais" estilo Google Calendar */
.month-more-btn {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: 1px;
}

.month-more-btn:hover {
  background: var(--surface-3);
  color: var(--color-info);
}

.month-dots {
  display: none;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 2px;
}

.month-dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--src);
  box-shadow: 0 0 4px color-mix(in srgb, var(--src) 50%, transparent);
}

/* ==========================================================================
   CONTAINER QUERIES / RESPONSIVIDADE NARROW
   ========================================================================== */
@container (max-width: 640px) {
  .month-chips,
  .month-more-btn,
  .cell-add-quick-btn {
    display: none;
  }

  .month-dots {
    display: flex;
  }

  .month-cell {
    align-items: center;
    padding: 4px;
  }

  .month-day {
    align-self: center;
  }

  .month-weekdays span {
    padding: 8px 0;
    font-size: 0.68rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .month-cell,
  .chip {
    transition: none !important;
  }
}
</style>
