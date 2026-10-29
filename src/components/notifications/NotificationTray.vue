<template>
  <div class="notification-tray-anchor" ref="trayAnchor">
    <!-- Botão do Tray na Barra de Tarefas -->
    <button
      type="button"
      ref="trayButton"
      class="tray-button"
      :class="{
        'is-open': isTrayOpen,
        'pulse-attention': shouldShowAttention,
        'has-unread': unreadCount > 0,
        'is-disabled': !isEnabled,
      }"
      :title="trayTooltip"
      :aria-label="trayTooltip"
      aria-haspopup="dialog"
      :aria-expanded="isTrayOpen"
      @click.stop="toggleTray"
      @contextmenu.prevent.stop="openContextMenu($event)"
      @keydown.esc.stop.prevent="closeTray"
    >
      <font-awesome-icon
        :icon="isEnabled ? 'bell' : 'bell-slash'"
        class="tray-icon"
        :class="{ 'icon-disabled': !isEnabled }"
      />

      <!-- Badge de contagem de não lidas -->
      <span
        v-if="unreadCount > 0"
        class="tray-badge"
        :class="{ 'high-count': unreadCount > 9 }"
        aria-hidden="true"
      >
        {{ unreadCount > 99 ? "99+" : unreadCount }}
      </span>
    </button>

    <!-- Context Menu no botão direito (teleportado para o body) -->
    <Teleport to="body">
      <Transition name="popup-anim">
        <ContextMenu
          v-if="showContextMenu"
          :options="contextMenuOptions"
          :x="contextMenuPos.x"
          :y="contextMenuPos.y"
          @menu-click="handleContextMenuAction"
        />
      </Transition>
    </Teleport>

    <!-- 1. MODO MODAL RESPONSIVO (MOBILE <= 768px): Usa o BaseModal oficial do sistema -->
    <BaseModal
      v-if="isMobileView"
      :model-value="isTrayOpen"
      size="md"
      :show-header="false"
      mobile-variant="bottom-sheet"
      custom-class="tray-base-modal"
      body-class="tray-modal-body-reset"
      @close="closeTray"
    >
      <NotificationContent
        :is-mobile="true"
        @close="closeTray"
        @open-settings="openPrivacySettings"
      />
    </BaseModal>

    <!-- 2. MODO DROPDOWN ANCORADO NO DESKTOP (> 768px): Popover fluido abaixo da barra -->
    <Teleport to="body">
      <Transition name="tray-desktop-fade">
        <div
          v-if="isTrayOpen && !isMobileView"
          class="tray-dropdown-popover glass"
          :style="desktopStyle"
          role="dialog"
          aria-modal="false"
          aria-label="Central de notificações"
          @click.stop
          @keydown.esc.stop.prevent="closeTray"
        >
          <NotificationContent
            :is-mobile="false"
            @close="closeTray"
            @open-settings="openPrivacySettings"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useNotificationStore } from "@/stores/notifications";
import { useAppStore } from "@/stores/app";
import BaseModal from "@/components/BaseModal.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import NotificationContent from "@/components/notifications/NotificationContent.vue";
import { mobileNavigationMixin } from "@/utils/mobileNavigation";

