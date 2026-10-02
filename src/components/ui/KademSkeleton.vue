<template>
  <span class="k-skeleton" :class="`k-skeleton--${shape}`" :style="skeleton_style" aria-hidden="true"></span>
</template>

<script>
const to_css_size = (value) => (typeof value === "number" ? `${value}px` : value);

export default {
  name: "KademSkeleton",
  props: {
    shape: {
      type: String,
      default: "line",
      validator: (value) => ["line", "block", "circle", "pill"].includes(value),
    },
    width: { type: [String, Number], default: null },
    height: { type: [String, Number], default: null },
  },
  computed: {
    skeleton_style() {
      const style = {};
      if (this.width !== null) style["--sk-w"] = to_css_size(this.width);
      if (this.height !== null) style["--sk-h"] = to_css_size(this.height);
      // Circulo: so informar um lado ja basta para ficar proporcional.
      if (this.shape === "circle") {
        const side = this.width ?? this.height ?? 32;
        style["--sk-w"] = to_css_size(side);
        style["--sk-h"] = to_css_size(side);
      }
      return style;
    },
  },
};
</script>

<style scoped>
.k-skeleton {
  position: relative;
  display: block;
  flex-shrink: 0;
  overflow: hidden;
  width: var(--sk-w, 100%);
  height: var(--sk-h, 12px);
  border-radius: var(--sk-radius, 6px);
  background: var(--skeleton-base);
}

.k-skeleton--block {
  height: var(--sk-h, 100%);
  --sk-radius: var(--radius-sm);
}

.k-skeleton--circle {
  --sk-radius: 50%;
}

.k-skeleton--pill {
  height: var(--sk-h, 20px);
  --sk-radius: var(--radius-pill);
}

/* Brilho que atravessa o bloco; --sk-delay (herdado) escalona os blocos e colunas. */
.k-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 15%, var(--skeleton-shine) 50%, transparent 85%);
  transform: translateX(-100%);
  animation: k-skeleton-sweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  animation-delay: var(--sk-delay, 0s);
}

@keyframes k-skeleton-sweep {
  0% {
    transform: translateX(-100%);
  }
  65%,
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .k-skeleton::after {
    animation: none;
    opacity: 0;
  }
}
</style>
