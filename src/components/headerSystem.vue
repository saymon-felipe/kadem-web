<template>
  <div class="header-wrapper">
    <header class="glass">
      <button
        class="plan-pill"
        @click="open_plan_modal"
        :class="{ 'is-pro': is_pro }"
        title="Gerenciar Plano"
      >
        <span class="status-dot"></span>
        {{ plan_label }}
      </button>
      <button
        class="header-button home"
        @click="openSystem"
        :class="{ opened: isStartMenuOpen }"
      >
        <img src="../assets/images/icons/system.png" alt="Iniciar" />
      </button>
      <button
        class="header-button"
        @click="handleWindowClick('projects', 'Meus Projetos', 'ProjectsWindow')"
        @contextmenu.prevent="
          handleRightClick($event, 'projects', 'Meus Projetos', 'ProjectsWindow')
        "
        :class="{
          opened: currentUserWindows['projects'],
          active:
            activeWindowId === 'projects' && !currentUserWindows['projects'].isMinimized,
        }"
      >
        <img src="../assets/images/icons/projects-icon.png" alt="Projetos" />
      </button>

      <button
        class="header-button"
        @click="handleWindowClick('productivity', 'Produtividade', 'ProductivityWindow')"
        @contextmenu.prevent="
          handleRightClick($event, 'productivity', 'Produtividade', 'ProductivityWindow')
        "
        :class="{
          opened: currentUserWindows['productivity'],
          active:
            activeWindowId === 'productivity' &&
            !currentUserWindows['productivity'].isMinimized,
        }"
      >
        <img src="../assets/images/icons/productivity-icon.png" alt="Produtividade" />
      </button>
      <div class="ai-credits-anchor">
        <button
          type="button"
          class="ai-credits-badge"
          :class="{ 'zero-credits': ai_credits_remaining === 0 }"
          :aria-label="ai_credits_tooltip"
          aria-haspopup="dialog"
          :aria-expanded="show_credits_dropdown"
          aria-controls="ai-credits-popover"
          :title="ai_credits_tooltip"
          @click="toggle_credits_dropdown"
          @keydown.esc.stop.prevent="show_credits_dropdown = false"
        >
          <font-awesome-icon icon="wand-magic-sparkles" class="ai-pill-icon" />
          <span>{{ ai_credits_label }}</span>
          <font-awesome-icon icon="chevron-down" class="ai-credits-chevron" />
        </button>
        <Transition name="popup-anim">
          <section
            v-if="show_credits_dropdown"
            id="ai-credits-popover"
            class="ai-credits-popover"
            role="dialog"
            aria-label="Uso dos créditos de IA"
            @keydown.esc.stop.prevent="show_credits_dropdown = false"
          >
            <div class="credits-popover-heading">
              <div>
                <span class="credits-eyebrow">CONTA DE IA</span>
                <h2>Uso de créditos</h2>
              </div>
              <button
                type="button"
                class="credits-close"
                aria-label="Fechar detalhes de créditos"
                @click="show_credits_dropdown = false"
              >
                <font-awesome-icon icon="xmark" />
              </button>
            </div>

            <div class="credits-balance">
              <strong>{{ format_credits(ai_credits_remaining) }}</strong>
              <span>disponíveis</span>
            </div>

            <div class="credits-usage-line">
              <span>Créditos usados</span>
              <strong>{{ format_credits(ai_credits_used) }} / {{ format_credits(ai_credits_total) }}</strong>
            </div>
            <div
              class="credits-progress-track"
              role="progressbar"
              aria-label="Uso de créditos de IA"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="Math.round(ai_usage_percent)"
            >
              <span :style="{ width: `${ai_usage_percent}%` }"></span>
            </div>
            <div class="credits-progress-caption">
              <span>{{ Math.round(ai_usage_percent) }}% utilizado</span>
              <span>{{ format_credits(ai_credits_remaining) }} restantes</span>
            </div>

            <p class="credits-shared-note">
              <font-awesome-icon icon="circle-info" />
              Créditos compartilhados entre Health e Nexo.
            </p>
            <button type="button" class="credits-plan-link" @click="open_plan_from_credits">
              Gerenciar plano
              <font-awesome-icon icon="arrow-up-right-from-square" />
            </button>
          </section>
        </Transition>
      </div>
    </header>
    <Transition name="start-menu-anim">
      <StartMenu v-if="isStartMenuOpen" />
    </Transition>
    <Transition name="popup-anim">
      <ContextMenu
        v-if="contextMenu.isOpen"
        :options="contextMenu.options"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @menu-click="handleMenuClick"
      />
    </Transition>
    <SubscriptionModal v-model="show_plan_modal" @close="show_plan_modal = false" />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useWindowStore } from "@/stores/windows";
