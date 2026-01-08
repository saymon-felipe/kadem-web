<template>
  <Transition name="slide-up">
    <div v-if="modelValue" class="bottom-sheet-wrapper">
      <div class="backdrop" @click="close"></div>
      <div class="sheet-content glass">
        <div class="sheet-header">
          <div class="drag-handle"></div>
        </div>
        <div class="sheet-body">
          <slot></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "BottomSheetModal",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "close"],
  methods: {
    close() {
      this.$emit("update:modelValue", false);
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.bottom-sheet-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: none;
}

.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  backdrop-filter: blur(2px);
}

.sheet-content {
  position: relative;
  width: 100%;
  height: 85vh;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.1);
}

.sheet-header {
  width: 100%;
  padding: var(--space-3);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.drag-handle {
  width: 40px;
  height: 5px;
  background-color: var(--gray-300);
  border-radius: 10px;
}

.sheet-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease;
}

.slide-up-enter-active .sheet-content,
.slide-up-leave-active .sheet-content {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.slide-up-enter-from .backdrop,
.slide-up-leave-to .backdrop {
  opacity: 0;
}

.slide-up-enter-from .sheet-content,
.slide-up-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
