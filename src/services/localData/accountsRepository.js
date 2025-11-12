import { db } from '../../db';

export const accountsRepository = {
    addLocalAccount: async (encryptedBlob) => {
        if (!db.accounts) {
            throw new Error("Tabela de contas (accounts) não foi inicializada.");
        }

        return await db.accounts.add({
            id: null,
            data: encryptedBlob
        });
    },
    setServerId: async (localId, serverId) => {
        return await db.accounts.update(localId, { id: serverId });
    },
    deleteLocalAccount: async (localId) => {
        return await db.accounts.delete(localId);
    },
    getAllLocalAccounts: async () => {
        if (!db.accounts) {
            console.error("[accountsRepository] db.accounts não está definido.");
            return [];
        }
        return await db.accounts.toArray();
    }
};