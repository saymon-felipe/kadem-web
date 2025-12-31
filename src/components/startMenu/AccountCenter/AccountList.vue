<template>
  <div class="account-list">
    <div v-if="!accounts.length" class="empty-state">
      <p>Nenhuma conta salva. Clique em "Adicionar Conta" para começar.</p>
    </div>
    <div v-for="account in accounts" :key="account.localId" class="account-item glass">
      <div class="account-meta">
        <img
          :src="returnAccountTypeImage(account)"
          :alt="account.type"
          class="avatar avatar-sm account-icon"
        />
        <div class="text-info">
          <strong class="account-name">{{ account.name }} ({{ account.type }})</strong>
          <span class="last-access-date">
            Último acesso: {{ formatLastAccess(account.lastAccess) }}
          </span>
        </div>
      </div>

      <div class="account-credentials">
        <div class="credential-field user-field">
          <span class="label">Usuário:</span>
          <input
            type="text"
            :value="account.user"
            readonly
            :class="{ revealed: vault.revealedPasswords[account.localId] }"
            :style="inputStyle(account.localId, false)"
          />

          <button
            v-if="vault.revealedPasswords[account.localId]"
            class="action-btn copy-btn ui-hover"
            @click="copyUserAndHide(account.localId, account.user)"
            title="Copiar Usuário"
          >
            <font-awesome-icon icon="copy" />
          </button>
        </div>

        <div class="credential-field password-field">
          <span class="label">Senha:</span>
          <input
            :type="vault.revealedPasswords[account.localId] ? 'text' : 'password'"
            :value="vault.revealedPasswords[account.localId] || '••••••••••••'"
            :class="{ revealed: vault.revealedPasswords[account.localId] }"
            readonly
            :style="inputStyle(account.localId, true)"
          />

          <button
            v-if="vault.revealedPasswords[account.localId]"
            class="action-btn copy-btn ui-hover"
            @click="copyPassword(account.localId)"
            title="Copiar Senha"
          >
            <font-awesome-icon icon="copy" />
          </button>
        </div>
      </div>

      <div class="account-actions">
        <button
          class="action-btn ui-hover"
          @click="toggleRevealAll(account.localId)"
          :title="
            vault.revealedPasswords[account.localId]
              ? 'Ocultar Credenciais'
              : 'Revelar Credenciais'
          "
        >
          <font-awesome-icon
            :icon="vault.revealedPasswords[account.localId] ? 'eye-slash' : 'eye'"
          />
        </button>

        <button
          class="action-btn ui-hover"
          @click="$emit('request-edit', account)"
          title="Editar Conta"
        >
          <font-awesome-icon icon="cog" />
        </button>

        <button
          class="action-btn delete-btn ui-hover"
          @click="confirmDelete(account)"
          title="Excluir Conta"
        >
          <font-awesome-icon icon="trash-can" />
        </button>
      </div>
    </div>

    <ConfirmationModal
      v-model="showDeleteModal"
      :message="deleteMessage"
      confirm-text="Excluir"
      @confirmed="handleDeleteAccount"
      @cancelled="showDeleteModal = false"
    />
  </div>
</template>

<script>
import defaultAccount from "@/assets/images/kadem-default-account.jpg";
import { useVaultStore } from "@/stores/vault";
import ConfirmationModal from "@/components/ConfirmationModal.vue";

