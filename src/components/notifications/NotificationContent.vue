<template>
  <div class="tray-content-root" :class="{ 'is-mobile': isMobile, 'is-desktop': !isMobile }">
    <!-- Cabeçalho -->
    <header class="tray-header">
      <div class="tray-header-left">
        <div class="tray-header-icon" :class="{ ok: isEnabled }">
          <font-awesome-icon :icon="isEnabled ? 'bell' : 'bell-slash'" />
        </div>
        <div class="tray-header-text">
          <h3 class="tray-title">Notificações</h3>
          <span class="tray-subtitle">
            {{ isEnabled ? "Lembretes e avisos ativos" : "Lembretes silenciados" }}
          </span>
        </div>
      </div>

      <div class="tray-header-right">
        <button
          v-if="activeTab === 'unread' && unreadCount > 0"
          type="button"
          class="tray-action-btn"
          title="Marcar todas como lidas"
          @click="markAllAsRead"
        >
          <font-awesome-icon icon="check" />
          <span>Limpar todas</span>
        </button>

        <button
          type="button"
          class="tray-close-btn"
          aria-label="Fechar notificações"
          @click="$emit('close')"
        >
          <font-awesome-icon icon="xmark" />
        </button>
      </div>
    </header>

    <!-- Banner de Permissão Push (caso pendente) -->
    <div v-if="shouldShowAttention" class="tray-banner">
      <div class="banner-icon">
        <font-awesome-icon icon="bell" />
      </div>
      <div class="banner-content">
        <strong>Ativar notificações em tempo real?</strong>
        <p>Receba alertas do Nexo e do Health mesmo com o Kadem fechado.</p>
        <div class="banner-actions">
          <button
            type="button"
            class="btn-banner primary"
            :disabled="saving"
            @click="handleActivatePush"
          >
            {{ saving ? "Ativando…" : "Ativar agora" }}
          </button>
          <button
            type="button"
            class="btn-banner ghost"
            @click="dismissAttention"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>

    <!-- Abas: Não lidas vs Histórico -->
    <div class="tray-tabs-bar">
      <button
        type="button"
        class="tray-tab"
        :class="{ active: activeTab === 'unread' }"
        @click="activeTab = 'unread'"
      >
        <span>Não lidas</span>
        <span v-if="unreadCount > 0" class="tab-badge">{{ unreadCount }}</span>
      </button>

      <button
        type="button"
        class="tray-tab"
        :class="{ active: activeTab === 'read' }"
        @click="activeTab = 'read'"
      >
        <span>Histórico</span>
        <span v-if="readNotifications.length > 0" class="tab-count-muted">
          {{ readNotifications.length }}
        </span>
      </button>
    </div>

    <!-- Lista com rolagem -->
    <div class="tray-list-area custom-scrollbar">
      <!-- Aba: Não lidas -->
      <template v-if="activeTab === 'unread'">
        <div v-if="unreadNotifications.length > 0" class="tray-items-list">
          <article
            v-for="item in unreadNotifications"
            :key="item.id"
            class="tray-item is-unread"
            @click="handleOpenItem(item)"
          >
            <div class="item-header">
              <span class="item-meta">
                <span v-if="item.module" class="module-tag" :class="item.module.toLowerCase()">
                  {{ item.module }}
                </span>
                <span class="unread-dot"></span>
                <span class="item-time">{{ formatTime(item.createdAt) }}</span>
              </span>

              <button
                type="button"
                class="item-action-icon"
                title="Marcar como lida"
                aria-label="Marcar como lida"
                @click.stop="handleMarkAsRead(item.id)"
              >
                <font-awesome-icon icon="check" />
              </button>
            </div>

            <h4 class="item-title">{{ item.title }}</h4>
            <p class="item-body">{{ item.body }}</p>

            <div v-if="item.actionUrl || item.openWindow" class="item-footer">
              <span class="item-open-hint">
                Abrir detalhes
                <font-awesome-icon icon="chevron-right" />
              </span>
            </div>
          </article>
        </div>

        <div v-else class="tray-empty-state">
          <div class="empty-icon-wrap">
            <font-awesome-icon icon="circle-check" class="empty-icon" />
          </div>
          <h4 class="empty-title">Tudo em dia!</h4>
          <p class="empty-text">Você não tem notificações pendentes no momento.</p>
        </div>
      </template>

      <!-- Aba: Histórico / Lidas -->
      <template v-else>
        <div v-if="readNotifications.length > 0" class="tray-items-list">
          <article
            v-for="item in readNotifications"
            :key="item.id"
            class="tray-item is-read"
            @click="handleOpenItem(item)"
          >
            <div class="item-header">
              <span class="item-meta">
                <span v-if="item.module" class="module-tag" :class="item.module.toLowerCase()">
                  {{ item.module }}
                </span>
                <span class="item-time">{{ formatTime(item.createdAt) }}</span>
              </span>

              <span class="read-indicator">Lida</span>
            </div>

            <h4 class="item-title">{{ item.title }}</h4>
            <p class="item-body">{{ item.body }}</p>

            <div v-if="item.actionUrl || item.openWindow" class="item-footer">
              <span class="item-open-hint">
                Reabrir
                <font-awesome-icon icon="chevron-right" />
              </span>
            </div>
          </article>
        </div>

        <div v-else class="tray-empty-state">
          <div class="empty-icon-wrap">
            <font-awesome-icon icon="clock-rotate-left" class="empty-icon" />
          </div>
          <h4 class="empty-title">Nenhum histórico</h4>
          <p class="empty-text">As notificações lidas e concluídas serão mantidas aqui.</p>
        </div>
      </template>
    </div>

    <!-- Rodapé -->
    <footer class="tray-footer">
      <button
        type="button"
        class="tray-settings-btn"
        @click="$emit('open-settings')"
      >
        <font-awesome-icon icon="shield-halved" />
        <span>Configurações de Privacidade</span>
      </button>
    </footer>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useNotificationStore } from "@/stores/notifications";

