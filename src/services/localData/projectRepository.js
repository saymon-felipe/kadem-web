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

        if (!Array.isArray(apiProjects)) {
            apiProjects = [];
        }

        const validApiIds = apiProjects
            .map(p => p?.id)
            .filter(id => id !== null && id !== undefined && id !== '');

        console.log("[projectRepository] Sincronizando IDs:", validApiIds);

        try {
            if (validApiIds.length > 0) {
                await db.projects
                    .filter(p => p.id != null && !validApiIds.includes(p.id))
                    .delete();
            } else {
                await db.projects
                    .filter(p => p.id != null)
                    .delete();
            }

            for (const apiProject of apiProjects) {
                if (!apiProject.id) continue;

                const localCopy = await db.projects.where('id').equals(apiProject.id).first();

                if (localCopy) {
                    await db.projects.put({
                        ...apiProject,
                        localId: localCopy.localId
                    });
                } else {
                    try {
                        await db.projects.put(apiProject);
                    } catch (putError) {
                        console.warn(`[projectRepository] Erro ao inserir projeto ${apiProject.id}. Tentando recuperação...`, putError);

                        const conflict = await db.projects.where('id').equals(apiProject.id).first();
                        if (conflict) {
                            await db.projects.put({ ...apiProject, localId: conflict.localId });
                        }
                    }
                }
            }
            console.log(`[projectRepository] Sync finalizado.`);

        } catch (err) {
            console.error("mergeApiProjects: Erro fatal", err);
        }
    },

    async clearLocalProjects() {
        return await db.projects.clear();
    }
};