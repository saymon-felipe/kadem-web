<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast-anim" tag="div" class="toast-wrapper">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast-item', `toast-${toast.type || 'info'}`]"
        role="alert"
      >
        <div class="toast-icon">
          <font-awesome-icon
            v-if="toast.type === 'success'"
            icon="circle-check"
          />
          <font-awesome-icon
            v-else-if="toast.type === 'error'"
            icon="triangle-exclamation"
          />
          <font-awesome-icon
            v-else-if="toast.type === 'warning'"
            icon="triangle-exclamation"
          />
          <font-awesome-icon
            v-else
            icon="circle-info"
          />
        </div>

        <div class="toast-content">
          <strong v-if="toast.title" class="toast-title">{{ toast.title }}</strong>
          <span class="toast-message">{{ toast.message }}</span>
        </div>

        <button
          type="button"
          class="toast-close"
          @click="removeToast(toast.id)"
          title="Fechar"
        >
          <font-awesome-icon icon="xmark" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useAppStore } from "@/stores/app";

export default {
  name: "ToastContainer",
  computed: {
    ...mapState(useAppStore, ["toasts"]),
  },
  methods: {
    ...mapActions(useAppStore, ["removeToast"]),
  },
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 99999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: min(420px, calc(100vw - var(--space-6)));
}

.toast-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-float);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  min-width: 260px;
  max-width: 100%;
  transition: all var(--transition-base);
}

.toast-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.toast-success .toast-icon {
  color: var(--green);
}

.toast-error .toast-icon {
  color: var(--color-expense);
}

.toast-warning .toast-icon {
  color: var(--amber);
}

.toast-info .toast-icon {
  color: var(--color-info);
}

.toast-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 2px;
}

.toast-message {
  font-size: var(--fontsize-xs);
  line-height: 1.35;
  color: var(--text-primary);
  word-break: break-word;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
  flex-shrink: 0;
}

.toast-close:hover {
  color: var(--text-primary);
  background: var(--surface-3);
}

/* Animações */
.toast-anim-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.toast-anim-leave-active {
  transition: transform 0.25s ease-in, opacity 0.25s ease-in;
  position: absolute;
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-anim-move {
  transition: transform 0.25s ease;
}

@media (max-width: 768px) {
  .toast-container {
    top: auto;
    bottom: var(--space-4);
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    align-items: center;
    width: calc(100vw - var(--space-6));
  }

  .toast-anim-enter-from {
    transform: translateY(30px) scale(0.95);
  }

  .toast-anim-leave-to {
    transform: translateY(30px) scale(0.9);
  }
}
</style>