import { useAppStore } from "@/stores/app";
import { useAiCreditsStore } from "@/stores/aiCredits";
import ContextMenu from "./ContextMenu.vue";
import StartMenu from "./startMenu/StartMenu.vue";
import SubscriptionModal from "./SubscriptionModal.vue";

const ANIMATION_DURATION = 150;

export default {
  components: {
    ContextMenu,
    StartMenu,
    SubscriptionModal,
  },
  data() {
    return {
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        options: [],
        target: null,
      },
      contextMenuTimer: null,
      show_plan_modal: false,
      show_credits_dropdown: false,
    };
  },
  computed: {
    ...mapState(useWindowStore, ["currentUserWindows", "activeWindowId"]),
    ...mapState(useAppStore, ["isStartMenuOpen"]),
    ...mapState(useAuthStore, ["user"]),
    is_pro() {
      if (!this.user) return false;
      return Boolean(this.user.plan_tier && this.user.plan_tier !== "free");
    },

    plan_label() {
      return this.is_pro ? "Pro" : "Free";
    },

    ai_credits_remaining() {
      const aiStore = useAiCreditsStore();
      return aiStore.remainingCredits;
    },

    ai_credits_total() {
      const aiStore = useAiCreditsStore();
      return aiStore.totalCredits;
    },

    ai_credits_used() {
      return useAiCreditsStore().usedCredits;
    },

    ai_usage_percent() {
      if (!this.ai_credits_total) return 0;
      return Math.min(100, Math.max(0, (this.ai_credits_used / this.ai_credits_total) * 100));
    },

    ai_credits_label() {
      const count = this.ai_credits_remaining;
      if (count >= 1000) {
        return `${Number(count).toLocaleString("pt-BR")} IA`;
      }
      return `${count} IA`;
    },

    ai_credits_tooltip() {
      return `Créditos de IA da Plataforma: ${this.ai_credits_remaining} disponíveis de ${this.ai_credits_total}`;
    },
  },
  methods: {
    ...mapActions(useAppStore, ["toggleStartMenu", "closeStartMenu"]),
    ...mapActions(useWindowStore, [
      "openWindow",
      "focusWindow",
      "restoreWindow",
      "minimizeWindow",
      "closeWindow",
    ]),
    open_plan_modal() {
      this.show_plan_modal = true;
    },
    toggle_credits_dropdown() {
      this.show_credits_dropdown = !this.show_credits_dropdown;
      if (this.show_credits_dropdown) useAiCreditsStore().fetchUsage();
    },
    open_plan_from_credits() {
      this.show_credits_dropdown = false;
      this.open_plan_modal();
    },
    format_credits(value) {
      return Number(value || 0).toLocaleString("pt-BR");
    },
    handleRightClick(event, id, title, componentId) {
      if (this.contextMenuTimer) {
        clearTimeout(this.contextMenuTimer);
        this.contextMenuTimer = null;
      }

      const window = this.currentUserWindows[id];
      let options = [];
      if (window) {
        options.push({ label: "Fechar", action: "close" });
      } else {
        options.push({ label: "Abrir", action: "open" });
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const newX = rect.x;
      const newY = rect.top + rect.height + 4;
      const newTarget = { id, title, componentId };

      if (this.contextMenu.isOpen) {
        this.contextMenu.isOpen = false;

        this._contextMenuTimer = setTimeout(() => {
          this.contextMenu = {
            isOpen: true,
            x: newX,
            y: newY,
            options: options,
            target: newTarget,
          };
        }, ANIMATION_DURATION + 10);
      } else {
        this.contextMenu = {
          isOpen: true,
          x: newX,
          y: newY,
          options: options,
          target: newTarget,
        };
      }
    },
    handleMenuClick(action) {
      const { id, title, componentId } = this.contextMenu.target;

      if (action === "open") {
        this.openWindow({ id, title, componentId });
      } else if (action === "close") {
        this.closeWindow(id);
      }

      this.closeContextMenu();
    },
    closeContextMenu() {
      this.contextMenu.isOpen = false;
    },
    closeAllPopups(event) {
      const isCreditsPopover = event.target.closest(".ai-credits-anchor");
      if (!isCreditsPopover) this.show_credits_dropdown = false;

      const isStartButton = event.target.closest(".header-button.home");
      if (isStartButton) {
        return;
      }

      const isModal = event.target.closest(
        ".kadem-modal-overlay, .kadem-modal-card, .modal-wrapper-fixed, .modal-overlay, .video-modal-overlay, .lyrics-modal-overlay, [role='dialog']"
      );
      if (isModal) {
        return;
      }

      this.closeContextMenu();
      this.closeStartMenu();
    },
    handleWindowClick(id, title, componentId) {
      const windowStore = useWindowStore();
      const window = this.currentUserWindows[id];

      if (window) {
        if (window.isMinimized) {
          windowStore.restoreWindow(id);
        } else {
          if (this.activeWindowId === id) {
            this.minimizeWindow(id);
          } else {
            this.focusWindow(id);
          }
        }
      } else {
        this.openWindow({ id, title, componentId });
      }
    },
    openSystem() {
      this.toggleStartMenu();
    },
  },
  watch: {
    user: {
      deep: true,
      handler(val) {
        if (val?.id) {
          useAiCreditsStore().fetchUsage(true);
        }
      },
    },
  },
  mounted() {
    document.addEventListener("mousedown", this.closeAllPopups);
    useAiCreditsStore().fetchUsage();
  },
  beforeUnmount() {
    document.removeEventListener("mousedown", this.closeAllPopups);
    if (this.contextMenuTimer) {
      clearTimeout(this.contextMenuTimer);
    }
  },
};
</script>
<style>
.plan-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--plan-pill-bg);
  border: 1px solid var(--plan-pill-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  transition: all var(--transition-base);
  height: 34px;
  margin-right: 6px;
  white-space: nowrap;
}

