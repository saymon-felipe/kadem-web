<template>
  <div ref="root" class="category-combo">
    <button
      type="button"
      class="combo-trigger"
      :class="{ open: isOpen }"
      @click="toggle"
    >
      <span v-if="selectedCategory" class="selected-category">
        <i class="combo-swatch" :style="{ background: selectedCategory.color || '#999999' }"></i>
        <font-awesome-icon :icon="selectedCategory.icon || 'tag'" class="combo-icon" />
        <span>{{ selectedCategory.name }}</span>
        <small>{{ selectedCategory.macro_category }}</small>
      </span>
      <span v-else class="combo-placeholder">{{ placeholder }}</span>
      <font-awesome-icon icon="chevron-down" class="combo-arrow" :class="{ up: isOpen }" />
    </button>

    <Teleport to="body">
      <Transition name="combo-pop">
        <div
          v-if="isOpen"
          ref="menu"
          class="combo-menu glass floating"
          :class="direction"
          :style="menuStyle"
        >
          <div class="combo-search">
            <font-awesome-icon icon="magnifying-glass" />
            <input
              ref="search"
              v-model="filter"
              type="search"
              placeholder="Filtrar por nome"
              @keydown.escape.prevent="close"
            />
          </div>

          <button type="button" class="combo-option clear" @click="select(null)">
            Sem categoria
          </button>

          <button v-if="allowCreate" type="button" class="combo-create" @click="requestCreate">
            <font-awesome-icon icon="plus" />
            <span>{{ createLabel }}</span>
          </button>

          <div class="combo-list custom-scrollbar">
            <button
              v-for="category in filteredCategories"
              :key="category.id"
              type="button"
              class="combo-option"
              :class="{ selected: sameId(category.id, modelValue) }"
              @click="select(category.id)"
            >
            <i class="combo-swatch" :style="{ background: category.color || '#999999' }"></i>
            <font-awesome-icon :icon="category.icon || 'tag'" class="combo-icon" />
            <span>{{ category.name }}</span>
            <small>{{ category.macro_category }}</small>
          </button>

            <p v-if="filteredCategories.length === 0" class="combo-empty">
              Nenhuma categoria encontrada.
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: "CategoryCombo",
  props: {
    modelValue: {
      type: [Number, String, null],
      default: null,
    },
    categories: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: "Selecionar categoria",
    },
    createLabel: {
      type: String,
      default: "Nova categoria",
    },
    allowCreate: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "change", "create"],
  data() {
    return {
      isOpen: false,
      filter: "",
      direction: "down",
      menuStyle: {},
    };
  },
  computed: {
    selectedCategory() {
      return this.categories.find((category) => this.sameId(category.id, this.modelValue));
    },
    filteredCategories() {
      const term = this.normalize(this.filter);
      if (!term) return this.categories;

      return this.categories.filter((category) => {
        const haystack = this.normalize(`${category.name} ${category.macro_category}`);
        return haystack.includes(term);
      });
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
    sameId(left, right) {
      return String(left || "") === String(right || "");
    },
    toggle() {
      this.isOpen ? this.close() : this.open();
    },
    open() {
      this.isOpen = true;
      this.filter = "";

      this.$nextTick(() => {
        this.updateDirection();
        this.$refs.search.focus();
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
      this.direction = spaceBelow < 280 && spaceAbove > spaceBelow ? "up" : "down";
      const availableSpace = this.direction === "down" ? spaceBelow - 12 : spaceAbove - 12;
      const extraHeight = this.allowCreate ? 150 : 104;
      const minHeight = this.allowCreate ? 240 : 220;
      const menuHeight = Math.min(340, Math.max(minHeight, this.filteredCategories.length * 44 + extraHeight));
      this.menuStyle = {
        left: `${Math.max(12, rect.left)}px`,
        width: `${Math.min(rect.width, window.innerWidth - 24)}px`,
        maxWidth: "360px",
        top: this.direction === "down" ? `${rect.bottom + 6}px` : "auto",
        bottom: this.direction === "up" ? `${window.innerHeight - rect.top + 6}px` : "auto",
        maxHeight: `${Math.max(180, Math.min(menuHeight, availableSpace))}px`,
      };
    },
    select(categoryId) {
      this.$emit("update:modelValue", categoryId);
      this.$emit("change", categoryId);
      this.close();
    },
    requestCreate() {
      this.$emit("create", this.filter.trim());
      this.close();
    },
    handleOutsideClick(event) {
      if (!this.isOpen) return;
      const clickedRoot = this.$refs.root && this.$refs.root.contains(event.target);
      const clickedMenu = this.$refs.menu && this.$refs.menu.contains(event.target);
      if (!clickedRoot && !clickedMenu) {
        this.close();
      }
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
.category-combo {
  position: relative;
  width: 100%;
  min-width: 180px;
}

.combo-trigger {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease,
    background 0.16s ease;
}

.combo-trigger:hover {
  border-color: var(--color-info);
  background: var(--surface-2);
  transform: translateY(-1px);
}

.combo-trigger.open {
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px var(--glass-border);
}

.selected-category {
  min-width: 0;
  display: grid;
  grid-template-columns: 12px 18px minmax(0, 1fr);
  column-gap: var(--space-2);
  align-items: center;
  text-align: left;
}

.selected-category span,
.combo-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-category small,
.combo-option small {
  grid-column: 3;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1;
}

.combo-placeholder {
  color: var(--text-muted);
}

.combo-arrow {
  flex: 0 0 auto;
  font-size: 0.75rem;
  transition: transform 0.18s ease;
}

.combo-arrow.up {
  transform: rotate(180deg);
}

.combo-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.combo-icon {
  color: var(--text-primary);
  opacity: 0.78;
}

.combo-menu {
  position: absolute;
  left: 0;
  z-index: 10020;
  width: min(360px, 92vw);
  max-height: 300px;
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--text-primary);
}

.combo-menu.floating {
  position: fixed;
  min-width: 220px;
  overflow-x: hidden;
}

.combo-menu.down {
  top: calc(100% + 6px);
  transform-origin: top;
}

.combo-menu.up {
  bottom: calc(100% + 6px);
  transform-origin: bottom;
}

.combo-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-3);
}

.combo-search input {
  min-width: 0;
  height: 38px;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  background: transparent;
  color: var(--text-primary);
}

.combo-list {
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.combo-option {
  border: none;
  background: transparent;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  min-height: 42px;
  padding: var(--space-2) var(--space-3);
  display: grid;
  grid-template-columns: 12px 18px minmax(0, 1fr);
  column-gap: var(--space-2);
  align-items: center;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.combo-option:hover,
.combo-option.selected {
  background: var(--surface-3);
  transform: translateX(2px);
}

.combo-option.clear {
  grid-template-columns: 1fr;
  color: var(--gray-100);
  min-height: 34px;
}

.combo-create {
  border: 1px dashed var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  min-height: 38px;
  padding: 0 var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.combo-create:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
  transform: translateY(-1px);
}

.combo-empty {
  color: var(--gray-100);
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
