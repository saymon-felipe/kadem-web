<template>
  <Transition name="slide-over-root">
    <div v-if="modelValue" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true">
      <div class="modal-content glass modal-base" @click.stop>
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "BaseModal",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  methods: {
    close() {
      this.$emit("update:modelValue", false);
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 10001;
}

.modal-content {
  padding: var(--space-6);
  max-width: 450px;
  width: 90%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--surface-0);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
}
</style>