export default {
  name: "NotificationContent",
  props: {
    isMobile: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "open-settings"],
  data() {
    return {
      activeTab: "unread",
    };
  },
  computed: {
    ...mapState(useNotificationStore, [
      "unreadNotifications",
      "readNotifications",
      "unreadCount",
      "isEnabled",
      "shouldShowAttention",
      "saving",
    ]),
  },
  methods: {
    ...mapActions(useNotificationStore, [
      "markAsRead",
      "markAllAsRead",
      "openNotification",
      "activatePush",
      "dismissAttention",
    ]),
    async handleMarkAsRead(id) {
      await this.markAsRead(id);
    },
    async handleOpenItem(item) {
      await this.openNotification(item);
      this.$emit("close");
    },
    async handleActivatePush() {
      await this.activatePush();
    },
    formatTime(dateStr) {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 1) return "Agora";
        if (diffMinutes < 60) return `${diffMinutes}m atrás`;

        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();

        if (isToday) {
          return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        }

        return d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return dateStr;
      }
    },
  },
};
</script>

<style scoped>
.tray-content-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--text-primary);
  box-sizing: border-box;
}

.tray-content-root.is-desktop {
  width: 380px;
}

.tray-content-root.is-mobile {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

/* ================= Cabeçalho ================= */
.tray-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-shrink: 0;
}

.tray-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.tray-header-icon {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-muted);
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  border: 1px solid var(--glass-border);
}

.tray-header-icon.ok {
  background: rgba(53, 90, 253, 0.12);
  color: var(--blue);
  border-color: rgba(53, 90, 253, 0.25);
}

.tray-header-text {
  min-width: 0;
}

.tray-title {
  margin: 0;
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
}

