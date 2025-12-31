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
          <input type="text" placeholder=" " class="search-bar" v-model="searchQuery" />
          <label>Filtrar Nome ou email</label>
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
          Trancar cofre
        </button>
      </div>
    </div>

    <SideModal v-model="showAddModal" @close="handleCloseModal">
      <AccountForm
        :accountToEdit="accountToEdit"
        @save="handleSaveOrUpdateAccount"
        @close="handleCloseModal"
      />
    </SideModal>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useVaultStore } from "@/stores/vault";
import { useAuthStore } from "@/stores/auth";
import AccountList from "./AccountList.vue";
import AccountForm from "./AccountForm.vue";
import SideModal from "@/components/SideModal.vue";

export default {
  components: {
    AccountList,
    AccountForm,
    SideModal,
  },
  data() {
    return {
      masterPasswordInput: "",
      passwordFieldType: "password",
      error: "",
      isLoading: false,
      searchQuery: "",
      showAddModal: false,
      accountToEdit: null,
    };
  },
  computed: {
    ...mapState(useVaultStore, ["isUnlocked"]),
    ...mapState(useAuthStore, ["user"]),
    vault() {
      return useVaultStore();
    },
    filteredAccounts() {
      if (!this.searchQuery) return this.vault.accounts;
      const lowerQuery = this.searchQuery.toLowerCase();
      return this.vault.accounts.filter(
        (acc) =>
          acc.name.toLowerCase().includes(lowerQuery) ||
          (acc.user && acc.user.toLowerCase().includes(lowerQuery)) ||
          (acc.email && acc.email.toLowerCase().includes(lowerQuery))
      );
    },
  },
  methods: {
    async handleUnlock() {
      this.isLoading = true;
      this.error = "";
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const success = await this.vault.unlockVault(
          this.masterPasswordInput,
          this.user.email
        );
        if (!success) {
          this.error = "Senha incorreta";
        }
      } catch (e) {
        this.error = "Erro ao tentar desbloquear";
        console.error(e);
      } finally {
        this.isLoading = false;
        this.masterPasswordInput = "";
      }
    },
    showPassword() {
      this.passwordFieldType = "text";
    },
    hidePassword() {
      this.passwordFieldType = "password";
    },
    handleRequestEdit(account) {
      this.accountToEdit = JSON.parse(JSON.stringify(account));
      this.showAddModal = true;
    },
    handleCloseModal() {
      this.showAddModal = false;
      this.accountToEdit = null;
    },
    async handleSaveOrUpdateAccount(data, localDataId) {
      try {
        if (localDataId) {
          await this.vault.updateAccount(localDataId, data);
        } else {
          await this.vault.createAccount(data);
        }
        this.handleCloseModal();
      } catch (err) {
        console.error("Erro ao salvar/editar conta:", err);
      }
    },
  },
};
</script>

<style scoped>
.account-center-container {
  width: 100%;
  height: 100%;
  color: var(--deep-blue);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  min-height: 0;
  padding-right: var(--space-2);
  margin-right: calc(var(--space-2) * -1);
  margin-top: var(--space-2);
}

.scrollable-content::-webkit-scrollbar {
  width: 6px;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.buttons {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  background-color: transparent;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: var(--space-2);
}
</style>
