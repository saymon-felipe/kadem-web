// src/services/syncService.js
import { api } from '../plugins/api';
import { syncQueueRepository } from './localData';

// --- Estado do Módulo ---
let isProcessing = false;

// --- Handlers Internos (Lógica da Fila) ---

/**
 * Processa uma única tarefa da fila, chamando a API correspondente.
 * @param {object} task A tarefa vinda do Dexie
 */
async function processTask(task) {
    switch (task.type) {
        case 'CREATE_OCCUPATION':
            return await api.post('/users/occupations', task.payload);

        case 'DELETE_OCCUPATION':
            return await api.delete(`/users/occupations/${task.payload.id}`);

        case 'UPDATE_USER_PROFILE':
            return await api.patch('/users/profile', task.payload);

        case 'UPDATE_USER_BIO':
            return await api.patch('/users/profile/bio', { bio: task.payload });

        default:
            console.warn(`Tipo de sync desconhecido: ${task.type}`);
            return Promise.resolve();
    }
}

// --- Serviço Público de Sincronização ---

export const syncService = {
    /**
     * Tenta processar todas as tarefas pendentes na fila.
     */
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
                console.error(`[SyncService] Falha ao sincronizar tarefa ${task.id} (${task.type}).`, error);
                break;
            }
        }

        isProcessing = false;
    }
};