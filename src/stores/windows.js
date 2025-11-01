import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

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
        unMaximize(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window && window.isMaximized) {
                window.isMaximized = false;
                return window.previousSize || null;
            }
            return null;
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
        openWindow({ id, title, componentId }) {
            const userState = this._getOrCreateCurrentUserState();
            if (!userState) return;

            const existingWindow = userState.openWindows[id];

            if (existingWindow) {
                return;
            }

            const prefs = userState.windowPrefs[id] || {};
            const savedSize = prefs.size || { width: 500, height: 400 };
            const savedPos = prefs.pos || { x: 100, y: 100 };

            const newWindow = {
                id,
                title,
                componentId,
                zIndex: this._zIndexCounter++,
                position: savedPos,
                size: savedSize,
                isOpen: true,
                isMinimized: false,
                isMaximized: false,
                previousPosition: null,
                previousSize: null,
            };

            userState.openWindows[id] = newWindow;
        },
        updateWindowSize(id, { width, height }) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window && !window.isMaximized) {
                window.size = { width, height };

                if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};
                userState.windowPrefs[id].size = { width, height };
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
        toggleMaximize(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (!window) return;

            if (window.isMaximized) {
                const prefs = userState.windowPrefs[id] || {};

                window.position = window.previousPosition || prefs.pos || { x: 100, y: 100 };
                window.size = window.previousSize || prefs.size || { width: 500, height: 400 };
                window.isMaximized = false;
                this.clearPreviousState(id);
            } else {
                window.previousPosition = { ...window.position };
                window.previousSize = { ...window.size };
                window.isMaximized = true;
            }

            this.focusWindow(id);
        },
        restoreWindow(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (!window) return;

            if (window.isMinimized) {
                window.isMinimized = false;
            }

            this.focusWindow(id);
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
            }
        },
        updateWindowPosition(id, { x, y }) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];

            if (window) {
                window.position = { x, y };

                if (!userState.windowPrefs[id]) userState.windowPrefs[id] = {};
                userState.windowPrefs[id].pos = { x, y };
            }
        },
        clearWindowsForUser(userId) {
            if (userId && this.windowStatesByUser[userId]) {
                this.windowStatesByUser[userId].openWindows = {};
                console.log(`Estado de janelas limpo para o usuário ${userId}`);
            }
        },
        setSnapTarget(target) {
            this.snapTarget = target;
        },
        clearPreviousState(id) {
            const userState = this._getOrCreateCurrentUserState();
            const window = userState?.openWindows[id];
            if (window) {
                window.previousPosition = null;
                window.previousSize = null;
            }
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

            window.isMaximized = target.id === 'top';

            this.focusWindow(id);
        },
    },
    persist: true,
});