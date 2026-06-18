<template>
  <nav class="nexo-tabs" aria-label="Kadem Nexo">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="{ active: activeTab === tab.id }"
      @click="$emit('update:activeTab', tab.id)"
    >
      <font-awesome-icon :icon="tab.icon" />
      <span>{{ tab.label }}</span>
      <font-awesome-icon v-if="tab.pro && !isPaidPlan" icon="lock" class="tab-lock" />
    </button>
  </nav>
</template>

<script>
export default {
  name: 'NexoTabs',
  emits: ['update:activeTab'],
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    activeTab: {
      type: String,
      required: true,
    },
    isPaidPlan: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.nexo-tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  overflow-x: auto;
  overflow-y: hidden;
  flex: 0 0 auto;
  scrollbar-width: none;
}

.nexo-tabs::-webkit-scrollbar {
  display: none;
}

.nexo-tabs button {
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-muted);
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

.nexo-tabs button:hover,
.nexo-tabs button.active {
  color: var(--text-primary);
}

.nexo-tabs button.active {
  font-weight: 700;
}

.nexo-tabs button.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--deep-blue);
  animation: tab-underline-in 0.2s var(--transition-spring);
}

.nexo-tabs button:active {
  transform: scale(0.97);
}

.tab-lock {
  color: #d4af37;
  font-size: 0.7rem;
  opacity: 0.8;
}

@keyframes tab-underline-in {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

@media (max-width: 760px) {
  .nexo-tabs {
    gap: var(--space-4);
  }
}
</style>
