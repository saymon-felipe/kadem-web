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
        if (!db.projects) {
            console.error("[projectRepository] ERRO CRÍTICO: db.projects não está definido. A migração do Dexie falhou?");
            return;
        }

        if (!Array.isArray(apiProjects)) {
            console.warn("[projectRepository] Aviso: apiProjects não é um array. Recebido:", apiProjects);
            apiProjects = [];
        }

        const apiIds = apiProjects
            .map(p => p?.id)
            .filter(id =>
                id !== null &&
                id !== undefined &&
                id !== '' &&
                !Number.isNaN(id)
            );

        console.log("[projectRepository] mergeApiProjects -> IDs válidos:", apiIds);

        try {
            if (apiIds.length > 0) {
                console.log(`[projectRepository] Deletando projetos locais não listados na API (${apiIds.length} IDs válidos)...`);
                await db.projects
                    .where('id')
                    .noneOf(apiIds)
                    .delete();
            } else {
                console.log("[projectRepository] Nenhum ID válido recebido da API. Limpando todos os projetos sincronizados...");

                const projectsWithServerId = await db.projects
                    .filter(p => p.id != null)
                    .toArray();

                for (const p of projectsWithServerId) {
                    await db.projects.delete(p.localId);
                }
            }

            for (const apiProject of apiProjects) {
                const localCopy = await db.projects.where('id').equals(apiProject.id).first();

                if (localCopy) {
                    await db.projects.put({
                        ...apiProject,
                        localId: localCopy.localId
                    });
                } else {
                    await db.projects.put(apiProject);
                }
            }

            console.log(`[projectRepository] mergeApiProjects: finalizado (${apiProjects.length} projetos).`);

        } catch (err) {
            console.error("mergeApiProjects: erro ao mesclar projetos da API", err);
            console.log("apiIds problemáticos:", apiIds);
        }
    },
    async clearLocalProjects() {
        return await db.projects.clear();
    }
};
