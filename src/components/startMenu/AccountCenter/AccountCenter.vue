<template>
  <div class="account-center-container">

    <div v-if="!vault.isUnlocked" class="vault-lock-screen">
      <h3>Cofre Trancado</h3>
      <p>Digite sua Senha para desbloquear a Central de Contas.</p>

      <div class="form-group password-group">
        <div class="form-group">
          <input :type="passwordFieldType" v-model="masterPasswordInput" placeholder=" " id="unlock-vault"
            @keyup.enter="handleUnlock" />
          <label for="unlock-vault">Senha</label>
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>

        <span class="password-icon" @mousedown="showPassword" @mouseup="hidePassword" @mouseleave="hidePassword"
          @touchstart.prevent="showPassword" @touchend.prevent="hidePassword">
          <font-awesome-icon :icon="passwordFieldType === 'password' ? 'eye' : 'eye-slash'" />
        </span>
      </div>

      <button @click="handleUnlock" :disabled="isLoading" class="btn-small btn-save">
        {{ isLoading ? "Desbloqueando..." : "Desbloquear" }}
      </button>
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
        </div>
      </div>

      <AccountList :accounts="filteredAccounts" @edit="openEditForm" />

      <AccountForm v-if="isAccountFormOpen" :editData="editAccountData" @save="saveAccount"
        @close="isAccountFormOpen = false" />

      <Transition name="slide-over-root">
        <div v-if="show_rescue_modal" class="modal-overlay">
          <div class="modal-content glass" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h3 class="warning-text">Resgatar Contas Antigas 🛟</h3>
            </div>

            <div class="modal-body text-center">
              <p>O sistema detectou <strong>{{ vault.zombie_count }}</strong> conta(s) criadas no passado que estão
                trancadas com uma senha antiga.</p>
              <p>Insira a sua senha antiga do Kadem para destrancá-las e convertê-las para a criptografia atual.</p>

              <div class="form-group mt-4">
                <input id="rescue-pw" type="password" v-model="rescue_password" placeholder=" "
                  @keyup.enter="handle_rescue" />
                <label for="rescue-pw">Senha Antiga do Kadem</label>
              </div>

              <p v-if="rescue_error" class="error-message mt-2">{{ rescue_error }}</p>
            </div>

            <div class="modal-footer">
              <button class="btn btn-cancel" @click="close_rescue_modal" :disabled="is_rescuing">Cancelar</button>
              <button class="btn btn-primary" @click="handle_rescue" :disabled="is_rescuing || !rescue_password">
                {{ is_rescuing ? "Processando..." : "Resgatar Contas" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<script>
import AccountList from "./AccountList.vue";
import AccountForm from "./AccountForm.vue";
import { useVaultStore } from "@/stores/vault";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import loadingSpinner from "../../loadingSpinner.vue";

export default {
  components: {
    AccountList,
    AccountForm,
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
      isAccountFormOpen: false,
      editAccountData: null,
      passwordFieldType: "password",
      show_rescue_modal: false,
      rescue_password: "",
      rescue_error: "",
      is_rescuing: false
    };
  },
  computed: {
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

    showPassword() {
      this.passwordFieldType = "text";
    },

    hidePassword() {
      this.passwordFieldType = "password";
    },

    openAddForm() {
      this.editAccountData = null;
      this.isAccountFormOpen = true;
    },

    openEditForm(account) {
      this.editAccountData = account;
      this.isAccountFormOpen = true;
    },

    async saveAccount(accountData, localId = null) {
      try {
        if (localId) {
          await this.vault.updateAccount(localId, accountData);
        } else {
          await this.vault.createAccount(accountData);
        };
        this.isAccountFormOpen = false;
      } catch (err) {
        console.error("Erro ao salvar conta:", err);
      };
    },
    async handle_rescue() {
      this.is_rescuing = true;
      this.rescue_error = "";

      try {
        const recovered_count = await this.vault.rescue_legacy_accounts(
          this.rescue_password,
          this.auth.user.email
        );

        if (recovered_count > 0) {
          this.close_rescue_modal();
        } else {
          this.rescue_error = "Nenhuma conta pôde ser aberta com esta senha. Tente outra.";
        };
      } catch (error) {
        this.rescue_error = error.message || "Ocorreu um erro ao tentar recuperar as contas.";
      } finally {
        this.is_rescuing = false;
      };
    },

    close_rescue_modal() {
      this.show_rescue_modal = false;
      this.rescue_password = "";
      this.rescue_error = "";
    }
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
  gap: var(--space-4);
  text-align: center;
}

.password-group {
  position: relative;
  width: 100%;
  max-width: 300px;

  & .error-message {
    position: absolute;
    top: 105%;
    right: 0;
    font-size: var(--fontsize-xs);
    color: var(--red);
  }
}

.password-icon {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: #333;
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
  color: var(--primary-color);
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

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 9999;
}

.modal-content {
  background: #ffffff;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 450px;
  padding: var(--space-6);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  color: var(--deep-blue);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header h3 {
  margin-bottom: var(--space-2);
  text-align: center;
}

.modal-body p {
  margin-bottom: var(--space-3);
  font-size: 0.95rem;
  line-height: 1.4;
}

.warning-text {
  color: var(--orange, #e67e22);
  font-weight: bold;
}

.text-center {
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-4);
}

.modal-footer .btn {
  width: 100%;
}
</style>