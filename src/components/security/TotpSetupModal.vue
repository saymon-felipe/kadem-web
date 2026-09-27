<template>
  <BaseModal
    :model-value="modelValue"
    title="App autenticador"
    size="md"
    :close-on-backdrop="false"
    :handle-mobile-back="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="reset"
  >
    <div class="sec-form">
      <div v-if="loading" class="totp-loading">
        <font-awesome-icon icon="circle-notch" spin />
        <span>Preparando...</span>
      </div>

      <template v-else-if="setup">
        <p>
          <strong>1.</strong> Abra o Google Authenticator, Microsoft Authenticator, Authy ou outro app de
          autenticação e escaneie o QR code.
        </p>

        <div class="totp-qr">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code para o app autenticador" width="196" height="196" />
        </div>

        <details class="totp-manual">
          <summary>Não consigo escanear</summary>
          <p>Digite esta chave no app (tipo de chave: baseada em tempo):</p>
          <code class="totp-secret">{{ formattedSecret }}</code>
        </details>

        <p><strong>2.</strong> Digite o código de 6 dígitos que o app mostra para confirmar.</p>

        <div class="form-group">
          <input
            id="totp-code"
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
          <label for="totp-code">Código de 6 dígitos</label>
        </div>
      </template>

      <p v-if="error" class="sec-inline-message error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="sec-form-actions totp-footer">
        <button type="button" class="sec-btn" :disabled="confirming" @click="cancel">Cancelar</button>
        <button
          v-if="setup"
          type="button"
          class="sec-btn primary"
          :disabled="confirming || code.trim().length < 6"
          @click="confirm"
        >
          {{ confirming ? "Ativando..." : "Ativar" }}
        </button>
        <button v-else-if="!loading" type="button" class="sec-btn primary" @click="start">Tentar novamente</button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import QRCode from "qrcode";
import { apiErrorCode, apiErrorMessage, securityService } from "@/services/securityService";
import "./security.css";

export default {
  name: "TotpSetupModal",
  components: { BaseModal },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "enabled"],
  data() {
    return {
      loading: false,
      confirming: false,
      setup: null,
      qrDataUrl: "",
      code: "",
      error: "",
    };
  },
  computed: {
    formattedSecret() {
      return (this.setup?.secret || "").replace(/(.{4})/g, "$1 ").trim();
    },
  },
  watch: {
    modelValue(open) {
      if (open) this.start();
    },
  },
  methods: {
    async start() {
      this.reset();
      this.loading = true;

      try {
        this.setup = await securityService.beginTotpSetup();
        this.qrDataUrl = await QRCode.toDataURL(this.setup.otpauth_uri, { margin: 1, width: 196 });
        this.$nextTick(() => this.$refs.codeInput?.focus());
      } catch (error) {
        this.setup = null;
        this.error = apiErrorCode(error) === "REAUTH_REQUIRED"
          ? "Confirmação de identidade cancelada."
          : apiErrorMessage(error, "Não foi possível iniciar a configuração.");
      } finally {
        this.loading = false;
      }
    },
    async confirm() {
      if (this.confirming || this.code.trim().length < 6) return;

      this.confirming = true;
      this.error = "";

      try {
        const result = await securityService.confirmTotpSetup(this.setup.setup_token, this.code.trim());
        this.$emit("enabled", result.recovery_codes);
        this.$emit("update:modelValue", false);
        this.reset();
      } catch (error) {
        this.error = apiErrorMessage(error, "Não foi possível ativar o app autenticador.");
        this.code = "";
        this.$refs.codeInput?.focus();
      } finally {
        this.confirming = false;
      }
    },
    cancel() {
      this.$emit("update:modelValue", false);
      this.reset();
    },
    reset() {
      this.setup = null;
      this.qrDataUrl = "";
      this.code = "";
      this.error = "";
    },
  },
};
</script>

<style scoped>
.totp-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-8) 0;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
}

.totp-qr {
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: #ffffff;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  min-height: 220px;
}

.totp-qr img {
  display: block;
  image-rendering: pixelated;
}

.totp-manual {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.totp-manual summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--blue);
  margin-bottom: var(--space-3);
}

.totp-secret {
  display: block;
  padding: var(--space-3) var(--space-4);
  background: var(--surface-2);
  border-radius: var(--radius-xs);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--fontsize-sx);
  letter-spacing: 0.06em;
  color: var(--text-primary);
  user-select: all;
  overflow-wrap: anywhere;
}

.totp-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  margin-top: 0;
}
</style>
