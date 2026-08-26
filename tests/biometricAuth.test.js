import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

// Execute the actual service/store with isolated API/authenticator/storage adapters.
// Web Crypto remains real, so the round-trip tests exercise the encrypted vault.
async function harness({ registered = true, prfEnabled = true } = {}) {
  const calls = [];
  const logs = [];
  const storage = new Map();
  const accounts = [];
  const state = { secret: new Uint8Array(32).fill(7), failure: null, verifyFailure: null };
  const context = createContext({
    ArrayBuffer, Uint8Array, TextEncoder, TextDecoder, atob, btoa, crypto: webcrypto,
    console: Object.fromEntries(['log', 'debug', 'info', 'warn', 'error'].map(
      (level) => [level, (...args) => logs.push([level, ...args])],
    )),
    window: { addEventListener() {}, removeEventListener() {} },
    navigator: { onLine: false },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    setTimeout: () => 1, clearTimeout() {},
  });
  const api = {
    async get(path) {
      calls.push({ path });
      return { data: { has_credential: registered } };
    },
    async post(path, body) {
      calls.push({ path, body });
      if (path.endsWith('/login/options')) {
        return { data: {
          challenge: 'challenge',
          rpId: 'vault-test.example',
          allowCredentials: [{ id: 'passkey-1', transports: ['internal', 'hybrid'] }],
        } };
      }
      if (path.endsWith('/registration/options')) {
        return { data: { challenge: 'challenge', extensions: { hmacCreateSecret: true } } };
      }
      if (path.endsWith('/login/verify') && state.verifyFailure) throw state.verifyFailure;
      return { data: {} };
    },
  };
  const webauthn = {
    async startRegistration({ optionsJSON }) {
      calls.push({ ceremony: 'create', options: optionsJSON });
      if (state.failure) throw state.failure;
      return { id: 'passkey-1', clientExtensionResults: { prf: { enabled: prfEnabled } } };
    },
    async startAuthentication({ optionsJSON }) {
      calls.push({ ceremony: 'get', options: optionsJSON });
      await state.beforeAuthentication?.();
      if (state.failure) throw state.failure;
      return {
        id: 'passkey-1',
        clientExtensionResults: optionsJSON.extensions.hmacGetSecret
          ? { hmacGetSecret: { output1: state.secret } }
          : { prf: { results: { first: state.secret } } },
      };
    },
  };
  async function synthetic(exports) {
    const module = new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
    await module.link(() => {});
    await module.evaluate();
    return module;
  }
  const apiModule = await synthetic({ api });
  const webauthnModule = await synthetic(webauthn);
  const service = new SourceTextModule(
    await readFile(new URL('../src/services/biometricAuth.js', import.meta.url), 'utf8'),
    { context, importModuleDynamically: () => webauthnModule },
  );
  await service.link(() => apiModule);
  await service.evaluate();
  const dependencies = {
    vue: await synthetic({ ref: (value) => ({ value }) }),
    pinia: await synthetic({ defineStore: (_name, setup) => setup }),
    '../services/biometricAuth': service,
    '../plugins/api': apiModule,
    '../services/localData/accountsRepository': await synthetic({ accountsRepository: {
      getAllLocalAccounts: async () => accounts,
      addLocalAccount: async (data) => { accounts.push({ localId: 1, data }); return 1; },
    } }),
    '../services/localData/syncQueueRepository': await synthetic({ syncQueueRepository: { addSyncQueueTask: async () => {} } }),
    '../services/syncService': await synthetic({ syncService: { processSyncQueue() {} } }),
  };
  const store = new SourceTextModule(
    await readFile(new URL('../src/stores/vault.js', import.meta.url), 'utf8'), { context },
  );
  await store.link((specifier) => dependencies[specifier]);
  await store.evaluate();
  return { service: service.namespace, newVault: store.namespace.useVaultStore, calls, logs, storage, state, navigator: context.navigator };
}