export default {
  name: "AccountList",
  components: {
    ConfirmationModal,
  },
  props: {
    accounts: {
      type: Array,
      required: true,
    },
  },
  emits: ["request-edit"],
  setup() {
    const vault = useVaultStore();
    return { vault };
  },
  data() {
    return {
      showDeleteModal: false,
      accountToDelete: null,
      deleteMessage: "",
      copySuccessMessage: "",
    };
  },
  methods: {
    formatLastAccess(dateString) {
      if (!dateString) return "Nunca";
      const date = new Date(dateString);
      return (
        date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
        " - " +
        date.toLocaleDateString("pt-BR")
      );
    },
    returnAccountTypeImage(account) {
      if (!account.domain) {
        return defaultAccount;
      }

      return account.domain;
    },
    inputStyle(localId) {
      const isRevealed = this.vault.revealedPasswords[localId];

      const blur = isRevealed ? "0px" : "4px";

      return {
        filter: `blur(${blur})`,
        transition: "filter 0.2s ease-in-out",
        color: isRevealed ? "var(--deep-blue)" : "var(--text-gray)",
      };
    },
    toggleRevealAll(localId) {
      if (this.vault.revealedPasswords[localId]) {
        this.vault.hidePassword(localId);
      } else {
        this.vault.revealPassword(localId);
      }
    },
    async copyUserAndHide(localId, text) {
      try {
        await navigator.clipboard.writeText(text);

        this.vault.hidePassword(localId);

        if (this.setResponse) {
          this.setResponse(
            "success",
            "Usuário copiado com sucesso! (Credenciais ocultadas)",
            false
          );
          setTimeout(() => this.resetResponse(), 1500);
        }
      } catch (err) {
        console.error("Falha ao copiar:", err);
      }
    },
    async copyPassword(localId) {
      const success = await this.vault.copyPasswordToClipboard(localId);

      if (success && this.setResponse) {
        this.setResponse(
          "success",
          "Senha copiada com sucesso! (Ocultada por segurança)",
          false
        );
        setTimeout(() => this.resetResponse(), 1500);
      }
    },
    confirmDelete(account) {
      this.accountToDelete = account;
      this.deleteMessage = `Tem certeza que deseja excluir a conta "${account.name} - ${account.type}"?`;
      this.showDeleteModal = true;
    },
    async handleDeleteAccount() {
      if (this.accountToDelete) {
        await this.vault.deleteAccount(this.accountToDelete.localId);
      }
      this.showDeleteModal = false;
      this.accountToDelete = null;
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: absolute !important;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.empty-state {
  text-align: center;
  font-style: italic;
  color: var(--text-gray);
  margin: var(--space-6) auto;
}

.account-item {
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: var(--dark-yellow);
}

.account-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
  width: 30%;
  min-width: 180px;
}

.account-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: none !important;
  box-shadow: none !important;
}

.text-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.account-name {
  color: var(--deep-blue);
  font-size: var(--fontsize-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}

.last-access-date {
  font-size: var(--fontsize-xs);
  color: var(--text-gray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-credentials {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 250px;
}

.credential-field {
  display: flex;
  align-items: center;
  background-color: var(--gray-700);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-3);
  height: 35px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.credential-field .label {
  font-size: var(--fontsize-xs);
  color: var(--deep-blue-2);
  font-weight: 600;
  flex-shrink: 0;
  width: 65px;
}

.credential-field input {
  border: none;
  background: none;
  box-shadow: none;
  padding: 0;
  height: auto;
  flex-grow: 1;
  font-family: monospace;
  font-size: var(--fontsize-sm);
  color: var(--deep-blue);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.account-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-self: flex-start;
  flex-shrink: 0;
  padding-top: var(--space-2);
}

.action-btn {
  background: none;
  border: none;
  color: var(--deep-blue);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  font-size: var(--fontsize-sm);
  transition: color 0.2s ease;
  display: grid;
  place-items: center;
}

.action-btn.copy-btn {
  color: var(--deep-blue);
}

.action-btn.copy-btn:hover {
  color: var(--deep-blue-2);
}

.action-btn.delete-btn {
  color: var(--red);
}

.action-btn.delete-btn:hover {
  color: var(--red-low);
}

@media (max-width: 960px) {
  .account-item {
    flex-wrap: wrap;
  }

  .account-meta {
    width: 100%;
    min-width: unset;
  }

  .account-credentials {
    width: calc(100% - 40px);
    min-width: unset;
  }

  .account-actions {
    position: absolute;
    right: 10px;
    top: 10px;
    flex-direction: row;
    padding-top: 0;
  }
}

@media (max-width: 600px) {
  .account-credentials {
    flex-direction: column;
    width: 100%;
  }

  .account-actions {
    flex-direction: row;
    position: static;
    width: 100%;
    justify-content: flex-end;
    align-self: flex-end;
    margin-top: var(--space-3);
  }
}
</style>
