import { api } from '../plugins/api';
import {
    syncQueueRepository,
    userRepository,
    occupationRepository,
    medalRepository,
    projectRepository,
    accountsRepository
} from './localData';

let isProcessing = false;

async function _saveServerData(apiUserData) {
    const { useAuthStore } = await import('../stores/auth');
    const authStore = useAuthStore();

    const { occupations, medals, ...profileData } = apiUserData;
    await userRepository.saveLocalUserProfile(profileData);
    await occupationRepository.mergeApiOccupations(occupations || []);
    await medalRepository.setLocalMedals(medals || []);
    const mergedOccupations = await occupationRepository.getLocalUserOccupations();
    const mergedMedals = await medalRepository.getLocalMedals();
    authStore.setUser({
        ...profileData,
        occupations: mergedOccupations,
        medals: mergedMedals
    });
}

async function processIndividualTask(task) {
    switch (task.type) {
        case 'CREATE_OCCUPATION':
            return await api.post('/users/occupations', task.payload);

        case 'DELETE_OCCUPATION':
            return await api.delete(`/users/occupations/${task.payload.id}`);

        case 'CREATE_PROJECT':
            try {
                const { localId, ...projectData } = task.payload;
                const response = await api.post('/projects', projectData);

                await projectRepository.deleteLocalProject(localId);
                await projectRepository.saveLocalProject(response.data);

                const { useProjectStore } = await import('../stores/projects');
                const projectStore = useProjectStore();
                await projectStore._loadProjectsFromDB();

            } catch (error) {
                console.error(`[SyncService] Falha ao criar projeto na API:`, error);
                throw error;
            }
            return;

        case 'DELETE_PROJECT':
            try {
                const serverId = task.payload.id;

                if (!serverId) {
                    console.warn(`[SyncService] Ignorando DELETE_PROJECT para item local (${task.payload.localId}) que nunca foi sincronizado.`);
                    return Promise.resolve();
                }

                await api.delete(`/projects/${serverId}`);
                console.log(`[SyncService] Projeto ${serverId} deletado na API.`);
                return Promise.resolve();

            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.warn(`[SyncService] Projeto ${task.payload.id} já estava deletado na API (404). Removendo tarefa.`);
                    return Promise.resolve();
                }

                console.error(`[SyncService] Falha ao deletar projeto ${task.payload.id} na API.`, error);
                throw error;
            }

        case 'CREATE_ACCOUNT':
            try {
                const response = await api.post('/accounts', { data: task.payload.data });

                const serverId = response.data.id;

                await accountsRepository.setServerId(task.payload.localId, serverId);
                return Promise.resolve();
            } catch (error) {
                console.error(`[SyncService] Falha ao criar conta na API:`, error);
                throw error;
            }

        case 'DELETE_ACCOUNT':
            try {
                const serverId = task.payload.id;
                if (!serverId) {
                    console.warn(`[SyncService] Ignorando DELETE_ACCOUNT local (${task.payload.localId}).`);
                    return Promise.resolve();
                }
                await api.delete(`/accounts/${serverId}`);
                return Promise.resolve();
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.warn(`[SyncService] Conta ${task.payload.id} já estava deletada na API (404).`);
                    return Promise.resolve();
                }
                console.error(`[SyncService] Falha ao deletar conta ${task.payload.id} na API.`, error);
                throw error;
            }

        default:
            console.warn(`[SyncService] Tipo de tarefa individual desconhecido: ${task.type}`);
            return Promise.resolve();
    }
}

async function processProfileSync(profileTasks) {
    if (profileTasks.length === 0) return;

    console.log(`[SyncService] Sincronizando ${profileTasks.length} mudanças de perfil...`);

    const changes = profileTasks.map(task => task.payload);
    try {
        const response = await api.post('/users/profile/sync', { changes });
        await _saveServerData(response.data);
        const taskIds = profileTasks.map(t => t.id);
        await syncQueueRepository.deleteTasks(taskIds);
        console.log(`[SyncService] Mudanças de perfil sincronizadas com sucesso.`);
    } catch (error) {
        console.error(`[SyncService] Falha ao sincronizar mudanças de perfil.`, error);
        throw error;
    }
}

