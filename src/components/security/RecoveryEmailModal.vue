<template>
  <BaseModal
    :model-value="modelValue"
    title="E-mail de recuperação"
    size="sm"
    :close-on-backdrop="false"
    :handle-mobile-back="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="reset"
  >
    <div class="sec-form">
      <template v-if="!sent">
        <p>
          Informe um e-mail <strong>diferente</strong> do e-mail da sua conta. Ele recebe um código para você entrar
          quando não tiver o app autenticador. Vamos enviar um código para confirmar que o endereço é seu.
        </p>

        <div class="form-group">
          <input
            id="recovery-email"
            ref="emailInput"
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            maxlength="254"
            placeholder=" "
            @keyup.enter="sendCode"
          />
          <label for="recovery-email">E-mail de recuperação</label>
        </div>
      </template>

      <template v-else>
        <p>Enviamos um código de 6 dígitos para <strong>{{ emailHint }}</strong>. Ele vale por {{ validMinutes }} minutos.</p>

        <div class="form-group">
          <input
            id="recovery-email-code"
            ref="codeInput"
            v-model="code"
            class="sec-code-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            placeholder=" "
            @keyup.enter="confirm"
          />
          <label for="recovery-email-code">Código recebido</label>
        </div>

        <div class="sec-actions">
          <button type="button" class="sec-btn ghost" :disabled="sending || cooldown > 0" @click="sendCode">
            {{ cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código" }}
          </button>
          <button type="button" class="sec-btn ghost" :disabled="sending || confirming" @click="changeAddress">
            Usar outro e-mail
          </button>
        </div>
      </template>

      <p v-if="error" class="sec-inline-message error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="sec-form-actions email-footer">
        <button type="button" class="sec-btn" :disabled="sending || confirming" @click="cancel">Cancelar</button>
        <button
          v-if="!sent"
          type="button"
          class="sec-btn primary"
          :disabled="sending || !looksLikeEmail"
          @click="sendCode"
        >
          {{ sending ? "Enviando..." : "Enviar código" }}
        </button>
        <button
          v-else
          type="button"
          class="sec-btn primary"
          :disabled="confirming || code.trim().length < 4"
          @click="confirm"
        >
          {{ confirming ? "Confirmando..." : "Confirmar" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import { apiErrorCode, apiErrorMessage, securityService } from "@/services/securityService";
import "./security.css";

export default {
  name: "RecoveryEmailModal",
  components: { BaseModal },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "saved"],
  data() {
    return {
      email: "",
      code: "",
      sent: false,
      emailHint: "",
      validMinutes: 10,
      sending: false,
      confirming: false,
      cooldown: 0,
      timer: null,
      error: "",
    };
  },
  computed: {
    looksLikeEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
    },
  },
  watch: {
    modelValue(open) {
      if (open) {
        this.reset();
        this.$nextTick(() => this.$refs.emailInput?.focus());
      }
    },
  },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  methods: {
    startCooldown(seconds) {
      clearInterval(this.timer);
      this.cooldown = seconds;
      this.timer = setInterval(() => {
        this.cooldown -= 1;
        if (this.cooldown <= 0) clearInterval(this.timer);
      }, 1000);
    },
    async sendCode() {
      if (this.sending || !this.looksLikeEmail) return;

      this.sending = true;
      this.error = "";

      try {
        const result = await securityService.beginRecoveryEmail(this.email.trim());
        this.sent = true;
        this.emailHint = result.email_hint;
        this.validMinutes = Math.round((result.expires_in_seconds || 600) / 60);
        this.startCooldown(result.resend_after_seconds || 60);
        this.$nextTick(() => this.$refs.codeInput?.focus());
      } catch (error) {
        if (apiErrorCode(error) === "EMAIL_COOLDOWN") {
          this.startCooldown(error.response.data.data.retry_after_seconds || 30);
        }
        if (apiErrorCode(error) !== "REAUTH_REQUIRED") {
          this.error = apiErrorMessage(error, "Não foi possível enviar o e-mail.");
        }
      } finally {
        this.sending = false;
      }
    },
    async confirm() {
      if (this.confirming || this.code.trim().length < 4) return;

      this.confirming = true;
      this.error = "";

      try {
        await securityService.confirmRecoveryEmail(this.code.trim());
        this.$emit("saved");
        this.$emit("update:modelValue", false);
        this.reset();
      } catch (error) {
        this.error = apiErrorMessage(error, "Não foi possível confirmar o código.");
        this.code = "";
        this.$refs.codeInput?.focus();
      } finally {
        this.confirming = false;
      }
    },
    changeAddress() {
      clearInterval(this.timer);
      this.sent = false;
      this.code = "";
      this.cooldown = 0;
      this.error = "";
      this.$nextTick(() => this.$refs.emailInput?.focus());
    },
    cancel() {
      this.$emit("update:modelValue", false);
      this.reset();
    },
    reset() {
      clearInterval(this.timer);
      this.email = "";
      this.code = "";
      this.sent = false;
      this.emailHint = "";
      this.cooldown = 0;
      this.error = "";
    },
  },
};
</script>

<style scoped>
.email-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  margin-top: 0;
}
</style>
