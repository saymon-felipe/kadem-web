<template>
  <header class="health-header">
    <div class="health-title-group">
      <h2>Kadem Health</h2>
      <span>Hub de saúde</span>
    </div>

    <div class="health-actions">
      <button
        class="kadem-health-button kadem-health-button--icon kadem-health-button--secondary"
        :disabled="loading"
        title="Recarregar registros"
        type="button"
        @click="$emit('reload')"
      >
        <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
      </button>

      <button
        class="kadem-health-button kadem-health-button--secondary"
        type="button"
        @click="$emit('new-object')"
      >
        <font-awesome-icon icon="layer-group" />
        <span>Novo Objeto</span>
      </button>

      <button
        class="kadem-health-button kadem-health-button--primary"
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
