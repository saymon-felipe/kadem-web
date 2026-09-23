<template>
  <div class="health-empty-state">
    <div class="empty-icon-halo">
      <font-awesome-icon :icon="icon" />
    </div>
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="primary-action empty-btn"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script>
export default {
  name: "HealthEmptyState",
  props: {
    icon: {
      type: String,
      default: "clipboard",
    },
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    actionLabel: {
      type: String,
      default: "",
    },
  },
  emits: ["action"],
};
</script>

<style scoped>
.health-empty-state {
  min-height: 240px;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--surface-1);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  box-shadow: var(--shadow-xs);
}

.empty-icon-halo {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(226, 83, 115, 0.12), rgba(141, 95, 211, 0.12));
  color: #e25373;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  margin-bottom: var(--space-4);
  box-shadow: 0 4px 12px rgba(226, 83, 115, 0.1);
}

.health-empty-state h3 {
  margin: 0 0 var(--space-2);
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.health-empty-state p {
  margin: 0 0 var(--space-5);
  max-width: 440px;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.empty-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
}

.empty-btn:active {
  transform: scale(0.98);
}

[data-theme="dark"] .empty-btn {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
}
</style>
