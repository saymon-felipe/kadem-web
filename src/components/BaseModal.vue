<template>
  <Teleport to="body" :disabled="!teleport">
    <Transition name="kadem-modal">
      <div
        v-if="modelValue"
        class="kadem-modal-overlay"
        :class="[backdropClass, { 'is-mobile': isMobileView }]"
        @click.self="onBackdropClick"
        @mousedown.stop
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Modal'"
      >
        <div
          ref="cardRef"
          class="kadem-modal-card glass"
          :class="[
            `size-${size}`,
            {
              'is-bottom-sheet': isMobileView && mobileVariant === 'bottom-sheet',
              'has-height-transition': isReadyForHeightTransition,
            },
            customClass,
          ]"
          :style="cardDynamicStyle"
          @click.stop
          @mousedown.stop
        >
          <!-- Indicador de arraste de celular (Drag Handle) -->
          <div
            v-if="isMobileView && mobileVariant === 'bottom-sheet'"
            ref="dragBarRef"
            class="mobile-drag-bar"
            aria-hidden="true"
          >
            <div class="drag-pill"></div>
          </div>

          <!-- Cabeçalho -->
          <slot name="header">
            <header v-if="hasHeader" ref="headerRef" class="modal-header-row">
              <div class="modal-header-title">
                <slot name="title">
                  <h3 v-if="title" class="title-text">{{ title }}</h3>
                </slot>
              </div>

              <button
                v-if="showClose"
                type="button"
                class="modal-close-icon"
                @click="close"
                aria-label="Fechar modal"
                title="Fechar"
              >
                <font-awesome-icon icon="xmark" />
              </button>
            </header>
          </slot>

          <!-- Corpo com scroll interno -->
          <div ref="bodyRef" class="modal-body-area custom-scrollbar" :class="bodyClass">
            <slot></slot>
          </div>

          <!-- Rodapé de ações -->
          <footer v-if="$slots.footer" ref="footerRef" class="modal-footer-row">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { registerModal } from "@/utils/modalHistory";

export default {
  name: "BaseModal",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      default: "md",
      validator: (val) => ["sm", "md", "lg", "xl", "full"].includes(val),
    },
    showClose: {
      type: Boolean,
      default: true,
    },
    showHeader: {
      type: Boolean,
      default: null,
    },
    closeOnBackdrop: {
      type: Boolean,
      default: true,
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    handleMobileBack: {
      type: Boolean,
      default: true,
    },
    mobileVariant: {
      type: String,
      default: "bottom-sheet",
      validator: (val) => ["bottom-sheet", "center"].includes(val),
    },
    teleport: {
      type: Boolean,
      default: true,
    },
    customClass: {
      type: [String, Array, Object],
      default: "",
    },
    backdropClass: {
      type: [String, Array, Object],
      default: "",
    },
    bodyClass: {
      type: [String, Array, Object],
      default: "",
    },
  },
  emits: ["update:modelValue", "close"],
  data() {
    return {
      isMobileView: false,
      modalRegistration: null,
      mediaQueryList: null,
      modalHeight: null,
      isReadyForHeightTransition: false,
      resizeObserver: null,
      mutationObserver: null,
    };
  },
  computed: {
    hasHeader() {
      if (this.showHeader !== null) return this.showHeader;
      return Boolean(this.title || this.$slots.header || this.$slots.title);
    },
    cardDynamicStyle() {
      if (this.modalHeight) {
        return {
          height: `${this.modalHeight}px`,
        };
      }
      return {};
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
      this.$emit("close");
    },
    onBackdropClick() {
      if (this.closeOnBackdrop) {
        this.close();
      }
    },
    handleKeydown(e) {
      if (e.key === "Escape" && this.closeOnEscape && this.modelValue) {
        this.close();
      }
    },
    updateMobileMatch(e) {
      this.isMobileView = Boolean(e.matches);
    },
    handleResize() {
      this.updateModalHeight(false);
    },
    updateModalHeight(animate = true) {
      if (!this.modelValue) return;
      const card = this.$refs.cardRef;
      const body = this.$refs.bodyRef;
      if (!card || !body) return;

      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
      const minH = Math.round(screenH * 0.40);
      const maxH = Math.max(minH, screenH - 76);

      let nonBodyHeight = 0;
      if (this.$refs.dragBarRef) nonBodyHeight += this.$refs.dragBarRef.offsetHeight;
      if (this.$refs.headerRef) nonBodyHeight += this.$refs.headerRef.offsetHeight;
      if (this.$refs.footerRef) nonBodyHeight += this.$refs.footerRef.offsetHeight;

      const activeTabPanel = body.querySelector(".tab-panel:not([style*='display: none'])");
      let bodyContentHeight = 0;
      if (activeTabPanel) {
        bodyContentHeight = activeTabPanel.scrollHeight;
      } else {
        bodyContentHeight = body.scrollHeight;
      }

      const bodyStyle = window.getComputedStyle(body);
      const paddingTop = parseFloat(bodyStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
      const totalBodyHeight = bodyContentHeight + paddingTop + paddingBottom;

      const cardComputed = window.getComputedStyle(card);
      const cardPaddingBottom = parseFloat(cardComputed.paddingBottom) || 0;

      const totalNatural = nonBodyHeight + totalBodyHeight + cardPaddingBottom;
      const targetHeight = Math.round(Math.min(Math.max(totalNatural, minH), maxH));

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
      const body = this.$refs.bodyRef;
      if (!body) return;

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateModalHeight(true);
        });
        for (const child of body.children) {
          this.resizeObserver.observe(child);
        }
      }

      if (typeof MutationObserver !== "undefined") {
        this.mutationObserver = new MutationObserver(() => {
          this.updateModalHeight(true);
        });
        this.mutationObserver.observe(body, {
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
    register() {
      if (typeof window !== "undefined") {
        document.addEventListener("keydown", this.handleKeydown);
      }
      this.modalRegistration = registerModal(
        () => {
          this.close();
        },
        { handleHistory: this.handleMobileBack }
      );
    },
    unregister() {
      if (typeof window !== "undefined") {
        document.removeEventListener("keydown", this.handleKeydown);
      }
      if (this.modalRegistration) {
        this.modalRegistration.unregister();
        this.modalRegistration = null;
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        if (val) {
          this.register();
          this.isReadyForHeightTransition = false;
          this.$nextTick(() => {
            this.updateModalHeight(false);
            this.initObservers();
            setTimeout(() => {
              this.isReadyForHeightTransition = true;
            }, 250);
          });
        } else {
          this.unregister();
          this.destroyObservers();
          this.modalHeight = null;
          this.isReadyForHeightTransition = false;
        }
      },
    },
  },
  mounted() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
      if (window.matchMedia) {
        this.mediaQueryList = window.matchMedia("(max-width: 768px)");
        this.isMobileView = this.mediaQueryList.matches;
        if (this.mediaQueryList.addEventListener) {
          this.mediaQueryList.addEventListener("change", this.updateMobileMatch);
        } else {
          this.mediaQueryList.addListener(this.updateMobileMatch);
        }
      }
    }
  },
  beforeUnmount() {
    this.unregister();
    this.destroyObservers();
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.mediaQueryList) {
      if (this.mediaQueryList.removeEventListener) {
        this.mediaQueryList.removeEventListener("change", this.updateMobileMatch);
      } else {
        this.mediaQueryList.removeListener(this.updateMobileMatch);
      }
    }
  },
};
</script>

