import { ref } from 'vue';
import { defineStore } from 'pinia';
import { accountsRepository } from '../services/localData/accountsRepository';
import { syncQueueRepository } from '../services/localData/syncQueueRepository';
import { syncService } from '../services/syncService';
import { api } from "../plugins/api";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 310000;
const AUTO_LOCK_DELAY = 5 * 60 * 1000; // 5 minutos

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
  const zombie_count = ref(0);
  const revealedPasswords = ref({});

  let _inactivityTimer = null;
  let _revealTimers = {};

  const last_sync_timestamp = ref(localStorage.getItem('kadem_vault_last_sync') || null);

  // --- CRIPTOGRAFIA (Web Crypto API) ---
  const _getWebCrypto = () => {
    const webCrypto = globalThis.crypto;

    if (!webCrypto?.subtle) {
      throw new Error("O Cofre exige uma conexão segura (HTTPS) e um navegador compatível com Web Crypto.");
    }

    return webCrypto;
  };

  const _deriveKey = async (password, salt) => {
    const webCrypto = _getWebCrypto();
    const keyMaterial = await webCrypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return await webCrypto.subtle.deriveKey(
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

    const webCrypto = _getWebCrypto();
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await webCrypto.subtle.encrypt(
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

    const webCrypto = _getWebCrypto();
    const { iv: ivB64, data: dataB64 } = JSON.parse(encryptedBlob);
    const iv = base64ToBuffer(ivB64);
    const data = base64ToBuffer(dataB64);

    const decryptedBuffer = await webCrypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    return decoder.decode(decryptedBuffer);
  };

  // --- GESTÃO DE INATIVIDADE (AUTO-LOCK) ---
  const _resetAutoLock = () => {
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
    if (isUnlocked.value) {
      _inactivityTimer = setTimeout(() => {
        console.warn("[Vault] Inatividade detectada. Trancando cofre.");
        lockVault();
      }, AUTO_LOCK_DELAY);
    }
  };

  const _setupActivityListeners = () => {
    window.addEventListener('mousemove', _resetAutoLock);
    window.addEventListener('keydown', _resetAutoLock);
    window.addEventListener('click', _resetAutoLock);
    _resetAutoLock();
  };

  const _removeActivityListeners = () => {
    window.removeEventListener('mousemove', _resetAutoLock);
    window.removeEventListener('keydown', _resetAutoLock);
    window.removeEventListener('click', _resetAutoLock);
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
  };

  // --- AÇÕES DO COFRE ---

  const lockVault = () => {
    _mek.value = null;

    accounts.value = [];
    revealedPasswords.value = {};

    Object.values(_revealTimers).forEach(timer => clearTimeout(timer));
    _revealTimers = {};

    isUnlocked.value = false;
    _removeActivityListeners();

    console.log("Cofre trancado e memória limpa.");
  };

  const purge_state = () => {
    lockVault();
    last_sync_timestamp.value = null;
  };

  const loadAccountsFromDB = async () => {
    if (!isUnlocked.value) return;

    const encrypted_accounts = await accountsRepository.getAllLocalAccounts();
    const decrypted_list = [];

    zombie_count.value = 0;

    for (const acc of encrypted_accounts) {
      try {
        const decrypted_data = await _decrypt(acc.data, _mek.value);
        const account_data = JSON.parse(decrypted_data);
        decrypted_list.push({
          localId: acc.localId,
          id: acc.id,
          ...account_data
        });
      } catch (err) {
        zombie_count.value++;
        console.warn(`[Vault] Conta órfã detectada (localId ${acc.localId}). Aguardando resgate.`);
      };
    };

    accounts.value = decrypted_list;
  };

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
        await loadAccountsFromDB();
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

  const unlockVault = async (masterPassword, userSalt) => {
    if (isUnlocked.value) return;

    try {
      const keyCandidate = await _deriveKey(masterPassword, userSalt);
      let encryptedValidation = localStorage.getItem('vault_validation');

      if (!encryptedValidation) {
        console.log("Configurando o cofre pela primeira vez...");
        await setupVault(masterPassword, userSalt);
        encryptedValidation = localStorage.getItem('vault_validation');
      }

      try {
        const validationToken = await _decrypt(encryptedValidation, keyCandidate);

        if (validationToken !== "VALID_VAULT_KEY") {
          throw new Error("Senha incorreta (token inválido).");
        }

        _mek.value = keyCandidate;
        isUnlocked.value = true;

        _setupActivityListeners();
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

  const checkMasterPassword = async (masterPassword, userSalt) => {
    try {
      const keyCandidate = await _deriveKey(masterPassword, userSalt);
      const encryptedValidation = localStorage.getItem('vault_validation');
      if (!encryptedValidation) throw new Error("Cofre não inicializado.");

      const validationToken = await _decrypt(encryptedValidation, keyCandidate);
      return validationToken === "VALID_VAULT_KEY";
    } catch (decryptError) {
      return false;
    }
  };

  // --- CRUD CONTAS ---

  const createAccount = async (accountData) => {
    if (!isUnlocked.value) throw new Error("Cofre trancado.");

    const dataString = JSON.stringify(accountData);
    const encryptedBlob = await _encrypt(dataString);
    const localId = await accountsRepository.addLocalAccount(encryptedBlob);

    accounts.value.push({ localId, id: null, ...accountData });
    _resetAutoLock();

    await syncQueueRepository.addSyncQueueTask({
      type: 'CREATE_ACCOUNT',
      payload: { localId, data: encryptedBlob },
      timestamp: new Date().toISOString()
    });
    syncService.processSyncQueue();
  };

  const updateAccount = async (localId, newAccountData) => {
    if (!isUnlocked.value) throw new Error("Cofre trancado.");
    await _updateLastAccess(localId, newAccountData);
  };

  const _updateLastAccess = async (localId, newAccountData = {}) => {
    const accountIndex = accounts.value.findIndex(a => a.localId === localId);
    if (accountIndex === -1) return;

    const newLastAccess = new Date().toISOString();
    const updatedAccount = {
      ...accounts.value[accountIndex],
      ...newAccountData,
      lastAccess: newLastAccess
    };

    accounts.value.splice(accountIndex, 1, updatedAccount);
    _resetAutoLock();

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
      payload: { localId, id: updatedAccount.id, data: encryptedBlob },
      timestamp: new Date().toISOString()
    });

    syncService.processSyncQueue();
  };

  const deleteAccount = async (localId) => {
    const account = accounts.value.find(a => a.localId === localId);
    if (!account) return;

    await accountsRepository.deleteLocalAccount(localId);
    accounts.value = accounts.value.filter(a => a.localId !== localId);
    _resetAutoLock();

    await syncQueueRepository.addSyncQueueTask({
      type: 'DELETE_ACCOUNT',
      payload: { localId, id: account.id },
      timestamp: new Date().toISOString()
    });
    syncService.processSyncQueue();
  };

  const revealPassword = async (localId) => {
    const account = accounts.value.find(a => a.localId === localId);
    if (!account) return;

    await _updateLastAccess(localId);

    revealedPasswords.value[localId] = account.password;

    if (_revealTimers[localId]) clearTimeout(_revealTimers[localId]);

    _revealTimers[localId] = setTimeout(() => {
      if (revealedPasswords.value[localId]) {
        delete revealedPasswords.value[localId];
        delete _revealTimers[localId];
      }
    }, 30 * 1000);
  };

  const hidePassword = (localId) => {
    delete revealedPasswords.value[localId];
    if (_revealTimers[localId]) {
      clearTimeout(_revealTimers[localId]);
      delete _revealTimers[localId];
    }
  };

  const copyPasswordToClipboard = async (localId) => {
    const account = accounts.value.find(a => a.localId === localId);
    if (!account) return false;

    if (!revealedPasswords.value[localId]) {
      await revealPassword(localId);
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

  const get_safe_salt = (email) => {
    return email ? email.trim().toLowerCase() : '';
  };

  const sanitize_recovery_code = (code) => {
    if (!code) return '';
    return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  };

  const generate_recovery_code = () => {
    const array = new Uint8Array(12);
    _getWebCrypto().getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return hex.match(/.{1,4}/g).join('-').toUpperCase();
  };

  const setup_recovery_key = async (master_password, user_salt) => {
    const recovery_code = generate_recovery_code();

    const clean_code = sanitize_recovery_code(recovery_code);
    const recovery_key = await _deriveKey(clean_code, user_salt);

    const recovery_payload = await _encrypt(master_password, recovery_key);

    try {
      await api.post('/users/profile/recovery-payload', { payload: recovery_payload });
      console.log("[Vault] Recovery payload salvo com segurança.");
    } catch (err) {
      console.error("Falha ao salvar payload de recuperação na API.", err);
      throw err;
    };

    return recovery_code;
  };

  const recover_vault_data = async (recovery_code, new_password, user_salt, encrypted_recovery_payload) => {
    try {
      const clean_code = sanitize_recovery_code(recovery_code);
      const recovery_key = await _deriveKey(clean_code, user_salt);

      const old_master_password = await _decrypt(encrypted_recovery_payload, recovery_key);

      await migrate_master_password(old_master_password, new_password, user_salt);

      const new_recovery_code = await setup_recovery_key(new_password, user_salt);

      return new_recovery_code;
    } catch (error) {
      console.error("[Vault] Falha na recuperação E2E:", error);
      throw new Error("Código de recuperação inválido ou dados corrompidos.");
    };
  };

  const migrate_master_password = async (old_password, new_password, user_salt) => {
    const old_key = await _deriveKey(old_password, user_salt);
    const new_key = await _deriveKey(new_password, user_salt);

    const encrypted_accounts = await accountsRepository.getAllLocalAccounts();

    for (const acc of encrypted_accounts) {
      const decrypted_data = await _decrypt(acc.data, old_key);

      const new_encrypted_blob = await _encrypt(decrypted_data, new_key);

      await accountsRepository.updateLocalAccount(acc.localId, new_encrypted_blob);

      await syncQueueRepository.addSyncQueueTask({
        type: 'UPDATE_ACCOUNT_ENCRYPTION',
        payload: {
          localId: acc.localId,
          data: new_encrypted_blob
        },
        timestamp: new Date().toISOString()
      });
    };

    const validation_token = "VALID_VAULT_KEY";
    const new_encrypted_validation = await _encrypt(validation_token, new_key);
    localStorage.setItem('vault_validation', new_encrypted_validation);

    _mek.value = new_key;
    isUnlocked.value = true;
    syncService.processSyncQueue();
  };

  const execute_home_migration = async (recovery_code, current_password, raw_user_salt) => {
    let old_master_password;
    let recovery_key;

    const user_salt = raw_user_salt;

    try {
      const { data } = await api.get('/users/profile/recovery-payload');
      const clean_code = sanitize_recovery_code(recovery_code);
      recovery_key = await _deriveKey(clean_code, user_salt);
      old_master_password = await _decrypt(data.recovery_payload, recovery_key);
    } catch (err) {
      throw new Error("Código de Recuperação (Senha Mestra) inválido ou erro de rede.");
    };

    const old_key = await _deriveKey(old_master_password, user_salt);
    const new_key = await _deriveKey(current_password, user_salt);

    localStorage.removeItem('kadem_vault_last_sync');
    last_sync_timestamp.value = null;
    await pullAccounts();

    const encrypted_accounts = await accountsRepository.getAllLocalAccounts();

    for (const acc of encrypted_accounts) {
      try {
        const decrypted_data = await _decrypt(acc.data, old_key);
        const new_encrypted_blob = await _encrypt(decrypted_data, new_key);

        await accountsRepository.saveLocalAccount({ ...acc, data: new_encrypted_blob });

        await syncQueueRepository.addSyncQueueTask({
          type: 'UPDATE_ACCOUNT',
          payload: { localId: acc.localId, id: acc.id, data: new_encrypted_blob },
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn(`[Vault] Conta ${acc.id} ignorada por falha prévia.`, e);
      };
    };

    const validationToken = "VALID_VAULT_KEY";
    const new_encrypted_validation = await _encrypt(validationToken, new_key);
    localStorage.setItem('vault_validation', new_encrypted_validation);

    const new_recovery_payload = await _encrypt(current_password, recovery_key);
    await api.post('/users/profile/recovery-payload', { payload: new_recovery_payload });

    await api.post('/users/profile/complete-migration');

    const time_shield = new Date().toISOString();
    localStorage.setItem('kadem_vault_last_sync', time_shield);
    last_sync_timestamp.value = time_shield;

    syncService.processSyncQueue();
    return true;
  };

  const rescue_legacy_accounts = async (test_password, test_email) => {
    if (!isUnlocked.value) {
      throw new Error("O cofre precisa estar destrancado com sua senha atual primeiro.");
    }

    const test_key = await _deriveKey(test_password, test_email);
    const encrypted_accounts = await accountsRepository.getAllLocalAccounts();

    let recovered_count = 0;

    for (const acc of encrypted_accounts) {
      let is_zombie = false;
      try {
        await _decrypt(acc.data, _mek.value);
      } catch (e) {
        is_zombie = true;
      }

      if (is_zombie) {
        try {
          const decrypted_data = await _decrypt(acc.data, test_key);

          const new_encrypted_blob = await _encrypt(decrypted_data, _mek.value);

          await accountsRepository.saveLocalAccount({ ...acc, data: new_encrypted_blob });

          await syncQueueRepository.addSyncQueueTask({
            type: 'UPDATE_ACCOUNT',
            payload: { localId: acc.localId, id: acc.id, data: new_encrypted_blob },
            timestamp: new Date().toISOString()
          });

          recovered_count++;
        } catch (e) {
          console.error(e)
        }
      }
    }

    if (recovered_count > 0) {
      await loadAccountsFromDB();
      syncService.processSyncQueue();
    }

    return recovered_count;
  };

  return {
    zombie_count,
    rescue_legacy_accounts,
    setup_recovery_key,
    execute_home_migration,
    generate_recovery_code,
    recover_vault_data,
    pullAccounts,
    _updateLastAccess,
    isUnlocked,
    accounts,
    revealedPasswords,
    unlockVault,
    lockVault,
    purge_state,
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