.tray-subtitle {
  font-size: 0.72rem;
  color: var(--text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tray-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.tray-action-btn {
  background: transparent;
  border: none;
  color: var(--blue);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.tray-action-btn:hover {
  background: rgba(53, 90, 253, 0.1);
}

.tray-close-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  border-radius: var(--radius-full) !important;
  border: none !important;
  background: var(--surface-2) !important;
  color: var(--text-secondary);
  cursor: pointer;
  display: grid !important;
  place-items: center;
  font-size: 0.85rem;
  padding: 0 !important;
  margin: 0 !important;
  transition: all var(--transition-fast);
}

.tray-close-btn:hover {
  background: var(--surface-3) !important;
  color: var(--text-primary);
  transform: scale(1.05);
}

/* ================= Banner Push ================= */
.tray-banner {
  margin: var(--space-3) var(--space-4) 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(53, 90, 253, 0.12), rgba(53, 90, 253, 0.04));
  border: 1px solid rgba(53, 90, 253, 0.28);
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  flex-shrink: 0;
}

.banner-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #355afd;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.banner-content {
  flex: 1;
}

.banner-content strong {
  display: block;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.banner-content p {
  margin: 0 0 var(--space-2);
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

.banner-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-banner {
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-banner.primary {
  background: #355afd;
  color: #fff;
}

.btn-banner.primary:hover:not(:disabled) {
  background: #243fb8;
}

.btn-banner.ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-banner.ghost:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

/* ================= Abas ================= */
.tray-tabs-bar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-1);
  flex-shrink: 0;
}

.tray-tab {
  flex: 1;
  padding: 7px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}

.tray-tab:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.tray-tab.active {
  background: var(--surface-0);
  color: var(--text-primary);
  border-color: var(--glass-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-badge {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: #355afd;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.2;
}

.tab-count-muted {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 600;
}

/* ================= Lista e Itens ================= */
.tray-list-area {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 180px;
  max-height: 380px;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
}

.is-mobile .tray-list-area {
  max-height: none;
  min-height: 0;
}

.tray-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tray-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.tray-item:hover {
  background: var(--surface-2);
  border-color: rgba(53, 90, 253, 0.35);
  transform: translateY(-1px);
}

.tray-item.is-unread {
  background: var(--surface-0);
  border-left: 3px solid #355afd;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #355afd;
  box-shadow: 0 0 5px rgba(53, 90, 253, 0.6);
}

.module-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  letter-spacing: 0.03em;
  background: var(--surface-3);
  color: var(--text-secondary);
}

.module-tag.nexo {
  background: rgba(53, 90, 253, 0.12);
  color: var(--blue);
}

.item-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.item-action-icon {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  border-radius: 50% !important;
  border: 1px solid var(--glass-border) !important;
  background: var(--surface-2) !important;
  color: var(--text-muted);
  cursor: pointer;
  display: grid !important;
  place-items: center;
  font-size: 0.75rem;
  padding: 0 !important;
  margin: 0 !important;
  transition: all var(--transition-fast);
}

.item-action-icon:hover {
  background: var(--green-high) !important;
  border-color: #2f8f4a !important;
  color: #2f8f4a;
}

.read-indicator {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.item-title {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.35;
  margin: 0;
}

.item-body {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 0;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 2px;
}

.item-open-hint {
  font-size: 0.7rem;
  color: var(--blue);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.85;
}

.tray-item:hover .item-open-hint {
  opacity: 1;
  text-decoration: underline;
}

/* ================= Estado Vazio ================= */
.tray-empty-state {
  margin: auto;
  padding: var(--space-6) var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-3);
}

.empty-icon {
  font-size: 1.5rem;
  color: var(--text-muted);
  opacity: 0.75;
}

.empty-title {
  margin: 0 0 var(--space-1);
  font-size: var(--fontsize-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.empty-text {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  max-width: 240px;
  line-height: 1.4;
}

/* ================= Rodapé ================= */
.tray-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--glass-border);
  background: var(--surface-1);
  flex-shrink: 0;
}

.tray-settings-btn {
  width: 100% !important;
  height: 38px !important;
  min-height: 38px !important;
  background: var(--surface-2) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--text-primary) !important;
  font-size: var(--fontsize-xs) !important;
  font-weight: 600 !important;
  cursor: pointer;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: 0 var(--space-4) !important;
  margin: 0 !important;
  transition: background var(--transition-fast);
}

.tray-settings-btn:hover {
  background: var(--surface-3) !important;
}
</style>