.plan-pill:hover {
  background: var(--surface-3);
  transform: translateY(-1px);
  box-shadow: var(--shadow-xs);
}

.plan-pill .status-dot {
  width: 7px;
  height: 7px;
  background-color: var(--gray-300);
  border-radius: 50%;
  flex-shrink: 0;
}

.plan-pill.is-pro {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), var(--surface-2));
  border-color: rgba(212, 175, 55, 0.4);
}

.plan-pill.is-pro .status-dot {
  background: linear-gradient(135deg, #ffd700, #d4af37);
  box-shadow: 0 0 6px rgba(212, 175, 55, 0.7);
}

.plan-pill {
  width: auto !important;
  min-width: auto !important;
  max-width: none !important;
}

@media (max-width: 1100px) {
  .start-menu {
    left: var(--space-3) !important;
    width: 90% !important;
    max-width: 450px !important;
  }
}
</style>
<style scoped>
.header-wrapper {
  position: relative;
  z-index: 9000;
  width: 100%;
  margin: 0 auto;
}

header {
  background: var(--header-bg) !important;
  border-bottom: 1px solid var(--header-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  min-width: fit-content;
  width: 100%;
  position: relative;
  margin: 0 auto;
  user-select: none;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition: background var(--transition-base), border-color var(--transition-base);

  & button {
    width: 52px;
    height: 52px;
    min-width: 52px;
    min-height: 52px;
    max-width: 52px;
    max-height: 52px;
    padding: var(--space-3);
    cursor: pointer;
    background: none;
    border-radius: var(--radius-sm);
    border: none;
    margin: var(--space-2);
    transition: background var(--transition-base);
    position: relative;
    display: grid;
    place-items: center;

    &:hover,
    &.opened,
    &.active {
      background: var(--header-btn-hover);
    }

    &:not(.home).opened::after,
    &:not(.home).active::after {
      content: "";
      width: 36%;
      height: 3px;
      border-radius: 2px;
      background: var(--gray-300);
      position: absolute;
      bottom: 5px;
      left: 0;
      right: 0;
      margin: auto;
      transition: background var(--transition-base), width var(--transition-base);
    }

    &.active::after {
      background: var(--deep-blue-2) !important;
      width: 50%;
    }
  }

  & img {
    width: 78%;
  }
}

.ai-credits-anchor {
  position: absolute;
  top: 50%;
  right: clamp(var(--space-4), 2vw, var(--space-7));
  z-index: 3;
  transform: translateY(-50%);
}

.ai-credits-anchor .ai-credits-badge {
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: calc(var(--space-2) + var(--space-1) + var(--space-1)) var(--space-3) !important;
  display: inline-flex !important;
  align-items: center;
  gap: calc(var(--space-2) + var(--space-1) + var(--space-1));
  border: 0 !important;
  border-radius: var(--radius-xs) !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text-secondary);
  font-size: var(--fontsize-sx);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ai-credits-anchor .ai-credits-badge:hover,
.ai-credits-anchor .ai-credits-badge[aria-expanded="true"] {
  background: var(--header-btn-hover) !important;
  color: var(--text-primary);
}

.ai-credits-badge .ai-pill-icon {
  color: #a78bfa;
  font-size: var(--fontsize-xs);
}

.ai-credits-badge.zero-credits .ai-pill-icon {
  color: var(--text-muted);
}

.ai-credits-chevron {
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  transition: transform var(--transition-fast);
}

.ai-credits-badge[aria-expanded="true"] .ai-credits-chevron {
  transform: rotate(180deg);
}

.ai-credits-popover {
  position: absolute;
  top: calc(100% + var(--space-4));
  right: 0;
  width: min(340px, calc(100vw - var(--space-7)));
  padding: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  box-shadow: var(--shadow-elevated);
  color: var(--text-primary);
  user-select: text;
  cursor: default;
}

.credits-popover-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.credits-eyebrow {
  color: #a78bfa;
  font-size: var(--fontsize-xs);
  font-weight: 800;
  letter-spacing: 0.09em;
}

.credits-popover-heading h2 {
  margin: var(--space-2) 0 0;
  color: var(--text-primary);
  font-size: var(--fontsize-sm);
  font-weight: 750;
}

.ai-credits-anchor .credits-close {
  width: calc(var(--space-7) + var(--space-2)) !important;
  height: calc(var(--space-7) + var(--space-2)) !important;
  min-width: calc(var(--space-7) + var(--space-2)) !important;
  min-height: calc(var(--space-7) + var(--space-2)) !important;
  max-width: calc(var(--space-7) + var(--space-2)) !important;
  max-height: calc(var(--space-7) + var(--space-2)) !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: var(--radius-xs) !important;
  background: transparent !important;
  color: var(--text-muted);
  cursor: pointer;
}

.ai-credits-anchor .credits-close:hover {
  background: var(--surface-2) !important;
  color: var(--text-primary);
}

.credits-balance {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.credits-balance strong {
  font-size: var(--fontsize-lg);
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.credits-balance span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.credits-usage-line,
.credits-progress-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--fontsize-xs);
}

.credits-usage-line {
  margin-bottom: var(--space-3);
}

.credits-usage-line span,
.credits-progress-caption {
  color: var(--text-secondary);
}

.credits-usage-line strong {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.credits-progress-track {
  width: 100%;
  height: var(--space-3);
  overflow: hidden;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
}

.credits-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8d5fd3 0%, #e25373 100%);
  transition: width var(--transition-base);
}

.credits-progress-caption {
  margin-top: calc(var(--space-3) - var(--space-1));
  font-size: var(--fontsize-xs);
}

.credits-shared-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin: var(--space-5) 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.credits-shared-note svg {
  margin-top: var(--space-2);
  color: #a78bfa;
}

.ai-credits-anchor .credits-plan-link {
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  min-height: var(--space-9) !important;
  max-height: none !important;
  margin: 0 !important;
  padding: var(--space-3) var(--space-3) !important;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-sm) !important;
  background: var(--surface-1) !important;
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-weight: 650;
  cursor: pointer;
}

.ai-credits-anchor .credits-plan-link:hover {
  background: var(--surface-2) !important;
}

@media (max-width: 1100px) {
  .header-wrapper {
    width: 100%;
  }

  header {
    padding: 0 var(--space-3);
    box-sizing: border-box;
  }
}

@media (max-width: 600px) {
  .ai-credits-anchor {
    right: var(--space-2);
  }

  .ai-credits-anchor .ai-credits-badge {
    gap: var(--space-2);
    padding: var(--space-3) var(--space-2) !important;
    font-size: var(--fontsize-xs);
  }
}
</style>
