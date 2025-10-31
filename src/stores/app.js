import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
    state: () => ({
        system: {},
        isStartMenuOpen: false,
    }),
    actions: {
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
