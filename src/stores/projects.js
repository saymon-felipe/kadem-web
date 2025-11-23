// src/stores/projects.js
import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import { syncService } from '../services/syncService';
import {
    projectRepository,
    syncQueueRepository,
    kanbanRepository
} from '../services/localData';

export const useProjectStore = defineStore('projects', {
    state: () => ({
        projects: [],
        active_project_id: null,
        is_populating_offline_cache: false,
    }),

    getters: {
        active_project: (state) => {
            if (!state.active_project_id) return null;
            return state.projects.find(p => p.localId == state.active_project_id);
        }
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
            const project = this.projects.find(p => p.localId == pid);

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
                    api.post(`/projects/${project.id}/access`).catch(err => {
                        console.warn("[ProjectStore] Falha silenciosa ao registrar acesso na API:", err.message);
                    });
                }
            }
        },

        async pullProjects() {
            console.log("[pullProjects] Puxando projetos da API...");
            try {
                const response = await api.get('/projects');

                await projectRepository.mergeApiProjects(response.data);
                await this._loadProjectsFromDB();

                console.log("[pullProjects] Lista sincronizada. Iniciando cache progressivo...");
                this.start_progressive_details_pull(this.projects);

            } catch (error) {
                console.error("Falha ao 'puxar' (pull) projetos da API:", error);
                await this._loadProjectsFromDB();
            }
        },

        async start_progressive_details_pull(projects_list) {
            if (this.is_populating_offline_cache) return;

            const queue = projects_list
                .filter(p => p.id)
                .map(p => ({ id: p.id, localId: p.localId }));

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
                console.warn(`[OfflineCache] Falha ao cachear projeto ${current_project.id}:`, error);
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

            const projectInState = this.projects.find(p => p.localId === originalProject.localId);
            if (projectInState) {
                Object.assign(projectInState, changes);
            }

            const timestamp = new Date().toISOString();
            for (const fieldName in cleanChanges) {
                await syncQueueRepository.addSyncQueueTask({
                    type: 'SYNC_PROJECT_CHANGE',
                    payload: {
                        project_id: cleanOriginal.id,
                        localId: cleanOriginal.localId,
                        field: fieldName,
                        value: cleanChanges[fieldName],
                        timestamp: timestamp
                    },
                    timestamp: timestamp
                });
            }
            syncService.processSyncQueue();
        },

        async createProject(projectData) {
            const cleanProjectData = JSON.parse(JSON.stringify(projectData));

            const localProject = {
                ...cleanProjectData,
                status: 'em_andamento',
                last_accessed_at: new Date().toISOString()
            };

            delete localProject.id;

            try {
                const localId = await projectRepository.addLocalProject(localProject);
                this.projects.push({ ...projectData, localId });

                this.selectProject(localId);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_PROJECT',
                    payload: {
                        ...cleanProjectData,
                        localId: localId
                    },
                    timestamp: new Date().toISOString()
                });
                syncService.processSyncQueue();
            } catch (error) {
                console.error("Falha ao criar projeto localmente:", error);
            }
        },

        async deleteProject(projectId, localId) {
            console.log(`[deleteProject] Iniciando exclusão. ID: ${projectId}, LocalID: ${localId}`);
            if (!localId) return;

            try {
                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_PROJECT',
                    payload: { id: projectId, localId: localId },
                    timestamp: new Date().toISOString()
                });
                await projectRepository.deleteLocalProject(localId);
                this.projects = this.projects.filter(p => p.localId !== localId);

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
            if (typeof value === 'object' && value !== null) {
                cleanValue = JSON.parse(JSON.stringify(value));
            }
            await projectRepository.saveLocalProject({
                localId: localId,
                [field]: cleanValue
            });
            const projectInState = this.projects.find(p => p.localId === localId);
            if (projectInState) {
                projectInState[field] = value;
            }
            await syncQueueRepository.addSyncQueueTask({
                type: 'SYNC_PROJECT_CHANGE',
                payload: {
                    project_id: projectId,
                    localId: localId,
                    field: field,
                    value: cleanValue,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            });
            syncService.processSyncQueue();
        }
    }
});