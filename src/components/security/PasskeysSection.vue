<template>
  <section class="sec-section">
    <h3>
      <span>Passkeys e biometria</span>
      <span class="sec-badge" :class="passkeys.length ? 'ok' : ''">
        {{ passkeys.length ? `${passkeys.length} cadastrada${passkeys.length > 1 ? "s" : ""}` : "Nenhuma" }}
      </span>
    </h3>
    <p>
      Entre com a digital, o rosto ou o PIN do dispositivo, sem digitar senha nem código. Uma passkey já vale como
      verificação em duas etapas.
    </p>

    <div v-for="passkey in passkeys" :key="passkey.id" class="sec-card">
      <div class="sec-row">
        <div class="sec-icon ok"><font-awesome-icon icon="fingerprint" /></div>
        <div class="sec-body">
          <div class="sec-title">
            {{ passkey.name || "Passkey" }}
            <span v-if="passkey.backed_up" class="sec-badge info">Sincronizada</span>
          </div>
          <div class="sec-meta">
            Criada em {{ formatDate(passkey.created_at) }} ·
            {{ passkey.last_used_at ? `usada em ${formatDate(passkey.last_used_at)}` : "ainda não usada" }}
          </div>
        </div>
        <button
          class="sec-btn danger icon-only"
          :disabled="!online || busyId === passkey.id"
          title="Remover passkey"
          aria-label="Remover passkey"
          @click="askRemove(passkey)"
        >
          <font-awesome-icon icon="trash" />
        </button>
      </div>
    </div>

    <p v-if="!supported" class="sec-hint">Este dispositivo não oferece suporte a passkeys.</p>
    <div v-else class="sec-actions">
      <button class="sec-btn primary" :disabled="!online || adding" @click="add">
        <font-awesome-icon icon="plus" />
        {{ adding ? "Aguardando o dispositivo..." : "Adicionar passkey neste dispositivo" }}
      </button>
    </div>
    <p v-if="error" class="sec-inline-message error">{{ error }}</p>

    <ConfirmationModal
      v-model="showRemove"
      message="Remover esta passkey?"
      description="Você não poderá mais entrar com ela. Se for a sua única passkey, o desbloqueio biométrico do Cofre também deixa de funcionar neste dispositivo."
      confirm-text="Remover"
      @confirmed="remove"
    />
  </section>
</template>

<script>
import { mapActions, mapState } from "pinia";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import {
  biometricDeclinedKey,
  isBiometricSupported,
  registerBiometricCredential,
  rememberedEmailKey,
} from "@/services/biometricAuth";
import { apiErrorMessage, securityService } from "@/services/securityService";
import "./security.css";

export default {
  name: "PasskeysSection",
  components: { ConfirmationModal },
  props: {
    passkeys: { type: Array, default: () => [] },
    online: { type: Boolean, default: true },
  },
  emits: ["changed"],
  data() {
    return {
      supported: false,
      adding: false,
      busyId: null,
      error: "",
      showRemove: false,
      target: null,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
  },
  async mounted() {
    this.supported = await isBiometricSupported();
  },
  methods: {
    ...mapActions(useAppStore, ["showToast"]),
    formatDate(value) {
      return value ? new Date(value).toLocaleDateString("pt-BR") : "";
    },
    async add() {
      this.adding = true;
      this.error = "";

      try {
        const credential = await registerBiometricCredential({
          onError: (message) => {
            this.error = message;
          },
          name: this.deviceName(),
        });

        if (!credential) return;

        // Habilita o atalho "Entrar com biometria" na tela de login deste navegador.
        localStorage.setItem(rememberedEmailKey, this.user.email);
        localStorage.removeItem(biometricDeclinedKey(this.user.email));
        this.showToast({ message: "Passkey cadastrada.", type: "success" });
        this.$emit("changed");
      } finally {
        this.adding = false;
      }
    },
    deviceName() {
      const ua = navigator.userAgent || "";
      const os = /Windows/.test(ua) ? "Windows"
        : /Android/.test(ua) ? "Android"
          : /iPhone|iPad|iPod/.test(ua) ? "iOS"
            : /Mac OS X|Macintosh/.test(ua) ? "macOS"
              : /Linux/.test(ua) ? "Linux" : "";
      return os ? `Passkey · ${os}` : "Passkey";
    },
    askRemove(passkey) {
      this.target = passkey;
      this.showRemove = true;
    },
    async remove() {
      const passkey = this.target;
      if (!passkey) return;

      this.busyId = passkey.id;
      this.error = "";

      try {
        await securityService.removePasskey(passkey.id);

        if (this.passkeys.length === 1) {
          localStorage.setItem(biometricDeclinedKey(this.user.email), "true");
        }

        this.showToast({ message: "Passkey removida.", type: "success" });
        this.$emit("changed");
      } catch (error) {
        if (error?.response?.data?.data?.code !== "REAUTH_REQUIRED") {
          this.error = apiErrorMessage(error, "Não foi possível remover a passkey.");
        }
      } finally {
        this.busyId = null;
      }
    },
  },
};
</script>
