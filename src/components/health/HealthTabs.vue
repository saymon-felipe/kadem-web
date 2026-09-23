<template>
  <nav class="health-tabs" aria-label="Navegação Health">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="{ active: activeTab === tab.id }"
      type="button"
      @click="$emit('update:activeTab', tab.id)"
    >
      <font-awesome-icon :icon="tab.icon" />
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge !== undefined" class="tab-badge">{{ tab.badge }}</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: "HealthTabs",
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    activeTab: {
      type: String,
      required: true,
    },
  },
  emits: ["update:activeTab"],
};
</script>

<style scoped>
.health-tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  overflow-x: auto;
  overflow-y: hidden;
  flex: 0 0 auto;
  scrollbar-width: none;
}

.health-tabs::-webkit-scrollbar {
  display: none;
}

.health-tabs button {
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: var(--space-3) 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  font-size: var(--fontsize-sx);
  font-weight: 500;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.health-tabs button:hover,
.health-tabs button.active {
  color: var(--text-primary);
}

.health-tabs button.active {
  font-weight: 700;
}

.health-tabs button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(90deg, #e25373, #8d5fd3);
  animation: tab-underline-in 0.2s var(--transition-spring);
}

@keyframes tab-underline-in {
  from {
    transform: scaleX(0.4);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

.health-tabs button:active {
  transform: scale(0.97);
}

.tab-badge {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 800;
  background: var(--surface-2);
  color: var(--text-secondary);
}

.health-tabs button.active .tab-badge {
  background: rgba(226, 83, 115, 0.16);
  color: #e25373;
}
</style>
