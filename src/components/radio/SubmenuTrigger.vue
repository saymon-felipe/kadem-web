<template>
  <div class="submenu-trigger-root" @mouseenter="open_on_hover" @mouseleave="close_on_hover">
    <button
      ref="trigger"
      class="menu-item"
      :class="{ 'submenu-open': show, 'disabled-item': disabled }"
      :disabled="disabled"
      :title="title"
      aria-haspopup="menu"
      :aria-expanded="show"
      @click.stop="toggle_on_touch"
    >
      <slot name="trigger" />
      <font-awesome-icon icon="chevron-right" class="submenu-chevron" />
    </button>

    <div
      v-if="show"
      ref="panel"
      class="submenu-panel"
      :style="panel_style"
      role="menu"
      @mouseenter="cancel_close"
      @mouseleave="close_on_hover"
    >
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: "SubmenuTrigger",
  props: {
    disabled: { type: Boolean, default: false },
    title: { type: String, default: "" },
    panelWidth: { type: String, default: "220px" },
  },
  data() {
    return {
      show: false,
      close_timer: null,
      position: { top: -9999, left: -9999, transformOrigin: "top left" },
    };
  },
  computed: {
    panel_style() {
      return {
        top: `${this.position.top}px`,
        left: `${this.position.left}px`,
        width: this.panelWidth,
        transformOrigin: this.position.transformOrigin,
      };
    },
  },
  mounted() {
    window.addEventListener("resize", this.position_panel);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.position_panel);
    this.cancel_close();
  },
  methods: {
    supports_hover() {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    },
    open_on_hover() {
      if (this.supports_hover()) this.open();
    },
    close_on_hover() {
      if (!this.supports_hover()) return;
      this.cancel_close();
      this.close_timer = window.setTimeout(() => {
        this.show = false;
        this.close_timer = null;
      }, 180);
    },
    cancel_close() {
      if (this.close_timer !== null) {
        window.clearTimeout(this.close_timer);
        this.close_timer = null;
      }
    },
    toggle_on_touch() {
      if (this.supports_hover()) return;
      if (this.show) {
        this.show = false;
        return;
      }
      this.open();
    },
    async open() {
      if (this.disabled) return;
      this.cancel_close();
      this.show = true;
      await this.$nextTick();
      this.position_panel();
    },
    position_panel() {
      if (!this.show) return;

      const trigger = this.$refs.trigger;
      const panel = this.$refs.panel;
      if (!trigger || !panel) return;

      const trigger_rect = trigger.getBoundingClientRect();
      const panel_rect = panel.getBoundingClientRect();
      const margin = 8;
      const max_left = Math.max(margin, window.innerWidth - panel_rect.width - margin);
      const max_top = Math.max(margin, window.innerHeight - panel_rect.height - margin);
      const has_space_right = window.innerWidth - trigger_rect.right >= panel_rect.width + margin;
      const has_space_left = trigger_rect.left >= panel_rect.width + margin;

      let left;
      let top;
      let transformOrigin;

      if (has_space_right || has_space_left) {
        left = has_space_right ? trigger_rect.right : trigger_rect.left - panel_rect.width;
        top = Math.min(Math.max(trigger_rect.top, margin), max_top);
        transformOrigin = has_space_right ? "top left" : "top right";
      } else {
        const has_space_below = window.innerHeight - trigger_rect.bottom >= panel_rect.height + margin;
        left = Math.min(Math.max(trigger_rect.left, margin), max_left);
        top = has_space_below ? trigger_rect.bottom : trigger_rect.top - panel_rect.height;
        top = Math.min(Math.max(top, margin), max_top);
        transformOrigin = has_space_below ? "top center" : "bottom center";
      }

      this.position = { top, left, transformOrigin };
    },
  },
};
</script>

<style scoped>
.submenu-trigger-root {
  position: relative;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition: background 0.1s;
  font-size: 0.9rem;
}

.menu-item:hover {
  background: var(--surface-3);
}

.menu-item.submenu-open {
  background: var(--surface-3);
}

.disabled-item {
  cursor: not-allowed !important;
  color: var(--text-muted) !important;
  background: none !important;
}

.submenu-chevron {
  margin-left: auto;
  font-size: 0.7rem;
}

.submenu-panel {
  position: fixed;
  z-index: 2;
  max-height: 320px;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
}
</style>
