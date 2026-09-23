<template>
  <BaseModal
    :model-value="modelValue"
    title="Atenção ao seu Cofre 🔒"
    size="md"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    :handle-mobile-back="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="migration-content">
      <p>
        Detectamos que sua senha foi alterada. Por segurança, suas contas ainda estão criptografadas e precisam
        ser migradas.
      </p>
      <p>
        Para recuperar o acesso, insira seu
        <strong>Código de Recuperação (Senha Mestra)</strong> que você salvou anteriormente.
      </p>

      <div class="form-group mt-4">
        <input id="recovery-code" type="text" v-model="recovery_code" placeholder=" " />
        <label for="recovery-code">Código de Recuperação (Senha Mestra)</label>
      </div>

      <div class="form-group password-group mt-2">
        <input
          id="new-pw"
          :type="show_password ? 'text' : 'password'"
          v-model="current_password"
          placeholder=" "
          @keyup.enter="handleMigration"
        />
        <label for="new-pw">Confirme sua Senha Atual do Sistema</label>

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

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>

    <template #footer>
      <div class="migration-footer">
        <button
          class="btn btn-primary"
          @click="handleMigration"
          :disabled="is_migrating || !recovery_code || !current_password"
        >
          {{ is_migrating ? "Descriptografando..." : "Migrar Cofre" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import { useVaultStore } from "@/stores/vault";

export default {
  name: "VaultMigrationModal",
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
  emits: ["update:modelValue", "migrated"],
  data() {
    return {
      recovery_code: "",
      current_password: "",
      show_password: false,
      is_migrating: false,
      error: "",
    };
  },
  methods: {
    async handleMigration() {
      if (this.is_migrating || !this.recovery_code || !this.current_password) return;
      this.error = "";
      this.is_migrating = true;

      try {
        const vaultStore = useVaultStore();
        await vaultStore.execute_home_migration(
          this.recovery_code,
          this.current_password,
          this.userEmail
        );
        this.recovery_code = "";
        this.current_password = "";
        this.$emit("migrated");
        this.$emit("update:modelValue", false);
      } catch (err) {
        this.error = err.message || "Código E2EE ou Senha incorretos. Tente novamente.";
      } finally {
        this.is_migrating = false;
      }
    },
  },
};
</script>

<style scoped>
.migration-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.migration-content p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.migration-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: flex-end;
}

.migration-footer .btn {
  width: 100%;
  height: 44px;
  font-weight: 600;
  border-radius: var(--radius-md);
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

.error-text {
  color: var(--color-expense);
  font-size: var(--fontsize-xs);
  margin-top: var(--space-2);
}
</style>
