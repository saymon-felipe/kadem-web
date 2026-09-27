<template>
  <section class="sec-section">
    <h3>
      <span>Verificação em duas etapas</span>
      <span class="sec-badge" :class="mfa.enabled ? 'ok' : ''">{{ mfa.enabled ? "Ativada" : "Desativada" }}</span>
    </h3>
    <p>
      Além da senha, pedimos um código ao entrar em um dispositivo novo. Assim, ninguém acessa a sua conta só com a
      senha.
    </p>

    <div class="sec-card">
      <div class="sec-row">
        <div class="sec-icon" :class="{ ok: mfa.enabled }"><font-awesome-icon icon="qrcode" /></div>
        <div class="sec-body">
          <div class="sec-title">
            App autenticador
            <span v-if="mfa.enabled" class="sec-badge ok">Ativo</span>
          </div>
          <div class="sec-meta">Google Authenticator, Microsoft Authenticator, Authy e similares.</div>
        </div>
      </div>
      <div class="sec-actions">
        <button class="sec-btn primary" :disabled="!online" @click="showTotp = true">
          {{ mfa.enabled ? "Reconfigurar" : "Configurar" }}
        </button>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-row">
        <div class="sec-icon" :class="{ ok: recoveryEmail }"><font-awesome-icon icon="envelope" /></div>
        <div class="sec-body">
          <div class="sec-title">
            E-mail de recuperação
            <span v-if="recoveryEmail" class="sec-badge ok">Confirmado</span>
          </div>
          <div class="sec-meta">
            <template v-if="recoveryEmail">
              Os códigos são enviados para {{ recoveryEmail.email_hint }}. Use quando não tiver o app autenticador.
            </template>
            <template v-else>
              Um segundo e-mail (diferente do da conta) que recebe um código para você entrar sem o app autenticador.
            </template>
          </div>
        </div>
      </div>
      <div class="sec-actions">
        <button class="sec-btn primary" :disabled="!online" @click="showRecoveryEmail = true">
          {{ recoveryEmail ? "Alterar e-mail" : "Adicionar e-mail" }}
        </button>
        <button v-if="recoveryEmail" class="sec-btn danger" :disabled="!online || busy" @click="showRemoveEmail = true">
          Remover
        </button>
      </div>
    </div>

    <div v-if="mfa.enabled" class="sec-card">
      <div class="sec-row">
        <div class="sec-icon" :class="lowCodes ? 'warn' : 'ok'"><font-awesome-icon icon="key" /></div>
        <div class="sec-body">
          <div class="sec-title">
            Códigos de backup
            <span class="sec-badge" :class="lowCodes ? 'warn' : 'info'">
              {{ mfa.recovery_codes.remaining }} de {{ mfa.recovery_codes.total }} disponíveis
            </span>
          </div>
          <div class="sec-meta">
            Use um deles para entrar se perder o celular. Cada código funciona uma única vez.
            <template v-if="lowCodes"> Restam poucos: gere novos códigos.</template>
          </div>
        </div>
      </div>
      <div class="sec-actions">
        <button class="sec-btn" :disabled="!online || busy" @click="showRegenerate = true">Gerar novos códigos</button>
      </div>
    </div>

    <button
      v-if="mfa.enabled"
      class="sec-btn danger disable-btn"
      :disabled="!online || busy"
      @click="showDisable = true"
    >
      Desativar verificação em duas etapas
    </button>

    <TotpSetupModal v-model="showTotp" @enabled="onEnabled" />
    <RecoveryEmailModal v-model="showRecoveryEmail" @saved="onRecoveryEmailSaved" />
    <RecoveryCodesModal v-model="showCodes" :codes="codes" :title="codesTitle" @closed="codes = []" />

    <ConfirmationModal
      v-model="showRemoveEmail"
      message="Remover o e-mail de recuperação?"
      description="Você deixará de poder receber códigos por e-mail ao entrar. O app autenticador e os códigos de backup continuam valendo."
      confirm-text="Remover"
      @confirmed="removeRecoveryEmail"
    />
    <ConfirmationModal
      v-model="showRegenerate"
      message="Gerar novos códigos de backup?"
      description="Os códigos atuais deixam de funcionar assim que os novos forem gerados."
      confirm-text="Gerar novos"
      @confirmed="regenerate"
    />
    <ConfirmationModal
      v-model="showDisable"
      message="Desativar a verificação em duas etapas?"
      description="Sua conta voltará a exigir apenas a senha. Os códigos de backup e todos os dispositivos confiáveis serão apagados. O e-mail de recuperação é mantido."
      confirm-text="Remover"
      @confirmed="disable"
    />
  </section>
</template>

<script>
import { mapActions } from "pinia";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import TotpSetupModal from "./TotpSetupModal.vue";
import RecoveryEmailModal from "./RecoveryEmailModal.vue";
import RecoveryCodesModal from "./RecoveryCodesModal.vue";
import { useAppStore } from "@/stores/app";
import { apiErrorMessage, securityService } from "@/services/securityService";
import "./security.css";

const LOW_CODES_THRESHOLD = 3;

export default {
  name: "MfaSection",
  components: { ConfirmationModal, TotpSetupModal, RecoveryEmailModal, RecoveryCodesModal },
  props: {
    overview: { type: Object, required: true },
    online: { type: Boolean, default: true },
  },
  emits: ["changed"],
  data() {
    return {
      showTotp: false,
      showRecoveryEmail: false,
      showCodes: false,
      showRemoveEmail: false,
      showRegenerate: false,
      showDisable: false,
      codes: [],
      codesTitle: "Guarde seus códigos de backup",
      busy: false,
    };
  },
  computed: {
    mfa() {
      return this.overview.mfa;
    },
    recoveryEmail() {
      return this.mfa.recovery_email;
    },
    lowCodes() {
      return this.mfa.recovery_codes.remaining <= LOW_CODES_THRESHOLD;
    },
  },
  methods: {
    ...mapActions(useAppStore, ["showToast"]),
    onEnabled(recoveryCodes) {
      this.$emit("changed");
      this.showToast({ message: "Verificação em duas etapas ativada.", type: "success" });

      if (recoveryCodes?.length) {
        this.codesTitle = "Guarde seus códigos de backup";
        this.codes = recoveryCodes;
        this.showCodes = true;
      }
    },
    onRecoveryEmailSaved() {
      this.$emit("changed");
      this.showToast({ message: "E-mail de recuperação confirmado.", type: "success" });
    },
    async run(action, successMessage) {
      this.busy = true;

      try {
        const result = await action();
        this.$emit("changed");
        if (successMessage) this.showToast({ message: successMessage, type: "success" });
        return result;
      } catch (error) {
        if (error?.response?.data?.data?.code !== "REAUTH_REQUIRED") {
          this.showToast({ message: apiErrorMessage(error, "Não foi possível concluir a ação."), type: "error" });
        }
        return null;
      } finally {
        this.busy = false;
      }
    },
    removeRecoveryEmail() {
      return this.run(() => securityService.removeRecoveryEmail(), "E-mail de recuperação removido.");
    },
    async regenerate() {
      const result = await this.run(() => securityService.regenerateRecoveryCodes());

      if (result?.recovery_codes) {
        this.codesTitle = "Seus novos códigos de backup";
        this.codes = result.recovery_codes;
        this.showCodes = true;
      }
    },
    disable() {
      return this.run(() => securityService.disableMfa(), "Verificação em duas etapas desativada.");
    },
  },
};
</script>

<style scoped>
.disable-btn {
  align-self: flex-start;
}
</style>
