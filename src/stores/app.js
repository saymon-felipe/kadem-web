import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    system: {},
    isStartMenuOpen: false,
    isMobile: window.innerWidth < 1100,
  }),
  getters: {
    getIsMobile: (state) => state.isMobile,
  },
  actions: {
    createGroup() {
      this.toggleStartMenu();

      setTimeout(() => {
        document.getElementById("create-group").click();
      }, 100);
    },
    updateMobileStatus() {
      this.isMobile = window.innerWidth < 1100;
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
    },
  },
});
