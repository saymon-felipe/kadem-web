<template>
  <section class="sec-section">
    <h3>
      <span>Senha</span>
      <span v-if="passwordChangedAt" class="sec-badge">Alterada em {{ formatDate(passwordChangedAt) }}</span>
    </h3>
    <p>
      Para trocar a senha, enviamos um link para <strong>{{ user.email }}</strong>. Na página do link você define a
      nova senha e escolhe se desconecta todos os dispositivos, só alguns ou nenhum.
    </p>

    <p v-if="missingRecoveryCode" class="sec-inline-message error">
      Você ainda não gerou o código de recuperação do Cofre. Gere-o antes de trocar a senha, senão as contas
      guardadas no Cofre não poderão ser migradas para a nova senha.
    </p>
    <p v-else class="sec-hint">
      Depois da troca, o Cofre é migrado no próximo acesso: tenha em mãos o seu Código de Recuperação (Senha Mestra).
    </p>

    <div class="sec-actions">
      <button class="sec-btn primary" :disabled="!online || sending || missingRecoveryCode" @click="sendLink">
        {{ sending ? "Enviando..." : "Enviar link para trocar a senha" }}
      </button>
    </div>

    <p v-if="sentTo" class="sec-inline-message success">
      Link enviado para {{ sentTo }}. Ele vale por 15 minutos.
    </p>
    <p v-if="error" class="sec-inline-message error">{{ error }}</p>
  </section>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/services/securityService";
import { api } from "@/plugins/api";
import "./security.css";

// A troca de senha é sempre feita pelo link do e-mail (a mesma tela do "esqueci minha senha"): é lá que a pessoa
// escolhe o que acontece com as outras sessões. Dentro do app só se pede o link.
export default {
  name: "PasswordSection",
  props: {
    passwordChangedAt: { type: String, default: null },
    online: { type: Boolean, default: true },
  },
  data() {
    return { sending: false, sentTo: "", error: "" };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    // Sem o código de recuperação o Cofre não consegue ser recifrado depois de uma redefinição por e-mail.
    missingRecoveryCode() {
      return this.user?.has_recovery_payload === false;
    },
  },
  methods: {
    ...mapActions(useAppStore, ["showToast"]),
    formatDate(value) {
      return new Date(value).toLocaleDateString("pt-BR");
    },
    async sendLink() {
      if (this.sending || this.missingRecoveryCode) return;

      this.sending = true;
      this.error = "";
      this.sentTo = "";

      try {
        await api.post("/auth/request_reset_password", { email: this.user.email });
        this.sentTo = this.user.email;
        this.showToast({ message: "Link de troca de senha enviado por e-mail.", type: "success" });
      } catch (error) {
        this.error = apiErrorMessage(error, "Não foi possível enviar o link agora.");
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>
