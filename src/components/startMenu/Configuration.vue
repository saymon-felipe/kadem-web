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

    <BaseModal v-model="showDeleteModal">
      <DeleteAccountForm @close="showDeleteModal = false" />
    </BaseModal>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useUtilsStore } from "@/stores/utils";
import { useAppStore } from "@/stores/app";
import BaseModal from "@/components/BaseModal.vue";
import DeleteAccountForm from "./DeleteAccountForm.vue";
import LoadingResponse from "@/components/loadingResponse.vue";
import {
  getPwaInstallUnavailableMessage,
  isIOSDevice,
  isPwaInstalled,
  requestPwaInstall,
} from "@/services/pwaInstall";

export default {
  components: {
    BaseModal,
    DeleteAccountForm,
    LoadingResponse,
  },
  data() {
    return {
      showDeleteModal: false,
      isIOS: false,
      isInstallingPwa: false,
      pwaInstalled: false,
      pwaMsg: "",
      pwaMsgType: "",
    };
  },
  computed: {
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useAppStore, ["isDark"]),
  },
  methods: {
    setTheme(theme) {
      const appStore = useAppStore();
      appStore.setTheme(theme);
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
  mounted() {
    this.isIOS = isIOSDevice();
    this.pwaInstalled = isPwaInstalled();
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
  background-image: linear-gradient(to left, #355afd, #243fb8);
  border-color: #355afd;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(53, 90, 253, 0.25);
}

.theme-option.active span,
.theme-option.active svg {
  color: #ffffff;
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
