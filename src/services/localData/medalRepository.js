import { db } from '../../db';

export const medalRepository = {
    async getLocalMedals() {
        return await db.medals.toArray();
    },
    async setLocalMedals(medalsArray) {
        await db.medals.clear();
        return await db.medals.bulkPut(medalsArray);
    },
    async clearLocalMedals() {
        return await db.medals.clear();
    }
};