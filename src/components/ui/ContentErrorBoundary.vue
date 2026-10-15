<template>
  <div class="content-error-boundary">
    <div v-if="failed" key="recovery" class="content-recovery" role="alert">
      <font-awesome-icon icon="triangle-exclamation" />
      <h3>{{ title }}</h3>
      <p>Ocorreu um erro ao abrir o conteúdo. Você pode tentar novamente.</p>
      <div class="recovery-actions">
        <button type="button" @click="retry">Tentar novamente</button>
        <button v-if="actionLabel" type="button" @click="$emit('action')">{{ actionLabel }}</button>
      </div>
    </div>
    <div v-else :key="'content-' + revision" class="boundary-content"><slot /></div>
  </div>
</template>

<script>
export default {
  name: "ContentErrorBoundary",
  props: {
    resetKey: { type: [String, Number], default: null },
    title: { type: String, default: "Não foi possível exibir este conteúdo" },
    actionLabel: { type: String, default: "" },
  },
  emits: ["retry", "action"],
  data: () => ({ failed: false, revision: 0 }),
  errorCaptured(error) {
    const revision = this.revision;
    this.$nextTick(() => { if (revision === this.revision) this.failed = true; });
    console.warn("[Interface] Conteúdo isolado após erro:", error);
    return false;
  },
  watch: { resetKey() { this.revision++; this.failed = false; } },
  methods: { retry() { this.$emit("retry"); this.revision++; this.failed = false; } },
};
</script>

<style scoped>
.content-error-boundary, .boundary-content { height: 100%; min-height: 0; width: 100%; }
.content-recovery { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); padding: var(--space-5); text-align: center; color: var(--text-secondary); overflow: auto; }
.content-recovery > svg { font-size: 2rem; color: var(--yellow); }
.content-recovery h3 { color: var(--text-primary); }
.recovery-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); }
.recovery-actions button { padding: var(--space-2) var(--space-3); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-1); color: var(--text-primary); cursor: pointer; }
</style>
