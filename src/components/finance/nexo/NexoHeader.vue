<template>
  <header class="nexo-header">
    <div>
      <h2>Kadem Nexo</h2>
      <span>{{ planLabel }} · {{ aiUsageLabel }}</span>
    </div>

    <div class="nexo-actions">
      <input
        :value="selectedMonth"
        type="month"
        @input="$emit('update:selectedMonth', $event.target.value)"
        @change="$emit('reload')"
      />
      <button class="icon-btn" :disabled="loading" title="Atualizar" @click="$emit('reload')">
        <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
      </button>
      <button class="primary-action" @click="$emit('new-transaction')">
        <font-awesome-icon icon="plus" />
        Lançamento
      </button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'NexoHeader',
  emits: ['new-transaction', 'reload', 'update:selectedMonth'],
  props: {
    selectedMonth: {
      type: String,
      required: true,
    },
    planLabel: {
      type: String,
      required: true,
    },
    aiUsageLabel: {
      type: String,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.nexo-header,
.nexo-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.nexo-header {
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.nexo-header h2 {
  margin: 0;
}

.nexo-header span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.nexo-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.nexo-actions input {
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  box-shadow: none;
  outline: none;
  font-size: var(--fontsize-sx);
  transition: border-color var(--transition-fast);
}

.nexo-actions input:focus {
  border-color: var(--deep-blue);
  outline: none;
  box-shadow: none;
}

.primary-action,
.icon-btn {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-action:active,
.icon-btn:active {
  transform: scale(0.97);
}

.icon-btn {
  width: 40px;
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-btn:hover {
  background: var(--dark-yellow-2);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
