import { defineStore } from "pinia";
import { syncService } from "@/services/syncService";
import { check_system_health, api } from "@/plugins/api";

const POLLING_INTERVAL_MS = 30000;
const PROBE_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];

// Fora do state do Pinia: detalhe interno que não precisa ser reativo.
let liveness_inflight = null;

export const useUtilsStore = defineStore("utils", {
  state: () => ({
    is_network_online: navigator.onLine,
    is_kadem_api_available: false,
    is_checking: false,
    _poll_interval_id: null,
    _probe_retry_id: null,
    _probe_retry_count: 0,
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
          await fetch(url, { mode: 'no-cors' });
          // Nota: no-cors retorna opaque, não serve pra canvas, mas serve pra img tag simples
          return null;
        } catch { return null; }
      }
    },
    init_connection_monitor() {
      window.addEventListener("offline", () => {
        this._cancel_probe_retry();
        this._set_connection_status(false, false);
        this._stop_heartbeat_polling();
      });

      window.addEventListener("online", async () => {
        this._set_connection_status(true, false);
        await this.check_kadem_api_liveness({ force: true });
        this._start_smart_polling();
        this.request_sync();
      });

      document.addEventListener("visibilitychange", () => {
        this.is_page_visible = document.visibilityState === "visible";

        if (this.is_page_visible) {
          this.refresh_connection();
          this._start_smart_polling();
        } else {
          this._cancel_probe_retry();
          this._stop_heartbeat_polling();
        }
      });

      // Voltar do cache de páginas ou ganhar foco também é um momento em que o aviso do navegador pode estar velho.
      window.addEventListener("pageshow", () => this.refresh_connection());
      window.addEventListener("focus", () => {
        if (!this.connection.connected) this.refresh_connection();
      });

      this.is_page_visible = document.visibilityState !== "hidden";
      if (this.is_network_online) {
        this._set_connection_status(true, false);
        this.check_kadem_api_liveness();
        this._start_smart_polling();
      }
    },

    /**
     * Confere a conexão agora. O aviso do navegador (navigator.onLine) pode atrasar ou nunca avisar a volta da rede
     * (a página aberta pelo Genos logo depois de acordar o aparelho), então a resposta do servidor decide: se ele
     * respondeu, está online, mesmo que o navegador ainda diga o contrário.
     */
    refresh_connection() {
      if (navigator.onLine && !this.is_network_online) this._set_connection_status(true, false);
      return this.check_kadem_api_liveness({ force: true });
    },

    /**
     * Espera (no máximo timeout_ms) a conexão ficar pronta e devolve true quando ficou. Reconfere sozinha enquanto
     * espera, sem depender de um evento do navegador. Usada pelo comando do Genos: logo depois de abrir a página a
     * conexão ainda não foi medida e não pode virar "sem internet" por isso.
     */
    async wait_for_connection(timeout_ms = 30000, interval_ms = 1500) {
      if (this.connection.connected) return true;
      const deadline = Date.now() + timeout_ms;
      while (!this.connection.connected) {
        const left = deadline - Date.now();
        if (left <= 0) return false;
        await this.refresh_connection();
        if (this.connection.connected) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(interval_ms, Math.max(left, 0))));
      }
      return true;
    },

    async check_kadem_api_liveness({ force = false } = {}) {
      if (!force && !this.is_network_online) {
        this._set_connection_status(false, false);
        return false;
      }

      if (!force && !this.is_page_visible) return;

      // Uma checagem por vez: as demais esperam o mesmo resultado.
      if (liveness_inflight) return liveness_inflight;

      this.is_checking = true;
      liveness_inflight = (async () => {
        let is_api_available = false;
        try {
          is_api_available = await check_system_health();
        } catch {
          is_api_available = false;
        }
        // O servidor respondeu: há rede, mesmo que o navegador ainda não tenha avisado.
        if (is_api_available) {
          this._set_connection_status(true, true);
          this._cancel_probe_retry();
        } else {
          this._set_connection_status(this.is_network_online || navigator.onLine, false);
          this._schedule_probe_retry();
        }
        return is_api_available;
      })().finally(() => {
        liveness_inflight = null;
      });
      return liveness_inflight;
    },

    // A rede acabou de voltar e o primeiro teste pode falhar (DNS ainda subindo): tenta de novo logo, em vez de esperar
    // os 30 s do ciclo normal.
    _schedule_probe_retry() {
      if (this._probe_retry_id || !this.is_network_online || !this.is_page_visible) return;
      const delay = PROBE_RETRY_DELAYS_MS[Math.min(this._probe_retry_count, PROBE_RETRY_DELAYS_MS.length - 1)];
      this._probe_retry_count += 1;
      this._probe_retry_id = setTimeout(() => {
        this._probe_retry_id = null;
        this.check_kadem_api_liveness();
      }, delay);
    },

    _cancel_probe_retry() {
      if (this._probe_retry_id) clearTimeout(this._probe_retry_id);
      this._probe_retry_id = null;
      this._probe_retry_count = 0;
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
