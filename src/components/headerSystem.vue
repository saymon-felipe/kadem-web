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
    };
  },
  computed: {
    ...mapState(useWindowStore, ["currentUserWindows", "activeWindowId"]),
    ...mapState(useAppStore, ["isStartMenuOpen"]),
    ...mapState(useAuthStore, ["user"]),
    is_pro() {
      if (!this.user) return false;
      return this.user.plan_tier && this.user.plan_tier !== "free";
    },

    plan_label() {
      return this.is_pro ? "Pro" : "Free";
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
      const isStartButton = event.target.closest(".header-button.home");
      if (isStartButton) {
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
  mounted() {
    document.addEventListener("mousedown", this.closeAllPopups);
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

@media (max-width: 1100px) {
  .header-wrapper {
    width: 100%;
  }

  header {
    padding: 0 var(--space-3);
    box-sizing: border-box;
  }
}
</style>
