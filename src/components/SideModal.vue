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
  background-color: rgba(14, 18, 34, 0.46);
  backdrop-filter: blur(2px);
  z-index: 1;
}

.modal-content {
  z-index: 2;
  position: relative;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: -18px 0 40px rgba(13, 20, 45, 0.2);
}

.variant-side {
  width: min(460px, 100%);
  height: 100%;
  overflow-y: auto;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.variant-floating {
  width: 80dvw;
  max-width: 860px;
  height: 100%;
  max-height: 760px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow:
    0 24px 70px rgba(13, 20, 45, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

@media (max-width: 480px) {
  .variant-floating {
    border-radius: var(--radius-md);
    width: 95dvw;
  }
}

.side-modal-enter-active,
.side-modal-leave-active {
  transition: opacity 0.2s ease;
}

.side-modal-enter-active .modal-content,
.side-modal-leave-active .modal-content {
  transition: transform 0.24s ease, opacity 0.2s ease;
}

.side-modal-enter-active .modal-overlay,
.side-modal-leave-active .modal-overlay {
  transition: opacity 0.2s ease;
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

.floating-modal-enter-active,
.floating-modal-leave-active {
  transition: opacity 0.22s ease;
}

.floating-modal-enter-active .modal-content,
.floating-modal-leave-active .modal-content {
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.25, 1.12), opacity 0.2s ease;
}

.floating-modal-enter-active .modal-overlay,
.floating-modal-leave-active .modal-overlay {
  transition: opacity 0.22s ease;
}

.floating-modal-enter-from .modal-overlay,
.floating-modal-leave-to .modal-overlay {
  opacity: 0;
}

.floating-modal-enter-from .modal-content {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.floating-modal-leave-to {
  opacity: 0;
}

.floating-modal-leave-to .modal-content {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
