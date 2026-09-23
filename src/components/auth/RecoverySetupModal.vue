<template>
  <BaseModal
    :model-value="modelValue"
    title="Atenção à Segurança 🔒"
    size="md"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    :handle-mobile-back="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="recovery-content">
      <p>
        Para garantir que você nunca perca suas senhas se esquecer o login, precisamos gerar sua
        <strong>Senha Mestra (Código E2EE)</strong>.
      </p>

      <div v-if="!generated_code" class="setup-form-block mt-4">
        <div class="form-group password-group">
          <input
            id="setup-password"
            :type="show_password ? 'text' : 'password'"
            v-model="setup_password"
            placeholder=" "
            @keyup.enter="handleGenerateRecovery"
          />
          <label for="setup-password">Digite sua senha atual</label>

          <span
            class="toggle-password"
            @mousedown="show_password = true"
            @mouseup="show_password = false"
            @mouseleave="show_password = false"
            @touchstart.prevent="show_password = true"
            @touchend.prevent="show_password = false"
          >
            <font-awesome-icon :icon="show_password ? 'eye-slash' : 'eye'" />
          </span>
        </div>

        <div class="forgot-password-container">
          <a href="#" @click.prevent="$emit('forgot-password')" class="forgot-link">Esqueci minha senha</a>
        </div>
      </div>

      <div v-else class="generated-code-box mt-4">
        <p class="warning-text">Copie e guarde este código em um lugar seguro. Ele NÃO será exibido novamente!</p>
        <h3 class="code-display">{{ generated_code }}</h3>
      </div>

      <p v-if="error" class="error-text mt-2">{{ error }}</p>
    </div>

    <template #footer>
      <div class="recovery-footer">
        <button
          v-if="!generated_code"
          class="btn btn-primary"
          @click="handleGenerateRecovery"
          :disabled="is_loading || !setup_password"
        >
          {{ is_loading ? "Gerando..." : "Gerar Senha Mestra" }}
        </button>
        <button
          v-else
          class="btn btn-success"
          @click="handleConfirmSaved"
        >
          Eu guardei o código com segurança
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import { useVaultStore } from "@/stores/vault";

export default {
  name: "RecoverySetupModal",
  components: {
    BaseModal,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    userEmail: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "completed", "forgot-password"],
  data() {
    return {
      setup_password: "",
      show_password: false,
      generated_code: null,
      is_loading: false,
      error: "",
    };
  },
  methods: {
    async handleGenerateRecovery() {
      if (!this.setup_password || this.is_loading) return;
      this.error = "";
      this.is_loading = true;

      try {
        const vaultStore = useVaultStore();
        const isValid = await vaultStore.checkMasterPassword(this.setup_password, this.userEmail);
        if (!isValid) throw new Error("Senha atual incorreta.");

        this.generated_code = await vaultStore.setup_recovery_key(this.setup_password, this.userEmail);
      } catch (err) {
        this.error = err.message || "Erro ao gerar chave de recuperação.";
      } finally {
        this.is_loading = false;
      }
    },
    handleConfirmSaved() {
      this.generated_code = null;
      this.setup_password = "";
      this.show_password = false;
      this.$emit("completed");
      this.$emit("update:modelValue", false);
    },
  },
};
</script>

<style scoped>
.recovery-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.recovery-content p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.password-group {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  padding: 4px;
}

.forgot-password-container {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.forgot-link {
  font-size: var(--fontsize-xs);
  color: var(--blue);
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.generated-code-box {
  background: var(--surface-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  text-align: center;
  border: 1px dashed var(--yellow);
}

.warning-text {
  color: var(--orange);
  font-size: var(--fontsize-xs);
  margin-bottom: var(--space-2);
  font-weight: 500;
}

.code-display {
  user-select: all;
  letter-spacing: 2px;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 1.25rem;
  margin: var(--space-2) 0 0 0;
}

.recovery-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: flex-end;
}

.recovery-footer .btn {
  width: 100%;
  height: 44px;
  font-weight: 600;
  border-radius: var(--radius-md);
}

.btn-success {
  background: var(--green);
  color: #ffffff;
  border: none;
}

.btn-success:hover {
  filter: brightness(0.95);
}

.error-text {
  color: var(--color-expense);
  font-size: var(--fontsize-xs);
}
</style>
