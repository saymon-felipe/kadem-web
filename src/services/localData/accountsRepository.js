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
    async mergeApiAccounts(api_accounts) {
        if (!Array.isArray(api_accounts) || api_accounts.length === 0) {
            return;
        }

        return db.transaction('rw', db.accounts, async () => {
            const changes_to_sync = [];

            for (const api_acc of api_accounts) {
                const existing_local = await db.accounts.where('id').equals(api_acc.id).first();

                const payload = {
                    id: api_acc.id,
                    data: api_acc.data,
                    updated_at: api_acc.updated_at
                };

                if (existing_local) {
                    payload.localId = existing_local.localId;
                }

                changes_to_sync.push(payload);
            }

            if (changes_to_sync.length > 0) {
                await db.accounts.bulkPut(changes_to_sync);
                console.log(`[AccountsRepo] Delta Sync: ${changes_to_sync.length} contas atualizadas/criadas.`);
            }
        });
    },
    async getLastUpdateTimestamp() {
        const last_item = await db.accounts.orderBy('updated_at').last();
        return last_item ? last_item.updated_at : null;
    }
};