<template>
  <Teleport to="body" :disabled="!teleport">
    <Transition :name="isMobile ? 'bottom-sheet' : transition_name">
      <div v-if="modelValue" class="modal-wrapper-fixed" :class="{ 'is-floating': is_floating, 'is-mobile': isMobile }" @mousedown.stop>
        <div class="modal-overlay" @click="close"></div>
        <div
          ref="modalContentRef"
          class="modal-content glass"
          :class="[
            `variant-${variant}`,
            {
              'is-mobile': isMobile,
              'has-height-transition': isReadyForHeightTransition && (is_floating || isMobile),
            },
          ]"
          :style="dynamicStyle"
          @click.stop
        >
          <div v-if="isMobile" ref="dragIndicatorRef" class="modal-drag-indicator"></div>
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { registerModal } from "@/utils/modalHistory";

export default {
  name: "SideModal",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    variant: {
      type: String,
      default: "side",
      validator: (value) => ["side", "floating"].includes(value),
    },
    teleport: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["close"],
  data() {
    return {
      isMobile: false,
      unregisterHistory: null,
      modalHeight: null,
      isReadyForHeightTransition: false,
      resizeObserver: null,
      mutationObserver: null,
    };
  },
  computed: {
    is_floating() {
      return this.variant === "floating";
    },
    transition_name() {
      return this.is_floating ? "floating-modal" : "side-modal";
    },
    dynamicStyle() {
      if ((this.is_floating || this.isMobile) && this.modalHeight) {
        return {
          height: `${this.modalHeight}px`,
        };
      }
      return {};
    },
  },
  mounted() {
    this.checkMobile();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleWindowResize);
    }
    if (this.modelValue) {
      document.addEventListener("keydown", this.handleKeydown);
      if (!this.unregisterHistory) {
        this.unregisterHistory = registerModal(() => {
          this.close();
        });
      }
      this.isReadyForHeightTransition = false;
      this.$nextTick(() => {
        this.updateModalHeight(false);
        this.initObservers();
        setTimeout(() => {
          this.isReadyForHeightTransition = true;
        }, 250);
      });
    }
  },
  methods: {
    checkMobile() {
      if (typeof window !== "undefined") {
        this.isMobile = window.innerWidth <= 768;
      }
    },
    handleWindowResize() {
      this.checkMobile();
      this.updateModalHeight(false);
    },
    close() {
      if (this.unregisterHistory) {
        this.unregisterHistory();
        this.unregisterHistory = null;
      }
      this.$emit("close");
    },
    handleKeydown(e) {
      if (e.key === "Escape" && this.modelValue) {
        this.close();
      }
    },
    updateModalHeight(animate = true) {
      if (!this.modelValue || (!this.is_floating && !this.isMobile)) return;
      const el = this.$refs.modalContentRef;
      if (!el) return;

      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
      const minH = Math.round(screenH * 0.40);
      const maxH = Math.max(minH, screenH - 76);

      const bodyEl = el.querySelector(".modal-body, .modal-body-area");
      let naturalHeight = 0;

      if (bodyEl) {
        const activePanel = bodyEl.querySelector(".tab-panel:not([style*='display: none'])");
        let bodyContentHeight = 0;
        if (activePanel) {
          bodyContentHeight = activePanel.scrollHeight;
        } else {
          bodyContentHeight = bodyEl.scrollHeight;
        }

        const bodyComputed = window.getComputedStyle(bodyEl);
        const paddingTop = parseFloat(bodyComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(bodyComputed.paddingBottom) || 0;
        const totalBody = bodyContentHeight + paddingTop + paddingBottom;

        const formRoot = el.querySelector(".task-detail-modal") || el;
        let nonBodyHeight = 0;
        for (const child of formRoot.children) {
          if (child !== bodyEl && !child.contains(bodyEl)) {
            nonBodyHeight += child.offsetHeight;
          }
        }

        if (this.$refs.dragIndicatorRef) {
          nonBodyHeight += this.$refs.dragIndicatorRef.offsetHeight;
        }

        const elComputed = window.getComputedStyle(el);
        const elPaddingBottom = parseFloat(elComputed.paddingBottom) || 0;

        naturalHeight = nonBodyHeight + totalBody + elPaddingBottom;
      } else {
        naturalHeight = el.scrollHeight;
      }

      const targetHeight = Math.round(Math.min(Math.max(naturalHeight, minH), maxH));
      this.modalHeight = targetHeight;

      if (!this.isReadyForHeightTransition && animate) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.isReadyForHeightTransition = true;
          }, 150);
        });
      }
    },
    initObservers() {
      this.destroyObservers();
      const el = this.$refs.modalContentRef;
      if (!el) return;

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateModalHeight(true);
        });
        for (const child of el.children) {
          if (child !== this.$refs.dragIndicatorRef) {
            this.resizeObserver.observe(child);
          }
        }
        const bodyEl = el.querySelector(".modal-body, .modal-body-area");
        if (bodyEl) {
          for (const child of bodyEl.children) {
            this.resizeObserver.observe(child);
          }
        }
      }

      if (typeof MutationObserver !== "undefined") {
        this.mutationObserver = new MutationObserver(() => {
          this.updateModalHeight(true);
        });
        this.mutationObserver.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      }
    },
    destroyObservers() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
    },
  },
  watch: {
    modelValue(val) {
      if (val) {
        document.addEventListener("keydown", this.handleKeydown);
        if (!this.unregisterHistory) {
          this.unregisterHistory = registerModal(() => {
            this.close();
          });
        }
        this.isReadyForHeightTransition = false;
        this.$nextTick(() => {
          this.updateModalHeight(false);
          this.initObservers();
          setTimeout(() => {
            this.isReadyForHeightTransition = true;
          }, 250);
        });
      } else {
        document.removeEventListener("keydown", this.handleKeydown);
        if (this.unregisterHistory) {
          this.unregisterHistory();
          this.unregisterHistory = null;
        }
        this.destroyObservers();
        this.modalHeight = null;
        this.isReadyForHeightTransition = false;
      }
    },
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.handleKeydown);
    if (this.unregisterHistory) {
      this.unregisterHistory();
      this.unregisterHistory = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleWindowResize);
    }
    this.destroyObservers();
  },
};
</script>


