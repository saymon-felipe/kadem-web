<template>
  <div class="connections">
    <p v-if="error" class="connection-error" role="alert">
      {{ error }}
      <button v-if="!personalEnabled" class="text-btn" type="button" @click="$emit('reload')">
        Tentar novamente
      </button>
    </p>

    <section v-if="personalEnabled" class="panel" aria-labelledby="connections-heading">
      <header class="panel-header">
        <div class="panel-heading">
          <span class="bank-icon heading-icon" aria-hidden="true">
            <font-awesome-icon icon="link" />
          </span>
          <div>
            <h3 id="connections-heading">Open Finance</h3>
            <p>Importe movimentos de contas e cartões conectados.</p>
          </div>
        </div>
        <div class="inline-actions">
          <button
            v-if="connections.length"
            class="primary-action"
            type="button"
            :disabled="syncingBanks"
            @click="$emit('sync')"
          >
            <font-awesome-icon
              :icon="syncingBanks ? 'circle-notch' : 'arrows-rotate'"
              :spin="syncingBanks"
            />
            {{ syncingBanks ? 'Sincronizando…' : 'Sincronizar' }}
          </button>
        </div>
      </header>

      <ul v-if="connections.length" class="connection-list">
        <li v-for="connection in connections" :key="connection.item_id" class="connection-card">
          <div class="institution">
            <span class="bank-icon" aria-hidden="true">
              <font-awesome-icon icon="building-columns" />
            </span>
            <div>
              <strong>{{ connection.connector_name }}</strong>
              <span class="connection-status" :class="statusTone(connection)">
                {{ statusLabel(connection) }}
              </span>
            </div>
          </div>

          <div class="last-sync">
            <span>Última sincronização</span>
            <time v-if="connection.last_sync_at" :datetime="connection.last_sync_at">
              {{ formatSyncDate(connection.last_sync_at) }}
            </time>
            <span v-else>Ainda não realizada</span>
          </div>

          <button
            class="icon-btn"
            type="button"
            :aria-label="`Remover conexão de ${connection.connector_name}`"
            :disabled="syncingBanks"
            @click="$emit('delete', connection.item_id)"
          >
            <font-awesome-icon icon="trash" />
          </button>
        </li>
      </ul>

      <div v-else class="empty-state">
        <h4>Nenhuma instituição conectada</h4>
        <button class="primary-action" type="button" :disabled="syncingBanks" @click="$emit('connect')">
          <font-awesome-icon :icon="syncingBanks ? 'circle-notch' : 'link'" :spin="syncingBanks" />
          {{ syncingBanks ? 'Conectando…' : 'Conectar instituição' }}
        </button>
      </div>
    </section>

    <section v-else-if="!error" class="panel unavailable">
      <span class="bank-icon heading-icon" aria-hidden="true">
        <font-awesome-icon icon="link" />
      </span>
      <div>
        <h3>Conexões bancárias automáticas</h3>
        <p>Enquanto o Open Finance está indisponível, você pode adicionar lançamentos e importar CSV em Movimentos.</p>
      </div>
      <button class="primary-action" type="button" @click="$emit('view-transactions')">
        Ir para Movimentos
      </button>
    </section>
  </div>
</template>

<script>
const syncDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const connectionStatusLabels = {
  UPDATED: 'Atualizada',
  UPDATING: 'Atualizando',
  LOGIN_ERROR: 'Erro de acesso',
  OUTDATED: 'Desatualizada',
};

export default {
  name: 'NexoConnectionsTab',
  emits: ['connect', 'delete', 'reload', 'sync', 'view-transactions'],
  props: {
    personalEnabled: { type: Boolean, default: false },
    error: { type: String, default: '' },
    syncingBanks: { type: Boolean, default: false },
    connections: { type: Array, required: true },
  },
  methods: {
    formatSyncDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Data indisponível' : syncDateFormatter.format(date);
    },
    statusLabel(connection) {
      if (connection.running) return 'Sincronizando…';
      if (connection.last_error) return 'Falha na sincronização';
      return connectionStatusLabels[connection.status] || 'Pendente';
    },
    statusTone(connection) {
      if (connection.last_error || connection.status === 'LOGIN_ERROR') return 'status-error';
      return connection.status === 'UPDATED' ? 'status-ready' : '';
    },
  },
};
</script>

<style scoped>
.connections {
  container-type: inline-size;
  display: grid;
  gap: var(--space-3);
}

.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
}

.panel-header,
.panel-heading,
.institution,
.unavailable {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.panel-header {
  justify-content: space-between;
  flex-wrap: wrap;
}

.panel-heading p,
.unavailable p {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
  margin-top: var(--space-1);
}

.bank-icon {
  flex: 0 0 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--deep-blue);
}

.heading-icon {
  flex-basis: 46px;
  height: 46px;
}

.connection-list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin-top: var(--space-5);
}

.connection-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(156px, 25%) auto;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.institution strong {
  display: block;
  overflow-wrap: anywhere;
  color: var(--text-primary);
}

.connection-status {
  display: inline-block;
  margin-top: var(--space-1);
  border-radius: 999px;
  padding: 2px var(--space-2);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
}

.status-ready {
  background: var(--green-high);
  color: var(--text-primary);
}

.status-error {
  background: var(--red-high);
  color: var(--text-primary);
}

.last-sync {
  display: grid;
  gap: 3px;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.last-sync time {
  color: var(--text-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: var(--space-5) var(--space-3);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
  text-align: center;
}

.connection-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--red-high);
  color: var(--text-primary);
}

.unavailable .primary-action {
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
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: var(--space-2) var(--space-4);
}

.primary-action:hover:not(:disabled) {
  filter: brightness(1.08);
}

.text-btn,
.icon-btn {
  background: var(--surface-2);
}

.text-btn {
  padding: var(--space-2) var(--space-3);
}

.icon-btn {
  width: 40px;
}

.icon-btn:hover:not(:disabled) {
  background: var(--red-high);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@container (max-width: 480px) {
  .panel {
    padding: var(--space-3);
  }

  .panel-header .inline-actions,
  .panel-header .primary-action {
    width: 100%;
  }

  .connection-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .last-sync {
    grid-row: 2;
    grid-column: 1 / -1;
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }

  .unavailable {
    flex-wrap: wrap;
  }

  .unavailable .primary-action {
    width: 100%;
  }
}
</style>
