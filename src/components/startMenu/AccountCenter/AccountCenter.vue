<template>
  <div class="account-center-container">
    <div v-if="!vault.isUnlocked" class="vault-lock-screen">
      <h3>Cofre Trancado</h3>
      <p>Digite sua Senha para desbloquear a Central de Contas.</p>

      <div class="form-group password-group">
        <div class="form-group">
          <input
            :type="passwordFieldType"
            v-model="masterPasswordInput"
            placeholder=" "
            @keyup.enter="handleUnlock"
          />
          <label>Senha</label>
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>
        <font-awesome-icon
          icon="eye"
          class="password-icon"
          @mousedown="showPassword"
          @mouseup="hidePassword"
          @mouseleave="hidePassword"
        />
      </div>
      <button @click="handleUnlock" :disabled="isLoading" class="btn-small btn-save">
        {{ isLoading ? "Desbloqueando..." : "Desbloquear" }}
      </button>
    </div>

    <div v-else class="vault-unlocked-screen">
      <div class="header-search">
        <div class="form-group">
          <input
            type="text"
            placeholder=" "
            class="search-bar"
            id="filter-account-input"
            v-model="searchQuery"
          />
          <label for="filter-account-input">Filtrar Nome, email ou tipo</label>
        </div>
      </div>

      <AccountList
        :accounts="filteredAccounts"
        class="scrollable-content"
        @request-edit="handleRequestEdit"
      />

      <div class="buttons">
        <button @click="showAddModal = true" class="btn-small btn-cancel">
          Adicionar Conta
        </button>
        <button @click="vault.lockVault()" class="btn-small btn-save">
          Trancar Cofre
        </button>
      </div>

      <SideModal v-model="showAddModal" @close="handleCloseModal">
        <AccountForm
          @close="handleCloseModal"
          @save="handleSaveNewAccount"
          :edit-account="accountToEdit"
        />
      </SideModal>
    </div>
  </div>
</template>

<script>
import { useVaultStore } from "@/stores/vault";
import { useAuthStore } from "@/stores/auth";
import AccountList from "./AccountList.vue";
import AccountForm from "./AccountForm.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import SideModal from "@/components/SideModal.vue";

export default {
  name: "AccountCenter",
  components: {
    SideModal,
    AccountList,
    AccountForm,
    FontAwesomeIcon,
  },
  setup() {
    const vault = useVaultStore();
    const auth = useAuthStore();
    return { vault, auth };
  },
  data() {
    return {
      masterPasswordInput: "",
      passwordFieldType: "password",
      isLoading: false,
      error: null,
      showAddModal: false,
      searchQuery: "",
      accountToEdit: null,
    };
  },
  computed: {
    filteredAccounts() {
      if (!this.searchQuery) {
        return this.vault.accounts;
      }
      const q = this.searchQuery.toLowerCase();
      // Filtro aprimorado para nome, usuário e tipo da conta
      return this.vault.accounts.filter(
        (acc) =>
          acc.name.toLowerCase().includes(q) ||
          acc.user.toLowerCase().includes(q) ||
          (acc.type && acc.type.toLowerCase().includes(q))
      );
    },
  },
  mounted: function () {},
  methods: {
    showPassword() {
      this.passwordFieldType = "text";
    },
    hidePassword() {
      this.passwordFieldType = "password";
    },

    async handleUnlock() {
      if (this.isLoading || !this.masterPasswordInput) return;

      this.isLoading = true;
      this.error = null;

      try {
        const userSalt = this.auth.user.email;
        await this.vault.unlockVault(this.masterPasswordInput, userSalt);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
        this.masterPasswordInput = "";
      }
    },

    handleRequestEdit(account) {
      this.accountToEdit = account;
      this.showAddModal = true;
    },

    handleCloseModal() {
      this.showAddModal = false;
      this.accountToEdit = null;
    },

    async handleSaveNewAccount(accountData) {
      try {
        if (accountData.localId) {
          // Lógica de edição se necessário (assumindo que o store suporte update)
          await this.vault.updateAccount(accountData);
        } else {
          await this.vault.createAccount(accountData);
        }
        this.handleCloseModal();
      } catch (err) {
        console.error("Erro ao salvar conta:", err);
      }
    },
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
  z-index: 2;
}

.password-icon:hover {
  opacity: 1;
}

.vault-unlocked-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding-bottom: var(--space-2);
}

.header-search {
  flex: 0 0 auto;
  padding-bottom: var(--space-4);
  z-index: 5;
}

.search-bar {
  width: 100%;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: var(--space-4);
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) rgba(255, 255, 255, 0.1);
}

.buttons {
  flex: 0 0 auto;
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: var(--space-3);
}
</style>
