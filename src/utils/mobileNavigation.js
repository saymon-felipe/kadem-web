import { computed, reactive } from "vue";
import { useAppStore } from "../stores/app.js";
import { registerNavigation } from "./modalHistory.js";

export const windowNavigationKey = Symbol("windowNavigation");

/** O consumidor define mobile_back_active e mobile_back(). */
export const mobileNavigationMixin = {
  inject: { windowNavigation: { from: windowNavigationKey, default: null } },
  mounted() {
    this.stop_mobile_back_watch = this.$watch(
      () => useAppStore().isMobile &&
        (this.windowNavigation?.active ?? true) && this.mobile_back_active,
      (active) => {
        if (active && !this.unregister_mobile_back) {
          this.unregister_mobile_back = registerNavigation(() => this.mobile_back(), {
            priority: this.$options.mobileBackPriority ?? 10,
          });
        } else if (!active && this.unregister_mobile_back) {
          this.unregister_mobile_back();
          this.unregister_mobile_back = null;
        }
      },
      { immediate: true },
    );
  },
  beforeUnmount() {
    this.stop_mobile_back_watch?.();
    this.unregister_mobile_back?.();
  },
};

export function createWindowNavigation(isActive, isVisible = isActive) {
  return reactive({ active: computed(isActive), visible: computed(isVisible) });
}
