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
    <Transition name="popup-anim">
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
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--deep-blue);
  transition: all 0.2s ease;
  height: 36px;
  margin-right: 8px;
}

.plan-pill:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-1px);
}

.plan-pill .status-dot {
  width: 8px;
  height: 8px;
  background-color: var(--gray-600);
  border-radius: 50%;
}

.plan-pill.is-pro {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 255, 255, 0.4));
  border-color: rgba(212, 175, 55, 0.3);
}

.plan-pill.is-pro .status-dot {
  background-color: #d4af37;
  box-shadow: 0 0 5px rgba(212, 175, 55, 0.6);
}

.popup-anim-enter-active,
.popup-anim-leave-active {
  transition: opacity 0.15s ease, max-height 0.15s ease;
  overflow: hidden;
}

.popup-anim-enter-from,
.popup-anim-leave-to {
  opacity: 0;
  max-height: 0px;
}

.popup-anim-enter-to,
.popup-anim-leave-from {
  opacity: 1;
  max-height: 70vh;
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
  background: rgba(206, 179, 134, 0.24) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  min-width: fit-content;
  width: 100%;
  margin: 0 auto;
  user-select: none;

  & button {
    width: 54px;
    height: 54px;
    min-width: 54px;
    min-height: 54px;
    max-width: 54px;
    max-height: 54px;
    padding: var(--space-3);
    cursor: pointer;
    background: none;
    border-radius: var(--radius-md);
    border: none;
    margin: var(--space-2);
    transition: all 0.2s ease-in-out;
    position: relative;
    display: grid;
    place-items: center;

    &:hover,
    &.opened,
    &.active {
      background: #d4cbbc;
    }

    &:not(.home).opened::after,
    &:not(.home).active::after {
      content: "";
      width: 40%;
      height: 4px;
      border-radius: 2px;
      background: var(--gray-300);
      position: absolute;
      bottom: 5px;
      left: 0;
      right: 0;
      margin: auto;
      transition: all 0.2s ease-in-out;
    }

    &.active::after {
      background: var(--deep-blue-2) !important;
    }
  }

  & img {
    width: 80%;
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
