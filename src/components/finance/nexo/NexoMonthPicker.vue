<template>
  <div ref="root" class="month-picker">
    <div class="month-stepper" role="group" aria-label="Mês de referência">
      <button
        type="button"
        class="step-btn"
        title="Mês anterior"
        aria-label="Mês anterior"
        :disabled="!canStep(-1)"
        @click="step(-1)"
      >
        <font-awesome-icon icon="chevron-left" />
      </button>

      <button
        ref="trigger"
        type="button"
        class="month-trigger"
        :class="{ open: isOpen }"
        title="Escolher mês"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        @click="toggle"
        @keydown.left.prevent="step(-1)"
        @keydown.right.prevent="step(1)"
      >
        <span class="label-stack" aria-live="polite">
          <Transition :name="slideName">
            <span :key="value" class="label-text">{{ label }}</span>
          </Transition>
        </span>
        <font-awesome-icon icon="chevron-down" class="trigger-caret" :class="{ up: isOpen }" />
      </button>

      <button
        type="button"
        class="step-btn"
        title="Próximo mês"
        aria-label="Próximo mês"
        :disabled="!canStep(1)"
        @click="step(1)"
      >
        <font-awesome-icon icon="chevron-right" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="picker-pop">
        <div
          v-if="isOpen"
          ref="panel"
          class="month-popover"
          :class="direction"
          :style="panelStyle"
          role="dialog"
          aria-label="Escolher mês"
          @keydown.escape.prevent="closeAndFocus"
        >
          <NexoMonthPanel :value="value" :min="min" :max="max" @select="pick" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import NexoMonthPanel from "./NexoMonthPanel.vue";
import { currentMonthKey, isMonthKey, monthLabel, shiftMonthKey } from "@/utils/monthKey";

// Filtro de mês do desktop: setas, texto com animação de troca e um dropdown com meses por ano.
// No celular o header usa o mesmo painel dentro de um modal.
export default {
  name: "NexoMonthPicker",
  components: { NexoMonthPanel },
  props: {
    modelValue: { type: String, default: "" },
    min: { type: String, default: "1990-01" },
    max: { type: String, default: "2100-12" },
    // Setas seguidas disparam um único `change` depois desta pausa (ms); uma escolha no painel dispara na hora.
    changeDelay: { type: Number, default: 280 },
  },
  emits: ["update:modelValue", "change"],
  data() {
    return {
      isOpen: false,
      direction: "down",
      panelStyle: {},
      slideName: "month-slide-next",
      changeTimer: null,
    };
  },
  computed: {
    value() {
      return isMonthKey(this.modelValue) ? this.modelValue : currentMonthKey();
    },
    label() {
      return monthLabel(this.value);
    },
  },
  watch: {
    // A direção do texto acompanha o sentido da troca: mês mais novo sobe, mais antigo desce.
    value(next, previous) {
      this.slideName = next > previous ? "month-slide-next" : "month-slide-prev";
    },
  },
  mounted() {
    document.addEventListener("mousedown", this.handleOutsideClick);
    window.addEventListener("resize", this.updatePosition);
    window.addEventListener("scroll", this.updatePosition, true);
  },
  beforeUnmount() {
    clearTimeout(this.changeTimer);
    document.removeEventListener("mousedown", this.handleOutsideClick);
    window.removeEventListener("resize", this.updatePosition);
    window.removeEventListener("scroll", this.updatePosition, true);
  },
  methods: {
    inRange(key) {
      return key >= this.min && key <= this.max;
    },
    canStep(delta) {
      return this.inRange(shiftMonthKey(this.value, delta));
    },
    // `immediate` evita esperar a pausa quando a escolha foi um único clique no painel.
    commit(key, immediate = false) {
      if (!isMonthKey(key) || !this.inRange(key) || key === this.value) return;
      this.$emit("update:modelValue", key);
      clearTimeout(this.changeTimer);
      if (immediate) this.$emit("change", key);
      else this.changeTimer = setTimeout(() => this.$emit("change", key), this.changeDelay);
    },
    step(delta) {
      this.commit(shiftMonthKey(this.value, delta));
    },
    pick(key) {
      this.commit(key, true);
      this.close();
    },
    toggle() {
      this.isOpen ? this.close() : this.open();
    },
    open() {
      this.isOpen = true;
      this.$nextTick(this.updatePosition);
    },
    close() {
      this.isOpen = false;
    },
    closeAndFocus() {
      this.close();
      this.$refs.trigger?.focus();
    },
    updatePosition() {
      if (!this.isOpen || !this.$refs.root) return;
      const rect = this.$refs.root.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 24);
      const spaceBelow = window.innerHeight - rect.bottom;
      this.direction = spaceBelow < 340 && rect.top > spaceBelow ? "up" : "down";
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      this.panelStyle = {
        left: `${left}px`,
        width: `${width}px`,
        top: this.direction === "down" ? `${rect.bottom + 8}px` : "auto",
        bottom: this.direction === "up" ? `${window.innerHeight - rect.top + 8}px` : "auto",
      };
    },
    handleOutsideClick(event) {
      if (!this.isOpen) return;
      if (this.$refs.root?.contains(event.target) || this.$refs.panel?.contains(event.target)) return;
      this.close();
    },
  },
};
</script>

<style scoped>
.month-picker {
  position: relative;
  display: inline-flex;
}

.month-stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 42px;
  box-sizing: border-box;
  padding: 3px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.step-btn {
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

.step-btn:hover:not(:disabled) {
  background: var(--surface-0);
  color: var(--text-primary);
}

.step-btn:active:not(:disabled) {
  transform: scale(0.92);
}

.step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.step-btn:focus-visible,
.month-trigger:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

.month-trigger {
  min-width: 168px;
  height: 34px;
  padding: 0 var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.month-trigger:hover,
.month-trigger.open {
  background: var(--surface-0);
}

/* Texto do mês: o antigo sai e o novo entra na mesma célula, então a troca é contínua e a largura não pula. */
.label-stack {
  display: grid;
  overflow: hidden;
  padding: 2px 0;
}

.label-text {
  grid-area: 1 / 1;
  text-align: center;
  white-space: nowrap;
}

.month-slide-next-enter-active,
.month-slide-next-leave-active,
.month-slide-prev-enter-active,
.month-slide-prev-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.22s ease;
}

.month-slide-next-enter-from,
.month-slide-prev-leave-to {
  opacity: 0;
  transform: translateY(70%);
}

.month-slide-next-leave-to,
.month-slide-prev-enter-from {
  opacity: 0;
  transform: translateY(-70%);
}

.trigger-caret {
  flex: 0 0 auto;
  font-size: 0.66rem;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.trigger-caret.up {
  transform: rotate(180deg);
}

/* Dropdown (desktop) */
.month-popover {
  position: fixed;
  z-index: 10020;
  box-sizing: border-box;
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  color: var(--text-primary);
}

.month-popover.down {
  transform-origin: top right;
}

.month-popover.up {
  transform-origin: bottom right;
}

.picker-pop-enter-active,
.picker-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.picker-pop-enter-from,
.picker-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .month-slide-next-enter-active,
  .month-slide-next-leave-active,
  .month-slide-prev-enter-active,
  .month-slide-prev-leave-active,
  .picker-pop-enter-active,
  .picker-pop-leave-active {
    transition: opacity 0.01s;
  }

  .month-slide-next-enter-from,
  .month-slide-next-leave-to,
  .month-slide-prev-enter-from,
  .month-slide-prev-leave-to,
  .picker-pop-enter-from,
  .picker-pop-leave-to {
    transform: none;
  }
}
</style>
