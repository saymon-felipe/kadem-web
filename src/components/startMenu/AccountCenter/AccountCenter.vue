<template>
  <div class="account-center-container">

    <div v-if="!vault.isUnlocked" class="vault-lock-screen">
      <h3>Cofre Trancado</h3>
      <p>Digite sua Senha para desbloquear a Central de Contas.</p>

      <div class="vault-unlock-form">
        <div class="form-group password-group">
          <input :type="passwordFieldType" v-model="masterPasswordInput" placeholder=" " id="unlock-vault"
            @keyup.enter="handleUnlock" />
          <label for="unlock-vault">Senha</label>

          <span class="password-icon" @mousedown="showPassword" @mouseup="hidePassword" @mouseleave="hidePassword"
            @touchstart.prevent="showPassword" @touchend.prevent="hidePassword">
            <font-awesome-icon :icon="passwordFieldType === 'password' ? 'eye' : 'eye-slash'" />
          </span>
        </div>

        <p v-if="error" class="vault-unlock-error" role="alert">{{ error }}</p>

        <div class="vault-unlock-actions">
          <button @click="handleUnlock" :disabled="isLoading" class="btn-small btn-save">
            {{ isLoading ? "Desbloqueando..." : "Desbloquear" }}
          </button>

          <button
            v-if="canUseVaultBiometrics && hasVaultBiometricUnlock"
            @click="handleBiometricUnlock"
            :disabled="isBiometricLoading"
            class="btn-small btn-save biometric-unlock-btn"
          >
            <font-awesome-icon icon="fingerprint" />
            {{ isBiometricLoading ? "Validando..." : "Desbloquear com digital" }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="vault-unlocked-screen">

      <div class="vault-header-actions">
        <div class="form-group search-group">
          <input type="text" placeholder=" " class="search-bar" id="filter-account-input" v-model="searchQuery" />
          <label for="filter-account-input">Filtrar Nome, email ou tipo</label>
        </div>

        <div class="header-buttons">
          <button v-if="vault.zombie_count > 0" class="btn-small rescue-btn" @click="show_rescue_modal = true"
            title="Recuperar contas que não abriram com a senha atual">
            <font-awesome-icon icon="life-ring" /> Resgatar ({{ vault.zombie_count }})
          </button>

          <button class="btn-small btn-cancel" @click="openAddForm">
            <font-awesome-icon icon="plus" /> Adicionar Conta
          </button>

          <button class="btn-small btn-save" @click="vault.lockVault()">
            <font-awesome-icon icon="lock" /> Trancar
          </button>

          <button
            v-if="canUseVaultBiometrics"
            class="btn-small biometric-unlock-btn"
            @click="toggleVaultBiometrics"
            :disabled="isBiometricLoading"
          >
            <font-awesome-icon icon="fingerprint" />
            {{
              isBiometricLoading
                ? "Processando..."
                : hasVaultBiometricUnlock
                  ? "Desativar digital"
                  : "Ativar digital"
            }}
          </button>
        </div>
      </div>

      <p v-if="error" role="alert" class="error-message">{{ error }}</p>

      <AccountList :accounts="filteredAccounts" @request-edit="openEditForm" />

      <BaseModal
        v-model="showAddModal"
        :title="accountToEdit ? 'Editar Conta' : 'Adicionar Nova Conta'"
        size="md"
        @close="handleCloseModal"
      >
        <AccountForm
          v-if="showAddModal"
          :account-to-edit="accountToEdit"
          @close="handleCloseModal"
          @save="handleSaveNewAccount"
        />
      </BaseModal>

      <RescueAccountsModal
        v-model="show_rescue_modal"
        :zombie-count="vault.zombie_count"
        :user-email="auth.user?.email || ''"
        @rescued="handleRescuedAccounts"
        @close="show_rescue_modal = false"
      />

    </div>
  </div>
</template>

<script>
import AccountList from "./AccountList.vue";
import AccountForm from "./AccountForm.vue";
import BaseModal from "@/components/BaseModal.vue";
import RescueAccountsModal from "./RescueAccountsModal.vue";
import { useVaultStore } from "@/stores/vault";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import loadingSpinner from "../../loadingSpinner.vue";
import {
  isBiometricCancellationError,
  isBiometricSupported,
} from "@/services/biometricAuth";

export default {
  components: {
    AccountList,
    AccountForm,
    BaseModal,
    RescueAccountsModal,
    loadingSpinner
  },
  setup() {
    const vault = useVaultStore();
    const appStore = useAppStore();
    const auth = useAuthStore();

    return { vault, appStore, auth };
  },
  data() {
    return {
      searchQuery: "",
      masterPasswordInput: "",
      error: "",
      isLoading: false,
      showAddModal: false,
      accountToEdit: null,
      passwordFieldType: "password",
      show_rescue_modal: false,
      biometricSupported: false,
      isBiometricLoading: false,
      vaultBiometricConfigured: false,
    };
  },
  computed: {
    canUseVaultBiometrics() {
      return this.appStore.isMobile && this.biometricSupported && !!this.auth.user?.email;
    },
    hasVaultBiometricUnlock() {
      return this.vaultBiometricConfigured;
    },
    filteredAccounts() {
      if (!this.searchQuery) return this.vault.accounts;

      const query = this.searchQuery.toLowerCase();

      return this.vault.accounts.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(query)) ||
          (a.user && a.user.toLowerCase().includes(query)) ||
          (a.type && a.type.toLowerCase().includes(query))
      );
    },
  },
  methods: {
    openAddForm() {
      this.accountToEdit = null;
      this.showAddModal = true;
    },
    async handleUnlock() {
      this.error = "";
      this.isLoading = true;

      try {
        await this.vault.unlockVault(this.masterPasswordInput, this.auth.user.email);
        this.masterPasswordInput = "";
        this.passwordFieldType = "password";
      } catch (err) {
        this.error = "Senha incorreta. Tente novamente.";
      } finally {
        this.isLoading = false;
      };
    },

    async handleBiometricUnlock() {
      if (this.isBiometricLoading) return;

      this.error = "";
      this.isBiometricLoading = true;

      try {
        const unlocked = await this.vault.unlockVaultWithBiometrics(this.auth.user.email);
        if (!unlocked) this.error = this.vault.biometricError;
      } catch (error) {
        if (!isBiometricCancellationError(error)) {
          this.error = error.message || "Não foi possível validar a digital.";
        }
      } finally {
        this.isBiometricLoading = false;
      }
    },

    async toggleVaultBiometrics() {
      if (this.isBiometricLoading) return;

      this.error = "";
      this.isBiometricLoading = true;

      try {
        if (this.hasVaultBiometricUnlock) {
          this.vault.disableBiometricUnlock(this.auth.user.email);
        } else {
          const enabled = await this.vault.enableBiometricUnlock(this.auth.user.email);
          if (!enabled) this.error = this.vault.biometricError;
        }
        this.refreshVaultBiometricStatus();
      } catch (error) {
        if (!isBiometricCancellationError(error)) {
          this.error = error.message || "Não foi possível configurar a digital.";
        }
      } finally {
        this.isBiometricLoading = false;
      }
    },

    showPassword() {
      this.passwordFieldType = "text";
    },

    hidePassword() {
      this.passwordFieldType = "password";
    },
    openEditForm(account) {
      console.log(account)
      this.accountToEdit = account;
      this.showAddModal = true;
    },

    handleCloseModal() {
      this.showAddModal = false;
      this.accountToEdit = null;
    },
    async handleSaveNewAccount(accountData, localId = null) {
      try {
        if (localId) {
          await this.vault.updateAccount(localId, accountData);
        } else {
          await this.vault.createAccount(accountData);
        };
        this.handleCloseModal();
      } catch (err) {
        console.error("Erro ao salvar conta:", err);
      }
    },
    handleRescuedAccounts() {
      this.show_rescue_modal = false;
    },

    refreshVaultBiometricStatus() {
      this.vaultBiometricConfigured = this.vault.hasBiometricUnlock(
        this.auth.user?.email,
      );
    },
  },
  async mounted() {
    this.biometricSupported = await isBiometricSupported();
    this.refreshVaultBiometricStatus();
  },
};
</script>

<style scoped>
.account-center-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vault-lock-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--space-6) var(--space-4);
  gap: var(--space-3);
  text-align: center;
  overflow-y: auto;
}

.vault-unlock-form {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.password-group {
  position: relative;
  margin: 0;
}

.vault-unlock-error {
  margin: 0;
  color: var(--red);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
  text-align: left;
}

.vault-unlock-actions {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-1);
}

.password-icon {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  user-select: none;
  z-index: 10;
  padding: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-icon:hover {
  opacity: 1;
  color: var(--text-primary);
}

.biometric-unlock-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.vault-unlocked-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.vault-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  width: 100%;
  flex-wrap: wrap;
}

.search-group {
  flex-grow: 1;
  min-width: 200px;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
  justify-content: flex-end;
  width: 100%;
}

.rescue-btn {
  background-color: var(--orange, #f39c12);
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  border: none;
  font-weight: bold;
}

.rescue-btn:hover {
  background-color: #e67e22;
}
</style>
