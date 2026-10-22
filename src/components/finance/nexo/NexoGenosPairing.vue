<template>
  <section v-if="enabled && active" class="genos-pairing" aria-labelledby="genos-pairing-title">
    <div class="pairing-heading">
      <div>
        <span class="personal-label">Integração pessoal</span>
        <h3 id="genos-pairing-title">Genos</h3>
        <p>Conecte o Genos para enviar as transações reconhecidas no seu celular ao Nexo.</p>
      </div>
      <button type="button" class="pairing-primary" :disabled="generating" @click="generate">
        <font-awesome-icon :icon="generating ? 'circle-notch' : 'link'" :spin="generating" />
        {{ generating ? "Gerando…" : pairing ? "Gerar novo código" : "Parear Genos" }}
      </button>
    </div>
    <p v-if="error" class="pairing-error" role="alert">{{ error }}</p>
    <p v-if="expired" role="status">O código expirou. Gere outro para continuar.</p>
    <div v-if="pairing" class="pairing-instructions">
      <ol>
        <li>Copie a configuração abaixo.</li>
        <li>No Genos, abra <strong>Transações → Parear com o Kadem</strong>.</li>
        <li>Cole a configuração e toque em <strong>Conectar</strong>.</li>
      </ol>
      <p class="pairing-server">
        API: <strong>{{ pairing.api_url }}</strong>
      </p>
      <label for="genos-pairing-config">Configuração de pareamento</label>
      <textarea
        id="genos-pairing-config"
        ref="configuration"
        :value="configuration"
        readonly
        rows="5"
        spellcheck="false"
      />
      <div class="pairing-actions">
        <span role="status">{{ remainingLabel }} · uso único</span>
        <button type="button" class="pairing-primary" @click="copy">
          {{ copied ? "Copiado" : "Copiar configuração" }}
        </button>
      </div>
      <p class="pairing-note">
        Sincronize a fila do Genos antes de trocar o pareamento. Esta configuração dá acesso à sua integração pessoal;
        mantenha-a privada.
      </p>
    </div>
  </section>
</template>

<script>
import { financeService } from "@/services/financeService";
import { useAuthStore } from "@/stores/auth";

export default {
  name: "NexoGenosPairing",
  props: { active: { type: Boolean, default: false } },
  data: () => ({
    enabled: false,
    generating: false,
    pairing: null,
    error: "",
    copied: false,
    expired: false,
    now: Date.now(),
    generation: 0,
    timer: null,
  }),
  computed: {
    userId() {
      return useAuthStore().user?.id || null;
    },
    configuration() {
      return this.pairing ? JSON.stringify(this.pairing, null, 2) : "";
    },
    remainingLabel() {
      const seconds = Math.max(0, Math.ceil((Date.parse(this.pairing?.expires_at) - this.now) / 1000));
      return `Expira em ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    },
  },
  watch: {
    active: {
      immediate: true,
      handler() {
        this.loadAccess();
      },
    },
    userId() {
      this.loadAccess();
    },
  },
  beforeUnmount() {
    this.reset();
  },
  methods: {
    reset() {
      this.generation++;
      clearInterval(this.timer);
      this.timer = null;
      this.enabled = false;
      this.generating = false;
      this.pairing = null;
      this.copied = false;
      this.expired = false;
      this.error = "";
    },
    async loadAccess() {
      this.reset();
      if (!this.active || !this.userId) return;
      const generation = this.generation;
      try {
        const { data } = await financeService.getGenosPairingAccess();
        if (generation === this.generation) this.enabled = data?.enabled === true;
      } catch {
        /* Fail closed: private integration stays hidden without fresh authorization. */
      }
    },
    async generate() {
      if (!this.enabled || !this.active || this.generating) return;
      clearInterval(this.timer);
      this.pairing = null;
      this.generating = true;
      this.error = "";
      this.copied = false;
      this.expired = false;
      const generation = this.generation;
      try {
        const { data } = await financeService.createGenosPairing();
        if (generation !== this.generation) return;
        if (!data?.pairing_code || !data?.api_url || !Number.isFinite(Date.parse(data.expires_at)))
          throw new Error("Configuração de pareamento inválida. Gere novamente.");
        this.pairing = data;
        this.tick();
        if (this.pairing) this.timer = setInterval(this.tick, 1000);
      } catch (error) {
        if (generation !== this.generation) return;
        if (error.response?.status === 403) this.enabled = false;
        this.error = error.response?.data?.message || error.message || "Não foi possível gerar o pareamento.";
      } finally {
        if (generation === this.generation) this.generating = false;
      }
    },
    tick() {
      this.now = Date.now();
      if (this.pairing && Date.parse(this.pairing.expires_at) <= this.now) {
        this.pairing = null;
        this.copied = false;
        this.expired = true;
        clearInterval(this.timer);
      }
    },
    async copy() {
      this.tick();
      if (!this.pairing) return;
      const generation = this.generation;
      this.error = "";
      try {
        await navigator.clipboard.writeText(this.configuration);
        if (generation === this.generation) this.copied = true;
      } catch {
        if (generation !== this.generation) return;
        this.$refs.configuration?.focus();
        this.$refs.configuration?.select();
        this.error = "Copie a configuração selecionada para colar no Genos.";
      }
    },
  },
};
</script>

<style scoped>
.genos-pairing {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}
.pairing-heading,
.pairing-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
h3 {
  margin: 0.4rem 0;
}
.personal-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
p,
li {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
p {
  margin: 0.5rem 0 0;
}
ol {
  padding-left: 1.4rem;
  margin: 1.2rem 0;
}
.pairing-primary {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0.7rem 1rem;
  cursor: pointer;
  font-weight: 600;
}
.pairing-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.pairing-server {
  overflow-wrap: anywhere;
  margin-bottom: 0.7rem;
}
.pairing-instructions label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  color: var(--text-secondary);
}
textarea {
  box-sizing: border-box;
  width: 100%;
  resize: vertical;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0.75rem;
  font: 0.8rem/1.5 monospace;
  box-shadow: none !important;
}
.pairing-actions {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.pairing-note {
  font-size: 0.8rem;
}
.pairing-error {
  color: var(--color-expense, #e74c3c);
}
</style>
