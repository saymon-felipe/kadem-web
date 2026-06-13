<template>
  <div ref="root" class="macro-combo">
    <button type="button" class="macro-trigger" :class="{ open: isOpen }" @click="toggle">
      <span v-if="modelValue">{{ modelValue }}</span>
      <span v-else class="placeholder">{{ placeholder }}</span>
      <font-awesome-icon icon="chevron-down" class="combo-arrow" :class="{ up: isOpen }" />
    </button>

    <Teleport to="body">
      <Transition name="combo-pop">
        <div
          v-if="isOpen"
          ref="menu"
          class="macro-menu glass floating"
          :class="direction"
          :style="menuStyle"
        >
          <div class="macro-search">
            <font-awesome-icon icon="magnifying-glass" />
            <input
              ref="search"
              v-model="filter"
              type="search"
              placeholder="Filtrar macro categoria"
              @keydown.enter.prevent="selectOrCreate"
              @keydown.escape.prevent="close"
            />
          </div>

          <div class="macro-list custom-scrollbar">
            <button
              v-for="macro in filteredMacros"
              :key="macro"
              type="button"
              class="macro-option"
              :class="{ selected: macro === modelValue }"
              @click="select(macro)"
            >
              {{ macro }}
            </button>

            <p v-if="filteredMacros.length === 0" class="macro-empty">
              Nenhuma macro categoria encontrada.
            </p>
          </div>

          <button type="button" class="macro-create" :disabled="!createLabel" @click="selectOrCreate">
            <font-awesome-icon icon="plus" />
            {{ createLabel || "Digite para criar uma nova macro" }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: "MacroCategoryCombo",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    categories: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: "Macro categoria",
    },
  },
  emits: ["update:modelValue", "change"],
  data() {
    return {
      isOpen: false,
      filter: "",
      direction: "down",
      menuStyle: {},
    };
  },
  computed: {
    macros() {
      const names = this.categories
        .map((category) => category.macro_category || "Geral")
        .filter(Boolean);
      return [...new Set(["Geral", ...names])].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    filteredMacros() {
      const term = this.normalize(this.filter);
      if (!term) return this.macros;
      return this.macros.filter((macro) => this.normalize(macro).includes(term));
    },
    createValue() {
      const value = this.filter.trim();
      if (!value) return "";
      const exists = this.macros.some((macro) => this.normalize(macro) === this.normalize(value));
      return exists ? "" : value;
    },
    createLabel() {
      return this.createValue ? `Criar "${this.createValue}"` : "";
    },
  },
  methods: {
    normalize(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },
    toggle() {
      this.isOpen ? this.close() : this.open();
    },
    open() {
      this.isOpen = true;
      this.filter = "";
      this.$nextTick(() => {
        this.updateDirection();
        this.$refs.search?.focus();
      });
    },
    close() {
      this.isOpen = false;
    },
    updateDirection() {
      if (!this.$refs.root) return;
      const rect = this.$refs.root.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      this.direction = spaceBelow < 260 && spaceAbove > spaceBelow ? "up" : "down";
      const availableSpace = this.direction === "down" ? spaceBelow - 12 : spaceAbove - 12;
      const menuHeight = Math.min(310, Math.max(220, this.filteredMacros.length * 40 + 112));
      this.menuStyle = {
        left: `${Math.max(12, rect.left)}px`,
        width: `${Math.min(rect.width, window.innerWidth - 24)}px`,
        maxWidth: "360px",
        top: this.direction === "down" ? `${rect.bottom + 6}px` : "auto",
        bottom: this.direction === "up" ? `${window.innerHeight - rect.top + 6}px` : "auto",
        maxHeight: `${Math.max(180, Math.min(menuHeight, availableSpace))}px`,
      };
    },
    select(value) {
      this.$emit("update:modelValue", value);
      this.$emit("change", value);
      this.close();
    },
    selectOrCreate() {
      if (this.createValue) {
        this.select(this.createValue);
        return;
      }
      if (this.filteredMacros[0]) this.select(this.filteredMacros[0]);
    },
    handleOutsideClick(event) {
      const clickedRoot = this.$refs.root?.contains(event.target);
      const clickedMenu = this.$refs.menu?.contains(event.target);
      if (!clickedRoot && !clickedMenu) this.close();
    },
    handleViewportChange() {
      if (this.isOpen) this.updateDirection();
    },
  },
  mounted() {
    document.addEventListener("mousedown", this.handleOutsideClick);
    window.addEventListener("resize", this.handleViewportChange);
    window.addEventListener("scroll", this.handleViewportChange, true);
  },
  beforeUnmount() {
    document.removeEventListener("mousedown", this.handleOutsideClick);
    window.removeEventListener("resize", this.handleViewportChange);
    window.removeEventListener("scroll", this.handleViewportChange, true);
  },
};
</script>

<style scoped>
.macro-combo {
  position: relative;
  width: 100%;
}

.macro-trigger {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease,
    background 0.16s ease;
}

.macro-trigger:hover {
  border-color: var(--color-info);
  background: var(--surface-2);
  transform: translateY(-1px);
}

.macro-trigger.open {
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px var(--glass-border);
}

.placeholder {
  color: var(--text-muted);
}

.combo-arrow {
  font-size: 0.75rem;
  transition: transform 0.18s ease;
}

.combo-arrow.up {
  transform: rotate(180deg);
}

.macro-menu {
  position: absolute;
  left: 0;
  z-index: 10020;
  width: min(360px, 92vw);
  max-height: 310px;
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--text-primary);
}

.macro-menu.floating {
  position: fixed;
  min-width: 220px;
  overflow-x: hidden;
}

.macro-menu.down {
  top: calc(100% + 6px);
  transform-origin: top;
}

.macro-menu.up {
  bottom: calc(100% + 6px);
  transform-origin: bottom;
}

.macro-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-3);
}

.macro-search input {
  min-width: 0;
  height: 38px;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  background: transparent;
  color: var(--text-primary);
}

.macro-list {
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.macro-option,
.macro-create {
  border: none;
  border-radius: var(--radius-sm);
  min-height: 38px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  text-align: left;
  transition: background 0.15s ease, transform 0.15s ease;
}

.macro-option {
  background: transparent;
}

.macro-option:hover,
.macro-option.selected {
  background: var(--surface-3);
  transform: translateX(2px);
}

.macro-create {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  font-weight: 700;
}

.macro-create:not(:disabled):hover {
  background: var(--surface-3);
}

.macro-create:disabled {
  opacity: 0.6;
  cursor: default;
}

.macro-empty {
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  text-align: center;
  padding: var(--space-3);
}

.combo-pop-enter-active,
.combo-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.combo-pop-enter-from,
.combo-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
