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
            <input
              id="name"
              v-model="name"
              type="text"
              maxlength="255"
              placeholder=""
              required
            />
            <label for="name">Nome</label>
          </div>

          <div class="form-group">
            <input
              id="email"
              v-model="email"
              type="email"
              maxlength="255"
              placeholder=""
              required
            />
            <label for="email">E-mail</label>
          </div>

          <div class="form-group password-group">
            <input
              id="password"
              v-model="password"
              :type="passwordFieldType"
              maxlength="255"
              placeholder=""
              required
              minlength="6"
              @input="updatePasswordStrength"
            />
            <label for="password">Senha</label>
            <font-awesome-icon
              icon="eye"
              class="password-icon"
              @mousedown="showPassword"
              @mouseup="hidePassword"
              @mouseleave="hidePassword"
            />
          </div>

          <div v-if="isRegister && password.length > 0" class="strength-meter">
            <div class="strength-bar" :class="passwordStrength.class"></div>
            <span>Força: <strong>{{ passwordStrength.text }}</strong></span>
          </div>

          <div v-if="isRegister" class="form-group password-group">
            <input
              id="repeat-password"
              v-model="repeatPassword"
              :type="repeatPasswordFieldType"
              maxlength="255"
              placeholder=""
              required
            />
            <label for="repeat-password">Repita a senha</label>
            <font-awesome-icon
              icon="eye"
              class="password-icon"
              @mousedown="showRepeatPassword"
              @mouseup="hideRepeatPassword"
              @mouseleave="hideRepeatPassword"
            />
          </div>

          <button type="submit" class="btn btn-primary">
            {{ isRegister ? "Criar conta" : "Entrar" }}
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

          <LoadingResponse
            :msg="response"
            :type="responseType"
            styletype="small"
            :loading="loading"
          />

          <div v-if="localDbIssue" class="storage-actions">
            <button
              type="button"
              class="btn"
              :disabled="repairingStorage"
              @click="repairStorage"
            >
              {{ repairingStorage ? "Reparando ambiente..." : "Reparar armazenamento local" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import LoadingResponse from "@/components/loadingResponse.vue";
import switchComponent from "../components/switchComponent.vue";
import { useAuthStore } from "@/stores/auth";
import { useVaultStore } from "@/stores/vault";
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
  },
  data() {
    return {
      name: "",
      email: "",
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
    };
  },
  computed: {
    isRegister() {
      return this.authType === "register";
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
          await authStore.login(this.email, this.password, this.inviteToken);
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

          const vaultStore = useVaultStore();
          vaultStore.setupVault(this.password, this.email);

          if (this.from_site) {
            this.$router.push({ path: "/", query: { source: "site_landing" } });
          } else {
            this.$router.push("/");
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
