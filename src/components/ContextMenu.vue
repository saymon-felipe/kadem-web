<template>
  <div class="context-menu glass" :style="menuStyle" @mousedown.stop>
    <ul>
      <li v-for="option in options" :key="option.action" @click="onMenuClick(option.action)">
        <font-awesome-icon v-if="option.icon" :icon="option.icon" class="menu-icon" />
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    options: { type: Array, required: true },
    x:       { type: Number, required: true },
    y:       { type: Number, required: true },
  },
  emits: ["menu-click"],
  computed: {
    menuStyle() {
      return {
        top:  `${this.y}px`,
        left: `${this.x}px`,
      };
    },
  },
  methods: {
    onMenuClick(action) {
      this.$emit("menu-click", action);
    },
  },
};
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  transform-origin: top left;
  overflow: hidden;
  background: var(--surface-0);
}

.context-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.context-menu li {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background-color var(--transition-fast);
  font-size: var(--fontsize-sx);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.context-menu li:hover {
  background-color: var(--surface-2);
}

.menu-icon {
  opacity: 0.6;
  width: 14px;
}
</style>