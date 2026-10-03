<template>
  <div class="mfa-challenge">
    <h2>Verificação em duas etapas</h2>
    <p class="mfa-lead">{{ leadText }}</p>

    <Transition name="mfa-step" mode="out-in" @after-enter="onStepEntered">
      <div v-if="methodPickerOpen" key="picker" class="mfa-other-methods">
        <button
          v-for="option in otherMethods"
          :key="option"
          type="button"
          class="mfa-option"
          @click="selectMethod(option)"
        >
          <span class="mfa-option-icon"><font-awesome-icon :icon="methodIcons[option]" /></span>
          <span class="mfa-option-body">
            <span class="mfa-option-title">{{ methodLabels[option] }}</span>
            <span class="mfa-option-desc">{{ methodDescriptions[option] }}</span>
          </span>
          <font-awesome-icon icon="chevron-right" class="mfa-option-chevron" />
        </button>

        <button type="button" class="btn mfa-secondary" @click="methodPickerOpen = false">Voltar</button>
      </div>

      <form v-else key="form" @submit.prevent="submit">
        <!-- E-mail é em duas etapas (igual à MFA da Microsoft): confirma o endereço antes de aceitar o código.
             O servidor não diz se bateu ou não (só manda de verdade se bater), então digitar errado nunca
             revela qual é o e-mail de recuperação. -->
        <div v-if="method === 'email' && !emailSent" class="form-group">
          <input
            id="mfa-email-confirm"
            ref="emailConfirmInput"
            v-model="emailConfirm"
            type="email"
            autocomplete="email"
            maxlength="254"
            placeholder=" "
            required
          />
          <label for="mfa-email-confirm">E-mail de recuperação</label>
        </div>

        <template v-if="showCodeInput">
          <RecoveryCodeInput v-if="method === 'recovery_code'" id="mfa-code" ref="codeInput" v-model="code" :label="codeLabel" />
          <OtpInput v-else ref="codeInput" v-model="code" :label="codeLabel" />
        </template>

        <button
          v-if="otherMethods.length"
          type="button"
          class="mfa-link-btn"
          :disabled="loading"
          @click="methodPickerOpen = true"
        >
          Entrar de outra forma
        </button>

        <button
          v-if="method === 'email' && !emailSent"
          type="button"
          class="btn btn-primary"
          :disabled="sendingEmail || !canConfirmEmail"
          @click="sendEmail"
        >
          {{ sendingEmail ? "Enviando..." : "Enviar código" }}
        </button>
        <button
          v-else-if="method === 'email'"
          type="button"
          class="btn mfa-secondary"
          :disabled="sendingEmail || emailCooldown > 0"
          @click="sendEmail"
        >
          {{ emailButtonText }}
        </button>

        <LoadingResponse :msg="message" :type="messageType" styletype="small" :loading="loading" />

        <button v-if="showCodeInput" type="submit" class="btn btn-primary" :disabled="loading || !codeComplete">
          {{ loading ? "Verificando..." : "Verificar" }}
        </button>
        <button type="button" class="btn mfa-secondary" :disabled="loading" @click="$emit('cancel')">
          Voltar
        </button>
      </form>
    </Transition>
  </div>
</template>

<script>
import LoadingResponse from "@/components/loadingResponse.vue";
import OtpInput from "@/components/security/OtpInput.vue";
import RecoveryCodeInput from "@/components/security/RecoveryCodeInput.vue";
import { apiErrorCode, apiErrorMessage, mfaMethodLabels, securityService } from "@/services/securityService";
import { normalizeRecoveryCode, OTP_LENGTH, RECOVERY_CODE_LENGTH } from "@/utils/otp_code";

const METHOD_ORDER = ["totp", "email", "recovery_code"];

const METHOD_ICONS = {
  totp: "qrcode",
  email: "envelope",
  recovery_code: "key",
};

const METHOD_DESCRIPTIONS = {
  totp: "Código do seu app autenticador",
  email: "Código enviado ao seu e-mail de recuperação",
  recovery_code: "Um dos seus códigos de backup",
};

