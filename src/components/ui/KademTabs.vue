<template>
  <div
    ref="containerRef"
    class="kadem-tabs-wrapper"
    :class="[`variant-${variant}`, { 'has-overflow': canScrollLeft || canScrollRight }]"
  >
    <!-- Trilho de Abas com Fade Mask nas bordas -->
    <nav
      ref="navRef"
      class="kadem-tabs-nav custom-scrollbar-none"
      :class="[maskClass, { 'is-dragging': isDragging }]"
      role="tablist"
      :aria-label="ariaLabel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @wheel.passive="handleWheel"
      @scroll.passive="checkScrollability"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :ref="(el) => setTabRef(el, tab.id)"
        type="button"
        class="kadem-tab-btn"
        :class="{
          active: isTabActive(tab),
          disabled: tab.disabled,
          'is-pro': tab.pro && !isPaidPlan,
        }"
        :disabled="tab.disabled"
        role="tab"
        :aria-selected="isTabActive(tab)"
        @click="handleTabClick(tab)"
      >
        <slot name="tab" :tab="tab" :active="isTabActive(tab)">
          <font-awesome-icon v-if="tab.icon" :icon="tab.icon" class="tab-icon" />
          <span class="tab-label">{{ tab.label || tab.name }}</span>
          <span
            v-if="tab.badge !== undefined && tab.badge !== null"
            class="tab-badge"
            :class="tab.badgeClass"
          >
            {{ tab.badge }}
          </span>
          <font-awesome-icon
            v-if="tab.pro && !isPaidPlan"
            icon="lock"
            class="tab-lock"
          />
        </slot>
      </button>
    </nav>
  </div>
</template>

<script>
export default {
  name: "KademTabs",
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    modelValue: {
      type: [String, Number],
      default: undefined,
    },
    activeTab: {
      type: [String, Number],
      default: undefined,
    },
    variant: {
      type: String,
      default: "default", // 'default' | 'health' | 'nexo' | 'info' | 'pills'
      validator: (val) => ["default", "health", "nexo", "info", "pills"].includes(val),
    },
    isPaidPlan: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: "Navegação por abas",
    },
    allowDrag: {
      type: Boolean,
      default: true,
    },
    allowWheel: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update:modelValue", "update:activeTab", "change"],
  data() {
    return {
      canScrollLeft: false,
      canScrollRight: false,
      isMouseDown: false,
      isDragging: false,
      startX: 0,
      scrollLeftStart: 0,
      hasDragged: false,
      tabRefs: {},
      resizeObserver: null,
    };
  },
  computed: {
    currentTabId() {
      if (this.modelValue !== undefined) {
        return this.modelValue;
      }
      return this.activeTab;
    },
    maskClass() {
      if (this.canScrollLeft && this.canScrollRight) {
        return "mask-both";
      }
      if (this.canScrollLeft) {
        return "mask-left";
      }
      if (this.canScrollRight) {
        return "mask-right";
      }
      return "";
    },
  },
  watch: {
    currentTabId() {
      this.$nextTick(() => {
        this.scrollToActiveTab(true);
        this.checkScrollability();
      });
    },
    tabs: {
      deep: true,
      handler() {
        this.$nextTick(() => {
          this.checkScrollability();
        });
      },
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.checkScrollability();
      this.scrollToActiveTab(false);
      this.initResizeObserver();
    });
    window.addEventListener("resize", this.checkScrollability);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.checkScrollability);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  },
  methods: {
    setTabRef(el, id) {
      if (el) {
        this.tabRefs[id] = el;
      }
    },
    isTabActive(tab) {
      return this.currentTabId === tab.id;
    },
    handleTabClick(tab) {
      if (tab.disabled) return;
      if (this.hasDragged) {
        this.hasDragged = false;
        return;
      }
      this.$emit("update:modelValue", tab.id);
      this.$emit("update:activeTab", tab.id);
      this.$emit("change", tab);
    },
    initResizeObserver() {
      if (typeof ResizeObserver === "undefined") return;
      if (this.$refs.containerRef) {
        this.resizeObserver = new ResizeObserver(() => {
          this.checkScrollability();
        });
        this.resizeObserver.observe(this.$refs.containerRef);
        if (this.$refs.navRef) {
          this.resizeObserver.observe(this.$refs.navRef);
        }
      }
    },
    checkScrollability() {
      const nav = this.$refs.navRef;
      if (!nav) return;

      const maxScroll = nav.scrollWidth - nav.clientWidth;
      const currentScroll = nav.scrollLeft;

      this.canScrollLeft = currentScroll > 2;
      this.canScrollRight = maxScroll > 2 && currentScroll < maxScroll - 2;
    },
    scrollToActiveTab(smooth = true) {
      const nav = this.$refs.navRef;
      const activeEl = this.tabRefs[this.currentTabId];
      if (!nav || !activeEl) return;

      const navRect = nav.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();

      const isLeftHidden = tabRect.left < navRect.left + 24;
      const isRightHidden = tabRect.right > navRect.right - 24;

      if (isLeftHidden || isRightHidden) {
        activeEl.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "nearest",
          inline: "center",
        });
      }
    },
    handleMouseDown(e) {
      if (!this.allowDrag || e.button !== 0) return;
      const nav = this.$refs.navRef;
      if (!nav) return;

      this.isMouseDown = true;
      this.isDragging = false;
      this.hasDragged = false;
      this.startX = e.pageX;
      this.scrollLeftStart = nav.scrollLeft;
    },
    handleMouseMove(e) {
      if (!this.isMouseDown) return;
      const nav = this.$refs.navRef;
      if (!nav) return;

      const deltaX = e.pageX - this.startX;
      if (Math.abs(deltaX) > 5) {
        this.isDragging = true;
        this.hasDragged = true;
        nav.scrollLeft = this.scrollLeftStart - deltaX;
      }
    },
    handleMouseUp() {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        this.isDragging = false;
        setTimeout(() => {
          this.hasDragged = false;
        }, 50);
      }
    },
    handleMouseLeave() {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        this.isDragging = false;
        setTimeout(() => {
          this.hasDragged = false;
        }, 50);
      }
    },
    handleWheel(e) {
      if (!this.allowWheel) return;
      const nav = this.$refs.navRef;
      if (!nav) return;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && (this.canScrollLeft || this.canScrollRight)) {
        nav.scrollLeft += e.deltaY;
      }
    },
  },
};
</script>

