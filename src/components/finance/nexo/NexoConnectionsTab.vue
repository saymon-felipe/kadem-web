<template>
  <div>
    <div class="panel connections-soon">
      <div class="soon-icon">
        <font-awesome-icon icon="link" />
      </div>
      <div>
        <span class="soon-kicker">Em breve</span>
        <h3>Conexões bancárias automáticas</h3>
        <p>
          O Kadem Nexo está preparando uma integração viável para produção. Por enquanto, use
          lançamento rápido no momento da compra e importe CSV para organizar o histórico.
        </p>
      </div>
      <button class="primary-action compact" type="button" @click="$emit('view-transactions')">
        <font-awesome-icon icon="list" />
        Ir para movimentos
      </button>
    </div>

    <template v-if="false">
      <ProGate v-if="!isPaidPlan" @upgrade="$emit('upgrade')" />
      <div v-else class="panel">
        <div class="panel-title">
          <h3>Conexões</h3>
          <div class="inline-actions">
            <button class="text-btn" :disabled="syncingBanks" @click="$emit('sync')">
              <font-awesome-icon
                :icon="syncingBanks ? 'circle-notch' : 'arrows-rotate'"
                :spin="syncingBanks"
              />
              Sincronizar
            </button>
            <button class="primary-action compact" @click="$emit('connect')">
              <font-awesome-icon icon="link" />
              Conectar
            </button>
          </div>
        </div>

        <div class="connection-grid">
          <article
            v-for="connection in connections"
            :key="connection.item_id"
            class="connection-card"
          >
            <div>
              <strong>{{ connection.connector_name }}</strong>
              <span>
                {{ connectionStatusLabel(connection.status) }} ·
                {{
                  connection.last_sync_at
                    ? formatShortDate(connection.last_sync_at)
                    : 'sem sincronização'
                }}
              </span>
            </div>
            <button
              class="icon-btn small danger"
              title="Remover"
              @click="$emit('delete', connection.item_id)"
            >
              <font-awesome-icon icon="trash" />
            </button>
          </article>
          <p v-if="connections.length === 0" class="empty-line">Nenhuma conexão ativa.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import ProGate from './ProGate.vue'

export default {
  name: 'NexoConnectionsTab',
  components: {
    ProGate,
  },
  emits: ['connect', 'delete', 'sync', 'upgrade', 'view-transactions'],
  props: {
    isPaidPlan: {
      type: Boolean,
      default: false,
    },
    syncingBanks: {
      type: Boolean,
      default: false,
    },
    connections: {
      type: Array,
      required: true,
    },
    formatShortDate: {
      type: Function,
      required: true,
    },
  },
  methods: {
    connectionStatusLabel(status) {
      const labels = {
        UPDATED: 'Atualizada',
        UPDATING: 'Atualizando',
        LOGIN_ERROR: 'Erro de acesso',
        OUTDATED: 'Desatualizada',
        DELETED: 'Removida',
      }
      return labels[status] || 'Pendente'
    },
  },
}
</script>

<style scoped>
.panel,
.connection-card {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel {
  padding: var(--space-5);
  min-height: 0;
}

.panel-title,
.inline-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel-title {
  margin-bottom: var(--space-5);
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel-title h3,
.connections-soon h3,
.connections-soon p {
  margin: 0;
}

.inline-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.connections-soon {
  min-height: 320px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
}

.connections-soon p {
  max-width: 620px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.soon-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--deep-blue);
  font-size: var(--fontsize-md);
}

.soon-kicker {
  display: inline-flex;
  width: max-content;
  margin-bottom: var(--space-2);
  border-radius: 999px;
  background: var(--dark-yellow-2);
  color: var(--gray-100);
  padding: var(--space-1) var(--space-3);
  font-size: var(--fontsize-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.connection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.connection-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.connection-card div {
  min-width: 0;
}

.connection-card strong,
.connection-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.connection-card span,
.empty-line {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.connection-card button {
  margin-left: auto;
}

.primary-action,
.text-btn,
.icon-btn {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
}

.primary-action.compact {
  min-height: 36px;
}

.text-btn {
  background: transparent;
  padding: 0 var(--space-3);
}

.icon-btn {
  width: 40px;
  background: var(--surface-2);
}

.icon-btn.small {
  width: 34px;
  min-height: 34px;
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.text-btn:hover,
.icon-btn:hover {
  background: var(--dark-yellow-2);
}

.icon-btn.danger:hover {
  background: var(--red-high);
  color: var(--red);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .connections-soon {
    grid-template-columns: 1fr;
    justify-items: start;
    min-height: 260px;
  }

  .connections-soon .primary-action {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
