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
    saveLocalAccount: async (accountObject) => {
        if (!db.accounts) {
            throw new Error("Tabela de contas (accounts) não foi inicializada.");
        }
        return await db.accounts.put(accountObject);
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
    },
    async clearLocalAccounts() {
        return await db.accounts.clear();
    },
    async mergeApiAccounts(apiAccounts) {
        if (!Array.isArray(apiAccounts)) {
            console.warn("[accountsRepository] apiAccounts inválido:", apiAccounts);
            return;
        }

        return db.transaction('rw', db.accounts, async () => {
            const localAccounts = await db.accounts.toArray();

            const serverIdsSet = new Set(apiAccounts.map(acc => acc.id));

            const accountsToDelete = localAccounts.filter(
                localAcc => localAcc.id !== null &&
                    localAcc.id !== undefined &&
                    !serverIdsSet.has(localAcc.id)
            );

            if (accountsToDelete.length > 0) {
                const idsToDelete = accountsToDelete.map(acc => acc.localId);
                console.log(`[AccountsRepo] Removendo ${idsToDelete.length} contas deletadas no servidor.`);
                await db.accounts.bulkDelete(idsToDelete);
            }

            for (const apiAcc of apiAccounts) {
                const existingLocal = localAccounts.find(l => l.id === apiAcc.id);

                if (existingLocal) {
                    if (existingLocal.data !== apiAcc.data) {
                        await db.accounts.update(existingLocal.localId, {
                            data: apiAcc.data,
                        });
                    }
                } else {
                    await db.accounts.add({
                        id: apiAcc.id,
                        data: apiAcc.data,
                    });
                }
            }
        });
    }
};