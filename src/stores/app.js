import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
    state: () => ({
        system: {},
        isStartMenuOpen: false,
        isMobile: window.innerWidth < 768,
    }),
    getters: {
        getIsMobile: (state) => state.isMobile,
    },
    actions: {
        updateMobileStatus() {
            this.isMobile = window.innerWidth < 768;
        },
        setSystem(system) {
            this.system = system;
        },
        toggleStartMenu() {
            this.isStartMenuOpen = !this.isStartMenuOpen;
        },
        closeStartMenu() {
            if (this.isStartMenuOpen) {
                this.isStartMenuOpen = false;
            }
        }
    }
});
