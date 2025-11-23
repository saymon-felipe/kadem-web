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

    async clearLocalProjects() {
        return await db.projects.clear();
    }
};