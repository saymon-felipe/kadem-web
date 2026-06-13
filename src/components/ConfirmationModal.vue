<template>
  <Transition name="slide-over-root">
    <div v-if="modelValue" class="modal-overlay" @click.self="cancel" role="dialog" aria-modal="true">
      <div class="modal-content" @click.stop>
        <div class="modal-icon-wrapper" :class="iconWrapperClass">
          <font-awesome-icon :icon="iconName" />
        </div>

        <div class="modal-header">
          <h3 v-html="sanitize(message)"></h3>
        </div>

        <div class="modal-body">
          <p v-html="sanitizedMessage"></p>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="cancel">Cancelar</button>
          <button
            class="btn"
            :class="confirmBtnClass"
            @click="confirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "ConfirmationModal",
  props: {
    modelValue:  { type: Boolean, default: false },
    description: { type: String,  default: "Esta ação não pode ser desfeita." },
    message:     { type: String,  required: true },
    confirmText: { type: String,  default: "Confirmar" },
  },
  emits: ["update:modelValue", "cancelled", "confirmed"],
  computed: {
    isWarning() {
      const t = (this.message || "").toLowerCase();
      return (
        t.includes("aviso") ||
        t.includes("atenção") ||
        t.includes("segurança") ||
        t.includes("não salvas")
      );
    },
    isDanger() {
      return (
        this.confirmText === "Excluir" ||
        this.confirmText === "Remover" ||
        this.confirmText === "Sair e Perder Dados" ||
        this.confirmText === "Sair e Fechar"
      );
    },
    iconName() {
      return this.isWarning ? "triangle-exclamation" : "circle-info";
    },
    iconWrapperClass() {
      if (this.isDanger) return "danger";
      if (this.isWarning) return "warning";
      return "info";
    },
    confirmBtnClass() {
      return this.isDanger ? "btn-red" : "btn-primary";
    },
    sanitizedMessage() {
      return this.sanitize(this.description);
    },
  },
  methods: {
    sanitize(html) {
      if (!html) return "";
      return html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
        .replace(/on\w+="[^"]*"/g, "");
    },
    cancel() {
      this.$emit("cancelled");
    },
    confirm() {
      this.$emit("confirmed");
    },
    handleKeydown(e) {
      if (e.key === "Escape" && this.modelValue) {
        this.cancel();
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
  z-index: 10000;
}

.modal-content {
  background: var(--surface-0);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 420px;
  padding: var(--space-7) var(--space-6);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  gap: var(--space-2);
}

/* Ícone */
.modal-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: var(--space-3);
  transition: background var(--transition-base);
}

.modal-icon-wrapper.info {
  background: var(--surface-2);
  color: var(--color-info);
}

.modal-icon-wrapper.warning {
  background: var(--amber-high);
  color: var(--amber);
}

.modal-icon-wrapper.danger {
  background: var(--red-high);
  color: var(--color-expense);
}

/* Header */
.modal-header h3 {
  margin: 0 0 var(--space-1) 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

/* Body */
.modal-body p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.65;
  margin: 0 0 var(--space-5) 0;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.modal-footer .btn {
  flex: 1;
  height: 44px;
  min-height: 44px;
  font-size: var(--fontsize-xs);
  font-weight: 600;
}
</style>
