<template>
  <div class="panel pro-gate">
    <font-awesome-icon icon="lock" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button class="primary-action compact" @click="$emit('upgrade')">
      <font-awesome-icon icon="crown" />
      {{ actionLabel }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ProGate',
  emits: ['upgrade'],
  props: {
    title: {
      type: String,
      default: 'Recurso Pro',
    },
    description: {
      type: String,
      default: 'Open Finance e IA financeira entram no plano Pro.',
    },
    actionLabel: {
      type: String,
      default: 'Ver planos',
    },
  },
}
</script>

<style scoped>
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.pro-gate {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-5);
}

.pro-gate > svg {
  font-size: var(--fontsize-lg);
  color: #d4af37;
}

.pro-gate h3,
.pro-gate p {
  margin: 0;
}

.pro-gate p {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.primary-action {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
  transition:
    transform var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action.compact {
  min-height: 36px;
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}
</style>
