<template>
  <BaseModal
    :model-value="reauth.visible"
    title="Confirme sua identidade"
    size="sm"
    backdrop-class="reauth-backdrop"
    :close-on-backdrop="false"
    :handle-mobile-back="false"
    @update:model-value="onModelUpdate"
  >
    <div class="sec-form">
      <p>Por segurança, confirme que é você para continuar com esta ação.</p>

      <template v-if="passkeyAvailable">
        <button type="button" class="sec-btn primary reauth-passkey" :disabled="busy" @click="usePasskey">
          <font-awesome-icon icon="fingerprint" />
          {{ passkeyBusy ? "Aguardando..." : "Usar biometria ou passkey" }}
        </button>
        <p class="reauth-divider"><span>ou com sua senha</span></p>
      </template>

      <div class="form-group">
        <input
          id="reauth-password"
          ref="passwordInput"
          v-model="password"
          type="password"
          autocomplete="current-password"
          maxlength="255"
          placeholder=" "
          @keyup.enter="submit"
        />
        <label for="reauth-password">Senha</label>
      </div>

      <template v-if="mfaEnabled">
        <div v-if="methods.length > 1" class="reauth-methods" role="tablist">
          <button
            v-for="option in methods"
            :key="option"
            type="button"
            class="reauth-method"
            :class="{ active: method === option }"
            @click="selectMethod(option)"
          >
            {{ methodLabels[option] }}
          </button>
        </div>

        <div class="form-group">
          <input
            id="reauth-code"
            v-model="code"
            class="sec-code-input"
            type="text"
            :inputmode="method === 'recovery_code' ? 'text' : 'numeric'"
            autocomplete="one-time-code"
            :maxlength="method === 'recovery_code' ? 16 : 8"
            placeholder=" "
            @keyup.enter="submit"
          />
          <label for="reauth-code">{{ method === "recovery_code" ? "Código de backup" : "Código de verificação" }}</label>
        </div>

        <p v-if="method === 'totp'" class="sec-hint">
          Se você acabou de usar este código, aguarde o app gerar o próximo.
        </p>

        <p v-if="method === 'email' && emailHint" class="sec-hint">
          O código é enviado para {{ emailHint }}.
        </p>

        <button
          v-if="method === 'email'"
          type="button"
          class="sec-btn ghost"
          :disabled="sendingEmail || emailCooldown > 0"
          @click="sendEmail"
        >
          {{ sendingEmail ? "Enviando..." : emailCooldown > 0 ? `Reenviar em ${emailCooldown}s` : "Enviar código por e-mail" }}
        </button>
      </template>

      <p v-if="error" class="sec-inline-message error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="sec-form-actions reauth-footer">
        <button type="button" class="sec-btn" :disabled="busy" @click="cancel">Cancelar</button>
        <button type="button" class="sec-btn primary" :disabled="!canSubmit || busy" @click="submit">
          {{ submitting ? "Confirmando..." : "Confirmar" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import { mapStores } from "pinia";
import BaseModal from "@/components/BaseModal.vue";
import { useReauthStore } from "@/stores/reauth";
import { useAuthStore } from "@/stores/auth";
import { authenticateWithBiometrics, isBiometricCancellationError, isBiometricSupported } from "@/services/biometricAuth";
import { apiErrorCode, apiErrorMessage, mfaMethodLabels, securityService } from "@/services/securityService";
import "./security.css";

const METHOD_ORDER = ["totp", "email", "recovery_code"];

// Modal global (montado no App): aparece quando o servidor exige autenticação recente para uma ação sensível.
// A confirmação vale por alguns minutos e a requisição que falhou é repetida automaticamente pelo interceptor.
export default {
  name: "ReauthModal",
  components: { BaseModal },
  data() {
    return {
      methodLabels: mfaMethodLabels,
      overview: null,
      biometricSupported: false,
      password: "",
      method: "totp",
      code: "",
      error: "",
      submitting: false,
      passkeyBusy: false,
      sendingEmail: false,
      emailCooldown: 0,
      emailTimer: null,
    };
  },
  computed: {
    ...mapStores(useReauthStore, useAuthStore),
    reauth() {
      return this.reauthStore;
    },
    mfaEnabled() {
      return Boolean(this.overview?.mfa?.enabled);
    },
    methods() {
      const enrolled = (this.overview?.mfa?.methods || []).map((item) => item.type);
      return METHOD_ORDER.filter((option) => {
        if (option === "recovery_code") return (this.overview?.mfa?.recovery_codes?.remaining || 0) > 0;
        if (option === "email") return Boolean(this.overview?.mfa?.recovery_email);
        return enrolled.includes(option);
      });
    },
    emailHint() {
      return this.overview?.mfa?.recovery_email?.email_hint || "";
    },
    passkeyAvailable() {
      return this.biometricSupported && (this.overview?.passkeys?.length || 0) > 0;
    },
    busy() {
      return this.submitting || this.passkeyBusy;
    },
    canSubmit() {
      if (!this.password) return false;
      return !this.mfaEnabled || this.code.trim().length >= 4;
    },
  },
  watch: {
    "reauth.visible": {
      handler(visible) {
        if (visible) this.prepare();
        else this.clear();
      },
    },
  },
  beforeUnmount() {
    clearInterval(this.emailTimer);
  },
  methods: {
    async prepare() {
      this.clear();
      this.biometricSupported = await isBiometricSupported();

      try {
        this.overview = await securityService.getOverview();
        this.method = this.methods[0] || "totp";
      } catch (error) {
        this.error = apiErrorMessage(error, "Não foi possível carregar suas opções de verificação.");
      }

      this.$nextTick(() => this.$refs.passwordInput?.focus());
    },
    clear() {
      clearInterval(this.emailTimer);
      this.overview = null;
      this.password = "";
      this.code = "";
      this.error = "";
      this.emailCooldown = 0;
    },
    onModelUpdate(open) {
      if (!open && this.reauth.visible) this.cancel();
    },
    selectMethod(option) {
      this.method = option;
      this.code = "";
      this.error = "";
    },
    cancel() {
      this.reauthStore.cancel();
    },
    async submit() {
      if (!this.canSubmit || this.busy) return;

      this.submitting = true;
      this.error = "";

      try {
        await securityService.reauthenticate({
          password: this.password,
          mfa: this.mfaEnabled ? { method: this.method, code: this.code.trim() } : undefined,
        });
        this.reauthStore.complete();
      } catch (error) {
        this.error = apiErrorMessage(error, "Não foi possível confirmar sua identidade.");
        if (apiErrorCode(error) === "MFA_INVALID_CODE") this.code = "";
      } finally {
        this.submitting = false;
      }
    },
    async usePasskey() {
      this.passkeyBusy = true;
      this.error = "";

      try {
        // O servidor reaproveita a sessão atual ao validar a passkey e a marca como recém-autenticada.
        await authenticateWithBiometrics(this.authStore.user.email);
        this.reauthStore.complete();
      } catch (error) {
        if (!isBiometricCancellationError(error)) {
          this.error = apiErrorMessage(error, "Não foi possível validar a biometria.");
        }
      } finally {
        this.passkeyBusy = false;
      }
    },
    async sendEmail() {
      this.sendingEmail = true;
      this.error = "";

      try {
        const result = await securityService.sendReauthEmailCode();
        this.startCooldown(result.resend_after_seconds || 60);
      } catch (error) {
        if (apiErrorCode(error) === "EMAIL_COOLDOWN") this.startCooldown(error.response.data.data.retry_after_seconds || 30);
        this.error = apiErrorMessage(error, "Não foi possível enviar o e-mail.");
      } finally {
        this.sendingEmail = false;
      }
    },
    startCooldown(seconds) {
      clearInterval(this.emailTimer);
      this.emailCooldown = seconds;
      this.emailTimer = setInterval(() => {
        this.emailCooldown -= 1;
        if (this.emailCooldown <= 0) clearInterval(this.emailTimer);
      }, 1000);
    },
  },
};
</script>

<style>
/* Sem scoped: o overlay é teletransportado para o body e precisa ficar acima dos outros modais. */
.reauth-backdrop {
  z-index: 10600 !important;
}
</style>

<style scoped>
.reauth-passkey {
  width: 100%;
  height: 44px;
}

.reauth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
  color: var(--text-muted);
}

.reauth-divider::before,
.reauth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--glass-border);
}

.reauth-methods {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.reauth-method {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
}

.reauth-method.active {
  background: var(--surface-0);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
}

.reauth-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  margin-top: 0;
}
</style>