const email = 'vault-test@example.com';
const salt = new Uint8Array(32).fill(1);
const configKey = `kadem_vault_biometric:${email}`;

test('reuses an existing passkey with PRF and never sends its secret to the API', async () => {
  const h = await harness();
  const result = await h.service.prepareVaultBiometricUnlock(email, salt);
  assert.equal(result.credentialId, 'passkey-1');
  assert.deepEqual(result.secret, h.state.secret);
  assert.equal(h.calls.some((call) => call.ceremony === 'create'), false);
  assert.equal(h.calls.find((call) => call.ceremony === 'get').options.extensions.prf.eval.first, salt);
  const verified = h.calls.find((call) => call.path?.endsWith('/login/verify'));
  assert.equal(verified.body.credential.clientExtensionResults.prf, undefined);
});

test('first enrollment requests PRF, verifies registration, then authenticates', async () => {
  const h = await harness({ registered: false });
  assert.ok(await h.service.prepareVaultBiometricUnlock(email, salt));
  const create = h.calls.find((call) => call.ceremony === 'create');
  assert.ok(create.options.extensions.prf);
  assert.equal(create.options.extensions.hmacCreateSecret, undefined);
  const paths = h.calls.filter((call) => call.path).map((call) => call.path);
  assert.ok(paths.indexOf('/auth/biometrics/registration/verify') < paths.indexOf('/auth/biometrics/login/options'));
});

test('missing PRF reports a controlled error after server verification, without registering duplicates', async () => {
  const h = await harness();
  h.state.secret = undefined;
  let message;
  assert.equal(await h.service.prepareVaultBiometricUnlock(email, salt, { onError: (value) => { message = value; } }), null);
  assert.match(message, /PRF/);
  assert.ok(h.calls.find((call) => call.path?.endsWith('/login/verify')));
  assert.equal(h.calls.some((call) => call.ceremony === 'create'), false);
});

test('registration without PRF support does not report successful setup', async () => {
  const h = await harness({ registered: false, prfEnabled: false });
  let message;
  assert.equal(await h.service.prepareVaultBiometricUnlock(email, salt, { onError: (value) => { message = value; } }), null);
  assert.match(message, /PRF/);
  assert.equal(h.calls.some((call) => call.ceremony === 'get'), false);
});

test('legacy hmac-secret uses the original salt and respects BufferSource offsets', async () => {
  const h = await harness();
  const buffer = new Uint8Array(64).fill(5);
  h.state.secret = new DataView(buffer.buffer, 16, 32);
  const result = await h.service.authenticateVaultWithBiometrics(email, 'passkey-1', salt, { keyDerivation: 'hmac-secret' });
  assert.deepEqual(result.secret, new Uint8Array(32).fill(5));
  assert.equal(h.calls.find((call) => call.ceremony === 'get').options.extensions.hmacGetSecret.salt1, salt);
  assert.equal(h.calls.find((call) => call.path?.endsWith('/login/verify')).body.credential.clientExtensionResults.hmacGetSecret, undefined);
});

test('server rejection never returns a secret or logs raw HTTP credentials', async () => {
  const h = await harness();
  h.state.verifyFailure = { name: 'AxiosError', response: { status: 401 }, config: { secret: 'sensitive-marker' } };
  assert.equal(await h.service.prepareVaultBiometricUnlock(email, salt), null);
  assert.equal(JSON.stringify(h.logs).includes('sensitive-marker'), false);
});

test('invalid secret length is rejected and cancellation is returned without throwing', async () => {
  const h = await harness();
  h.state.secret = new Uint8Array(16);
  assert.equal(await h.service.prepareVaultBiometricUnlock(email, salt), null);
  h.state.failure = new DOMException('User cancelled', 'NotAllowedError');
  let message;
  assert.equal(await h.service.prepareVaultBiometricUnlock(email, salt, { onError: (value) => { message = value; } }), null);
  assert.equal(message, '');
});