<style scoped>
.kadem-tabs-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--glass-border);
  box-sizing: border-box;
}

/* Modo Pills (sem borda inferior cheia) */
.kadem-tabs-wrapper.variant-pills {
  border-bottom: none;
  padding: var(--space-1) 0;
}

/* Trilho de navegação */
.kadem-tabs-nav {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  user-select: none;
  transition:
    mask-image 0.2s ease,
    -webkit-mask-image 0.2s ease;
}

.kadem-tabs-wrapper.variant-pills .kadem-tabs-nav {
  gap: var(--space-2);
}

.kadem-tabs-nav::-webkit-scrollbar {
  display: none;
}

.kadem-tabs-nav.is-dragging {
  cursor: grabbing;
  scroll-behavior: auto;
}

.kadem-tabs-nav.is-dragging .kadem-tab-btn {
  cursor: grabbing;
  pointer-events: none;
}

/* Máscaras de Gradiente (Esmaecimento elegante das bordas) */
.kadem-tabs-nav.mask-both {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 36px,
    black calc(100% - 36px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 36px,
    black calc(100% - 36px),
    transparent 100%
  );
}

.kadem-tabs-nav.mask-left {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 36px,
    black 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 36px,
    black 100%
  );
}

.kadem-tabs-nav.mask-right {
  -webkit-mask-image: linear-gradient(
    to right,
    black 0,
    black calc(100% - 36px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    black 0,
    black calc(100% - 36px),
    transparent 100%
  );
}

/* Botões de aba padrão */
.kadem-tab-btn {
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: var(--space-3) var(--space-1);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  font-size: var(--fontsize-sx);
  font-weight: 500;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
  outline: none;
  box-sizing: border-box;
  flex-shrink: 0;
}

.kadem-tab-btn:hover,
.kadem-tab-btn.active {
  color: var(--text-primary);
}

.kadem-tab-btn.active {
  font-weight: 700;
}

.kadem-tab-btn:active {
  transform: scale(0.97);
}

.kadem-tab-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* Sublinhado ativo padrão */
.kadem-tab-btn.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--deep-blue);
  animation: tab-underline-in 0.2s var(--transition-spring);
}

/* Variante Health (Gradiente Rosa/Roxo) */
.variant-health .kadem-tab-btn.active::after {
  background: linear-gradient(90deg, #e25373, #8d5fd3);
}

/* Variante Nexo */
.variant-nexo .kadem-tab-btn {
  color: var(--text-muted);
}
.variant-nexo .kadem-tab-btn:hover,
.variant-nexo .kadem-tab-btn.active {
  color: var(--text-primary);
}
.variant-nexo .kadem-tab-btn.active::after {
  background: var(--deep-blue);
}

/* Variante Info */
.variant-info .kadem-tab-btn.active {
  color: var(--color-info);
}
.variant-info .kadem-tab-btn.active::after {
  background: var(--color-info);
  height: 3px;
}

/* Variante Pills */
.variant-pills .kadem-tab-btn {
  min-height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-secondary);
  padding: 0 var(--space-3);
  font-weight: 600;
}
.variant-pills .kadem-tab-btn:hover,
.variant-pills .kadem-tab-btn.active {
  color: var(--text-primary);
  background: var(--surface-1);
  border-color: var(--deep-blue);
}
.variant-pills .kadem-tab-btn.active::after {
  display: none;
}

/* Ícones & Badges */
.tab-icon {
  font-size: 0.95em;
  opacity: 0.9;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 8px;
  min-width: 18px;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--surface-2);
  color: var(--text-secondary);
  line-height: 1.3;
  transition: all var(--transition-fast);
}

.kadem-tab-btn.active .tab-badge {
  background: var(--deep-blue);
  color: var(--white);
}

.variant-health .kadem-tab-btn.active .tab-badge {
  background: linear-gradient(90deg, #e25373, #8d5fd3);
  color: #fff;
}

.variant-info .kadem-tab-btn.active .tab-badge {
  background: var(--color-info);
  color: var(--white);
}

.tab-lock {
  color: #d4af37;
  font-size: 0.7rem;
  opacity: 0.85;
  margin-left: 2px;
}

/* Animações */
@keyframes tab-underline-in {
  from {
    transform: scaleX(0.4);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
