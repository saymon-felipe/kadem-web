<template>
  <div class="project-content-boundary">
    <div v-if="failed" key="recovery" class="project-recovery" role="alert">
      <font-awesome-icon icon="triangle-exclamation" />
      <h3>Não foi possível exibir esta aba</h3>
      <p>Ocorreu um erro ao abrir o conteúdo. Tente novamente ou volte para seus projetos.</p>
      <div class="recovery-actions">
        <button type="button" @click="retry">Tentar novamente</button>
        <button type="button" @click="$emit('back-to-list')">Voltar aos projetos</button>
      </div>
    </div>
    <div v-else :key="'content-' + revision" class="project-content"><slot /></div>
  </div>
</template>

<script>
export default {
  name: "ProjectContentBoundary",
  props: { resetKey: { type: [String, Number], default: null } },
  emits: ["back-to-list"],
  data: () => ({ failed: false, revision: 0 }),
  errorCaptured(error) {
    const revision = this.revision;
    // Aguarda o patch atual terminar antes de desmontar a árvore que falhou.
    this.$nextTick(() => { if (revision === this.revision) this.failed = true; });
    console.warn("[Projects] Conteúdo da aba isolado após erro:", error);
    return false;
  },
  watch: { resetKey() { this.retry(); } },
  methods: { retry() { this.revision++; this.failed = false; } },
};
</script>

<style scoped>
.project-content-boundary, .project-content { height: 100%; min-height: 0; }
.project-recovery { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); padding: var(--space-5); text-align: center; color: var(--text-secondary); }
.project-recovery > svg { font-size: 2rem; color: var(--yellow); }
.project-recovery h3 { color: var(--text-primary); }
.recovery-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); }
.recovery-actions button { padding: var(--space-2) var(--space-3); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-1); color: var(--text-primary); cursor: pointer; }
</style>
