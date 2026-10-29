import { defineStore } from "pinia";
import { notificationService, notificationLabels } from "@/services/notificationService";
import { useUtilsStore } from "@/stores/utils";

const ATTENTION_DISMISSED_KEY = "kadem_noti_attention_dismissed";

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    settings: null,
    ownerId: null,
    notifications: [],
    publicKey: null,
    loading: false,
    saving: false,
    permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    isAttentionDismissed: localStorage.getItem(ATTENTION_DISMISSED_KEY) === "true",
    isTrayOpen: false,
    activeTab: "unread", // "unread" | "history"
    labels: notificationLabels,
  }),

  getters: {
    unreadNotifications(state) {
      return (state.notifications || []).filter((n) => !n.read_at);
    },

    readNotifications(state) {
      return (state.notifications || []).filter((n) => Boolean(n.read_at));
    },

    unreadCount(state) {
      return (state.notifications || []).filter((n) => !n.read_at).length;
    },

    isEnabled(state) {
      // Notificações habilitadas na conta e não bloqueadas pelo navegador
      if (!state.settings) return true; // estado inicial otimista
      return Boolean(state.settings.enabled && state.permission !== "denied");
    },

    shouldShowAttention(state) {
      // Só pisca/pula de forma intermitente se ainda não pediu ('default')
      // e o usuário ainda não dispensou o aviso nesta sessão/navegador
      if (typeof Notification === "undefined") return false;
      if (state.permission !== "default") return false;
      return !state.isAttentionDismissed;
    },
  },

  actions: {
    setState(stateData) {
      if (!stateData) return;
      if (stateData.settings) {
        // Sincronização em segundo plano é função nativa: mantemos sempre true
        this.settings = {
          ...stateData.settings,
          background_sync: true,
        };
      }
      if (stateData.user_id) this.ownerId = stateData.user_id;
      if (Array.isArray(stateData.notifications)) this.notifications = stateData.notifications;
      if (stateData.public_key !== undefined) this.publicKey = stateData.public_key;
      if (typeof Notification !== "undefined") {
        this.permission = Notification.permission;
      }
    },

    async fetchState() {
      const utils = useUtilsStore();
      if (!utils.connection?.connected) return null;

      this.loading = true;
      try {
        const state = await notificationService.state();
        this.setState(state);
        return state;
      } catch (err) {
        console.warn("[NotificationStore] Erro ao carregar estado:", err?.message || err);
        return null;
      } finally {
        this.loading = false;
        if (typeof Notification !== "undefined") {
          this.permission = Notification.permission;
        }
      }
    },

    async markAsRead(id) {
      const item = this.notifications.find((n) => n.id === id);
      if (item && !item.read_at) {
        item.read_at = new Date().toISOString();
      }
      try {
        await notificationService.read(id);
      } catch (err) {
        console.warn("[NotificationStore] Erro ao marcar como lida:", err?.message || err);
      }
    },

    async markAllAsRead() {
      const unread = this.unreadNotifications;
      const now = new Date().toISOString();
      unread.forEach((n) => {
        n.read_at = now;
      });
      for (const item of unread) {
        try {
          await notificationService.read(item.id);
        } catch (err) {
          console.warn("[NotificationStore] Erro ao marcar como lida:", err?.message || err);
        }
      }
    },

    async openNotification(item) {
      await this.markAsRead(item.id);
      this.closeTray();
      notificationService.open(item.module);
    },

    async toggleEnabled(enable) {
      if (!this.settings) {
        await this.fetchState();
      }
      if (!this.settings) return;

      const nextVal = enable !== undefined ? Boolean(enable) : !this.settings.enabled;
      this.settings.enabled = nextVal;
      this.settings.background_sync = true;
      this.saving = true;

      try {
        await notificationService.save(this.settings, this.ownerId);
      } catch (err) {
        console.warn("[NotificationStore] Erro ao salvar estado habilitado:", err?.message || err);
      } finally {
        this.saving = false;
      }
    },

    async activatePush() {
      this.saving = true;
      try {
        await notificationService.activate(this.ownerId);
        if (this.settings) {
          this.settings.enabled = true;
          this.settings.background_sync = true;
          await notificationService.save(this.settings, this.ownerId);
        }
        this.dismissAttention();
      } finally {
        if (typeof Notification !== "undefined") {
          this.permission = Notification.permission;
        }
        this.saving = false;
      }
    },

    async deactivatePush() {
      this.saving = true;
      try {
        await notificationService.deactivateDevice();
      } finally {
        this.saving = false;
      }
    },

    dismissAttention() {
      this.isAttentionDismissed = true;
      try {
        localStorage.setItem(ATTENTION_DISMISSED_KEY, "true");
      } catch {}
    },

    toggleTray() {
      this.isTrayOpen = !this.isTrayOpen;
      if (this.isTrayOpen) {
        this.fetchState().catch(() => {});
      }
    },

    openTray() {
      this.isTrayOpen = true;
      this.fetchState().catch(() => {});
    },

    closeTray() {
      this.isTrayOpen = false;
    },
  },
});
