// Abas fornecem um destino e visibilidade para todos os overlays descendentes.
// Componentes fora de uma aba continuam usando o body e a viewport.
import { windowNavigationKey } from "./mobileNavigation.js";

export const overlayScopeKey = Symbol("overlayScope");

export const overlayScopeMixin = {
  inject: {
    overlayScope: { from: overlayScopeKey, default: null },
    windowNavigation: { from: windowNavigationKey, default: null },
  },
  computed: {
    overlay_target() {
      return this.overlayScope?.target || "body";
    },
    overlay_active() {
      return (this.overlayScope?.active ?? true) && (this.windowNavigation?.visible ?? true);
    },
    overlay_scoped() {
      return Boolean(this.overlayScope?.target);
    },
    overlay_height() {
      return this.overlayScope?.height || (typeof window !== "undefined" ? window.innerHeight : 800);
    },
    is_modal_active() {
      return this.modelValue && this.overlay_active && (this.overlayScope?.interactive ?? true) &&
        (this.windowNavigation?.active ?? true);
    },
  },
  methods: {
    focus_overlay() {
      this.overlayScope?.focus?.();
    },
    overlay_rect(element) {
      const rect = element.getBoundingClientRect();
      const host = this.overlayScope?.target?.getBoundingClientRect();
      const left = rect.left - (host?.left || 0);
      const top = rect.top - (host?.top || 0);
      return { left, top, bottom: top + rect.height, width: rect.width, height: rect.height };
    },
    overlay_viewport() {
      return {
        width: this.overlayScope?.width || window.innerWidth,
        height: this.overlay_height,
      };
    },
  },
};
