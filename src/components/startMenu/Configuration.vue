<template>
  <div class="config-wrapper">
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
  },
  methods: {
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
  font-size: var(--fontsize-sm);
  font-weight: 600;
  color: var(--deep-blue);
  padding-bottom: var(--space-2);
}

.config-section p {
  font-size: var(--fontsize-xs);
  color: var(--text-gray);
  line-height: 1.6;
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
