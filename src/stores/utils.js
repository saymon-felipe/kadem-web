import { defineStore } from "pinia";
import { syncService } from "@/services/syncService";
import { check_system_health, api } from "@/plugins/api";

const POLLING_INTERVAL_MS = 30000;

export const useUtilsStore = defineStore("utils", {
  state: () => ({
    is_network_online: navigator.onLine,
    is_kadem_api_available: false,
    is_checking: false,
    _poll_interval_id: null,
    is_syncing: false,
    is_page_visible: true,
  }),
  getters: {
    is_connected_and_sync_ready: (state) =>
      state.is_network_online && state.is_kadem_api_available,
    is_checking_connection: (state) => state.is_checking,
    connection: (state) => ({
      connected: state.is_network_online && state.is_kadem_api_available,
      checking: state.is_checking,
    }),
  },
  actions: {
    async fetch_image_blob(url, bypass_cache = false) {
      if (!url) return null;

      try {
        // Constrói a URL para o seu próprio backend
        // Supondo que sua API base seja ex: http://localhost:3000/api
        // A rota final será: http://localhost:3000/api/system/proxy-image?url=...

        // Codifica a URL do YouTube para passar como query param seguro
        const encoded_target = encodeURIComponent(url);

        // Adiciona timestamp se for bypass_cache
        const cache_buster = bypass_cache ? `&r=${Date.now()}` : '';

        // Monta a URL do proxy no seu backend
        // Ajuste '/system/proxy-image' conforme o prefixo das suas rotas (ex: /api/v1/system...)
        const backend_proxy_url = `${api.BASE_URL || ''}/system/proxy-image?url=${encoded_target}${cache_buster}`;

        const response = await fetch(backend_proxy_url, {
          // 'force-cache': Se o navegador já baixou essa thumb do seu proxy, usa ela.
          // Isso economiza banda do seu servidor.
          cache: bypass_cache ? 'reload' : 'force-cache',
        });

        if (!response.ok) {
          throw new Error(`Proxy Backend Error: ${response.status}`);
        }

        // O Backend garante os headers CORS, então o blob será "seguro" para Canvas
        return await response.blob();

      } catch (error) {
        console.warn(`[Utils] Falha ao baixar imagem via Backend Proxy:`, error);
        // Fallback final: Tenta direto (pode falhar CORS, mas tenta)
        try {
          const fallback = await fetch(url, { mode: 'no-cors' });
          // Nota: no-cors retorna opaque, não serve pra canvas, mas serve pra img tag simples
          return null;
        } catch (e) { return null; }
      }
    },
    init_connection_monitor() {
      window.addEventListener("offline", () => {
        this._set_connection_status(false, false);
        this._stop_heartbeat_polling();
      });

      window.addEventListener("online", async () => {
        this._set_connection_status(true, false);
        await this.check_kadem_api_liveness();
        this._start_smart_polling();
        this.request_sync();
      });

      document.addEventListener("visibilitychange", () => {
        this.is_page_visible = document.visibilityState === "visible";

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
        const { useAuthStore } = await import("@/stores/auth");
        let auth_store = useAuthStore();
        await syncService.processSyncQueue();
        if (auth_store.isLoggedIn) await auth_store.syncProfile();
      } catch (error) {
        console.error("Sync error:", error);
      } finally {
        setTimeout(() => (this.is_syncing = false), 500);
      }
    },
  },
});
