<template>
  <div class="invite-wrapper">
    <div class="invite-card glass">
      <div class="brand-header">
        <img src="@/assets/images/kadem-logo.png" alt="Kadem Logo" class="brand-logo" />
      </div>

      <div class="content-body">
        <h2 v-if="loading">Validando Convite</h2>
        <h2 v-else-if="responseType === 'error'">Ops!</h2>

        <p v-if="loading" class="status-text">Verificando credenciais de acesso...</p>

        <div v-if="loading" class="spinner-container">
          <font-awesome-icon icon="circle-notch" spin size="2x" class="loading-icon" />
        </div>

        <div class="response-area">
          <LoadingResponse
            :msg="response"
            :type="responseType"
            styletype="small"
            :loading="false"
          />
        </div>
      </div>
    </div>

    <div class="background-overlay"></div>
  </div>
</template>

<script>
import { api } from "@/plugins/api";
import LoadingResponse from "@/components/loadingResponse.vue";
import { useAuthStore } from "../stores/auth";

export default {
  name: "InviteLanding",
  components: { LoadingResponse },
  data() {
    return {
      loading: true,
    };
  },
  async mounted() {
    const token = this.$route.query.token;

    if (!token) return this.$router.push({ name: "home" });

    this.resetResponse();

    await new Promise((r) => setTimeout(r, 800));

    try {
      const res = await api.get(`/projects/invite/validate/${token}`);
      const { has_account, email, is_valid } = res.data;

      if (is_valid) {
        const authStore = useAuthStore();
        authStore.logout(false, true);

        if (has_account) {
          this.$router.push({
            name: "Auth",
            query: { authtype: "login", invite_token: token },
          });
        } else {
          this.$router.push({
            name: "Auth",
            query: {
              authtype: "register",
              email: email,
              invite_token: token,
            },
          });
        }
      } else {
        this.setResponse("error", "Este convite é inválido ou já expirou.", false);
      }
    } catch (error) {
      console.error("Erro na validação do convite:", error);
      const msg = error.response?.data?.message || "Falha ao conectar ao servidor.";
      this.setResponse("error", msg, false);
    }
  },
};
</script>

<style scoped>
.invite-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
  background-image: url("@/assets/images/fundo-auth.webp");
  background-size: cover;
  background-position: center;
  z-index: 9999;
}

.invite-card {
  width: 90%;
  max-width: 400px;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.brand-header {
  margin-bottom: var(--space-5);
}

.brand-logo {
  height: 60px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.content-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

h2 {
  color: var(--deep-blue);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.status-text {
  color: var(--gray-500);
  font-size: 0.95rem;
  margin: 0;
}

.spinner-container {
  margin: var(--space-4) 0;
  color: var(--deep-blue);
}

.loading-icon {
  opacity: 0.8;
}

.response-area {
  width: 100%;
  margin-top: var(--space-2);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {
  .invite-card {
    padding: var(--space-5);
    max-width: 90%;
  }

  .brand-logo {
    height: 50px;
  }
}
</style>
