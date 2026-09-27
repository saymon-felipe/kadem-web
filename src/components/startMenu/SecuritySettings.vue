<template>
  <div class="security-wrapper">
    <div v-if="!online" class="sec-inline-message info">
      As configurações de segurança exigem conexão com a internet.
    </div>

    <div v-if="loading && !overview" class="security-loading">
      <font-awesome-icon icon="circle-notch" spin />
      <span>Carregando...</span>
    </div>

    <p v-else-if="loadError && !overview" class="sec-inline-message error">{{ loadError }}</p>

    <template v-if="overview">
      <MfaSection :overview="overview" :online="online" @changed="reload" />
      <PasskeysSection :passkeys="overview.passkeys" :online="online" @changed="reload" />
      <DevicesSection
        :devices="devices"
        :loading="loadingDevices"
        :online="online"
        @refresh="loadDevices"
        @changed="onDevicesChanged"
      />
      <PasswordSection :password-changed-at="overview.password_changed_at" :online="online" />
    </template>
  </div>
</template>

<script>
import { mapState } from "pinia";
import MfaSection from "@/components/security/MfaSection.vue";
import PasskeysSection from "@/components/security/PasskeysSection.vue";
import DevicesSection from "@/components/security/DevicesSection.vue";
import PasswordSection from "@/components/security/PasswordSection.vue";
import { useAuthStore } from "@/stores/auth";
import { useUtilsStore } from "@/stores/utils";
import { apiErrorMessage, securityService } from "@/services/securityService";
import "@/components/security/security.css";

export default {
  name: "SecuritySettings",
  components: { MfaSection, PasskeysSection, DevicesSection, PasswordSection },
  props: {
    // O Menu Iniciar mantém todas as abas montadas: só carrega (e recarrega) quando esta fica visível.
    active: { type: Boolean, default: false },
  },
  data() {
    return {
      overview: null,
      devices: [],
      loading: false,
      loadingDevices: false,
      loadError: "",
    };
  },
  computed: {
    ...mapState(useUtilsStore, ["connection"]),
    online() {
      return Boolean(this.connection.connected);
    },
  },
  watch: {
    active(isActive) {
      if (isActive && this.online) this.reload();
    },
    online(isOnline) {
      if (isOnline && this.active) this.reload();
    },
  },
  methods: {
    async reload() {
      this.loading = true;
      this.loadError = "";

      try {
        const [overview, devices] = await Promise.all([securityService.getOverview(), securityService.getDevices()]);
        this.overview = overview;
        this.devices = devices;
      } catch (error) {
        if (error?.response?.status !== 401) {
          this.loadError = apiErrorMessage(error, "Não foi possível carregar as configurações de segurança.");
        }
      } finally {
        this.loading = false;
      }
    },
    async loadDevices() {
      this.loadingDevices = true;

      try {
        this.devices = await securityService.getDevices();
      } catch (error) {
        if (error?.response?.status !== 401) {
          this.loadError = apiErrorMessage(error, "Não foi possível atualizar os dispositivos.");
        }
      } finally {
        this.loadingDevices = false;
      }
    },
    async onDevicesChanged(outcome) {
      // Desconectar/remover o próprio dispositivo equivale a sair: a sessão atual já foi encerrada no servidor.
      if (outcome?.logged_out_current) {
        await useAuthStore().logout(true);
        return;
      }

      await this.reload();
    },
  },
};
</script>

<style scoped>
.security-wrapper {
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.security-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-10) 0;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
}
</style>
