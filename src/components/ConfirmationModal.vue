<template>
  <BaseModal
    :model-value="modelValue"
    size="sm"
    :show-close="false"
    :show-header="false"
    :close-on-backdrop="true"
    :close-on-escape="true"
    :handle-mobile-back="true"
    custom-class="confirmation-modal-custom"
    @update:model-value="handleUpdateModelValue"
    @close="cancel"
  >
    <div class="confirm-dialog-content">
      <div class="confirm-icon-circle" :class="iconWrapperClass">
        <font-awesome-icon :icon="iconName" />
      </div>

      <div class="confirm-text-header">
        <h3 v-html="sanitize(message)"></h3>
      </div>

      <div class="confirm-text-body" v-if="sanitizedMessage">
        <p v-html="sanitizedMessage"></p>
      </div>

      <div class="confirm-action-footer">
        <button type="button" class="btn btn-cancel" @click="cancel">
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="btn btn-confirm"
          :class="confirmBtnClass"
          @click="confirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

export default {
  name: "ConfirmationModal",
  components: {
    BaseModal,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "Esta ação não pode ser desfeita.",
    },
    confirmText: {
      type: String,
      default: "Confirmar",
    },
    cancelText: {
      type: String,
      default: "Cancelar",
    },
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
    handleUpdateModelValue(val) {
      this.$emit("update:modelValue", val);
      if (!val) {
        this.$emit("cancelled");
      }
    },
    cancel() {
      this.$emit("update:modelValue", false);
      this.$emit("cancelled");
    },
    confirm() {
      this.$emit("update:modelValue", false);
      this.$emit("confirmed");
    },
  },
};
</script>

<style scoped>
.confirm-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-2);
}

.confirm-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: var(--space-2);
  transition: background var(--transition-base);
  flex-shrink: 0;
}

.confirm-icon-circle.info {
  background: var(--surface-2);
  color: var(--color-info);
}

.confirm-icon-circle.warning {
  background: var(--amber-high);
  color: var(--amber);
}

.confirm-icon-circle.danger {
  background: var(--red-high);
  color: var(--color-expense);
}

.confirm-text-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
}

.confirm-text-body p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.65;
  margin: 0;
}

.confirm-action-footer {
  display: flex;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-4);
}

.confirm-action-footer .btn {
  flex: 1;
  height: 44px;
  min-height: 44px;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-cancel {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.btn-cancel:hover {
  background: var(--surface-3);
}

.btn-confirm.btn-primary {
  background: var(--deep-blue);
  color: #ffffff;
}

.btn-confirm.btn-primary:hover {
  background: var(--deep-blue-2);
}

.btn-confirm.btn-red {
  background: var(--color-expense);
  color: #ffffff;
}

.btn-confirm.btn-red:hover {
  background: var(--red-low);
}

@media (max-width: 768px) {
  .confirm-dialog-content {
    padding: var(--space-2) 0 var(--space-4);
  }

  .confirm-action-footer {
    flex-direction: column-reverse;
    gap: var(--space-2);
  }

  .confirm-action-footer .btn {
    width: 100%;
    height: 48px;
    font-size: var(--fontsize-sm);
  }
}
</style>
