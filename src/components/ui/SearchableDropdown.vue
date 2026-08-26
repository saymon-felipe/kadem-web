<template>
  <div class="searchable-dropdown" ref="dropdownRoot">
    <button
      type="button"
      ref="triggerBtn"
      class="dropdown-trigger"
      :class="{ 'is-open': is_open, 'has-active-value': modelValue && modelValue !== 'all' }"
      @click.stop="toggle"
      :title="selected_label"
    >
      <div class="trigger-content">
        <div v-if="selected_option?.icon" class="item-icon-box">
          <font-awesome-icon :icon="selected_option.icon" />
        </div>
        <img
          v-else-if="selected_option?.avatar"
          :src="selected_option.avatar"
          class="item-avatar"
          alt=""
        />
        <span
          v-else-if="selected_option?.color"
          class="item-color-dot"
          :style="{ backgroundColor: selected_option.color }"
        ></span>
        <span class="trigger-text">{{ selected_label }}</span>
      </div>
      <font-awesome-icon
        icon="chevron-down"
        class="trigger-arrow"
        :class="{ rotated: is_open }"
      />
    </button>

    <Teleport to="body">
      <transition name="dropdown-pop">
        <div
          v-if="is_open"
          ref="dropdownMenu"
          class="searchable-dropdown-menu"
          :style="menu_style"
          v-click-outside="handle_click_outside"
        >
          <div v-if="searchable" class="dropdown-search-header" @click.stop>
            <font-awesome-icon icon="magnifying-glass" class="search-input-icon" />
            <input
              ref="searchInput"
              type="text"
              v-model="search_term"
              :placeholder="searchPlaceholder"
              class="dropdown-search-field"
              @keydown.esc.stop="close"
            />
            <button
              v-if="search_term"
              class="search-clear-btn"
              @click.stop="search_term = ''"
              type="button"
              title="Limpar busca"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="dropdown-items-scroll">
            <template v-if="filtered_options.length > 0">
              <div
                v-for="(option, idx) in filtered_options"
                :key="option.value !== undefined ? option.value : idx"
                class="dropdown-item-row"
                :class="{ 'is-selected': is_option_selected(option) }"
                @click.stop="select_option(option)"
              >
                <div v-if="option.icon" class="item-icon-box">
                  <font-awesome-icon :icon="option.icon" />
                </div>
                <img
                  v-else-if="option.avatar"
                  :src="option.avatar"
                  class="item-avatar"
                  alt=""
                />
                <span
                  v-else-if="option.color"
                  class="item-color-dot"
                  :style="{ backgroundColor: option.color }"
                ></span>
                <span class="item-label">{{ option.label }}</span>
                <font-awesome-icon
                  v-if="is_option_selected(option)"
                  icon="check"
                  class="check-icon"
                />
              </div>
            </template>
            <div v-else class="dropdown-empty-result">
              <span>Nenhum resultado</span>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: "SearchableDropdown",
  props: {
    modelValue: {
      type: [String, Number, Object, null],
      default: null,
    },
    options: {
      type: Array,
      required: true,
      default: () => [],
    },
    searchable: {
      type: Boolean,
      default: false,
    },
    searchPlaceholder: {
      type: String,
      default: "Buscar...",
    },
    placeholder: {
      type: String,
      default: "Selecione...",
    },
  },
  emits: ["update:modelValue", "change"],
  directives: {
    "click-outside": {
      mounted(el, binding) {
        el._clickOutsideHandler = (e) => {
          const path = e.composedPath ? e.composedPath() : [];
          if (!el.contains(e.target) && !path.includes(el)) {
            binding.value(e);
          }
        };
        document.addEventListener("pointerdown", el._clickOutsideHandler);
      },
      unmounted(el) {
        document.removeEventListener("pointerdown", el._clickOutsideHandler);
      },
    },
  },
  data() {
    return {
      is_open: false,
      search_term: "",
      menu_style: {},
    };
  },
  computed: {
    selected_option() {
      return this.options.find((opt) => opt.value === this.modelValue) || null;
    },
    selected_label() {
      if (this.selected_option) {
        return this.selected_option.label;
      }
      return this.placeholder;
    },
    filtered_options() {
      if (!this.searchable || !this.search_term.trim()) {
        return this.options;
      }
      const term = this.search_term.toLowerCase().trim();
      return this.options.filter((opt) => {
        const matchLabel = (opt.label || "").toLowerCase().includes(term);
        const matchSubtitle = (opt.subtitle || "").toLowerCase().includes(term);
        return matchLabel || matchSubtitle;
      });
    },
  },
  methods: {
    toggle() {
      if (this.is_open) {
        this.close();
      } else {
        this.open();
      }
    },
    open() {
      this.is_open = true;
      this.search_term = "";
      this.calculate_position();
      this.$nextTick(() => {
        this.calculate_position();
        if (this.searchable && this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });

      window.addEventListener("resize", this.calculate_position, { passive: true });
      window.addEventListener("scroll", this.calculate_position, { passive: true, capture: true });
    },
    close() {
      this.is_open = false;
      window.removeEventListener("resize", this.calculate_position);
      window.removeEventListener("scroll", this.calculate_position);
    },
    calculate_position() {
      if (!this.$refs.triggerBtn) return;
      const rect = this.$refs.triggerBtn.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const targetWidth = Math.min(Math.max(rect.width, 210), Math.max(160, viewportWidth - 20));

      let left = rect.left;
      if (left + targetWidth > viewportWidth - 10) {
        left = viewportWidth - targetWidth - 10;
      }
      if (left < 10) left = 10;

      const spaceBelow = viewportHeight - rect.bottom - 10;
      const spaceAbove = rect.top - 10;
      const openUpwards = spaceBelow < 180 && spaceAbove > spaceBelow;

      const maxHeight = Math.min(260, Math.max(120, openUpwards ? spaceAbove : spaceBelow));

      const style = {
        position: "fixed",
        left: `${left}px`,
        width: `${targetWidth}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: "99999",
      };

      if (openUpwards) {
        style.bottom = `${viewportHeight - rect.top + 4}px`;
        style.top = "auto";
      } else {
        style.top = `${rect.bottom + 4}px`;
        style.bottom = "auto";
      }

      this.menu_style = style;
    },
    handle_click_outside(e) {
      if (this.$refs.triggerBtn && (this.$refs.triggerBtn === e.target || this.$refs.triggerBtn.contains(e.target))) {
        return;
      }
      this.close();
    },
    select_option(option) {
      this.$emit("update:modelValue", option.value);
      this.$emit("change", option.value);
      this.close();
    },
    is_option_selected(option) {
      return option.value === this.modelValue;
    },
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.calculate_position);
    window.removeEventListener("scroll", this.calculate_position);
  },
};
</script>

<style scoped>
.searchable-dropdown {
  position: relative;
  width: 100%;
  user-select: none;
}

.dropdown-trigger {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  background-color: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  cursor: pointer;
  outline: none !important;
  box-shadow: none !important;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.dropdown-trigger:hover {
  background-color: var(--surface-2);
  border-color: var(--text-muted);
}

.dropdown-trigger.is-open {
  border-color: var(--color-info);
  background-color: var(--surface-2);
}

.dropdown-trigger.has-active-value {
  color: var(--color-info);
  font-weight: 600;
}

.trigger-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.trigger-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.trigger-arrow {
  font-size: 9px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.trigger-arrow.rotated {
  transform: rotate(180deg);
}

.item-icon-box {
  width: 14px;
  height: 14px;
  display: grid;
  place-items: center;
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.item-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.item-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

<style>
/* Estilos globais para o menu teleportado no body */
.searchable-dropdown-menu {
  background-color: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}

[data-theme="dark"] .searchable-dropdown-menu {
  background-color: rgba(26, 30, 48, 0.96);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
}

.dropdown-search-header {
  padding: 4px 8px;
  height: 28px;
  min-height: 28px;
  max-height: 28px;
  border-bottom: 1px solid var(--glass-border);
  background-color: var(--surface-2);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.search-input-icon {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.dropdown-search-field {
  flex: 1;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  border: none !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  outline: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  min-width: 0;
}

.dropdown-search-field::placeholder {
  color: var(--text-muted);
  opacity: 0.65;
  font-size: 11px;
}

.search-clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  font-size: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.search-clear-btn:hover {
  color: var(--text-primary);
}

.dropdown-items-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 3px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dropdown-item-row {
  padding: 5px 8px;
  min-height: 26px;
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  font-size: 11px;
  color: var(--text-primary);
}

.dropdown-item-row:hover {
  background-color: var(--surface-2);
}

.dropdown-item-row.is-selected {
  background-color: rgba(53, 90, 253, 0.12);
  color: var(--color-info);
  font-weight: 600;
}

.dropdown-item-row .item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item-row .check-icon {
  font-size: 10px;
  color: var(--color-info);
  flex-shrink: 0;
}

.dropdown-empty-result {
  padding: 12px 8px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}

.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>