<style scoped>
.kadem-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 10001;
  padding: var(--space-4);
  box-sizing: border-box;
}

.kadem-modal-card {
  background: var(--surface-0);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  border: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  min-height: 40dvh;
  max-height: calc(100dvh - 76px);
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  z-index: 2;
  color: var(--text-primary);
}

.kadem-modal-card.has-height-transition {
  transition: height 0.32s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.32s ease;
}


/* Tamanhos no Desktop */
.size-sm {
  width: 90%;
  max-width: 380px;
}

.size-md {
  width: 90%;
  max-width: 480px;
}

.size-lg {
  width: 92%;
  max-width: 640px;
}

.size-xl {
  width: 94%;
  max-width: 860px;
}

.size-full {
  width: 96%;
  max-width: 1100px;
}

/* Header */
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.modal-header-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.title-text {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-close-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--surface-2);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.modal-close-icon:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  transform: scale(1.05);
}

.modal-close-icon:active {
  transform: scale(0.95);
}

/* Corpo com scroll */
.modal-body-area {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-5) var(--space-6);
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mobile-drag-bar {
  display: none;
}

/* ===================================================
   COMPORTAMENTO DE CELULAR (MOBILE BOTTOM-SHEET)
   =================================================== */
@media (max-width: 768px) {
  .kadem-modal-overlay.is-mobile {
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
  }

  .kadem-modal-card.is-bottom-sheet {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 24px 24px 0 0 !important;
    min-height: 40dvh !important;
    max-height: calc(100dvh - 76px) !important;
    border-bottom: none !important;
    border-left: none !important;
    border-right: none !important;
    border-top: 1px solid var(--glass-border) !important;
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.3) !important;
    padding-bottom: max(var(--space-3), env(safe-area-inset-bottom, 16px));
  }

  .kadem-modal-card.is-bottom-sheet.has-height-transition {
    transition: height 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }


  .mobile-drag-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-3) 0 var(--space-1);
    flex-shrink: 0;
    width: 100%;
    cursor: grab;
  }

  .drag-pill {
    width: 44px;
    height: 5px;
    border-radius: 999px;
    background: var(--text-muted);
    opacity: 0.35;
  }

  .modal-header-row {
    padding: var(--space-3) var(--space-5);
  }

  .modal-body-area {
    padding: var(--space-4) var(--space-5);
  }
}

/* ===================================================
   TRANSIÇÕES / ANIMAÇÕES
   =================================================== */
.kadem-modal-enter-active,
.kadem-modal-leave-active {
  transition: opacity var(--transition-base);
}

.kadem-modal-enter-from,
.kadem-modal-leave-to {
  opacity: 0;
}

/* Desktop: Leve escala e fade centralizado */
.kadem-modal-enter-active .kadem-modal-card,
.kadem-modal-leave-active .kadem-modal-card {
  transition:
    transform var(--transition-bounce),
    opacity var(--transition-base);
}

.kadem-modal-enter-from .kadem-modal-card {
  transform: scale(0.94) translateY(14px);
  opacity: 0;
}

.kadem-modal-leave-to .kadem-modal-card {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}

/* Celular: Desliza de baixo para cima (Bottom Sheet) */
@media (max-width: 768px) {
  .kadem-modal-enter-active .kadem-modal-card.is-bottom-sheet,
  .kadem-modal-leave-active .kadem-modal-card.is-bottom-sheet {
    transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  .kadem-modal-enter-from .kadem-modal-card.is-bottom-sheet {
    transform: translateY(100%) !important;
    opacity: 1 !important;
  }

  .kadem-modal-leave-to .kadem-modal-card.is-bottom-sheet {
    transform: translateY(100%) !important;
    opacity: 1 !important;
  }
}
</style>