import { defineStore } from 'pinia';

export const useUtilsStore = defineStore('utils', {
    state: () => ({
        connection: {
            connected: navigator.onLine,
            checking: false
        },
        _pollIntervalId: null, // ID do intervalo para o polling
    }),

    getters: {
        isConnected: (state) => state.connection.connected,
        isChecking: (state) => state.connection.checking,
    },

    actions: {
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

        async checkRealConnection() {
            if (!navigator.onLine) {
                this._setConnectionStatus(false);
                return;
            }

            this.connection.checking = true;

            try {
                // Esta rota /check_connection/status/200 deve ser
                // um arquivo estático leve no seu servidor, 
                // ou uma rota de API que não use auth.
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

        initConnectionMonitor() {
            window.addEventListener('offline', () => {
                console.log('Evento OFFLINE: Conexão perdida.');
                this._setConnectionStatus(false);
                this._stopHeartbeatPolling();
            });

            window.addEventListener('online', () => {
                console.log('Evento ONLINE: Rede detectada, verificando internet...');
                this.checkRealConnection();
                this._startHeartbeatPolling();
            });

            if (this.connection.connected) {
                this.checkRealConnection();
                this._startHeartbeatPolling();
            }
        }
    }
});
