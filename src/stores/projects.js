// src/stores/projects.js
import { defineStore } from "pinia";
import { api } from "../plugins/api";
import { syncService } from "../services/syncService";
import { useAuthStore } from "../stores/auth";
import {
  projectRepository,
  syncQueueRepository,
  kanbanRepository,
} from "../services/localData";

export const useProjectStore = defineStore("projects", {
  state: () => ({
    projects: [],
    active_project_id: null,
    is_populating_offline_cache: false,
    lastSyncTimestamp: localStorage.getItem("kadem_projects_last_sync") || null,
  }),

  getters: {
    active_project: (state) => {
      if (!state.active_project_id) return null;

      return state.projects.find(
        (p) => String(p.localId) === String(state.active_project_id)
      );
    },
  },

  actions: {
    async _loadProjectsFromDB() {
      try {
        this.projects = await projectRepository.getLocalProjects();
      } catch (error) {
        console.error("Falha ao carregar projetos do banco local:", error);
      }
    },

    selectProject(localId) {
      this.active_project_id = localId;
    },

    async markProjectAsAccessed(localId) {
      const pid = Number(localId) || localId;
      const project = this.projects.find((p) => p.localId == pid);

      if (project) {
        const now = new Date().toISOString();

        project.last_accessed_at = now;

        try {
          const projectClone = JSON.parse(JSON.stringify(project));
          await projectRepository.saveLocalProject(projectClone);
          console.debug(`[ProjectStore] Acesso salvo localmente: ${pid}`);
        } catch (error) {
          console.error("[ProjectStore] Erro ao salvar acesso no Dexie:", error);
        }

        if (project.id) {
          api.post(`/projects/${project.id}/access`).catch((err) => {
            console.warn(
              "[ProjectStore] Falha silenciosa ao registrar acesso na API:",
              err.message
            );
          });
        }
      }
    },

    async pullProjects() {
      await this._loadProjectsFromDB();

      try {
        const params = {};
        if (this.lastSyncTimestamp) {
          params.since = this.lastSyncTimestamp;
        }

        const response = await api.get("/projects", { params });

        const isDeltaFormat =
          response.data && !Array.isArray(response.data) && "items" in response.data;
        const remoteProjects = isDeltaFormat ? response.data.items : response.data;
        const serverTime = isDeltaFormat ? response.data.server_timestamp : null;

        if (Array.isArray(remoteProjects) && remoteProjects.length > 0) {
          console.log(
            `[Projects] ${remoteProjects.length} alterações recebidas. Atualizando banco local...`
          );

          await projectRepository.mergeApiProjects(remoteProjects);

          await this._loadProjectsFromDB();
        } else {
          console.log("[Projects] Sincronizado (Nenhuma alteração remota).");
        }

        if (serverTime) {
          this.lastSyncTimestamp = serverTime;
          localStorage.setItem("kadem_projects_last_sync", serverTime);
        }
      } catch (error) {
        console.warn("[Projects] Pull falhou ou offline:", error);
      }
    },

    async start_progressive_details_pull(projects_list) {
      if (this.is_populating_offline_cache) return;

      const queue = projects_list
        .filter((p) => p.id)
        .map((p) => ({ id: p.id, localId: p.localId }));

      if (queue.length === 0) return;

      this.is_populating_offline_cache = true;
      await this._process_download_queue(queue);
    },

    async _process_download_queue(queue) {
      if (queue.length === 0) {
        console.log("[ProjectStore] Cache offline completo.");
        this.is_populating_offline_cache = false;
        return;
      }

      const current_project = queue.shift();

      try {
        const response = await api.get(`/kanban/projects/${current_project.id}`);
        const { columns, tasks } = response.data;

        if (columns && tasks) {
          await kanbanRepository.mergeServerData(current_project.localId, columns, tasks);
          console.debug(`[OfflineCache] Projeto ${current_project.id} cacheado.`);
        }
      } catch (error) {
        console.warn(
          `[OfflineCache] Falha ao cachear projeto ${current_project.id}:`,
          error
        );
      }

      setTimeout(() => {
        this._process_download_queue(queue);
      }, 300);
    },

    async updateProject(originalProject, changes) {
      const cleanOriginal = JSON.parse(JSON.stringify(originalProject));
      const cleanChanges = JSON.parse(JSON.stringify(changes));
      const updatedProject = { ...cleanOriginal, ...cleanChanges };

      await projectRepository.saveLocalProject(updatedProject);

      const projectInState = this.projects.find(
        (p) => p.localId === originalProject.localId
      );
      if (projectInState) {
        Object.assign(projectInState, changes);

        console.log("updated project in memory: ", projectInState)
      }

      delete cleanChanges.invites;

      const timestamp = new Date().toISOString();
      for (const fieldName in cleanChanges) {
        await syncQueueRepository.addSyncQueueTask({
          type: "SYNC_PROJECT_CHANGE",
          payload: {
            project_id: cleanOriginal.id,
            localId: cleanOriginal.localId,
            field: fieldName,
            value: cleanChanges[fieldName],
            timestamp: timestamp,
          },
          timestamp: timestamp,
        });
      }
      syncService.processSyncQueue();
    },

    async createProject(projectData) {
      const authStore = useAuthStore();
      const currentUser = authStore.user;

      const cleanProjectData = JSON.parse(JSON.stringify(projectData));

      const localProject = {
        ...cleanProjectData,
        status: "active",
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_synced: false,
        members: cleanProjectData.members && cleanProjectData.members.length > 0
          ? cleanProjectData.members
          : [{
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            role: 'admin'
          }]
      };

      delete localProject.id;

      try {
        const localId = await projectRepository.addLocalProject(localProject);

        const projectWithId = { ...localProject, localId };

        this.projects.push(projectWithId);

        this.selectProject(localId);

        await syncQueueRepository.addSyncQueueTask({
          type: "CREATE_PROJECT",
          payload: {
            ...cleanProjectData,
            localId: localId,
          },
          timestamp: new Date().toISOString(),
        });

        syncService.processSyncQueue();

        return localId;

      } catch (error) {
        console.error("Falha ao criar projeto localmente:", error);
        throw error;
      }
    },

    async deleteProject(projectId, localId) {
      console.log(
        `[deleteProject] Iniciando exclusão. ID: ${projectId}, LocalID: ${localId}`
      );
      if (!localId) return;

      try {
        await syncQueueRepository.addSyncQueueTask({
          type: "DELETE_PROJECT",
          payload: { id: projectId, localId: localId },
          timestamp: new Date().toISOString(),
        });
        await projectRepository.deleteLocalProject(localId);
        this.projects = this.projects.filter((p) => p.localId !== localId);

        if (this.active_project_id === localId) {
          this.active_project_id = null;
        }

        syncService.processSyncQueue();
      } catch (error) {
        console.error("[deleteProject] FALHA GERAL na operação de exclusão.", error);
      }
    },

    async syncProjectChange(projectId, localId, field, value) {
      let cleanValue = value;
      if (typeof value === "object" && value !== null) {
        cleanValue = JSON.parse(JSON.stringify(value));
      }
      await projectRepository.saveLocalProject({
        localId: localId,
        [field]: cleanValue,
      });
      const projectInState = this.projects.find((p) => p.localId === localId);
      if (projectInState) {
        projectInState[field] = value;
      }
      await syncQueueRepository.addSyncQueueTask({
        type: "SYNC_PROJECT_CHANGE",
        payload: {
          project_id: projectId,
          localId: localId,
          field: field,
          value: cleanValue,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      syncService.processSyncQueue();
    },

    async removeProjectMember(projectId, localId, targetUserId) {
      const project = this.projects.find((p) => p.localId === localId);
      if (project) {
        project.members = project.members.filter((m) => m.id !== targetUserId);
        await projectRepository.saveLocalProject(JSON.parse(JSON.stringify(project)));
      }

      await syncQueueRepository.addSyncQueueTask({
        type: "REMOVE_PROJECT_MEMBER",
        payload: {
          projectId: projectId,
          targetUserId: targetUserId,
        },
        timestamp: new Date().toISOString(),
      });

      syncService.processSyncQueue();
    },

    async revokeProjectInvite(projectId, localId, targetEmail) {
      const project = this.projects.find((p) => p.localId === localId);
      if (project) {
        project.invites = project.invites.filter((email) => email !== targetEmail);
        await projectRepository.saveLocalProject(JSON.parse(JSON.stringify(project)));
      }

      await syncQueueRepository.addSyncQueueTask({
        type: "REVOKE_PROJECT_INVITE",
        payload: {
          projectId: projectId,
          targetEmail: targetEmail,
        },
        timestamp: new Date().toISOString(),
      });

      syncService.processSyncQueue();
    },

    /**
     * AÇÃO DE AUTO-CORREÇÃO DE SEGURANÇA
     * Chamada quando o servidor retorna 403 Forbidden para um projeto.
     */
    async forceLocalProjectRemoval(projectId) {
      console.warn(
        `[Security] Acesso revogado para o projeto ${projectId}. Iniciando remoção local.`
      );

      try {
        this.projects = this.projects.filter(
          (p) =>
            String(p.id) !== String(projectId) && String(p.localId) !== String(projectId)
        );

        await projectRepository.deleteProjectByRemoteId(projectId);

        await syncQueueRepository.removeTasksByProjectId(projectId);

        window.dispatchEvent(
          new CustomEvent("project-access-revoked", { detail: { projectId } })
        );
      } catch (error) {
        console.error(`[Security] Erro ao limpar projeto revogado ${projectId}:`, error);
      }
    },
  },

  persist: {
    paths: ["active_project_id"],
  },
});
