<template>
  <div class="header-wrapper">
    <header class="glass">
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
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useWindowStore } from "@/stores/windows";
import { useAppStore } from "@/stores/app";
import ContextMenu from "./ContextMenu.vue";
import StartMenu from "./startMenu/StartMenu.vue";

const ANIMATION_DURATION = 150;

export default {
  components: {
    ContextMenu,
    StartMenu,
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
    };
  },
  computed: {
    ...mapState(useWindowStore, ["currentUserWindows", "activeWindowId"]),
    ...mapState(useAppStore, ["isStartMenuOpen"]),
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
