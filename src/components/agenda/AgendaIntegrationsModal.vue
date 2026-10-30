<template>
  <BaseModal
    :model-value="visible"
    title="Integrações da agenda"
    size="md"
    @update:model-value="(value) => { if (!value) $emit('close'); }"
    @close="$emit('close')"
  >
    <div class="integrations-modal-body">
      <!-- Card Google Agenda -->
      <section class="integration-card">
        <header class="card-header">
          <div class="card-avatar google">
            <font-awesome-icon icon="calendar-days" />
          </div>
          <div class="card-header-info">
            <div class="card-title-row">
              <h4>Google Agenda</h4>
              <span v-if="status?.connected && status.status === 'active'" class="status-pill success">
                <span class="pill-dot"></span>
                <span>Conectado</span>
              </span>
              <span v-else-if="status?.connected" class="status-pill warning">
                <span>Acesso revogado</span>
              </span>
              <span v-else-if="status?.configured" class="status-pill neutral">
                <span>Não conectado</span>
              </span>
            </div>
            <p v-if="!status" class="card-desc">Verificando conexão…</p>
            <p v-else-if="!status.configured" class="card-desc">Integração ainda não configurada neste ambiente.</p>
            <p v-else-if="status.connected && status.status === 'active'" class="card-desc">
              Conectado{{ status.google_email ? ` como ${status.google_email}` : "" }}.
            </p>
            <p v-else-if="status.connected" class="card-desc">Acesso revogado. Conecte novamente para voltar a sincronizar.</p>
            <p v-else class="card-desc">Sincronize os compromissos nos dois sentidos com a sua conta Google.</p>
          </div>
        </header>

        <div v-if="status?.connected && status.last_synced_at" class="sync-meta-row">
          <font-awesome-icon icon="clock" class="meta-icon" />
          <span>Última sincronização: {{ formatDateTime(status.last_synced_at) }}</span>
        </div>

        <div v-if="status?.last_error" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ status.last_error }}</span>
        </div>

        <div v-if="message" class="nexo-banner success" role="status">
          <font-awesome-icon icon="circle-check" class="banner-icon" />
          <span>{{ message }}</span>
        </div>

        <ul class="facts-list">
          <li>
            <font-awesome-icon icon="circle-check" class="check-icon" />
            <span>Tudo o que você cria aqui vai para o Google, e tudo o que está no Google vem para cá, inclusive o que a Alexa adicionar.</span>
          </li>
          <li>
            <font-awesome-icon icon="circle-check" class="check-icon" />
            <span>
              Os agendamentos do Health também vão para o Google, na próxima data prevista; os recorrentes (por dia, semana ou mês) viram um evento que se repete.
              <strong>O Health é quem manda neles</strong>: para alterar, edite no Health. O que for mudado direto no Google é desfeito.
            </span>
          </li>
          <li>
            <font-awesome-icon icon="circle-check" class="check-icon" />
            <span>Ao desconectar, seus compromissos permanecem salvos com segurança no Kadem.</span>
          </li>
        </ul>

        <div class="card-actions">
          <template v-if="status?.configured">
            <button
              v-if="!status.connected || status.status !== 'active'"
              type="button"
              class="primary-action-btn"
              :disabled="busy || !online"
              @click="$emit('connect')"
            >
              <font-awesome-icon :icon="busy ? 'circle-notch' : 'link'" :spin="busy" />
              <span>Conectar Google Agenda</span>
            </button>
            <template v-else>
              <button type="button" class="secondary-btn" :disabled="busy || !online" @click="$emit('sync')">
                <font-awesome-icon icon="arrows-rotate" :spin="busy" />
                <span>Sincronizar agora</span>
              </button>
              <button type="button" class="danger-btn" :disabled="busy || !online" @click="$emit('disconnect')">
                <font-awesome-icon icon="link-slash" />
                <span>Desconectar</span>
              </button>
            </template>
          </template>
        </div>

        <p v-if="!online" class="offline-note">
          <font-awesome-icon icon="triangle-exclamation" />
          <span>Sem conexão com a internet: o Google só pode ser alterado online.</span>
        </p>
      </section>

      <footer class="modal-actions-bar">
        <button type="button" class="secondary-btn" @click="$emit('close')">{{ needsConnection ? "Agora não" : "Fechar" }}</button>
      </footer>
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

export default {
  name: "AgendaIntegrationsModal",
  components: { BaseModal },
  props: {
    visible: { type: Boolean, default: false },
    status: { type: Object, default: null },
    busy: { type: Boolean, default: false },
    online: { type: Boolean, default: true },
    message: { type: String, default: "" },
  },
  emits: ["close", "connect", "sync", "disconnect"],
  computed: {
    // Google disponível neste ambiente, mas ainda não vinculado (ou com o acesso revogado).
    needsConnection() {
      return Boolean(this.status?.configured && !(this.status.connected && this.status.status === "active"));
    },
  },
  methods: {
    formatDateTime(value) {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   MODAL DE INTEGRAÇÕES DA AGENDA
   ========================================================================== */
.integrations-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  color: var(--text-primary);
}

.integration-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.card-avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 1.15rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.card-avatar.google {
  background: linear-gradient(135deg, #34a853, #4285f4);
}

.card-header-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-title-row h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

/* Status Pills */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  font-weight: 700;
}

.status-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill.success {
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.28);
  color: #16a34a;
}

[data-theme="dark"] .status-pill.success {
  color: #4ade80;
}

.status-pill.warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #d97706;
}

[data-theme="dark"] .status-pill.warning {
  color: #fbbf24;
}

.status-pill.neutral {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
}

/* Meta de sincronização */
.sync-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.meta-icon {
  font-size: 0.72rem;
}

/* Banners de status e alerta */
.nexo-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.nexo-banner .banner-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nexo-banner.success {
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.28);
  color: #16a34a;
}

[data-theme="dark"] .nexo-banner.success {
  color: #4ade80;
}

.nexo-banner.error {
  background: rgba(214, 74, 46, 0.1);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .nexo-banner.error {
  color: #fca5a5;
}

/* Lista de fatos */
.facts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.facts-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.check-icon {
  color: var(--color-info);
  font-size: 0.78rem;
  margin-top: 2px;
  flex-shrink: 0;
}

/* Ações do Card */
.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.primary-action-btn,
.secondary-btn,
.danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action-btn {
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.28);
}

.primary-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.secondary-btn {
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

.danger-btn {
  border: 1px solid rgba(214, 74, 46, 0.28);
  background: rgba(214, 74, 46, 0.08);
  color: var(--color-expense, #d64a2e);
}

.danger-btn:hover:not(:disabled) {
  background: var(--color-expense, #d64a2e);
  border-color: var(--color-expense, #d64a2e);
  color: #ffffff;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none !important;
}

.offline-note {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d97706;
  font-size: 0.72rem;
  font-weight: 600;
}

/* ==========================================================================
   RODAPÉ DO MODAL (EDGE-TO-EDGE)
   ========================================================================== */
.modal-actions-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-3);
  margin-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
}

@media (max-width: 520px) {
  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .card-actions button {
    width: 100%;
  }

  .modal-actions-bar {
    justify-content: stretch;
  }

  .modal-actions-bar button {
    width: 100%;
  }
}
</style>
