<template>
  <Transition name="slide-over-root">
    <div v-if="modelValue" class="modal-wrapper-fixed">
      <div class="modal-overlay" @click="close"></div>
      <div class="modal-content glass borderless" @click.stop>
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
  },
  emits: ["close"],
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
  z-index: 10000;
  display: grid;
  grid-template-columns: 1fr auto;
}

.modal-overlay {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.modal-content {
  grid-column: 2;
  grid-row: 1;
  width: 90vw;
  max-width: 500px;
  height: 100%;
  z-index: 2;
  position: relative;
  overflow-y: auto;
}

@media (max-width: 1100px) {
  .modal-content {
    width: calc(100dvw - 30px);
  }
}

@media (max-width: 480px) {
  .modal-content {
    grid-column: 1;
    width: calc(100dvw - 12px);
  }
}

.slide-over-root-enter-active,
.slide-over-root-leave-active {
  transition: opacity 0.3s ease;
}

.slide-over-root-enter-active .modal-content,
.slide-over-root-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.slide-over-root-enter-active .modal-overlay,
.slide-over-root-leave-active .modal-overlay {
  transition: opacity 0.3s ease;
}

.slide-over-root-enter-from .modal-overlay {
  opacity: 0;
}

.slide-over-root-enter-from .modal-content {
  transform: translateX(100%);
}

.slide-over-root-leave-to .modal-overlay {
  opacity: 0;
}

.slide-over-root-leave-to .modal-content {
  transform: translateX(100%);
}
</style>
