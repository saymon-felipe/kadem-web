<template>
  <section class="auth">
    <div class="glass auth-container">
      <div class="auth-header">
        <switchComponent v-model="authType" :options="authOptions" />
        <img src="../assets/images/kadem-logo.png" alt="Kadem" />
      </div>
      <div class="auth-body">
        <form @submit.prevent="auth" v-animate-height>
          <h2>{{ isRegister ? "Crie uma conta" : "Entre" }}</h2>

          <div v-if="isRegister" class="form-group">
            <input id="name" v-model="name" type="text" maxlength="255" placeholder="" required />
            <label for="name">Nome</label>
          </div>

          <div class="form-group">
            <input id="email" v-model="email" type="email" maxlength="255" placeholder="" autocomplete="username"
              required />
            <label for="email">E-mail</label>
          </div>

          <div class="form-group password-group">
            <input id="password" v-model="password" :type="passwordFieldType" maxlength="255" placeholder=""
              autocomplete="current-password" required minlength="6" @input="updatePasswordStrength" />
            <label for="password">Senha</label>
            <font-awesome-icon icon="eye" class="password-icon" @pointerdown.prevent="showPassword"
              @pointerup="hidePassword" @pointercancel="hidePassword" @pointerleave="hidePassword" />
          </div>

          <div v-if="isRegister && password.length > 0" class="strength-meter">
            <div class="strength-bar" :class="passwordStrength.class"></div>
            <span>Força: <strong>{{ passwordStrength.text }}</strong></span>
          </div>

          <div v-if="isRegister" class="form-group password-group">
            <input id="repeat-password" v-model="repeatPassword" :type="repeatPasswordFieldType" maxlength="255"
              placeholder="" required />
            <label for="repeat-password">Repita a senha</label>
            <font-awesome-icon icon="eye" class="password-icon" @pointerdown.prevent="showRepeatPassword"
              @pointerup="hideRepeatPassword" @pointercancel="hideRepeatPassword" @pointerleave="hideRepeatPassword" />
          </div>

          <label v-if="!isRegister" class="remember-email">
            <input v-model="rememberUser" type="checkbox" />
            <span>Lembrar meu e-mail neste dispositivo</span>
          </label>

          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ isRegister ? "Criar conta" : "Entrar" }}
          </button>

          <button v-if="canUseBiometrics" type="button" class="btn biometric-login-button"
            :disabled="isBiometricLoading" @click="loginWithBiometrics">
            <font-awesome-icon icon="fingerprint" />
            {{ isBiometricLoading ? "Validando..." : "Entrar com biometria" }}
          </button>

          <div class="form-group">
            <p v-if="isRegister">
              Já tem uma conta?
              <strong style="cursor: pointer" @click="authType = 'login'">Entre</strong>
            </p>
            <div v-else class="auth-details">
              <p>
                Não tem uma conta?
                <strong style="cursor: pointer" @click="authType = 'register'">Cadastre-se</strong>
              </p>
              <p style="cursor: pointer" @click="handleResetPassword">
                Esqueci minha senha
              </p>
            </div>
          </div>

          <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="loading" />

          <div v-if="localDbIssue" class="storage-actions">
            <button type="button" class="btn" :disabled="repairingStorage" @click="repairStorage">
              {{ repairingStorage ? "Reparando ambiente..." : "Reparar armazenamento local" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmationModal v-model="showBiometricPrompt" message="Ativar login com biometria?"
      :description="biometricPromptDescription"
      :confirm-text="isActivatingBiometrics ? 'Ativando...' : biometricPromptError ? 'Tentar novamente' : 'Ativar agora'"
      @confirmed="confirmBiometrics" @cancelled="declineBiometrics" />
  </section>
</template>

<script>
import LoadingResponse from "@/components/loadingResponse.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import switchComponent from "../components/switchComponent.vue";
import { useAuthStore } from "@/stores/auth";
import { useVaultStore } from "@/stores/vault";
import {
  biometricDeclinedKey,
  getBiometricStatus,
  isBiometricSupported,
  isBiometricCancellationError,
  registerBiometricCredential,
  rememberedEmailKey,
} from "@/services/biometricAuth";
import {
  consumeLocalDbIssue,
  initializeLocalDb,
  isLocalDbUnavailableError,
  onLocalDbIssue,
  repairLocalEnvironment,
} from "@/db";

export default {
  components: {
    switchComponent,
    LoadingResponse,
    ConfirmationModal,
  },
  data() {
    const rememberedEmail = localStorage.getItem(rememberedEmailKey) || "";

    return {
      name: "",
      email: rememberedEmail,
      password: "",
      repeatPassword: "",
      authType: "login",
      authOptions: [
        { code: "register", name: "Cadastrar" },
        { code: "login", name: "Entrar" },
      ],
      passwordFieldType: "password",
      repeatPasswordFieldType: "password",
      passwordStrength: { text: "", class: "" },
      inviteToken: null,
      from_site: false,
      localDbIssue: null,
      repairingStorage: false,
      removeLocalDbIssueListener: null,
      rememberUser: Boolean(rememberedEmail),
      biometricSupported: false,
      isBiometricLoading: false,
      isActivatingBiometrics: false,
      showBiometricPrompt: false,
      biometricPromptError: "",
    };
  },
  computed: {
    isRegister() {
      return this.authType === "register";
    },
    canUseBiometrics() {
      return !this.isRegister
        && this.biometricSupported
        && Boolean(localStorage.getItem(rememberedEmailKey));
    },
    biometricPromptDescription() {
      return this.biometricPromptError
        || "Use a biometria deste dispositivo para entrar no Kadem mais rapidamente.";
    },
  },
  mounted() {
    if (
      this.$route.query.authtype === "login"
      || this.$route.query.authtype === "register"
    ) {
      this.authType = this.$route.query.authtype;
    }

    this.localDbIssue = consumeLocalDbIssue();
    if (this.localDbIssue) {
      this.setResponse("error", this.localDbIssue.message, false);
    }

    this.removeLocalDbIssueListener = onLocalDbIssue((issue) => {
      this.localDbIssue = issue;

      if (issue?.message) {
        this.setResponse("error", issue.message, false);
      }
    });

    initializeLocalDb().catch((error) => {
      if (isLocalDbUnavailableError(error)) {
        this.localDbIssue = consumeLocalDbIssue();
        this.setResponse("error", error.message, false);
      }
    });

    this.checkBiometricSupport();

    this.$nextTick(() => {
      if (this.$route.query.invite_token) {
        this.inviteToken = this.$route.query.invite_token;
      }

      if (this.$route.query.email) {
        this.email = this.$route.query.email;
      }

      if (
        this.$route.query.from_site === "true"
        || this.$route.query.from_site === true
        || this.$route.query.from_site === 1
        || this.$route.query.from_site === "1"
      ) {
        this.from_site = true;
      }
    });
  },
  beforeUnmount() {
    this.removeLocalDbIssueListener?.();
  },
  watch: {
    authType() {
      this.name = "";
      this.email = "";
      this.password = "";
      this.repeatPassword = "";
      this.passwordStrength = { text: "", class: "" };
      this.resetResponse();

      if (this.localDbIssue) {
        this.setResponse("error", this.localDbIssue.message, false);
      }
    },
  },
  methods: {
    getErrorMessage(error, fallback) {
      return error.response?.data?.message || error.message || fallback;
    },
    saveRememberedEmail() {
      if (this.rememberUser) {
        localStorage.setItem(rememberedEmailKey, this.email.trim());
      } else {
        localStorage.removeItem(rememberedEmailKey);
      }
    },
    async checkBiometricSupport() {
      this.biometricSupported = await isBiometricSupported();
    },
    async shouldPromptForBiometrics() {
      if (!this.biometricSupported) {
        await this.checkBiometricSupport();
      }

      if (!this.biometricSupported || localStorage.getItem(biometricDeclinedKey(this.email))) {
        return false;
      }

      try {
        return !(await getBiometricStatus());
      } catch {
        return false;
      }
    },
    finishLogin() {
      this.showBiometricPrompt = false;
      this.biometricPromptError = "";

      if (this.from_site) {
        this.$router.push({ path: "/", query: { source: "site_landing" } });
      } else {
        this.$router.push("/");
      }
    },
    async confirmBiometrics() {
      if (this.isActivatingBiometrics) return;

      this.isActivatingBiometrics = true;
      this.biometricPromptError = "";
      try {
        await registerBiometricCredential();
        localStorage.setItem(rememberedEmailKey, this.email.trim());
        localStorage.removeItem(biometricDeclinedKey(this.email));
        this.finishLogin();
      } catch (error) {
        this.biometricPromptError = this.getErrorMessage(
          error,
          "N\u00e3o foi poss\u00edvel ativar a biometria. Tente novamente.",
        );
        console.warn("Não foi possível ativar a biometria após o login.", error);
      } finally {
        this.isActivatingBiometrics = false;
      }
    },
    declineBiometrics() {
      localStorage.setItem(biometricDeclinedKey(this.email), "true");
      this.finishLogin();
    },
    async loginWithBiometrics() {
      const rememberedEmail = localStorage.getItem(rememberedEmailKey);
      if (!rememberedEmail) return;

      this.isBiometricLoading = true;
      this.resetResponse();

      try {
        const authStore = useAuthStore();
        await authStore.loginWithBiometrics(rememberedEmail);
        this.setResponse("success", "Login realizado", false);
        this.finishLogin();
      } catch (error) {
        if (isBiometricCancellationError(error)) {
          return;
        }

        this.setResponse(
          "error",
          this.getErrorMessage(error, "Não foi possível validar a biometria."),
          false,
        );
      } finally {
        this.isBiometricLoading = false;
      }
    },
    async handleResetPassword() {
      this.resetResponse();

      if (!this.email) {
        this.setResponse(
          "error",
          "Por favor, digite seu e-mail no campo “E-mail” para solicitar a redefinição.",
          false,
        );
        return;
      }

      this.setResponse("", "", true);
      const authStore = useAuthStore();

      try {
        const message = await authStore.requestPasswordReset(this.email);
        this.setResponse("success", message, false);
      } catch (error) {
        const errorMsg =
          error.response?.data?.message
          || error.message
          || "Ocorreu um erro desconhecido.";
        this.setResponse("error", errorMsg, false);
      }
    },
    async repairStorage() {
      if (this.repairingStorage) {
        return;
      }

      this.repairingStorage = true;

      try {
        await repairLocalEnvironment();
      } catch (error) {
        this.setResponse(
          "error",
          error?.message || "Não foi possível concluir o reparo automático do ambiente local.",
          false,
        );
      } finally {
        this.repairingStorage = false;
      }
    },
    showPassword() {
      this.passwordFieldType = "text";
    },
    hidePassword() {
      this.passwordFieldType = "password";
    },
    showRepeatPassword() {
      this.repeatPasswordFieldType = "text";
    },
    hideRepeatPassword() {
      this.repeatPasswordFieldType = "password";
    },
    checkPasswordStrength(password) {
      let score = 0;
      if (!password) return { text: "", class: "" };

      if (password.length >= 6) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[!@#$%&*]/.test(password)) score++;

      if (score <= 2) return { text: "Fraca", class: "weak" };
      if (score <= 4) return { text: "Média", class: "medium" };
      return { text: "Forte", class: "strong" };
    },
    updatePasswordStrength() {
      this.passwordStrength = this.checkPasswordStrength(this.password);
    },
    async auth() {
      this.resetResponse();

      if (this.localDbIssue) {
        this.setResponse("error", this.localDbIssue.message, false);
      }

      if (this.password.length < 6) {
        this.setResponse("error", "A senha deve ter no mínimo 6 caracteres.", false);
        return;
      }

      if (this.isRegister) {
        if (this.password !== this.repeatPassword) {
          this.setResponse("error", "As senhas não conferem.", false);
          return;
        }

        const strength = this.checkPasswordStrength(this.password);
        if (strength.class !== "strong") {
          this.setResponse(
            "error",
            "Sua senha não é forte o suficiente. Deve conter maiúscula, minúscula, número e caractere especial (!@#$%&*).",
            false,
          );
          return;
        }
      }

      const authStore = useAuthStore();
      this.setResponse("", "", true);

      try {
        if (this.isRegister) {
          const data = {
            email: this.email,
            password: this.password,
            name: this.name,
            invite_token: this.inviteToken,
          };

          await authStore.register(data);
        } else {
          const loginPassword = this.password;
          await authStore.login(this.email, loginPassword, this.inviteToken);
          this.saveRememberedEmail();

          const vaultStore = useVaultStore();
          try {
            await vaultStore.setupVault(loginPassword, this.email);
          } catch (vaultError) {
            console.warn("O Cofre não pôde ser preparado nesta conexão.", vaultError);
          }
          this.password = "";
        }

        if (this.isRegister) {
          this.setResponse("success", "Registro realizado", false);

          setTimeout(() => {
            const email = this.email;

            this.$nextTick(() => {
              this.authType = "login";
              this.email = email;
            });
          }, 1500);
        } else {
          this.setResponse("success", "Login realizado", false);

          if (this.rememberUser && await this.shouldPromptForBiometrics()) {
            this.showBiometricPrompt = true;
          } else {
            this.finishLogin();
          }
        }
      } catch (error) {
        const errorMsg =
          error.response?.data?.message
          || error.message
          || "Ocorreu um erro desconhecido.";

        if (isLocalDbUnavailableError(error)) {
          this.localDbIssue = consumeLocalDbIssue() || this.localDbIssue;
        }

        this.setResponse("error", errorMsg, false);
      }
    },
  },
};
</script>

<style scoped>
form {
  & button[type="submit"] {
    margin-top: var(--space-3);
  }
}

.auth {
  overflow: hidden;
  width: 100dvw;
  height: 100dvh;
  display: grid;
  place-items: center;
  background-image: url("../assets/images/fundo-auth.webp");
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;

  & .form-group label {
    color: var(--black);
  }

  & .btn {
    background-color: var(--background-gray);
    color: var(--black);
  }

  & .btn.btn-primary {
    background-image: var(--deep-blue-gradient);
    color: var(--white);
  }

  & .auth-container {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    width: 99%;
    height: fit-content;
    max-width: 50dvw;

    & .auth-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-8);
      user-select: none;

      & img {
        width: calc(5rem + 5vw);
        pointer-events: none;
      }
    }

    & .auth-body {
      & form {
        display: flex;
        flex-direction: column;
        transition: opacity 0.3s ease-in-out;

        & h2 {
          margin-bottom: var(--space-6);
        }
      }
    }
  }
}

.password-group {
  position: relative;
}

.password-icon {
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  color: var(--black);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  user-select: none;
}

.password-icon:hover {
  opacity: 1;
}

.strength-meter {
  margin: var(--space-2);
  font-size: var(--fontsize-xs);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--black);
}