export default {
  name: "NotificationTray",
  mixins: [mobileNavigationMixin],
  mobileBackPriority: 35,
  components: {
    BaseModal,
    ContextMenu,
    NotificationContent,
  },
  data() {
    return {
      showContextMenu: false,
      contextMenuPos: { x: 0, y: 0 },
      isMobileView: typeof window !== "undefined" ? window.innerWidth <= 768 : false,
      desktopStyle: {},
      mediaQueryList: null,
      mediaQueryListener: null,
    };
  },
  computed: {
    ...mapState(useNotificationStore, [
      "isTrayOpen",
      "unreadCount",
      "isEnabled",
      "shouldShowAttention",
    ]),
    mobile_back_active() {
      // BaseModal gerencia o histórico de mobile no modo mobile automaticamente;
      // o mixin aqui cobre o menu de contexto ou o popover desktop.
      return this.showContextMenu || (!this.isMobileView && this.isTrayOpen);
    },
    trayTooltip() {
      if (!this.isEnabled) {
        return "Notificações pausadas ou desativadas";
      }
      if (this.unreadCount > 0) {
        return `Notificações: ${this.unreadCount} ${this.unreadCount === 1 ? "não lida" : "não lidas"}`;
      }
      return "Notificações do sistema";
    },
    contextMenuOptions() {
      const options = [];
      if (this.isEnabled) {
        options.push({
          label: "Pausar notificações",
          icon: "bell-slash",
          action: "toggle",
        });
      } else {
        options.push({
          label: "Ativar notificações",
          icon: "bell",
          action: "toggle",
        });
      }

      if (this.unreadCount > 0) {
        options.push({
          label: "Marcar todas como lidas",
          icon: "check",
          action: "readAll",
        });
      }

      options.push({
        label: "Configurações de privacidade...",
        icon: "shield-halved",
        action: "settings",
      });

      return options;
    },
  },
  methods: {
    mobile_back() {
      if (this.showContextMenu) {
        this.showContextMenu = false;
      } else {
        this.closeTray();
      }
    },
    ...mapActions(useNotificationStore, [
      "toggleTray",
      "closeTray",
      "markAllAsRead",
      "toggleEnabled",
    ]),
    openContextMenu(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      this.contextMenuPos = {
        x: Math.min(window.innerWidth - 200, Math.max(10, rect.left)),
        y: rect.bottom + 6,
      };
      this.showContextMenu = true;
    },
    async handleContextMenuAction(action) {
      this.showContextMenu = false;
      if (action === "toggle") {
        await this.toggleEnabled();
      } else if (action === "readAll") {
        await this.markAllAsRead();
      } else if (action === "settings") {
        this.openPrivacySettings();
      }
    },
    openPrivacySettings() {
      this.closeTray();
      const appStore = useAppStore();
      appStore.openStartMenu("privacy");
    },
    updatePosition() {
      if (this.isMobileView) return;
      const trigger = this.$refs.trayButton;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 380;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));

      this.desktopStyle = {
        position: "fixed",
        top: `${rect.bottom + 8}px`,
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 100002,
      };
    },
    handleGlobalClick(event) {
      if (this.showContextMenu) {
        const isMenu = event.target.closest(".context-menu");
        if (!isMenu) this.showContextMenu = false;
      }

      if (this.isTrayOpen && !this.isMobileView) {
        const isTrayButton = this.$refs.trayButton && this.$refs.trayButton.contains(event.target);
        const isPopover = event.target.closest(".tray-dropdown-popover");
        const isContextMenu = event.target.closest(".context-menu");
        if (!isTrayButton && !isPopover && !isContextMenu) {
          this.closeTray();
        }
      }
    },
  },
  watch: {
    isTrayOpen(isOpen) {
      if (isOpen) {
        this.$nextTick(() => {
          this.updatePosition();
        });
      }
    },
  },
  mounted() {
    document.addEventListener("mousedown", this.handleGlobalClick);
    window.addEventListener("resize", this.updatePosition, { passive: true });
    window.addEventListener("scroll", this.updatePosition, { passive: true, capture: true });

    if (typeof window !== "undefined" && window.matchMedia) {
      this.mediaQueryList = window.matchMedia("(max-width: 768px)");
      this.isMobileView = this.mediaQueryList.matches;
      this.mediaQueryListener = (e) => {
        this.isMobileView = e.matches;
        if (this.isTrayOpen) {
          this.updatePosition();
        }
      };
      if (this.mediaQueryList.addEventListener) {
        this.mediaQueryList.addEventListener("change", this.mediaQueryListener);
      } else {
        this.mediaQueryList.addListener(this.mediaQueryListener);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener("mousedown", this.handleGlobalClick);
    window.removeEventListener("resize", this.updatePosition);
    window.removeEventListener("scroll", this.updatePosition, true);

    if (this.mediaQueryList && this.mediaQueryListener) {
      if (this.mediaQueryList.removeEventListener) {
        this.mediaQueryList.removeEventListener("change", this.mediaQueryListener);
      } else {
        this.mediaQueryList.removeListener(this.mediaQueryListener);
      }
    }
  },
};
</script>

<style scoped>
.notification-tray-anchor {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6px;
  display: flex;
  align-items: center;
  z-index: 10;
}

/* Botão do Tray */
.tray-button {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
  padding: 0 !important;
  border: 1px solid var(--plan-pill-border) !important;
  border-radius: var(--radius-sm) !important;
  background: var(--plan-pill-bg) !important;
  color: var(--text-primary);
  display: grid !important;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-base);
  user-select: none;
}

.tray-button:hover,
.tray-button.is-open {
  background: var(--header-btn-hover) !important;
  transform: translateY(-1px);
}

.tray-icon {
  font-size: 1.05rem;
  color: var(--text-primary);
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.tray-icon.icon-disabled {
  color: var(--text-muted);
  opacity: 0.75;
}

/* Badge no ícone */
.tray-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: #355afd;
  background-image: linear-gradient(135deg, #355afd, #243fb8);
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--surface-0);
  box-shadow: 0 2px 5px rgba(53, 90, 253, 0.4);
  line-height: 1;
}

.tray-badge.high-count {
  padding: 0 5px;
}

/* Animação intermitente elegante */
@keyframes intermittent-bell-ring {
  0%, 72%, 100% {
    transform: scale(1) rotate(0deg);
    filter: none;
  }
  75% {
    transform: scale(1.15) translateY(-3px) rotate(-14deg);
    filter: drop-shadow(0 0 6px rgba(53, 90, 253, 0.6));
  }
  79% {
    transform: scale(1.15) translateY(-1px) rotate(14deg);
    filter: drop-shadow(0 0 8px rgba(53, 90, 253, 0.75));
  }
  83% {
    transform: scale(1.08) translateY(-2px) rotate(-8deg);
    filter: drop-shadow(0 0 5px rgba(53, 90, 253, 0.5));
  }
  87% {
    transform: scale(1.04) translateY(-1px) rotate(6deg);
  }
  91% {
    transform: scale(1) translateY(0) rotate(0deg);
    filter: none;
  }
}

.tray-button.pulse-attention {
  animation: intermittent-bell-ring 4.8s ease-in-out infinite;
}

/* Reset do padding do corpo do BaseModal no mobile */
:deep(.tray-modal-body-reset) {
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

/* ========================================================
   MODO DROPDOWN ANCORADO NO DESKTOP (> 768px)
   ======================================================== */
.tray-dropdown-popover {
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--glass-border) !important;
  background: var(--surface-0) !important;
  box-shadow: var(--shadow-float) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  user-select: text;
}

/* Animações Desktop */
.tray-desktop-fade-enter-active,
.tray-desktop-fade-leave-active {
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.tray-desktop-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.tray-desktop-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.tray-desktop-fade-enter-to,
.tray-desktop-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
