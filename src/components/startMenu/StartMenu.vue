<template>
  <div class="start-menu glass" @mousedown.stop>
    <div class="start-menu-content">
      <div class="start-menu-header">
        <avatarComponent :user="user" />
        <div class="header-actions">
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'"
          >
            <font-awesome-icon :icon="isDark ? 'sun' : 'moon'" />
          </button>
          <div class="ui-hover" @click="handleLogoutClick" title="Sair do Sistema">
            <font-awesome-icon icon="right-from-bracket" class="logout" />
          </div>
        </div>
      </div>

      <nav class="tab-navigation">
        <button
          v-for="(tab, index) in visibleTabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTabIndex === tab.originalIndex }]"
          @click="setActiveTab(tab.id, tab.originalIndex)"
        >
          {{ tab.name }}
        </button>
      </nav>

      <div class="tab-viewport">
        <div class="tabs-track" :style="trackStyle" ref="tabsTrack">
          <div
            class="tab-pane"
            v-for="(tab, index) in tabs"
            :key="tab.id"
            role="tabpanel"
            :aria-hidden="activeTabIndex !== index"
          >
            <component
              :is="tab.component"
              @request-new-group="openCreateProject"
              @request-edit-group="openEditProject"
              @cancel-new-group="closeProjectView"
              :projectToEdit="projectToEdit"
            />
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal
      v-model="showSyncWarning"
      :message="isOffline ? 'Aviso de Segurança (Offline)' : 'Alterações não salvas!'"
      :description="syncWarningMessage"
      :confirmText="isOffline ? 'Sair e Fechar' : 'Sair e Perder Dados'"
      @cancelled="showSyncWarning = false"
      @confirmed="logout(true)"
    />
  </div>
</template>

<script>
import avatarComponent from "../avatarComponent.vue";
import { mapState, mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useUtilsStore } from "@/stores/utils";
import { useAppStore } from "@/stores/app";

import MainInformations from "./MainInformations.vue";
import Configuration from "./Configuration.vue";
import AccountCenter from "./AccountCenter/AccountCenter.vue";
import NewProject from "./NewProject.vue";
import ConfirmationModal from "../ConfirmationModal.vue";

export default {
  components: {
    avatarComponent,
    MainInformations,
    Configuration,
    AccountCenter,
    NewProject,
    ConfirmationModal,
  },
  data() {
    return {
      activeTab: "main",
      activeTabIndex: 0,

      showSyncWarning: false,
      pendingCount: 0,

      tabs: [
        {
          id: "main",
          name: "Informações principais",
          component: MainInformations,
          isNav: true,
        },
        { id: "config", name: "Configurações", component: Configuration, isNav: true },
        {
          id: "accounts",
          name: "Central de contas",
          component: AccountCenter,
          isNav: true,
        },
        { id: "new-group", name: "Criar Grupo", component: NewProject, isNav: false },
      ],
      animationDuration: 350,
      projectToEdit: null,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useAppStore, ["isDark"]),

    isOffline() {
      return !this.connection.connected;
    },

    visibleTabs() {
      return this.tabs
        .map((tab, index) => ({ ...tab, originalIndex: index }))
        .filter((tab) => tab.isNav);
    },
    trackWidth() {
      return `${this.tabs.length * 100}%`;
    },
    translatePercent() {
      const step = 100 / this.tabs.length;
      return -(this.activeTabIndex * step);
    },
    trackStyle() {
      return {
        width: this.trackWidth,
        transform: `translateX(${this.translatePercent}%)`,
        transition: `transform ${this.animationDuration}ms cubic-bezier(.22,.9,.36,1)`,
      };
    },

    syncWarningMessage() {
      let msg = "";

      if (this.pendingCount > 0) {
        msg += `Você possui ${this.pendingCount} alterações pendentes que serão PERDIDAS se sair agora.\n\n`;
      }

      if (this.isOffline) {
        msg += `<span style="font-size: 1em; opacity: 0.8">O sistema não consegue encerrar sua sessão no servidor sem internet.</span><br><br>`;
        msg += `Se este for um computador público, <strong>FECHE O NAVEGADOR</strong> após sair para garantir sua segurança.`;
      }

      return msg;
    },
  },
  methods: {
    ...mapActions(useAuthStore, ["checkPendingChanges", "logout"]),
    toggleTheme() {
      const appStore = useAppStore();
      appStore.toggleTheme();
    },
    logout() {
      this.$router.push("/logout");
    },
    setActiveTab(tabId, newIndex) {
      if (this.activeTabIndex === newIndex) return;
      this.activeTab = tabId;
      this.activeTabIndex = newIndex;
    },
    setActiveTabById(tabId) {
      const newIndex = this.tabs.findIndex((tab) => tab.id === tabId);

      if (newIndex !== -1 && this.activeTabIndex !== newIndex) {
        this.setActiveTab(tabId, newIndex);
      }
    },
    openCreateProject() {
      this.projectToEdit = null;
      this.setActiveTabById("new-group");
    },
    openEditProject(projectPayload) {
      this.projectToEdit = projectPayload;
      this.setActiveTabById("new-group");
    },
    closeProjectView() {
      this.setActiveTabById("main");
      this.projectToEdit = null;
    },

    async handleLogoutClick() {
      let hasPending = false;

      if (this.checkPendingChanges) {
        const check = await this.checkPendingChanges();
        if (check && check.hasPending) {
          this.pendingCount = check.count;
          hasPending = true;
        }
      }

      if (hasPending || this.isOffline) {
        if (!hasPending) this.pendingCount = 0;
        this.showSyncWarning = true;
      } else {
        this.logout();
      }
    },
  },
};
</script>