test('vault enrollment survives reopening and decrypts accounts with the biometric key', async () => {
  const h = await harness();
  const vault = h.newVault();
  const password = 'test-master-password';
  await vault.unlockVault(password, email);
  await vault.createAccount({ name: 'test-account', password: 'test-secret' });
  assert.equal(await vault.enableBiometricUnlock(email), true);
  const config = JSON.parse(h.storage.get(configKey));
  assert.equal(config.key_derivation, 'prf');
  assert.equal(config.version, 2);
  assert.deepEqual(config.credential_transports, ['internal', 'hybrid']);
  assert.equal(config.rp_id, 'vault-test.example');
  assert.equal(h.storage.get(configKey).includes(password), false);
  vault.lockVault();
  const reopened = h.newVault();
  assert.equal(reopened.hasBiometricUnlock(email), true);
  assert.equal(await reopened.unlockVaultWithBiometrics(email), true);
  assert.equal(reopened.accounts.value[0].password, 'test-secret');
});

test('vault biometric unlock is fully local and does not call the API', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  assert.equal(await vault.enableBiometricUnlock(email), true);
  vault.lockVault();
  h.calls.length = 0;

  assert.equal(await vault.unlockVaultWithBiometrics(email), true);
  assert.equal(h.calls.some((call) => call.path), false);
  const authentication = h.calls.find((call) => call.ceremony === 'get');
  assert.equal(authentication.options.allowCredentials[0].id, 'passkey-1');
  assert.deepEqual([...authentication.options.allowCredentials[0].transports], ['internal', 'hybrid']);
  assert.equal(authentication.options.rpId, 'vault-test.example');
  assert.equal(authentication.options.userVerification, 'required');
});

test('local biometric failure explains the offline password fallback', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  await vault.enableBiometricUnlock(email);
  vault.lockVault();
  h.state.failure = new Error('Authenticator unavailable');

  assert.equal(await vault.unlockVaultWithBiometrics(email), false);
  assert.match(vault.biometricError.value, /não funciona offline.*senha/i);
});

test('an Android-style local NotAllowedError also shows the password fallback', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  await vault.enableBiometricUnlock(email);
  vault.lockVault();
  h.state.failure = new DOMException('The request is not allowed', 'NotAllowedError');

  assert.equal(await vault.unlockVaultWithBiometrics(email), false);
  assert.match(vault.biometricError.value, /não funciona offline.*senha/i);
});

test('an online local biometric failure does not claim that the device is offline', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  await vault.enableBiometricUnlock(email);
  vault.lockVault();
  h.navigator.onLine = true;
  h.state.failure = new DOMException('The request is not allowed', 'NotAllowedError');

  assert.equal(await vault.unlockVaultWithBiometrics(email), false);
  assert.match(vault.biometricError.value, /não foi possível concluir a biometria/i);
});

test('wrong biometric secret keeps the vault locked and password fallback usable', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  await vault.enableBiometricUnlock(email);
  vault.lockVault();
  h.state.secret = new Uint8Array(32).fill(99);
  assert.equal(await vault.unlockVaultWithBiometrics(email), false);
  assert.equal(vault.isUnlocked.value, false);
  assert.ok(vault.biometricError.value);
  await vault.unlockVault('password', email);
  assert.equal(vault.isUnlocked.value, true);
});

test('failed setup or locking during the biometric prompt never persists a configuration', async () => {
  const h = await harness();
  const vault = h.newVault();
  await vault.unlockVault('password', email);
  h.state.secret = undefined;
  assert.equal(await vault.enableBiometricUnlock(email), false);
  assert.equal(h.storage.has(configKey), false);
  h.state.secret = new Uint8Array(32).fill(7);
  h.state.beforeAuthentication = () => vault.lockVault();
  assert.equal(await vault.enableBiometricUnlock(email), false);
  assert.equal(h.storage.has(configKey), false);
});
