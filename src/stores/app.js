import { defineStore } from "pinia";

const lightThemePaths = ["/auth", "/reset_password", "/invite/landing", "/alexa-auth"];
const LEGACY_THEME_STORAGE_KEY = "kadem-theme";
const ANONYMOUS_THEME_STORAGE_KEY = "kadem-theme:anonymous";
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
const normalizeTheme = (theme) => (theme === "dark" ? "dark" : "light");
const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const resolveThemeUserId = (user) => user?.id || user?.email || null;
const buildThemeStorageKey = (user) => {
  const userId = resolveThemeUserId(user);
  return userId ? `kadem-theme:user:${userId}` : ANONYMOUS_THEME_STORAGE_KEY;
};
const readStoredTheme = (storageKey, { fallbackToLegacy = false } = {}) => {
  const storedTheme = localStorage.getItem(storageKey);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  if (!fallbackToLegacy) {
    return null;
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  return legacyTheme === "dark" || legacyTheme === "light" ? legacyTheme : null;
};

export const useAppStore = defineStore("app", {
  state: () => ({
    system: {},
    isStartMenuOpen: false,
    isMobile: window.innerWidth < 1100,
    theme: systemTheme(),
    themeOverride: null,
    themeStorageKey: ANONYMOUS_THEME_STORAGE_KEY,
  }),
  getters: {
    getIsMobile: (state) => state.isMobile,
    isDark: (state) => (state.themeOverride || state.theme) === "dark",
    activeTheme: (state) => state.themeOverride || state.theme,
  },
  actions: {
    initTheme() {
      this.loadAnonymousTheme({ apply: false, fallbackToLegacy: true });
      this.themeOverride = isLightThemePath(window.location.pathname) ? "light" : null;
      this.applyTheme();
    },
    applyTheme() {
      document.documentElement.setAttribute("data-theme", this.activeTheme);
    },
    loadAnonymousTheme({ apply = true, fallbackToLegacy = true } = {}) {
      this.themeStorageKey = ANONYMOUS_THEME_STORAGE_KEY;
      this.theme = readStoredTheme(ANONYMOUS_THEME_STORAGE_KEY, { fallbackToLegacy }) || systemTheme();
      if (apply) {
        this.applyTheme();
      }
    },
    loadThemeForUser(user, { apply = true } = {}) {
      const storageKey = buildThemeStorageKey(user);
      this.themeStorageKey = storageKey;
      this.theme = readStoredTheme(storageKey) || systemTheme();
      if (apply) {
        this.applyTheme();
      }
    },
    persistTheme(theme) {
      this.theme = normalizeTheme(theme);
      localStorage.setItem(this.themeStorageKey || ANONYMOUS_THEME_STORAGE_KEY, this.theme);
      this.applyTheme();
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
      this.persistTheme(this.theme === "dark" ? "light" : "dark");
    },
    setTheme(theme) {
      this.persistTheme(theme);
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
