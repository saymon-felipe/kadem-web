import { defineStore } from 'pinia';
import { syncService } from '@/services/syncService';

export const useUtilsStore = defineStore('utils', {
    // --- State ---
    state: () => ({
        connection: {
            connected: navigator.onLine,
            checking: false
        },
        _pollIntervalId: null,
        isSyncing: false,
    }),

    // --- Getters ---
    getters: {
        isConnected: (state) => state.connection.connected,
        isChecking: (state) => state.connection.checking
    },

    // --- Actions ---
    actions: {

        // --- Funções de Monitoramento de Conexão ---

        initConnectionMonitor() {
            window.addEventListener('offline', () => {
                console.log('Evento OFFLINE: Conexão perdida.');
                this._setConnectionStatus(false);
                this._stopHeartbeatPolling();
            });

            window.addEventListener('online', async () => {
                console.log('Evento ONLINE: Rede detectada, verificando internet...');
                this.checkRealConnection();
                this._startHeartbeatPolling();
                this.requestSync();
            });

            if (this.connection.connected) {
                this.checkRealConnection();
                this._startHeartbeatPolling();
            }
        },

        async checkRealConnection() {
            if (!navigator.onLine) {
                this._setConnectionStatus(false);
                return;
            }

            this.connection.checking = true;

            try {
                const response = await fetch('/check_connection/status/200', {
                    method: 'HEAD',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(10000)
                });
                this._setConnectionStatus(response.ok);
            } catch (error) {
                console.warn('Falha no heartbeat:', error.name);
                this._setConnectionStatus(false);
            }
        },

        // --- Funções de Sincronização (PUSH/PULL) ---

        async requestSync() {
            if (this.isSyncing) return;

            this.isSyncing = true;

            try {
                const { useAuthStore } = await import('@/stores/auth');
                let authStore = useAuthStore();

                // 1. PUSH PRIMEIRO
                await syncService.processSyncQueue();

                // 2. PULL DEPOIS
                if (authStore.isLoggedIn) {
                    await authStore.syncProfile();
                }
            } catch (error) {
                console.error("Falha no sync PUSH-PULL do 'online' listener:", error);
            } finally {
                setTimeout(() => {
                    this.isSyncing = false;
                }, 500);
            }
        },

        // --- Funções Internas (Helpers de Status/Polling) ---

        _setConnectionStatus(isOnline) {
            this.connection.connected = isOnline;
            this.connection.checking = false;
        },

        _stopHeartbeatPolling() {
            if (this._pollIntervalId) {
                clearInterval(this._pollIntervalId);
                this._pollIntervalId = null;
            }
        },

        _startHeartbeatPolling() {
            this._stopHeartbeatPolling();
            this._pollIntervalId = setInterval(() => {
                this.checkRealConnection();
            }, 10000);
        },
    }
});