<style scoped>
.start-menu {
  position: fixed;
  z-index: 9000;
  top: 82px;
  left: 50% !important;
  transform: translateX(-50%);
  height: calc(100dvh - 94px);
  max-height: calc(100dvh - 94px);
  width: min(680px, 97dvw) !important;
  max-width: min(680px, 97dvw) !important;
  padding: var(--space-5);
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-float);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
  transition: background var(--transition-base);
}

.start-menu-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

.start-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.theme-toggle {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1rem;
  transition: all var(--transition-base);
}

.theme-toggle:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  transform: rotate(15deg);
}

.start-menu-header .ui-hover .logout {
  font-size: var(--fontsize-md);
  color: var(--text-secondary);
}

.tab-navigation {
  display: flex;
  gap: var(--space-6);
  margin-top: var(--space-6);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}

.tab-button {
  background: none;
  border: none;
  padding: var(--space-3) 0;
  font-size: var(--fontsize-sx);
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  position: relative;
  transition: color var(--transition-fast);
  white-space: nowrap;
}

.tab-button.active {
  color: var(--text-primary);
  font-weight: 600;
}

.tab-button.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--deep-blue);
  border-radius: 2px 2px 0 0;
  animation: tab-slide-in 0.2s var(--transition-spring);
}

@keyframes tab-slide-in {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.tab-button:hover {
  color: var(--text-primary);
}

.tab-viewport {
  position: relative;
  width: 100%;
  height: calc(100% - 130px);
  overflow: hidden;
}

.tabs-track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.tab-pane {
  width: calc(100% / 1);
  flex: 0 0 calc(100% / 1);
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-right: var(--space-3);
  box-sizing: border-box;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--gray-300) transparent;
}

.tabs-track > .tab-pane {
  width: calc(100% / 4);
  flex: 0 0 calc(100% / 4);
}

.tab-pane::-webkit-scrollbar {
  width: 5px;
}

.tab-pane::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

/* Start Menu Windows 11-style transition */
.start-menu-anim-enter-active,
.start-menu-anim-leave-active {
  transition: opacity var(--transition-medium, 0.2s), transform var(--transition-spring, 0.35s cubic-bezier(0.2, 0.8, 0.2, 1));
}
.start-menu-anim-enter-from,
.start-menu-anim-leave-to {
  opacity: 0;
  transform: translate(-50%, -30px) scale(0.95);
}
.start-menu-anim-enter-to,
.start-menu-anim-leave-from {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
</style>
