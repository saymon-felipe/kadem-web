<template>
  <div class="loading-overlay" :class="{ 'fade-out': !isLoading }">
    <loadingSpinner type="yellow" />
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

    <Transition name="slide-over-root">
      <div v-if="user && user.needs_vault_migration && !show_recovery_setup" class="modal-overlay">
        <div class="modal-content glass" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3 class="warning-text">Atenção ao seu Cofre 🔒</h3>
          </div>

          <div class="modal-body">
            <p>Detectamos que sua senha foi alterada. Por segurança, suas contas ainda estão criptografadas e precisam
              ser migradas.</p>
            <p>Para recuperar o acesso, insira seu <strong>Código de Recuperação (Senha Mestra)</strong> que você salvou
              anteriormente.</p>

            <div class="form-group mt-4">
              <input id="recovery-code" type="text" v-model="migration_recovery_code" placeholder=" " />
              <label for="recovery-code">Código de Recuperação (Senha Mestra)</label>
            </div>

            <div class="form-group password-group mt-2">
              <input id="new-pw" :type="show_current_password ? 'text' : 'password'"
                v-model="migration_current_password" placeholder=" " @keyup.enter="run_migration" />
              <label for="new-pw">Confirme sua Senha Atual do Sistema</label>

              <span class="toggle-password" @mousedown="show_current_password = true"
                @mouseup="show_current_password = false" @mouseleave="show_current_password = false"
                @touchstart.prevent="show_current_password = true" @touchend.prevent="show_current_password = false">
                <font-awesome-icon :icon="show_current_password ? 'eye-slash' : 'eye'" />
              </span>
            </div>

            <p v-if="migration_error" class="error-text">{{ migration_error }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary" @click="run_migration"
              :disabled="is_migrating || !migration_recovery_code || !migration_current_password">
              {{ is_migrating ? "Descriptografando..." : "Migrar Cofre" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="slide-over-root">
      <div v-if="show_recovery_setup" class="modal-overlay">
        <div class="modal-content glass" role="dialog" aria-modal="true">

          <div class="modal-header">
            <h3>Atenção à Segurança 🔒</h3>
          </div>

          <div class="modal-body">
            <p>Para garantir que você nunca perca suas senhas se esquecer o login, precisamos gerar sua <strong>Senha
                Mestra (Código E2EE)</strong>.</p>

            <div v-if="!generated_code" class="mt-4">
              <div class="form-group password-group">
                <input id="setup-password" :type="show_setup_password ? 'text' : 'password'" v-model="setup_password"
                  placeholder=" " @keyup.enter="generate_recovery" />
                <label for="setup-password">Digite sua senha atual</label>

                <span class="toggle-password" @mousedown="show_setup_password = true"
                  @mouseup="show_setup_password = false" @mouseleave="show_setup_password = false"
                  @touchstart.prevent="show_setup_password = true" @touchend.prevent="show_setup_password = false">
                  <font-awesome-icon :icon="show_setup_password ? 'eye-slash' : 'eye'" />
                </span>
              </div>
              <div class="forgot-password-container">
                <a href="#" @click.prevent="handle_forgot_password" class="forgot-link">Esqueci minha senha</a>
              </div>
            </div>

            <div v-else class="generated-code-box mt-4">
              <p class="warning-text">Copie e guarde este código em um lugar seguro. Ele NÃO será exibido novamente!</p>
              <h3 class="code-display">{{ generated_code }}</h3>
            </div>

            <p v-if="recovery_error" class="error-text">{{ recovery_error }}</p>
          </div>

          <div class="modal-footer">
            <button v-if="!generated_code" class="btn btn-primary" @click="generate_recovery"
              :disabled="!setup_password">
              Gerar Senha Mestra
            </button>
            <button v-else class="btn btn-success" @click="confirm_saved">
              Eu guardei o código com segurança
            </button>
          </div>

        </div>
      </div>
    </Transition>
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

export default {
  components: {
    headerSystem,
    homeWidgets,
    loadingSpinner,
    DesktopWindowManager,
    SyncIndicator,
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
      setup_password: "",
      generated_code: null,
      recovery_error: "",
      show_setup_password: false,

      migration_recovery_code: "",
      migration_current_password: "",
      migration_error: "",
      is_migrating: false,
      show_current_password: false
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
      this.$router.push('/logout');
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
      };
    },

    async run_migration() {
      this.is_migrating = true;
      this.migration_error = "";

      try {
        const vault_store = useVaultStore();
        await vault_store.execute_home_migration(
          this.migration_recovery_code,
          this.migration_current_password,
          this.user.email
        );

        this.user.needs_vault_migration = false;
        this.migration_recovery_code = "";
        this.migration_current_password = "";

        this.show_current_password = false;

      } catch (error) {
        this.migration_error = error.message || "Código E2EE ou Senha incorretos. Tente novamente.";
      } finally {
        this.is_migrating = false;
      };
    },

    async generate_recovery() {
      if (!this.setup_password) return;
      this.recovery_error = "";

      try {
        const vault_store = useVaultStore();
        const is_valid = await vault_store.checkMasterPassword(this.setup_password, this.user.email);
        if (!is_valid) throw new Error("Senha atual incorreta.");

        this.generated_code = await vault_store.setup_recovery_key(this.setup_password, this.user.email);

        this.user.has_recovery_payload = true;
      } catch (err) {
        this.recovery_error = err.message;
      };
    },

    confirm_saved() {
      this.show_recovery_setup = false;
      this.generated_code = null;
      this.setup_password = "";
      this.show_setup_password = false;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 10000;
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
  align-items: center;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: var(--deep-blue);
}

.modal-header h3 {
  margin-bottom: var(--space-2);
}

.modal-body {
  width: 100%;
  margin-bottom: var(--space-4);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  width: 100%;
}

.modal-footer .btn {
  width: 100%;
}

.generated-code-box {
  background: var(--background-gray);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 1px dashed var(--primary-color);
}

.code-display {
  font-family: monospace;
  font-size: 1.25rem;
  letter-spacing: 2px;
  background: #222;
  padding: var(--space-3);
  border-radius: 8px;
  color: var(--green);
  user-select: all;
  margin-top: var(--space-3);
}

.warning-text {
  color: var(--red);
  font-weight: bold;
  font-size: var(--fontsize-sm);
}

.error-text {
  color: var(--red);
  margin-top: var(--space-3);
  font-size: var(--fontsize-sm);
}

.modal-body .password-group {
  position: relative;
  width: 100%;
}

.modal-body .password-group input {
  padding-right: var(--space-10) !important;
}

.modal-body .toggle-password {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.3s ease;
  z-index: 10;
  padding: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body .toggle-password:hover {
  color: var(--text-primary);
}

.forgot-password-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.forgot-link {
  color: var(--primary-color);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.forgot-link:hover {
  color: var(--deep-blue);
  text-decoration: underline;
}
</style>
