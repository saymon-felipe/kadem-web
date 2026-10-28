<template>
  <div class="month-panel-body">
    <header class="panel-head">
      <button
        type="button"
        class="nav-btn"
        :title="view === 'months' ? 'Ano anterior' : 'Anos anteriores'"
        :aria-label="view === 'months' ? 'Ano anterior' : 'Anos anteriores'"
        :disabled="!canShiftView(-1)"
        @click="shiftView(-1)"
      >
        <font-awesome-icon icon="chevron-left" />
      </button>
      <button
        type="button"
        class="panel-title"
        :title="view === 'months' ? 'Escolher outro ano' : 'Voltar aos meses'"
        @click="toggleView"
      >
        <span>{{ view === "months" ? viewYear : `${yearStart} – ${yearStart + 11}` }}</span>
        <font-awesome-icon icon="chevron-down" class="title-caret" :class="{ up: view === 'years' }" />
      </button>
      <button
        type="button"
        class="nav-btn"
        :title="view === 'months' ? 'Próximo ano' : 'Próximos anos'"
        :aria-label="view === 'months' ? 'Próximo ano' : 'Próximos anos'"
        :disabled="!canShiftView(1)"
        @click="shiftView(1)"
      >
        <font-awesome-icon icon="chevron-right" />
      </button>
    </header>

    <div class="grid-viewport">
      <Transition :name="gridSlideName" mode="out-in">
        <div v-if="view === 'months'" :key="`months-${viewYear}`" class="cell-grid">
          <button
            v-for="(name, index) in shortMonths"
            :key="name"
            type="button"
            class="cell"
            :class="{
              selected: monthKey(viewYear, index) === value,
              current: monthKey(viewYear, index) === currentMonth,
            }"
            :disabled="!inRange(monthKey(viewYear, index))"
            :aria-pressed="monthKey(viewYear, index) === value"
            @click="pickMonth(index)"
          >
            {{ name }}
          </button>
        </div>
        <div v-else :key="`years-${yearStart}`" class="cell-grid">
          <button
            v-for="year in years"
            :key="year"
            type="button"
            class="cell"
            :class="{ selected: year === selectedYear, current: year === currentYear }"
            :disabled="year < minYear || year > maxYear"
            :aria-pressed="year === selectedYear"
            @click="pickYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </Transition>
    </div>

    <footer class="panel-foot">
      <button type="button" class="today-btn" :disabled="!inRange(currentMonth)" @click="pickCurrent">
        Mês atual
      </button>
    </footer>
  </div>
</template>

<script>
import { SHORT_MONTH_NAMES, currentMonthKey, isMonthKey, monthKey } from "@/utils/monthKey";

