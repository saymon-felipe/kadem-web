import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

const HEADER_OFFSET = 82;

export const useWindowStore = defineStore('windows', {
    state: () => ({
        windowStatesByUser: {},
        _zIndexCounter: 0,
        snapTarget: null,
    }),
    getters: {
        activeWindowId(state) {
            const windows = this.currentUserWindows;
            const windowList = Object.values(windows);

            if (windowList.length === 0) {
                return null;
            }

            const visibleWindows = windowList.filter(win => !win.isMinimized);

            if (visibleWindows.length === 0) {
                return null;
            }

            const activeWindow = visibleWindows.reduce((active, current) => {
                return current.zIndex > active.zIndex ? current : active;
            });

            return activeWindow.id;
        },
        currentUserWindows(state) {
            const authStore = useAuthStore();
            const userId = authStore.user?.id;

            if (!userId) {
                return {};
            }

            if (!state.windowStatesByUser[userId]) {
                state.windowStatesByUser[userId] = { openWindows: {} };
            }

            return state.windowStatesByUser[userId].openWindows;
        },
        activeSnapTarget(state) {
            return state.snapTarget;
        }
    },
    actions: {
        ensure_window_visibility(window_id) {
            const user_state = this._getOrCreateCurrentUserState();
            if (!user_state || !user_state.openWindows[window_id]) return;

            const win = user_state.openWindows[window_id];

            // Se estiver minimizada ou maximizada, a lógica de posicionamento flutuante não se aplica
            if (win.isMinimized || win.isMaximized) return;

            const screen_w = window.innerWidth;
            const screen_h = window.innerHeight;

            let { x, y } = win.position;
            const { width, height } = win.size;

            const min_x = -(width * 0.5);
            const max_x = screen_w - (width * 0.5);
            const min_y = HEADER_OFFSET;
            const max_y = screen_h - (height * 0.5);

            let has_changed = false;

            if (x < min_x) { x = min_x; has_changed = true; }
            if (x > max_x) { x = max_x; has_changed = true; }
            if (y < min_y) { y = min_y; has_changed = true; }
            if (y > max_y) { y = max_y; has_changed = true; }

            if (has_changed) {
                win.position = { x, y };
                if (!user_state.windowPrefs[window_id]) user_state.windowPrefs[window_id] = {};
                user_state.windowPrefs[window_id].pos = { x, y };
            }
        },

        handle_viewport_resize() {
            const user_state = this._getOrCreateCurrentUserState();
            if (!user_state) return;

            const open_windows_ids = Object.keys(user_state.openWindows);
            open_windows_ids.forEach(id => {
                this.ensure_window_visibility(id);
            });
        },

        openWindow({ id, title, componentId }) {
            const userState = this._getOrCreateCurrentUserState();
            if (!userState) return;

            const existingWindow = userState.openWindows[id];

            if (existingWindow) {
                if (existingWindow.isMinimized) {
                    this.restoreWindow(id);
                } else {
                    this.focusWindow(id);
                }
                return;
            }

            const prefs = userState.windowPrefs[id] || {};
            const savedSize = prefs.size || { width: 500, height: 400 };
            const savedPos = prefs.pos || { x: 100, y: 100 };
            const savedMaximized = !!prefs.isMaximized; // Recupera estado maximizado

            const newWindow = {
                id,
                title,
                componentId,
                zIndex: this._zIndexCounter++,
                position: savedPos,
                size: savedSize,
                isOpen: true,
                isMinimized: false,
                isMaximized: savedMaximized,
                // Se iniciar maximizada, definimos o previousState com os valores salvos
                // Isso permite que o usuário clique em "restaurar" e a janela volte ao tamanho correto
                previousPosition: savedMaximized ? savedPos : null,
                previousSize: savedMaximized ? savedSize : null,
            };

            userState.openWindows[id] = newWindow;

            // Só verificamos visibilidade se NÃO estiver maximizada
            if (!savedMaximized) {
                this.ensure_window_visibility(id);
            }
        },
        closeWindow(id) {
            const wasActive = this.activeWindowId === id;
            const userState = this._getOrCreateCurrentUserState();

            if (userState && userState.openWindows[id]) {
                delete userState.openWindows[id];
                if (wasActive) {
                    this._findAndFocusNextWindow();
                }
            }
        },
        focusWindow(id) {
            const userState = this._getOrCreateCurrentUserState();
            if (userState && userState.openWindows[id]) {
                userState.openWindows[id].zIndex = this._zIndexCounter++;
                this.ensure_window_visibility(id);
            }
        },
        minimizeWindow(id) {
            const wasActive = this.activeWindowId === id;
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window) {
                window.isMinimized = true;
                if (wasActive) {
                    this._findAndFocusNextWindow();
                }
            }
        },
        restoreWindow(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (!window) return;

            if (window.isMinimized) {
                window.isMinimized = false;
            }
            this.focusWindow(id);
            this.ensure_window_visibility(id);
        },
        toggleMaximize(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (!window) return;

            if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};

            if (window.isMaximized) {
                // RESTAURAR
                const prefs = userState.windowPrefs[id];
                window.position = window.previousPosition || prefs.pos || { x: 100, y: 100 };
                window.size = window.previousSize || prefs.size || { width: 500, height: 400 };
                window.isMaximized = false;

                // Salva estado nas preferências
                userState.windowPrefs[id].isMaximized = false;

                this.clearPreviousState(id);
                this.ensure_window_visibility(id);
            } else {
                // MAXIMIZAR
                window.previousPosition = { ...window.position };
                window.previousSize = { ...window.size };
                window.isMaximized = true;

                // Salva estado nas preferências
                userState.windowPrefs[id].isMaximized = true;
            }
            this.focusWindow(id);
        },
        unMaximize(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window && window.isMaximized) {
                window.isMaximized = false;
                // Atualiza preferência ao desmaximizar programaticamente
                if (userState.windowPrefs[id]) {
                    userState.windowPrefs[id].isMaximized = false;
                }
                return window.previousSize || null;
            }
            return null;
        },
        updateWindowPosition(id, { x, y }) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window) {
                window.position = { x, y };
                if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};

                // Só salvamos a posição como preferência se NÃO estiver maximizada
                // Isso previne salvar "0,0" como a posição preferida
                if (!window.isMaximized) {
                    userState.windowPrefs[id].pos = { x, y };
                }
            }
        },
        updateWindowSize(id, { width, height }) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window && !window.isMaximized) {
                window.size = { width, height };
                if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};
                // Salva o tamanho nas preferências
                userState.windowPrefs[id].size = { width, height };
            }
        },
        setSnapTarget(target) {
            this.snapTarget = target;
        },
        applySnap(id, target) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (!window) return;

            if (!window.isMaximized) {
                window.previousPosition = { ...window.position };
                window.previousSize = { ...window.size };
            }

            window.position = { x: target.xPx, y: target.yPx };
            window.size = { width: target.widthPx, height: target.heightPx };

            const isMax = target.id === 'top';
            window.isMaximized = isMax;

            // Atualiza preferência de maximização se for snap to top
            if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};
            userState.windowPrefs[id].isMaximized = isMax;

            this.focusWindow(id);
        },
        clearWindowsForUser(userId) {
            if (userId && this.windowStatesByUser[userId]) {
                this.windowStatesByUser[userId].openWindows = {};
                console.log(`Estado de janelas limpo para o usuário ${userId}`);
            }
        },
        clearPreviousState(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (window) {
                window.previousPosition = null;
                window.previousSize = null;
            }
        },
        _findAndFocusNextWindow() {
            const userState = this._getOrCreateCurrentUserState();
            if (!userState) return;

            const openWindows = Object.values(userState.openWindows);
            const visibleWindows = openWindows.filter(win => !win.isMinimized);

            if (visibleWindows.length === 0) {
                return;
            }

            const nextActiveWindow = visibleWindows.reduce((highest, current) => {
                return current.zIndex > highest.zIndex ? current : highest;
            });

            this.focusWindow(nextActiveWindow.id);
        },
        _getOrCreateCurrentUserState() {
            const authStore = useAuthStore();
            const userId = authStore.user?.id;
            if (!userId) return null;

            if (!this.windowStatesByUser[userId]) {
                this.windowStatesByUser[userId] = { openWindows: {}, windowPrefs: {} };
            }

            if (!this.windowStatesByUser[userId].openWindows) {
                this.windowStatesByUser[userId].openWindows = {};
            }

            if (!this.windowStatesByUser[userId].windowPrefs) {
                this.windowStatesByUser[userId].windowPrefs = {};
            }

            return this.windowStatesByUser[userId];
        },
    },
    persist: true,
});