<template>
  <div class="config-wrapper">
    <section class="config-section">
      <h3>Aparência</h3>
      <p>Escolha o tema visual do Kadem. A preferência é salva neste navegador para a sua conta.</p>
      <div class="theme-options">
        <button class="theme-option" :class="{ active: !isDark }" @click="setTheme('light')">
          <font-awesome-icon icon="sun" />
          <span>Claro</span>
        </button>
        <button class="theme-option" :class="{ active: isDark }" @click="setTheme('dark')">
          <font-awesome-icon icon="moon" />
          <span>Escuro</span>
        </button>
      </div>
    </section>

    <section class="config-section">
      <h3>Segurança</h3>
      <p>Para redefinir sua senha, enviaremos um link de recuperação para o seu e-mail.</p>
      <button
        class="btn btn-primary"
        :disabled="!connection.connected || isLoading"
        :title="!connection.connected ? 'Esta ação requer conexão com a internet.' : ''"
        @click="showResetModal = true"
      >
        {{ isLoading ? "Enviando..." : "Solicitar redefinição de senha" }}
      </button>
      <LoadingResponse :msg="responseMsg" :type="responseType" styletype="small" :loading="false" />

      <template v-if="biometricSupported">
        <p>Use a biometria deste dispositivo para entrar no Kadem mais rapidamente.</p>
        <button
          class="btn"
          :class="biometricRegistered ? 'btn-red' : 'btn-primary'"
          :disabled="!connection.connected || isBiometricLoading"
          :title="!connection.connected ? 'Esta ação requer conexão com a internet.' : ''"
          @click="toggleBiometrics"
        >
          {{ isBiometricLoading ? "Processando..." : biometricRegistered ? "Desativar login com biometria" : "Ativar login com biometria" }}
        </button>
      </template>
      <p v-else>Este dispositivo não oferece suporte a biometria para acesso.</p>
      <LoadingResponse :msg="biometricMsg" :type="biometricMsgType" styletype="small" :loading="false" />
    </section>

    <section class="config-section">
      <h3>Aplicativo</h3>
      <p v-if="!pwaInstalled">Instale o Kadem no celular para abri-lo como aplicativo.</p>
      <p v-else>O Kadem já está instalado neste dispositivo.</p>
      <button
        v-if="!pwaInstalled"
        class="btn btn-primary"
        :disabled="isInstallingPwa"
        @click="handlePwaInstall"
      >
        {{ isInstallingPwa ? "Instalando..." : isIOS ? "Como instalar" : "Instalar aplicativo" }}
      </button>
      <LoadingResponse :msg="pwaMsg" :type="pwaMsgType" styletype="small" :loading="false" />
    </section>

    <section class="config-section">
      <h3>Conta</h3>
      <p>
        Esta é uma ação irreversível. Todos os seus dados, projetos e informações do cofre serão permanentemente
        excluídos do Kadem.
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
import {
  biometricDeclinedKey,
  getBiometricStatus,
  isBiometricSupported,
  registerBiometricCredential,
  rememberedEmailKey,
  removeBiometricCredentials,
} from "@/services/biometricAuth";
import {
  getPwaInstallUnavailableMessage,
  isIOSDevice,
  isPwaInstalled,
  requestPwaInstall,
} from "@/services/pwaInstall";

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
      biometricSupported: false,
      biometricRegistered: false,
      isBiometricLoading: false,
      biometricMsg: "",
      biometricMsgType: "",
      isIOS: false,
      isInstallingPwa: false,
      pwaInstalled: false,
      pwaMsg: "",
      pwaMsgType: "",
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
        this.responseMsg = error.response?.data?.message || "Falha ao solicitar a redefinição de senha.";
      } finally {
        this.isLoading = false;
      }
    },
    async loadBiometricStatus() {
      if (!this.biometricSupported || !this.connection.connected) return;

      try {
        this.biometricRegistered = await getBiometricStatus();
      } catch (error) {
        this.biometricMsgType = "error";
        this.biometricMsg = error.response?.data?.message || "Não foi possível consultar a biometria.";
      }
    },
    async toggleBiometrics() {
      if (this.isBiometricLoading) return;

      this.isBiometricLoading = true;
      this.biometricMsg = "";
      this.biometricMsgType = "";

      try {
        if (this.biometricRegistered) {
          await removeBiometricCredentials();
          localStorage.setItem(biometricDeclinedKey(this.user.email), "true");
          this.biometricRegistered = false;
          this.biometricMsg = "Login com biometria desativado.";
        } else {
          await registerBiometricCredential();
          localStorage.setItem(rememberedEmailKey, this.user.email);
          localStorage.removeItem(biometricDeclinedKey(this.user.email));
          this.biometricRegistered = true;
          this.biometricMsg = "Biometria ativada neste dispositivo.";
        }
        this.biometricMsgType = "success";
      } catch (error) {
        this.biometricMsgType = "error";
        this.biometricMsg = error.response?.data?.message || "Não foi possível atualizar a biometria.";
      } finally {
        this.isBiometricLoading = false;
      }
    },
    async handlePwaInstall() {
      this.pwaMsg = "";
      this.pwaMsgType = "";

      if (this.isIOS) {
        this.pwaMsgType = "success";
        this.pwaMsg = "No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.";
        return;
      }

      this.isInstallingPwa = true;
      try {
        const outcome = await requestPwaInstall();

        if (outcome === "accepted") {
          this.pwaInstalled = true;
          this.pwaMsgType = "success";
          this.pwaMsg = "Aplicativo instalado com sucesso.";
        } else if (outcome === "dismissed") {
          this.pwaMsgType = "error";
          this.pwaMsg = "A instalação foi cancelada. Você pode tentar novamente quando quiser.";
        } else {
          this.pwaMsgType = "error";
          this.pwaMsg = getPwaInstallUnavailableMessage();
        }
      } finally {
        this.isInstallingPwa = false;
      }
    },
  },
  async mounted() {
    this.isIOS = isIOSDevice();
    this.pwaInstalled = isPwaInstalled();
    this.biometricSupported = await isBiometricSupported();
    await this.loadBiometricStatus();
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