<style scoped>
.modal-wrapper-fixed {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  box-sizing: border-box;
  z-index: 10001;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.modal-wrapper-fixed.is-floating {
  display: grid;
  place-items: center;
  justify-content: center;
  padding: clamp(8px, 3vw, 24px);
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1;
  transition: opacity var(--transition-base);
}

.modal-content {
  z-index: 2;
  position: relative;
  background: var(--surface-0);
  box-shadow: var(--shadow-float);
  transition: background var(--transition-base);
}

/* Variante: painel lateral */
.variant-side {
  width: min(480px, 100%);
  height: 100%;
  overflow-y: auto;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

/* Variante: modal flutuante centralizado */
.variant-floating {
  width: 80dvw;
  max-width: 860px;
  min-height: 40dvh;
  max-height: calc(100dvh - 76px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}

.variant-floating.has-height-transition {
  transition: height 0.32s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.32s ease;
}

@media (max-width: 480px) {
  .variant-floating {
    border-radius: var(--radius-md);
    width: 96dvw;
    min-height: 40dvh;
    max-height: calc(100dvh - 76px);
  }
}


/* --- Animação: painel lateral --- */
.side-modal-enter-active,
.side-modal-leave-active {
  transition: opacity var(--transition-base);
}
.side-modal-enter-active .modal-content,
.side-modal-leave-active .modal-content {
  transition: transform var(--transition-spring), opacity var(--transition-base);
}
.side-modal-enter-active .modal-overlay,
.side-modal-leave-active .modal-overlay {
  transition: opacity var(--transition-base);
}
.side-modal-enter-from .modal-overlay,
.side-modal-leave-to .modal-overlay {
  opacity: 0;
}
.side-modal-enter-from .modal-content,
.side-modal-leave-to .modal-content {
  opacity: 0;
  transform: translateX(100%);
}

/* --- Animação: modal flutuante (spring) --- */
.floating-modal-enter-active,
.floating-modal-leave-active {
  transition: opacity var(--transition-base);
}
.floating-modal-enter-active .modal-content,
.floating-modal-leave-active .modal-content {
  transition: transform var(--transition-spring), opacity var(--transition-base);
}
.floating-modal-enter-active .modal-overlay,
.floating-modal-leave-active .modal-overlay {
  transition: opacity var(--transition-base);
}
.floating-modal-enter-from .modal-overlay,
.floating-modal-leave-to .modal-overlay {
  opacity: 0;
}
.floating-modal-enter-from .modal-content {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.floating-modal-leave-to .modal-content {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

/* --- Animação: bottom sheet (mobile) --- */
.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: opacity var(--transition-base, 0.25s ease);
}
.bottom-sheet-enter-active .modal-content,
.bottom-sheet-leave-active .modal-content {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity var(--transition-base, 0.25s ease);
}
.bottom-sheet-enter-active .modal-overlay,
.bottom-sheet-leave-active .modal-overlay {
  transition: opacity var(--transition-base, 0.25s ease);
}
.bottom-sheet-enter-from .modal-overlay,
.bottom-sheet-leave-to .modal-overlay {
  opacity: 0;
}
.bottom-sheet-enter-from .modal-content,
.bottom-sheet-leave-to .modal-content {
  opacity: 1;
  transform: translateY(100%);
}

@media (max-width: 768px) {
  .modal-wrapper-fixed {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;
    display: flex !important;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 !important;
    z-index: 99999 !important;
  }

  .modal-content.variant-side,
  .modal-content.variant-floating {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 40dvh !important;
    max-height: calc(100dvh - 76px) !important;
    border-radius: 24px 24px 0 0 !important;
    overflow: hidden !important;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35) !important;
    border-bottom: none !important;
    padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
    display: flex;
    flex-direction: column;
  }

  .modal-content.variant-floating.has-height-transition,
  .modal-content.variant-side.has-height-transition {
    transition: height 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }


  .modal-drag-indicator {
    width: 40px;
    height: 5px;
    background: var(--text-gray, rgba(150, 150, 150, 0.4));
    border-radius: 999px;
    margin: 10px auto 6px auto;
    flex-shrink: 0;
    pointer-events: none;
  }
}
</style>