async function processProjectSync(projectTasks) {
    if (projectTasks.length === 0) return;

    const tasksByProject = projectTasks.reduce((acc, task) => {
        const key = task.payload.project_id || `local_${task.payload.localId}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(task);
        return acc;
    }, {});

    console.log(`[SyncService] Sincronizando mudanças para ${Object.keys(tasksByProject).length} projetos...`);

    for (const projectKey of Object.keys(tasksByProject)) {
        const tasksForThisProject = tasksByProject[projectKey];
        const projectId = tasksForThisProject[0].payload.project_id;

        const localId = tasksForThisProject[0].payload.localId;

        if (!projectId) {
            continue;
        }

        const changes = tasksForThisProject.map(task => ({
            field: task.payload.field,
            value: task.payload.value,
            timestamp: task.payload.timestamp
        }));

        try {
            const response = await api.post(`/projects/${projectId}/sync`, { changes });

            const projectToSave = {
                ...response.data,
                localId: localId
            };

            await projectRepository.saveLocalProject(projectToSave);

            const taskIds = tasksForThisProject.map(t => t.id);
            await syncQueueRepository.deleteTasks(taskIds);

            console.log(`[SyncService] Projeto ${projectId} (LocalID: ${localId}) sincronizado com sucesso.`);

        } catch (error) {
            console.error(`[SyncService] Falha ao sincronizar projeto ${projectId}.`, error);

            if (error.response && error.response.status === 404) {
                console.warn(`[SyncService] Projeto ${projectId} não encontrado no servidor (404). Removendo tarefas zumbis.`);
                const taskIds = tasksForThisProject.map(t => t.id);
                await syncQueueRepository.deleteTasks(taskIds);
            } else {
                throw error;
            }
        }
    }
}

export const syncService = {
    async processSyncQueue() {
        if (isProcessing || !navigator.onLine) {
            return;
        }
        isProcessing = true;

        const tasks = await syncQueueRepository.getPendingTasks();
        if (tasks.length === 0) {
            isProcessing = false;
            return;
        }

        console.log(`[SyncService] Iniciando sincronização de ${tasks.length} tarefas...`);

        const profileTasks = tasks.filter(t => t.type === 'SYNC_PROFILE_CHANGE');
        const projectTasks = tasks.filter(t => t.type === 'SYNC_PROJECT_CHANGE');
        const individualTasks = tasks.filter(t =>
            t.type !== 'SYNC_PROFILE_CHANGE' &&
            t.type !== 'SYNC_PROJECT_CHANGE'
        );

        try {
            await processProfileSync(profileTasks);
            await processProjectSync(projectTasks);

            for (const task of individualTasks) {
                try {
                    await processIndividualTask(task);
                    await syncQueueRepository.deleteTask(task.id);
                    console.log(`[SyncService] Tarefa ${task.id} (${task.type}) concluída.`);
                } catch (error) {
                    console.error(`[SyncService] Falha ao sincronizar tarefa ${task.id} (${task.type}).`, error);

                    if (task.type === 'DELETE_PROJECT' && error.response && error.response.status === 404) {
                        console.warn(`[SyncService] Tarefa ${task.type} falhou (404), mas continuando a fila.`);

                        await syncQueueRepository.deleteTask(task.id);
                    } else {
                        throw new Error("Falha em tarefa individual, interrompendo fila.");
                    }
                }
            }
            console.log("[SyncService] Fila processada.");
        } catch (syncError) {
            console.warn("[SyncService] Processamento da fila interrompido por erro.", syncError.message);
        } finally {
            isProcessing = false;
        }
    }
};