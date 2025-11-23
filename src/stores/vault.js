import { ref } from 'vue';
import { defineStore } from 'pinia';
import { accountsRepository } from '../services/localData/accountsRepository';
import { syncQueueRepository } from '../services/localData/syncQueueRepository';
import { syncService } from '../services/syncService';
import { api } from "../plugins/api";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 310000;

const bufferToBase64 = (buf) => {
    const binary = String.fromCharCode.apply(null, buf);
    return btoa(binary);
};

const base64ToBuffer = (b64) => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

export const useVaultStore = defineStore('vault', () => {
    const isUnlocked = ref(false);
    const _mek = ref(null);
    const accounts = ref([]);
    const revealedPasswords = ref({});

    const _deriveKey = async (password, salt) => {
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode(salt),
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    };

    const _encrypt = async (data, key = _mek.value) => {
        if (!key) throw new Error("Cofre está trancado ou chave não fornecida.");

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoder.encode(data)
        );

        return JSON.stringify({
            iv: bufferToBase64(iv),
            data: bufferToBase64(new Uint8Array(encryptedData)),
        });
    };

    const _decrypt = async (encryptedBlob, key = _mek.value) => {
        if (!key) throw new Error("Cofre está trancado ou chave não fornecida.");

        const { iv: ivB64, data: dataB64 } = JSON.parse(encryptedBlob);
        const iv = base64ToBuffer(ivB64);
        const data = base64ToBuffer(dataB64);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        return decoder.decode(decryptedBuffer);
    };

    const last_sync_timestamp = ref(localStorage.getItem('kadem_vault_last_sync') || null);

    const pullAccounts = async () => {
        console.log("[VaultStore] Verificando atualizações...");
        try {
            const params = {};
            if (last_sync_timestamp.value) {
                params.since = last_sync_timestamp.value;
            }

            const { data } = await api.get('/accounts', { params });
            const remote_accounts = data.items || [];
            const server_time = data.server_timestamp;

            if (remote_accounts.length > 0) {
                await accountsRepository.mergeApiAccounts(remote_accounts);
            } else {
                console.log("[VaultStore] Cofre sincronizado.");
            }

            if (server_time) {
                last_sync_timestamp.value = server_time;
                localStorage.setItem('kadem_vault_last_sync', server_time);
            }

        } catch (error) {
            console.error("[VaultStore] Erro no sync (pode estar offline):", error);
        }
    };

    const checkMasterPassword = async (masterPassword, userSalt) => {
        try {
            const keyCandidate = await _deriveKey(masterPassword, userSalt);
            const encryptedValidation = localStorage.getItem('vault_validation');

            if (!encryptedValidation) {
                throw new Error("Cofre não inicializado.");
            }

            const validationToken = await _decrypt(encryptedValidation, keyCandidate);

            return validationToken === "VALID_VAULT_KEY";

        } catch (decryptError) {
            console.error("Falha na checagem da senha:", decryptError.name);
            return false;
        }
    };

    const unlockVault = async (masterPassword, userSalt) => {
        if (isUnlocked.value) return;

        try {
            const keyCandidate = await _deriveKey(masterPassword, userSalt);
            const encryptedValidation = localStorage.getItem('vault_validation');

            if (!encryptedValidation) {
                console.log("Configurando o cofre pela primeira vez...");
                await setupVault(masterPassword, userSalt);
                return;
            }

            try {
                const validationToken = await _decrypt(encryptedValidation, keyCandidate);

                if (validationToken !== "VALID_VAULT_KEY") {
                    throw new Error("Senha incorreta (token inválido).");
                }

                _mek.value = keyCandidate;
                isUnlocked.value = true;
                await loadAccountsFromDB();

            } catch (decryptError) {
                console.error("Falha na descriptografia do token:", decryptError);
                throw new Error("Senha Mestra incorreta.");
            }

        } catch (err) {
            isUnlocked.value = false;
            throw err;
        }
    };

    const setupVault = async (password, userSalt) => {
        const key = await _deriveKey(password, userSalt);
        const validationToken = "VALID_VAULT_KEY";
        const encryptedValidation = await _encrypt(validationToken, key);

        localStorage.setItem('vault_validation', encryptedValidation);
        console.log("Cofre configurado.");
    };

    const lockVault = () => {
        _mek.value = null;
        isUnlocked.value = false;
        accounts.value = [];
        revealedPasswords.value = {};
        console.log("Cofre trancado.");
    };

    const loadAccountsFromDB = async () => {
        if (!isUnlocked.value) throw new Error("Cofre trancado.");

        const encryptedAccounts = await accountsRepository.getAllLocalAccounts();

        const decryptedList = [];
        for (const acc of encryptedAccounts) {
            try {
                const decryptedData = await _decrypt(acc.data);
                const accountData = JSON.parse(decryptedData);
                decryptedList.push({
                    localId: acc.localId,
                    id: acc.id,
                    ...accountData
                });
            } catch (err) {
                console.error(`Falha ao descriptografar conta localId ${acc.localId}`, err);
            }
        }
        accounts.value = decryptedList;
    };

    const createAccount = async (accountData) => {
        if (!isUnlocked.value) throw new Error("Cofre trancado.");

        const dataString = JSON.stringify(accountData);
        const encryptedBlob = await _encrypt(dataString);
        const localId = await accountsRepository.addLocalAccount(encryptedBlob);

        accounts.value.push({ localId, id: null, ...accountData });

        await syncQueueRepository.addSyncQueueTask({
            type: 'CREATE_ACCOUNT',
            payload: {
                localId: localId,
                data: encryptedBlob
            },
            timestamp: new Date().toISOString()
        });
        syncService.processSyncQueue();
    };

    const updateAccount = async (localId, newAccountData) => {
        if (!isUnlocked.value) throw new Error("Cofre trancado.");

        await _updateLastAccess(localId, newAccountData);
    };

    const _updateLastAccess = async (localId, newAccountData) => {
        const accountIndex = accounts.value.findIndex(a => a.localId === localId);
        if (accountIndex === -1) return;

        const newLastAccess = new Date().toISOString();
        const updatedAccount = {
            ...accounts.value[accountIndex],
            ...newAccountData,
            lastAccess: newLastAccess
        };

        accounts.value.splice(accountIndex, 1, updatedAccount);

        const { localId: omitLocalId, id: omitId, ...dataToEncrypt } = updatedAccount;

        const dataString = JSON.stringify(dataToEncrypt);
        const encryptedBlob = await _encrypt(dataString);

        await accountsRepository.saveLocalAccount({
            localId,
            id: updatedAccount.id,
            data: encryptedBlob
        });

        await syncQueueRepository.addSyncQueueTask({
            type: 'UPDATE_ACCOUNT',
            payload: {
                localId: localId,
                id: updatedAccount.id,
                data: encryptedBlob
            },
            timestamp: new Date().toISOString()
        });

        syncService.processSyncQueue();
    };

    const deleteAccount = async (localId) => {
        const account = accounts.value.find(a => a.localId === localId);
        if (!account) return;

        await accountsRepository.deleteLocalAccount(localId);

        accounts.value = accounts.value.filter(a => a.localId !== localId);

        await syncQueueRepository.addSyncQueueTask({
            type: 'DELETE_ACCOUNT',
            payload: {
                localId: localId,
                id: account.id
            },
            timestamp: new Date().toISOString()
        });
        syncService.processSyncQueue();
    };

    const revealPassword = async (localId) => {
        const account = accounts.value.find(a => a.localId === localId);
        if (!account) return;

        await _updateLastAccess(localId);

        revealedPasswords.value[localId] = account.password;

        setTimeout(() => {
            if (revealedPasswords.value[localId]) {
                delete revealedPasswords.value[localId];
            }
        }, 30 * 1000);
    };

    const hidePassword = (localId) => {
        delete revealedPasswords.value[localId];
    };

    const copyPasswordToClipboard = async (localId) => {
        const account = accounts.value.find(a => a.localId === localId);
        if (!account) return false;

        if (!revealedPasswords.value[localId]) {
            revealPassword(localId);
        }

        try {
            await navigator.clipboard.writeText(account.password);

            hidePassword(localId);

            return true;
        } catch (err) {
            console.error("Falha ao copiar para o clipboard:", err);
            return false;
        }
    };

    return {
        pullAccounts,
        _updateLastAccess,
        isUnlocked,
        accounts,
        revealedPasswords,
        unlockVault,
        lockVault,
        setupVault,
        loadAccountsFromDB,
        createAccount,
        updateAccount,
        deleteAccount,
        revealPassword,
        hidePassword,
        copyPasswordToClipboard,
        checkMasterPassword
    };
});