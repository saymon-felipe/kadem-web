import { defineStore } from 'pinia';
import { syncService } from '@/services/syncService';
import { check_system_health } from '@/plugins/api';

const POLLING_INTERVAL_MS = 30000;

export const useUtilsStore = defineStore('utils', {
  state: () => ({
    is_network_online: navigator.onLine,
    is_kadem_api_available: false,
    is_checking: false,
    _poll_interval_id: null,
    is_syncing: false,
    is_page_visible: true,
  }),
  getters: {
    is_connected_and_sync_ready: (state) => state.is_network_online && state.is_kadem_api_available,
    is_checking_connection: (state) => state.is_checking,
    connection: (state) => ({
      connected: state.is_network_online && state.is_kadem_api_available,
      checking: state.is_checking
    })
  },
  actions: {
    init_connection_monitor() {
      window.addEventListener('offline', () => {
        this._set_connection_status(false, false);
        this._stop_heartbeat_polling();
      });

      window.addEventListener('online', async () => {
        this._set_connection_status(true, false);
        await this.check_kadem_api_liveness();
        this._start_smart_polling();
        this.request_sync();
      });

      document.addEventListener('visibilitychange', () => {
        this.is_page_visible = document.visibilityState === 'visible';

        if (this.is_page_visible && this.is_network_online) {
          this.check_kadem_api_liveness();
          this._start_smart_polling();
        } else {
          this._stop_heartbeat_polling();
        }
      });

      if (this.is_network_online) {
        this._set_connection_status(true, false);
        this.check_kadem_api_liveness();
        this._start_smart_polling();
      }
    },

    async check_kadem_api_liveness() {
      if (!this.is_network_online) {
        this._set_connection_status(false, false);
        return false;
      }

      if (!this.is_page_visible) return;

      this.is_checking = true;

      try {
        const is_api_available = await check_system_health();
        this._set_connection_status(true, is_api_available);
        return is_api_available;
      } catch (error) {
        this._set_connection_status(true, false);
        return false;
      }
    },

    _start_smart_polling() {
      this._stop_heartbeat_polling();

      if (this.is_network_online && this.is_page_visible) {
        this._poll_interval_id = setInterval(() => {
          this.check_kadem_api_liveness();
        }, POLLING_INTERVAL_MS);
      }
    },

    _stop_heartbeat_polling() {
      if (this._poll_interval_id) {
        clearInterval(this._poll_interval_id);
        this._poll_interval_id = null;
      }
    },

    _set_connection_status(is_network, is_api) {
      this.is_network_online = is_network;
      this.is_kadem_api_available = is_api;
      this.is_checking = false;
    },

    async request_sync() {
      if (this.is_syncing) return;
      this.is_syncing = true;
      try {
        const { useAuthStore } = await import('@/stores/auth');
        let auth_store = useAuthStore();
        await syncService.processSyncQueue();
        if (auth_store.isLoggedIn) await auth_store.syncProfile();
      } catch (error) {
        console.error("Sync error:", error);
      } finally {
        setTimeout(() => this.is_syncing = false, 500);
      }
    }
  }
});