// Painel de meses por ano (e lista de anos), usado no dropdown do desktop e no modal do celular.
export default {
  name: "NexoMonthPanel",
  props: {
    value: { type: String, default: "" },
    min: { type: String, default: "1990-01" },
    max: { type: String, default: "2100-12" },
  },
  emits: ["select"],
  data() {
    const current = currentMonthKey();
    return {
      view: "months",
      viewYear: Number((isMonthKey(this.value) ? this.value : current).slice(0, 4)),
      yearStart: 0,
      gridSlideName: "grid-slide-next",
      currentMonth: current,
      shortMonths: SHORT_MONTH_NAMES,
    };
  },
  computed: {
    currentYear() {
      return Number(this.currentMonth.slice(0, 4));
    },
    selectedYear() {
      return Number((isMonthKey(this.value) ? this.value : this.currentMonth).slice(0, 4));
    },
    minYear() {
      return Number(this.min.slice(0, 4));
    },
    maxYear() {
      return Number(this.max.slice(0, 4));
    },
    years() {
      return Array.from({ length: 12 }, (_, i) => this.yearStart + i);
    },
  },
  mounted() {
    this.$nextTick(() => this.$el.querySelector(".cell.selected")?.focus({ preventScroll: true }));
  },
  methods: {
    monthKey,
    inRange(key) {
      return key >= this.min && key <= this.max;
    },
    pickMonth(index) {
      this.$emit("select", monthKey(this.viewYear, index));
    },
    pickYear(year) {
      this.gridSlideName = year >= this.viewYear ? "grid-slide-next" : "grid-slide-prev";
      this.viewYear = year;
      this.view = "months";
    },
    pickCurrent() {
      this.$emit("select", this.currentMonth);
    },
    toggleView() {
      this.gridSlideName = this.view === "months" ? "grid-slide-next" : "grid-slide-prev";
      // A janela de 12 anos abre com o ano em foco um pouco depois do início, deixando anos anteriores à vista.
      this.yearStart = Math.min(Math.max(this.viewYear - 5, this.minYear), this.maxYear - 11);
      this.view = this.view === "months" ? "years" : "months";
    },
    canShiftView(delta) {
      if (this.view === "months") return this.viewYear + delta >= this.minYear && this.viewYear + delta <= this.maxYear;
      return delta < 0 ? this.yearStart > this.minYear : this.yearStart + 12 <= this.maxYear;
    },
    shiftView(delta) {
      if (!this.canShiftView(delta)) return;
      this.gridSlideName = delta > 0 ? "grid-slide-next" : "grid-slide-prev";
      if (this.view === "months") this.viewYear += delta;
      else this.yearStart = Math.min(Math.max(this.yearStart + delta * 12, this.minYear), this.maxYear - 11);
    },
  },
};
</script>

<style scoped>
.month-panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.nav-btn {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.nav-btn:hover:not(:disabled) {
  background: var(--surface-0);
  color: var(--text-primary);
}

.nav-btn:active:not(:disabled) {
  transform: scale(0.92);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-btn:focus-visible,
.panel-title:focus-visible,
.cell:focus-visible,
.today-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

.panel-title {
  flex: 1;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.92rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.panel-title:hover {
  background: var(--surface-0);
}

.title-caret {
  flex: 0 0 auto;
  font-size: 0.66rem;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.title-caret.up {
  transform: rotate(180deg);
}

.grid-viewport {
  overflow: hidden;
}

.cell-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.cell {
  height: 42px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.cell:hover:not(:disabled):not(.selected) {
  background: var(--surface-0);
  border-color: var(--glass-border);
}

.cell:active:not(:disabled) {
  transform: scale(0.95);
}

.cell.current:not(.selected) {
  border-color: var(--color-info);
  color: var(--color-info);
}

.cell.selected {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  font-weight: 800;
}

.cell:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.panel-foot {
  display: flex;
  justify-content: center;
  padding-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
}

.today-btn {
  height: 32px;
  padding: 0 var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.today-btn:hover:not(:disabled) {
  background: var(--surface-0);
}

.today-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.grid-slide-next-enter-active,
.grid-slide-next-leave-active,
.grid-slide-prev-enter-active,
.grid-slide-prev-leave-active {
  transition:
    transform 0.16s ease,
    opacity 0.16s ease;
}

.grid-slide-next-enter-from,
.grid-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

.grid-slide-next-leave-to,
.grid-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}

/* Alvos de toque maiores no celular */
@media (max-width: 768px) {
  .cell {
    height: 48px;
    font-size: 0.9rem;
  }

  .nav-btn,
  .panel-title {
    height: 40px;
  }

  .nav-btn {
    width: 40px;
    flex-basis: 40px;
  }

  .today-btn {
    height: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid-slide-next-enter-active,
  .grid-slide-next-leave-active,
  .grid-slide-prev-enter-active,
  .grid-slide-prev-leave-active {
    transition: opacity 0.01s;
  }

  .grid-slide-next-enter-from,
  .grid-slide-next-leave-to,
  .grid-slide-prev-enter-from,
  .grid-slide-prev-leave-to {
    transform: none;
  }
}
</style>
