<template>
  <BaseModal
    :model-value="modelValue"
    title="Resgatar Contas Antigas 🛟"
    size="md"
    :show-close="true"
    :close-on-backdrop="!is_rescuing"
    :close-on-escape="!is_rescuing"
    :handle-mobile-back="!is_rescuing"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div class="rescue-modal-content">
      <p>
        O sistema detectou <strong>{{ zombieCount }}</strong> conta(s) criadas no passado que estão
        trancadas com uma senha antiga.
      </p>
      <p>
        Insira a sua senha antiga do Kadem para destrancá-las e convertê-las para a criptografia atual.
      </p>

      <div class="form-group mt-4">
        <input
          id="rescue-pw"
          type="password"
          v-model="rescue_password"
          placeholder=" "
          @keyup.enter="handleRescue"
        />
        <label for="rescue-pw">Senha Antiga do Kadem</label>
      </div>

      <p v-if="error" class="error-message mt-2">{{ error }}</p>
    </div>

    <template #footer>
      <div class="rescue-modal-footer">
        <button
          type="button"
          class="btn btn-cancel"
          @click="handleClose"
          :disabled="is_rescuing"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="handleRescue"
          :disabled="is_rescuing || !rescue_password"
        >
          {{ is_rescuing ? "Processando..." : "Resgatar Contas" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import { useVaultStore } from "@/stores/vault";

export default {
  name: "RescueAccountsModal",
  components: {
    BaseModal,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    zombieCount: {
      type: [Number, String],
      default: 0,
    },
    userEmail: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "rescued", "close"],
  data() {
    return {
      rescue_password: "",
      is_rescuing: false,
      error: "",
    };
  },
  methods: {
    handleClose() {
      if (this.is_rescuing) return;
      this.rescue_password = "";
      this.error = "";
      this.$emit("update:modelValue", false);
      this.$emit("close");
    },
    async handleRescue() {
      if (this.is_rescuing || !this.rescue_password) return;
      this.error = "";
      this.is_rescuing = true;

      try {
        const vaultStore = useVaultStore();
        const recoveredCount = await vaultStore.rescue_legacy_accounts(
          this.rescue_password,
          this.userEmail
        );
        if (recoveredCount > 0) {
          this.rescue_password = "";
          this.$emit("rescued", recoveredCount);
          this.$emit("update:modelValue", false);
        } else {
          this.error = "Nenhuma conta pôde ser aberta com esta senha. Tente outra.";
        }
      } catch (err) {
        this.error = err.message || "Ocorreu um erro ao tentar recuperar as contas.";
      } finally {
        this.is_rescuing = false;
      }
    },
  },
};
</script>

<style scoped>
.rescue-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: center;
}

.rescue-modal-content p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.error-message {
  color: var(--color-expense);
  font-size: var(--fontsize-xs);
}

.rescue-modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.rescue-modal-footer .btn {
  height: 44px;
  min-width: 120px;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
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

.btn-primary {
  background: var(--deep-blue);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--deep-blue-2);
}

@media (max-width: 768px) {
  .rescue-modal-footer {
    flex-direction: column-reverse;
  }

  .rescue-modal-footer .btn {
    width: 100%;
    height: 48px;
  }
}
</style>
