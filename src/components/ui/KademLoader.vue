<template>
  <div class="k-loader" :class="`k-loader--${size}`" :style="loader_style" role="status" aria-live="polite">
    <div class="k-loader__orb" aria-hidden="true">
      <span class="k-loader__halo"></span>
      <span class="k-loader__track"></span>
      <span class="k-loader__ring"></span>
      <span class="k-loader__core"></span>
    </div>
    <p class="k-loader__title">{{ title }}</p>
    <p v-if="hint" class="k-loader__hint">{{ hint }}</p>
  </div>
</template>

<script>
import { loadingContinuity } from "./loadingContinuity";

// Loader central para areas sem um layout previsivel para imitar (use KademSkeleton quando houver).
// Aparece so depois de `appear_delay` ms para nao piscar em cargas rapidas.
export default {
  name: "KademLoader",
  mixins: [loadingContinuity],
  props: {
    title: { type: String, default: "Carregando…" },
    hint: { type: String, default: "" },
    size: {
      type: String,
      default: "md",
      validator: (value) => ["sm", "md", "lg"].includes(value),
    },
  },
  computed: {
    loader_style() {
      return { "--k-loader-delay": `${this.delay_ms}ms` };
    },
  },
};
</script>

<style scoped>
.k-loader {
  --orb: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--space-6);
  text-align: center;
  animation: k-loader-appear 0.4s ease var(--k-loader-delay, 140ms) both;
}

.k-loader--sm {
  --orb: 40px;
  gap: var(--space-4);
}

.k-loader--lg {
  --orb: 92px;
}

.k-loader__orb {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--orb);
  height: var(--orb);
}

.k-loader__halo {
  position: absolute;
  inset: -40%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--loader-halo) 0%, transparent 65%);
  animation: k-loader-breathe 2.6s ease-in-out infinite;
}

.k-loader__track,
.k-loader__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  --stroke: max(3px, calc(var(--orb) * 0.07));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--stroke) - 1px), #000 calc(100% - var(--stroke)));
  mask: radial-gradient(farthest-side, transparent calc(100% - var(--stroke) - 1px), #000 calc(100% - var(--stroke)));
}

.k-loader__track {
  background: var(--loader-track);
}

/* Cauda de cometa: some na origem e termina forte na cabeca, que gira. */
.k-loader__ring {
  background: conic-gradient(from 0deg, transparent 0%, var(--orange) 60%, var(--yellow) 100%);
  animation: k-loader-spin 1.15s linear infinite;
}

.k-loader__core {
  width: 24%;
  height: 24%;
  border-radius: 50%;
  background: var(--yellow-gradient);
  box-shadow: 0 0 14px var(--loader-halo);
  animation: k-loader-pulse 1.6s ease-in-out infinite;
}

.k-loader__title {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
}

.k-loader__hint {
  margin-top: calc(var(--space-3) * -1);
  max-width: 280px;
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
}

.k-loader--sm .k-loader__title {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

@keyframes k-loader-appear {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes k-loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes k-loader-breathe {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes k-loader-pulse {
  0%,
  100% {
    transform: scale(0.75);
  }
  50% {
    transform: scale(1);
  }
}

/* O giro continua (e o sinal de progresso), mas mais calmo e sem pulsos. */
@media (prefers-reduced-motion: reduce) {
  .k-loader {
    animation: none;
  }

  .k-loader__ring {
    animation-duration: 2.8s;
  }

  .k-loader__halo,
  .k-loader__core {
    animation: none;
  }
}
</style>
