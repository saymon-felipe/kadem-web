<template>
  <header class="health-header">
    <div class="health-title-group">
      <h2>Kadem Health</h2>
      <span>Hub de saúde</span>
    </div>

    <div class="health-actions">
      <button
        class="icon-btn"
        :disabled="loading"
        title="Recarregar registros"
        type="button"
        @click="$emit('reload')"
      >
        <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
      </button>

      <button
        class="secondary-btn"
        type="button"
        @click="$emit('new-object')"
      >
        <font-awesome-icon icon="layer-group" />
        <span>Novo Objeto</span>
      </button>

      <button
        class="primary-action"
        type="button"
        @click="$emit('new-action')"
      >
        <font-awesome-icon icon="plus" />
        <span>Lançamento</span>
      </button>
    </div>
  </header>
</template>

<script>
export default {
  name: "HealthHeader",
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["reload", "new-object", "new-action"],
};
</script>

<style scoped>
.health-header,
.health-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.health-header {
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.health-title-group h2 {
  margin: 0;
  font-size: var(--fontsize-md);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.health-title-group span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  display: block;
  margin-top: 2px;
}

.health-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.icon-btn,
.secondary-btn,
.primary-action {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: 6px;
  font-weight: 600;
  font-size: var(--fontsize-sx);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.icon-btn {
  width: 40px;
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.icon-btn:hover {
  background: var(--surface-3);
}

.secondary-btn {
  background: var(--surface-1);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 0 var(--space-4);
  box-shadow: var(--shadow-xs);
}

.secondary-btn:hover {
  background: var(--surface-2);
  transform: translateY(-1px);
}

.primary-action {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  padding: 0 var(--space-4);
  box-shadow: 0 4px 12px rgba(226, 83, 115, 0.25);
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-action:active,
.secondary-btn:active,
.icon-btn:active {
  transform: scale(0.97);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .health-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .health-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
