import { defineStore } from "pinia";
import { api } from "../plugins/api";
import router from "../router/index";
import { useWindowStore } from "./windows";
import { useUtilsStore } from "./utils";
import { syncService } from "../services/syncService";
import { useProjectStore } from "./projects";
import { useVaultStore } from "./vault";
import { useAppStore } from "./app";
import { useKanbanStore } from "./kanban";
import { useRadioStore } from "./radio";
import { usePlayerStore } from "./player";

import {
  userRepository,
  occupationRepository,
  medalRepository,
  syncQueueRepository,
  projectRepository,
  accountsRepository,
  kanbanRepository,
  radioRepository,
} from "../services/localData";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: {},
    isAuthenticated: null,
    token: null,
    lastSyncTimestamp: localStorage.getItem("kadem_user_last_sync") || null,
  }),
  getters: {
    isLoggedIn: (state) => state.isAuthenticated === true,
    getToken: (state) => state.token
  },
  actions: {
    async requestPasswordReset(email) {
      try {
        const response = await api.post("/auth/request_reset_password", { email });

        return response.data.message;
      } catch (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        throw error;
      }
    },
    async login(email, password, invite_token) {
      try {
        const response = await api.post("/auth/login", { email, password, invite_token });
        const { token, user } = response.data;

        if (token) {
          this.token = token;
        }

        await this._saveUserData(user);
        return response;
      } catch (error) {
        this.user = {};
        this.isAuthenticated = false;
        throw error;
      }
    },

    async register(userData) {
      try {
        let response = await api.post("/auth/register", userData);
        return response;
      } catch (error) {
        throw error;
      }
    },

    async checkPendingChanges() {
      try {
        const pending = await syncQueueRepository.getPendingTasks();
        return {
          hasPending: pending.length > 0,
          count: pending.length,
        };
      } catch (error) {
        console.error("Erro ao verificar fila de sync:", error);
        return { hasPending: false, count: 0 };
      }
    },

    async logout(force = false, not_redirect = false) {
      const windowStore = useWindowStore();
      const appStore = useAppStore();
      const projectStore = useProjectStore();
      const kanbanStore = useProjectStore();
      const vaultStore = useVaultStore();
      const radioStore = useRadioStore();
      const playerStore = usePlayerStore();
      const userIdToClear = this.user?.id;

      try {
        if (!force) {
          await api.post("/auth/logout");
        }
      } catch (error) {
        console.warn("Erro ao chamar API de logout, deslogando localmente.", error);
      } finally {
        appStore.closeStartMenu();

        if (userIdToClear) {
          windowStore.clearWindowsForUser(userIdToClear);
        }

        await Promise.all([
          userRepository.clearLocalProfile(),
          occupationRepository.clearLocalUserOccupations(),
          medalRepository.clearLocalMedals(),
          syncQueueRepository.clearSyncQueue(),
          projectRepository.clearLocalProjects(),
          accountsRepository.clearLocalAccounts(),
          kanbanRepository.clearLocalKanban(),
          radioRepository.clearLocalData(),
        ]);

        this.user = {};
        this.isAuthenticated = false;
        this.lastSyncTimestamp = null;
        projectStore.projects = [];
        projectStore.lastSyncTimestamp = null;
        projectStore.active_project_id = null;
        projectStore.is_populating_offline_cache = false;
        projectStore.lastSyncTimestamp = null;
        kanbanStore.columns = {};
        kanbanStore.tasks = {};
        kanbanStore.lastSyncs = null;
        vaultStore.lockVault();
        radioStore.clearState();
        playerStore.clearState();
        localStorage.removeItem("kadem_user_last_sync");
        localStorage.removeItem("kadem_vault_last_sync");
        localStorage.removeItem("kadem_projects_last_sync");
        localStorage.removeItem("kadem_kanban_syncs");

        if (!not_redirect) {
          router.push("/auth");
        }
      }
    },
    async checkAuthStatus(recursive = false) {
      try {
        const localUser = await userRepository.getLocalUserProfile();
        const projectStore = useProjectStore();
        const vaultStore = useVaultStore();
        const radioStore = useRadioStore();
        const playerStore = usePlayerStore();

        if (navigator.onLine) {
          try {
            await this.syncProfile(recursive);
            await syncService.processSyncQueue();

            if (recursive) {
              const kanbanStore = useKanbanStore();

              await projectStore.pullProjects();
              await vaultStore.pullAccounts();
              await kanbanStore.syncAllBoards();
              await radioStore.pullPlaylists();
              await playerStore.pullPlayerState();
            }
          } catch (syncError) {
            console.error("Falha na orquestração PUSH-PULL:", syncError);
          }
        } else {
          if (localUser) {
            const localOccupations = await occupationRepository.getLocalUserOccupations();
            const localMedals = await medalRepository.getLocalMedals();

            await projectStore._loadProjectsFromDB();
            await vaultStore.loadAccountsFromDB();
            await radioStore._loadFromDB();

            this.user = {
              ...localUser,
              occupations: localOccupations,
              medals: localMedals,
            };

            this.isAuthenticated = true;
          }
        }
      } catch (error) {
        this.user = {};
        this.isAuthenticated = false;
      }
    },
    async _loadLocalUserToState() {
      try {
        const localUser = await userRepository.getLocalUserProfile();
        if (localUser) {
          const localOccupations = await occupationRepository.getLocalUserOccupations();
          const localMedals = await medalRepository.getLocalMedals();

          this.user = {
            ...localUser,
            occupations: localOccupations,
            medals: localMedals,
          };
          this.isAuthenticated = true;
          return true;
        }
      } catch (err) {
        console.error("Erro ao carregar usuário local:", err);
      }
      return false;
    },
    async syncProfile(recursive = false) {
      const hasLocalData = await this._loadLocalUserToState();

      try {
        const params = {};
        if (this.lastSyncTimestamp) {
          params.since = this.lastSyncTimestamp;
        }

        const response = await api.get("/users/profile", { params });
        const { user: remoteUser, server_timestamp, token } = response.data;

        this.token = token;

        if (remoteUser) {
          await this._saveUserData(remoteUser);
        } else if (!hasLocalData) {
          await this._loadLocalUserToState();
        }

        if (server_timestamp) {
          this.lastSyncTimestamp = server_timestamp;
          localStorage.setItem("kadem_user_last_sync", server_timestamp);
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          this.logout(true);
        } else {
          console.warn("Falha ao sincronizar perfil. Usando dados locais.", error);
          await this._loadLocalUserToState();
        }
      }

      if (recursive) {
        setTimeout(() => {
          this.syncProfile();
        }, 15 * 60 * 1000); // 15 minutos
      }
    },
    async _saveUserData(apiUserData) {
      const { occupations, medals, ...profileData } = apiUserData;

      await userRepository.saveLocalUserProfile(profileData);
      await occupationRepository.mergeApiOccupations(occupations || []);
      await medalRepository.setLocalMedals(medals || []);

      const mergedOccupations = await occupationRepository.getLocalUserOccupations();
      const mergedMedals = await medalRepository.getLocalMedals();

      this.user = {
        ...profileData,
        occupations: mergedOccupations,
        medals: mergedMedals,
      };
      this.isAuthenticated = true;
    },
    async updateUserBio(newBio) {
      const currentUser = this.user;
      const { occupations, medals, ...profileData } = currentUser;
      const updatedProfileData = { ...profileData, bio: newBio };
      const updatedUserForState = { ...updatedProfileData, occupations, medals };

      try {
        await userRepository.saveLocalUserProfile(updatedProfileData);
        this.setUser(updatedUserForState);

        await syncQueueRepository.addSyncQueueTask({
          type: "SYNC_PROFILE_CHANGE",
          payload: {
            field: "bio",
            value: newBio,
            timestamp: new Date().toISOString(),
          },
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
        });

        syncService.processSyncQueue();
      } catch (error) {
        console.error("Falha ao salvar bio localmente:", error);
      }
    },
    async addNewOccupation(occupationName) {
      if (!occupationName || occupationName.trim() === "") return;

      const newOccupationData = {
        name: occupationName,
        id: null,
      };

      try {
        const newLocalId = await occupationRepository.addLocalUserOccupation(
          newOccupationData
        );

        await syncQueueRepository.addSyncQueueTask({
          type: "CREATE_OCCUPATION",
          payload: {
            name: occupationName,
          },
          timestamp: new Date().toISOString(),
        });

        this.user.occupations.push({
          ...newOccupationData,
          localId: newLocalId,
        });

        syncService.processSyncQueue();
      } catch (error) {
        console.error("Falha ao adicionar ocupação local:", error);
      }
    },

    async removeOccupation(occupation) {
      try {
        await occupationRepository.deleteLocalUserOccupation(occupation.localId);

        if (occupation.id) {
          await syncQueueRepository.addSyncQueueTask({
            type: "DELETE_OCCUPATION",
            payload: {
              id: occupation.id,
            },
            timestamp: new Date().toISOString(),
          });
        }

        this.user.occupations = this.user.occupations.filter(
          (o) => o.localId !== occupation.localId
        );

        syncService.processSyncQueue();
      } catch (error) {
        console.error("Falha ao remover ocupação local:", error);
      }
    },
    setUser(user) {
      this.user = user;
    },
  },
});
