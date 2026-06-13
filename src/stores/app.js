import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    system: {},
    isStartMenuOpen: false,
    isMobile: window.innerWidth < 1100,
    theme: localStorage.getItem("kadem-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  }),
  getters: {
    getIsMobile: (state) => state.isMobile,
    isDark: (state) => state.theme === "dark",
  },
  actions: {
    initTheme() {
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      localStorage.setItem("kadem-theme", this.theme);
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    setTheme(theme) {
      this.theme = theme;
      localStorage.setItem("kadem-theme", this.theme);
      document.documentElement.setAttribute("data-theme", this.theme);
    },
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
