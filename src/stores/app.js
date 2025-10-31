import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
    state: () => ({
        system: {},
    }),

    actions: {
        setSystem(system) {
            this.system = system;
        },
    }
});
