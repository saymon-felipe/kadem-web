import { defineStore } from "pinia";

const lightThemePaths = ["/auth", "/reset_password", "/invite/landing", "/alexa-auth"];
let pendingThemeTransition = null;

const cancelPendingThemeTransition = () => {
  if (!pendingThemeTransition) return;

  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(pendingThemeTransition);
  } else {
    clearTimeout(pendingThemeTransition);
  }

  pendingThemeTransition = null;
};

const isLightThemePath = (path) => lightThemePaths.some((item) => path === item || path.startsWith(`${item}/`));

export const useAppStore = defineStore("app", {
  state: () => ({
    system: {},
    isStartMenuOpen: false,
    isMobile: window.innerWidth < 1100,
    theme: localStorage.getItem("kadem-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    themeOverride: null,
  }),
  getters: {
    getIsMobile: (state) => state.isMobile,
    isDark: (state) => (state.themeOverride || state.theme) === "dark",
    activeTheme: (state) => state.themeOverride || state.theme,
  },
  actions: {
    initTheme() {
      this.themeOverride = isLightThemePath(window.location.pathname) ? "light" : null;
      document.documentElement.setAttribute("data-theme", this.activeTheme);
    },
    applyTheme() {
      document.documentElement.setAttribute("data-theme", this.activeTheme);
    },
    isLightThemeRoute(route) {
      return Boolean(route?.meta?.forceLightTheme || route?.matched?.some((record) => record.meta?.forceLightTheme));
    },
    syncThemeForRoute(route, { deferInternal = false } = {}) {
      const nextOverride = this.isLightThemeRoute(route) ? "light" : null;

      if (nextOverride) {
        this.setThemeOverride(nextOverride);
        return;
      }

      if (deferInternal && this.themeOverride) {
        cancelPendingThemeTransition();

        const applyInternalTheme = () => {
          pendingThemeTransition = null;
          this.setThemeOverride(null);
        };

        if (typeof requestAnimationFrame === "function") {
          pendingThemeTransition = requestAnimationFrame(() => {
            pendingThemeTransition = requestAnimationFrame(applyInternalTheme);
          });
        } else {
          pendingThemeTransition = setTimeout(applyInternalTheme, 0);
        }

        return;
      }

      this.setThemeOverride(null);
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      localStorage.setItem("kadem-theme", this.theme);
      this.applyTheme();
    },
    setTheme(theme) {
      this.theme = theme;
      localStorage.setItem("kadem-theme", this.theme);
      this.applyTheme();
    },
    setThemeOverride(theme) {
      cancelPendingThemeTransition();
      this.themeOverride = theme || null;
      this.applyTheme();
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