.strength-bar {
  flex-grow: 1;
  height: 6px;
  border-radius: 3px;
  background-color: var(--background-gray);
  transition: width 0.3s ease, background-color 0.3s ease;
  width: 100%;
}

.strength-bar.weak {
  background-color: var(--red);
}

.strength-bar.medium {
  background-color: var(--orange);
}

.strength-bar.strong {
  background-color: var(--green);
}

.strength-meter span {
  white-space: nowrap;
}

.auth-details {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.remember-email {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  cursor: pointer;
}

.remember-email input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: grid;
  flex: 0 0 20px;
  place-content: center;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 2px solid var(--deep-blue);
  border-radius: 4px;
  background: var(--white);
  box-shadow: none;
  cursor: pointer;
}

.remember-email input[type="checkbox"]:checked {
  background: var(--deep-blue);
}

.remember-email input[type="checkbox"]:checked::after {
  width: 8px;
  height: 4px;
  border: solid var(--white);
  border-width: 0 0 2px 2px;
  content: "";
  transform: rotate(-45deg) translate(1px, -1px);
}

.remember-email input[type="checkbox"]:focus-visible {
  outline: 2px solid var(--deep-blue);
  outline-offset: 2px;
}

.biometric-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin: var(--space-3) 0;
}

.storage-actions {
  display: flex;
  justify-content: center;
  margin-top: var(--space-2);
}

.storage-actions .btn {
  width: 100%;
}

@media (max-width: 960px) {
  .auth-container {
    max-width: 75dvw !important;
  }
}

@media (max-width: 570px) {
  .auth-header {
    flex-direction: column-reverse;
  }

  .auth-container {
    max-width: 99dvw !important;
    min-height: 99dvh !important;
  }
}
</style>
