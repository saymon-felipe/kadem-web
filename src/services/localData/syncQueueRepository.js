// src/services/localData/syncQueueRepository.js
import { db } from '../../db';

export const syncQueueRepository = {

    // --- Funções de Leitura (Read) ---

    async getPendingTasks() {
        return await db.syncQueue.toArray();
    },

    async getPendingTasksByType(type) {
        return await db.syncQueue.where('type').equals(type).toArray();
    },

    // --- Funções de Escrita (Mutations) ---

    async addSyncQueueTask(task) {
        return await db.syncQueue.add(task);
    },

    async deleteTask(taskId) {
        return await db.syncQueue.delete(taskId);
    },

    async clearSyncQueue() {
        return await db.syncQueue.clear();
    },
};