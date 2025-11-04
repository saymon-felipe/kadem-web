import { db } from '../../db';
import { syncQueueRepository } from './syncQueueRepository';

export const occupationRepository = {

    // --- Funções de Leitura (Read) ---

    async getLocalUserOccupations() {
        return await db.user_occupations.toArray();
    },

    // --- Funções de Escrita (Mutations) ---

    async addLocalUserOccupation(occupationData) {
        return await db.user_occupations.add(occupationData);
    },

    async deleteLocalUserOccupation(localId) {
        return await db.user_occupations.delete(localId);
    },

    async clearLocalUserOccupations() {
        return await db.user_occupations.clear();
    },

    // --- Funções de Sincronização (Sync) ---

    async mergeApiOccupations(apiOccupations) {
        const pendingCreates = await syncQueueRepository.getPendingTasksByType('CREATE_OCCUPATION');
        const localOnlyOccupations = pendingCreates.map(task => task.payload);

        const pendingDeletes = await syncQueueRepository.getPendingTasksByType('DELETE_OCCUPATION');
        const deleteIds = new Set(pendingDeletes.map(task => task.payload.id));

        const finalApiOccupations = apiOccupations.filter(
            apiOcc => !deleteIds.has(apiOcc.id)
        );

        return db.transaction('rw', db.user_occupations, async () => {
            await db.user_occupations.clear();
            await db.user_occupations.bulkAdd(finalApiOccupations);
            await db.user_occupations.bulkAdd(localOnlyOccupations);
        });
    },
};