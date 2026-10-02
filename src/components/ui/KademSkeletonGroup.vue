<template>
  <div class="k-skeleton-group" :style="group_style" role="status" aria-live="polite" aria-busy="true">
    <span class="k-skeleton-group__label">{{ label }}</span>
    <slot />
  </div>
</template>

<script>
import { loadingContinuity } from "./loadingContinuity";

// Raiz de todo esqueleto de layout: anuncia o carregamento para leitores de tela e so
// aparece depois de `appear_delay` ms. Se os dados chegam antes disso (cache local rapido),
// o esqueleto nunca chega a ser visto, evitando um flash de meio segundo.
export default {
  name: "KademSkeletonGroup",
  mixins: [loadingContinuity],
  props: {
    label: { type: String, default: "Carregando…" },
  },
  computed: {
    group_style() {
      return { "--sk-appear-delay": `${this.delay_ms}ms` };
    },
  },
};
</script>

<style scoped>
.k-skeleton-group {
  animation: k-skeleton-appear 0.35s ease var(--sk-appear-delay, 140ms) both;
}

.k-skeleton-group__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes k-skeleton-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
