<template>
  <div class="loading-overlay" :class="{ 'fade-out': !isLoading }">
    <loadingSpinner />
  </div>
  <div class="main">
    <div
      class="desktop-bg bg-light"
      :class="{ active: !isDark }"
      :style="isImageReady ? { backgroundImage: `url(${lightBgUrl})` } : {}"
    ></div>
    <div
      class="desktop-bg bg-dark"
      :class="{ active: isDark }"
      :style="isImageReady ? { backgroundImage: `url(${darkBgUrl})` } : {}"
    ></div>
    <headerSystem ref="systemHeader" />
    <SyncIndicator :syncing="is_syncing" />
    <homeWidgets />
    <DesktopWindowManager />
    <GlobalPlayerHost />

    <VaultMigrationModal
      v-if="user"
      :model-value="Boolean(user.needs_vault_migration && !show_recovery_setup)"
      :user-email="user.email"
      @update:model-value="user.needs_vault_migration = $event"
      @migrated="user.needs_vault_migration = false"
    />

    <RecoverySetupModal
      v-model="show_recovery_setup"
      :user-email="user ? user.email : ''"
      @forgot-password="handle_forgot_password"
      @completed="handleRecoveryCompleted"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useVaultStore } from "@/stores/vault";
import { useAppStore } from "@/stores/app";
import { useUtilsStore } from "@/stores/utils";
import headerSystem from "../components/headerSystem.vue";
import homeWidgets from "../components/homeWidgets.vue";
import loadingSpinner from "../components/loadingSpinner.vue";
import systemBackground from "../assets/images/system-background.webp";
import systemBackgroundDark from "../assets/images/system-background-black.webp";
import DesktopWindowManager from "../components/windowing/DesktopWindowManager.vue";
import SyncIndicator from "@/components/SyncIndicator.vue";
import GlobalPlayerHost from "@/components/radio/GlobalPlayerHost.vue";
import VaultMigrationModal from "@/components/auth/VaultMigrationModal.vue";
import RecoverySetupModal from "@/components/auth/RecoverySetupModal.vue";

export default {
  components: {
    headerSystem,
    homeWidgets,
    loadingSpinner,
    DesktopWindowManager,
    SyncIndicator,
    GlobalPlayerHost,
    VaultMigrationModal,
    RecoverySetupModal,
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useUtilsStore, ["is_syncing"]),
    ...mapState(useAppStore, ["system", "isDark"]),
    lightBgUrl() {
      if (this.system && this.system.background && this.system.background !== "") {
        return this.system.background;
      }
      return this.defaultBackground;
    },
    darkBgUrl() {
      if (this.system && this.system.background_dark && this.system.background_dark !== "") {
        return this.system.background_dark;
      }
      return this.darkBackground;
    },
  },
  data() {
    return {
      defaultBackground: systemBackground,
      darkBackground: systemBackgroundDark,
      isLoading: true,
      isImageReady: false,
      isLightBgReady: false,
      isDarkBgReady: false,

      show_recovery_setup: false,
    };
  },
  watch: {
    lightBgUrl: {
      handler(newUrl) {
        this.preloadImage(newUrl, "light");
      },
      immediate: true,
    },
    darkBgUrl: {
      handler(newUrl) {
        this.preloadImage(newUrl, "dark");
      },
      immediate: true,
    },
  },
  methods: {
    preloadImage(url, type) {
      if (!url) {
        if (type === "light") this.isLightBgReady = true;
        else this.isDarkBgReady = true;
        this.checkIfReady();
        return;
      }

      if (type === "light") this.isLightBgReady = false;
      else this.isDarkBgReady = false;
      this.isLoading = true;

      const img = new Image();
      img.onload = () => {
        if (type === "light") this.isLightBgReady = true;
        else this.isDarkBgReady = true;
        this.checkIfReady();
      };
      img.onerror = () => {
        console.error(`Falha ao carregar imagem de fundo (${type}):`, url);
        if (type === "light") this.isLightBgReady = true;
        else this.isDarkBgReady = true;
        this.checkIfReady();
      };
      img.src = url;
    },
    checkIfReady() {
      if (this.isLightBgReady && this.isDarkBgReady) {
        this.isImageReady = true;
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.isLoading = false;
          });
        });
      }
    },
    ...mapActions(useAuthStore, ["setUser", "checkAuthStatus"]),
    ...mapActions(useAppStore, ["setSystem", "updateMobileStatus"]),
    handle_forgot_password() {
      this.$router.push("/logout");
    },
    handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        console.debug("[Kadem] Aba ativa novamente. Forçando verificação de sessão...");
        this.checkAuthStatus();
      }
    },

    check_vault_security_status() {
      if (!this.user) return;

      if (this.user.has_recovery_payload === false) {
        this.show_recovery_setup = true;
        return;
      }
    },

    handleRecoveryCompleted() {
      this.show_recovery_setup = false;
      if (this.user) {
        this.user.has_recovery_payload = true;
      }
    },

    returnSystem: function () {
      this.api.get("/system").then((response) => {
        this.setSystem(response.data);
      });
    },

    init_connection_monitor() {
      const utilsStore = useUtilsStore();
      utilsStore._start_smart_polling();
    },

    handleResize() {
      this.updateMobileStatus();
    },

    handleProjectRevoked() {
      this.$router.go();
    },

    checkLandingSource() {
      const source = this.$route.query.source;
      if (source === "site_landing") {
        setTimeout(() => {
          if (this.$refs.systemHeader) {
            this.$refs.systemHeader.open_plan_modal();
            this.$router.replace({ query: null });
          }
        }, 500);
      }
    },
  },
  created() {
    window.addEventListener("project-access-revoked", this.handleProjectRevoked);
  },
  mounted: function () {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    this.returnSystem();
    this.init_connection_monitor();

    this.checkAuthStatus(true);

    setTimeout(() => {
      this.check_vault_security_status();
    }, 1000);

    this.checkLandingSource();

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("project-access-revoked", this.handleProjectRevoked);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  },
};
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  position: relative;
  overflow: hidden;
}

.desktop-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
}

.desktop-bg.active {
  opacity: 1;
}
</style>
