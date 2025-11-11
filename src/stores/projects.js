// /stores/projects.js
import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import { syncService } from '../services/syncService';
import {
    projectRepository,
    syncQueueRepository
} from '../services/localData';

export const useProjectStore = defineStore('projects', {
    state: () => ({
        projects: [],
    }),
    actions: {
        async _loadProjectsFromDB() {
            try {
                this.projects = await projectRepository.getLocalProjects();
            } catch (error) {
                console.error("Falha ao carregar projetos do banco local:", error);
            }
        },
        async pullProjects() {
            console.log("[pullProjects] Puxando projetos da API...");
            try {
                const response = await api.get('/projects');

                await projectRepository.mergeApiProjects(response.data);
                await this._loadProjectsFromDB();

                console.log("[pullProjects] Projetos sincronizados e recarregados.");

            } catch (error) {
                console.error("Falha ao 'puxar' (pull) projetos da API:", error);

                await this._loadProjectsFromDB();
            }
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
                id: null,
                status: 'em_andamento'
            };
            try {
                const localId = await projectRepository.addLocalProject(localProject);
                this.projects.push({ ...projectData, localId });
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
            if (!localId) {
                console.error("[deleteProject] ERRO: localId é nulo.");
                return;
            }
            try {
                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_PROJECT',
                    payload: { id: projectId, localId: localId },
                    timestamp: new Date().toISOString()
                });
                await projectRepository.deleteLocalProject(localId);
                this.projects = this.projects.filter(p => p.localId !== localId);
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