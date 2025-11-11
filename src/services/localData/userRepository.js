import { db } from '../../db';

export const userRepository = {
    async getLocalUserProfile() {
        return await db.users.limit(1).first();
    },
    async saveLocalUserProfile(userObject) {
        return await db.users.put(userObject);
    },
    async clearLocalProfile() {
        return await db.users.clear();
    }
};