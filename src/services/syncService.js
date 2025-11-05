import { api } from '../plugins/api';
import { syncQueueRepository, userRepository } from './localData';

let isProcessing = false;

async function processTask(task) {
    switch (task.type) {
        case 'CREATE_OCCUPATION':
            return await api.post('/users/occupations', task.payload);

        case 'DELETE_OCCUPATION':
            return await api.delete(`/users/occupations/${task.payload.id}`);

        case 'UPDATE_USER_PROFILE':
            return await api.patch('/users/profile', task.payload);

        case 'UPDATE_USER_BIO':
            return await api.patch('/users/profile/bio', task.payload);

        default:
            console.warn(`Tipo de sync desconhecido: ${task.type}`);
            return Promise.resolve();
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

        for (const task of tasks) {
            try {
                await processTask(task);

                await syncQueueRepository.deleteTask(task.id);
                console.log(`[SyncService] Tarefa ${task.id} (${task.type}) concluída.`);
            } catch (error) {
                if (error.response?.status === 409) {
                    console.warn(`[SyncService] Conflito 409 detectado para tarefa ${task.id}. O servidor venceu.`);

                    const serverData = error.response.data;

                    if (task.type === 'UPDATE_USER_BIO') {
                        await userRepository.saveLocalUserProfile(serverData);
                    }

                    await syncQueueRepository.deleteTask(task.id);

                } else {
                    console.error(`[SyncService] Falha ao sincronizar tarefa ${task.id} (${task.type}).`, error);
                    break;
                }
            }
        }

        isProcessing = false;
    }
};