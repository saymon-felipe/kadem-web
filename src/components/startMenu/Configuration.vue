<template>
  <div class="config-wrapper">
    <section class="config-section">
      <h3>Aparência</h3>
      <p>Escolha o tema visual do Kadem. A preferência é salva localmente no navegador.</p>
      <div class="theme-options">
        <button
          class="theme-option"
          :class="{ active: !isDark }"
          @click="setTheme('light')"
        >
          <font-awesome-icon icon="sun" />
          <span>Claro</span>
        </button>
        <button
          class="theme-option"
          :class="{ active: isDark }"
          @click="setTheme('dark')"
        >
          <font-awesome-icon icon="moon" />
          <span>Escuro</span>
        </button>
      </div>
    </section>

    <section class="config-section">
      <h3>Segurança</h3>
      <p>
        Para redefinir sua senha, enviaremos um link de recuperação para o seu e-mail.
      </p>
      <button
        class="btn btn-primary"
        :disabled="!connection.connected || isLoading"
        :title="!connection.connected ? 'Esta ação requer conexão com a internet.' : ''"
        @click="showResetModal = true"
      >
        {{ isLoading ? "Enviando..." : "Solicitar redefinição de senha" }}
      </button>
      <LoadingResponse
        :msg="responseMsg"
        :type="responseType"
        styletype="small"
        :loading="false"
      />
    </section>

    <section class="config-section">
      <h3>Conta</h3>
      <p>
        Esta é uma ação irreversível. Todos os seus dados, projetos e informações do cofre
        serão permanentemente excluídos do Kadem.
      </p>
      <button
        class="btn btn-red"
        :disabled="!connection.connected"
        :title="!connection.connected ? 'Esta ação requer conexão com a internet.' : ''"
        @click="showDeleteModal = true"
      >
        Excluir conta
      </button>
    </section>

    <ConfirmationModal
      v-model="showResetModal"
      message="Você confirma que deseja solicitar a redefinição da sua senha? "
      description="Um e-mail será enviado para sua conta."
      confirm-text="Confirmar"
      @confirmed="handleRequestPasswordReset"
      @cancelled="showResetModal = false"
    />

    <BaseModal v-model="showDeleteModal">
      <DeleteAccountForm @close="showDeleteModal = false" />
    </BaseModal>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useUtilsStore } from "@/stores/utils";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import { api } from "@/plugins/api";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import BaseModal from "@/components/BaseModal.vue";
import DeleteAccountForm from "./DeleteAccountForm.vue";
import LoadingResponse from "@/components/loadingResponse.vue";

export default {
  components: {
    ConfirmationModal,
    BaseModal,
    DeleteAccountForm,
    LoadingResponse,
  },
  data() {
    return {
      isLoading: false,
      responseMsg: "",
      responseType: "",
      showResetModal: false,
      showDeleteModal: false,
    };
  },
  computed: {
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useAppStore, ["isDark"]),
  },
  methods: {
    setTheme(theme) {
      const appStore = useAppStore();
      appStore.setTheme(theme);
    },
    async handleRequestPasswordReset() {
      this.isLoading = true;
      this.responseMsg = "";
      this.responseType = "";
      this.showResetModal = false;

      try {
        await api.post("/auth/request_reset_password", { email: this.user.email });
        this.responseType = "success";
        this.responseMsg = "E-mail de redefinição enviado com sucesso.";
      } catch (error) {
        this.responseType = "error";
        this.responseMsg =
          error.response?.data?.message || "Falha ao solicitar a redefinição de senha.";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: absolute !important;
}

.config-wrapper {
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-2);
}

.config-section h3 {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--space-1);
}

.config-section p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.65;
}

/* Seletor de tema */
.theme-options {
  display: flex;
  gap: var(--space-3);
}

.theme-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border: 1.5px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.theme-option:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.theme-option.active {
  background: var(--deep-blue);
  border-color: var(--deep-blue);
  color: #ffffff;
  box-shadow: var(--shadow-card);
}

.config-section .btn {
  width: fit-content;
  height: 40px;
  padding: 0 var(--space-6);
}

.config-section .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-position: left center;
}
</style>
