// src/services/localData/projectRepository.js
import { db } from '../../db';

export const projectRepository = {
    async addLocalProject(projectData) {
        return await db.projects.add(projectData);
    },
    async saveLocalProject(project) {
        return await db.projects.put(project);
    },
    async deleteLocalProject(localId) {
        return await db.projects.delete(localId);
    },
    async getLocalProject(localId) {
        return await db.projects.get(localId);
    },
    async getLocalProjects() {
        if (!db.projects) {
            console.error("[projectRepository] db.projects não está definido.");
            return [];
        }
        return await db.projects.toArray();
    },

    async mergeApiProjects(apiProjects) {
        if (!db.projects) return;

        if (!Array.isArray(apiProjects) || apiProjects.length === 0) {
            return;
        }

        console.log(`[projectRepository] Processando Delta Sync de ${apiProjects.length} projetos.`);

        return db.transaction('rw', db.projects, async () => {
            const changes_to_sync = [];

            for (const apiProj of apiProjects) {
                if (!apiProj.id) continue;

                const existing_local = await db.projects.where('id').equals(apiProj.id).first();

                const payload = {
                    ...apiProj,
                    members: apiProj.members || []
                };

                if (existing_local) {
                    payload.localId = existing_local.localId;
                }

                changes_to_sync.push(payload);
            }

            if (changes_to_sync.length > 0) {
                await db.projects.bulkPut(changes_to_sync);
            }
        });
    },

    /**
     * Remove fisicamente um projeto do banco local (Dexie) usando o ID do servidor.
     * Utilizado pelo mecanismo de segurança "Self-Healing".
     */
    async deleteProjectByRemoteId(projectId) {
        const id = parseInt(projectId, 10);

        if (isNaN(id)) {
            console.error('[ProjectRepo] ID inválido para exclusão:', projectId);
            return;
        }

        try {
            await db.projects.where('id').equals(id).delete();

            if (db.kanban_tasks) {
                await db.kanban_tasks.where('project_id').equals(id).delete();
            }
            if (db.kanban_columns) {
                await db.kanban_columns.where('project_id').equals(id).delete();
            }

            console.log(`[ProjectRepo] Projeto ${id} e dados associados removidos localmente.`);
        } catch (error) {
            console.error(`[ProjectRepo] Falha ao deletar projeto ${id}:`, error);
            throw error;
        }
    },

    async clearLocalProjects() {
        return await db.projects.clear();
    }
};