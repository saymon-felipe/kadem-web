<template>
  <Transition :name="transition_name">
    <div v-if="modelValue" class="modal-wrapper-fixed" :class="{ 'is-floating': is_floating }">
      <div class="modal-overlay" @click="close"></div>
      <div class="modal-content glass" :class="`variant-${variant}`" @click.stop>
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "SideModal",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    variant: {
      type: String,
      default: "side",
      validator: (value) => ["side", "floating"].includes(value),
    },
  },
  emits: ["close"],
  computed: {
    is_floating() {
      return this.variant === "floating";
    },
    transition_name() {
      return this.is_floating ? "floating-modal" : "side-modal";
    },
  },
  methods: {
    close() {
      this.$emit("close");
    },
    handleKeydown(e) {
      if (e.key === "Escape" && this.modelValue) {
        this.close();
      }
    },
  },
  watch: {
    modelValue(val) {
      if (val) {
        document.addEventListener("keydown", this.handleKeydown);
      } else {
        document.removeEventListener("keydown", this.handleKeydown);
      }
    },
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.handleKeydown);
  },
};
</script>

<style scoped>
.modal-wrapper-fixed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  z-index: 10000;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.modal-wrapper-fixed.is-floating {
  display: grid;
  place-items: center;
  justify-content: center;
  padding: clamp(8px, 3vw, 24px);
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1;
  transition: opacity var(--transition-base);
}

.modal-content {
  z-index: 2;
  position: relative;
  background: var(--surface-0);
  box-shadow: var(--shadow-float);
  transition: background var(--transition-base);
}

/* Variante: painel lateral */
.variant-side {
  width: min(480px, 100%);
  height: 100%;
  overflow-y: auto;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

/* Variante: modal flutuante centralizado */
.variant-floating {
  width: 80dvw;
  max-width: 860px;
  height: 100%;
  max-height: 780px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

@media (max-width: 480px) {
  .variant-floating {
    border-radius: var(--radius-md);
    width: 96dvw;
    max-height: 90dvh;
  }
}

/* --- Animação: painel lateral --- */
.side-modal-enter-active,
.side-modal-leave-active {
  transition: opacity var(--transition-base);
}
.side-modal-enter-active .modal-content,
.side-modal-leave-active .modal-content {
  transition: transform var(--transition-spring), opacity var(--transition-base);
}
.side-modal-enter-active .modal-overlay,
.side-modal-leave-active .modal-overlay {
  transition: opacity var(--transition-base);
}
.side-modal-enter-from .modal-overlay,
.side-modal-leave-to .modal-overlay {
  opacity: 0;
}
.side-modal-enter-from .modal-content,
.side-modal-leave-to .modal-content {
  opacity: 0;
  transform: translateX(100%);
}

/* --- Animação: modal flutuante (spring) --- */
.floating-modal-enter-active,
.floating-modal-leave-active {
  transition: opacity var(--transition-base);
}
.floating-modal-enter-active .modal-content,
.floating-modal-leave-active .modal-content {
  transition: transform var(--transition-spring), opacity var(--transition-base);
}
.floating-modal-enter-active .modal-overlay,
.floating-modal-leave-active .modal-overlay {
  transition: opacity var(--transition-base);
}
.floating-modal-enter-from .modal-overlay,
.floating-modal-leave-to .modal-overlay {
  opacity: 0;
}
.floating-modal-enter-from .modal-content {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.floating-modal-leave-to .modal-content {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
</style>