// Segundo passo do login. O chamador decide o que fazer com o código validado (`verifyFn`), porque a tela de
// login do app e a de vínculo da Alexa não guardam a sessão do mesmo jeito.
export default {
  name: "MfaChallenge",
  components: { LoadingResponse, OtpInput, RecoveryCodeInput },
  props: {
    // { mfa_token, methods, email_hint }
    challenge: { type: Object, required: true },
    // async ({ method, code }) => resposta; rejeita com o erro da API
    verifyFn: { type: Function, required: true },
  },
  emits: ["verified", "cancel"],
  data() {
    const usable = METHOD_ORDER.filter((option) => this.challenge.methods.includes(option));

    return {
      methodLabels: mfaMethodLabels,
      methodIcons: METHOD_ICONS,
      methodDescriptions: METHOD_DESCRIPTIONS,
      method: usable[0] || "recovery_code",
      methodPickerOpen: false,
      code: "",
      emailConfirm: "",
      loading: false,
      sendingEmail: false,
      emailSent: false,
      emailCooldown: 0,
      emailTimer: null,
      message: "",
      messageType: "",
    };
  },
  computed: {
    // Só o método padrão aparece de cara (como na MFA da Microsoft); os outros ficam atrás do link
    // "Entrar de outra forma", pra quem não tem o primeiro método à mão.
    otherMethods() {
      return METHOD_ORDER.filter((option) => this.challenge.methods.includes(option) && option !== this.method);
    },
    // No método e-mail, o código só aparece depois que o usuário confirma o endereço e pede o envio.
    showCodeInput() {
      return this.method !== "email" || this.emailSent;
    },
    canConfirmEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailConfirm.trim());
    },
    // Código completo: 6 dígitos (app e e-mail) ou os 10 caracteres do código de backup.
    codeComplete() {
      return this.method === "recovery_code"
        ? normalizeRecoveryCode(this.code).length === RECOVERY_CODE_LENGTH
        : this.code.length === OTP_LENGTH;
    },
    leadText() {
      if (this.methodPickerOpen) {
        return "Escolha outra forma de verificar sua identidade.";
      }

      if (this.method === "email") {
        const hint = this.challenge.email_hint || "o seu e-mail de recuperação";
        if (this.emailSent) return `Enviamos um código para ${hint}. Digite-o abaixo.`;
        return `Digite seu e-mail de recuperação (${hint}). Se ele estiver correto, enviaremos um código de 6 dígitos.`;
      }

      if (this.method === "recovery_code") {
        return "Digite um dos seus códigos de backup. Cada código só funciona uma vez.";
      }

      return "Digite o código de 6 dígitos que aparece no seu app autenticador.";
    },
    codeLabel() {
      return this.method === "recovery_code" ? "Código de backup" : "Código de 6 dígitos";
    },
    emailButtonText() {
      if (this.sendingEmail) return "Enviando...";
      if (this.emailCooldown > 0) return `Reenviar em ${this.emailCooldown}s`;
      return this.emailSent ? "Reenviar código" : "Enviar código por e-mail";
    },
  },
  mounted() {
    this.$refs.codeInput?.focus();
  },
  beforeUnmount() {
    clearInterval(this.emailTimer);
  },
  methods: {
    selectMethod(option) {
      this.method = option;
      this.methodPickerOpen = false;
      this.code = "";
      this.emailConfirm = "";
      this.message = "";
      this.messageType = "";
      // O foco só é aplicado em onStepEntered: com o modo "out-in" da transição, o input do novo
      // método só existe no DOM depois que a etapa anterior termina de sair.
    },
    onStepEntered() {
      if (this.methodPickerOpen) return;
      (this.$refs.emailConfirmInput || this.$refs.codeInput)?.focus();
    },
    startCooldown(seconds) {
      clearInterval(this.emailTimer);
      this.emailCooldown = seconds;
      this.emailTimer = setInterval(() => {
        this.emailCooldown -= 1;
        if (this.emailCooldown <= 0) clearInterval(this.emailTimer);
      }, 1000);
    },
    async sendEmail() {
      if (!this.emailSent && !this.canConfirmEmail) return;

      this.sendingEmail = true;
      this.message = "";

      try {
        const result = await securityService.sendLoginEmailCode(this.challenge.mfa_token, this.emailConfirm.trim());
        this.emailSent = true;
        this.startCooldown(result.resend_after_seconds || 60);
        await this.$nextTick();
        this.$refs.codeInput?.focus();
      } catch (error) {
        if (apiErrorCode(error) === "EMAIL_COOLDOWN") {
          this.emailSent = true;
          this.startCooldown(error.response.data.data.retry_after_seconds || 30);
        }
        this.messageType = "error";
        this.message = apiErrorMessage(error, "Não foi possível enviar o e-mail agora.");
      } finally {
        this.sendingEmail = false;
      }
    },
    async submit() {
      if (this.loading || !this.codeComplete) return;

      this.loading = true;
      this.message = "";

      try {
        const response = await this.verifyFn({
          method: this.method,
          code: this.code,
        });
        this.$emit("verified", response);
      } catch (error) {
        this.messageType = "error";
        this.message = apiErrorMessage(error, "Não foi possível verificar o código.");
        this.code = "";
        this.$refs.codeInput?.focus();
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.mfa-challenge {
  display: flex;
  flex-direction: column;
}

.mfa-challenge h2 {
  margin-bottom: var(--space-3);
}

.mfa-lead {
  font-size: var(--fontsize-xs);
  color: var(--gray-100);
  line-height: 1.6;
  margin-bottom: var(--space-4);
}

.mfa-other-methods {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.mfa-option {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.mfa-option:hover {
  background: var(--surface-2);
  border-color: var(--deep-blue);
  transform: translateY(-1px);
}

.mfa-option-icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 1rem;
}

.mfa-option-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mfa-option-title {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
}

.mfa-option-desc {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  line-height: 1.4;
}

.mfa-option-chevron {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.mfa-link-btn {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--deep-blue);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  margin-top: var(--space-2);
  margin-bottom: var(--space-1);
}

.mfa-challenge .form-group label {
  color: var(--black);
}

.mfa-challenge .btn {
  background-color: var(--background-gray);
  color: var(--black);
  margin-top: var(--space-3);
}

.mfa-challenge .btn.btn-primary {
  background-image: var(--deep-blue-gradient);
  color: var(--white);
}

.mfa-step-enter-active,
.mfa-step-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.mfa-step-enter-from,
.mfa-step-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
