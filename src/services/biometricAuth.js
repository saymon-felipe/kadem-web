import { api } from "@/plugins/api";

export const rememberedEmailKey = "kadem_remembered_email";
export const biometricDeclinedKey = (email) => `kadem_biometric_prompt_declined:${String(email || "").trim().toLowerCase()}`;

export function isBiometricCancellationError(error) {
  const errorName = String(error?.name || "");
  const errorMessage = String(error?.message || "").toLowerCase();

  return ["NotAllowedError", "AbortError", "TimeoutError"].includes(errorName)
    || errorMessage.includes("operation either timed out or was not allowed")
    || errorMessage.includes("the operation was canceled")
    || errorMessage.includes("the operation was cancelled");
}

const getWebAuthn = () => import("@simplewebauthn/browser");

const reportBiometricFailure = (stage, error, onError) => {
  const cancelled = isBiometricCancellationError(error);
  const message = cancelled ? "" : (
    typeof error === "string" ? error : "Não foi possível concluir a biometria. Tente novamente."
  );
  // Não registrar o erro bruto: erros HTTP podem conter cookies e a asserção.
  const details = { stage, name: error?.name, status: error?.response?.status };
  if (cancelled) console.info("[Cofre/biometria] Operação cancelada.", details);
  else console.error(`[Cofre/biometria] ${message}`, details);
  onError?.(message);
  return null;
};

// A saída PRF é material da chave do Cofre e nunca deve sair do dispositivo.
const credentialForVerification = (credential) => {
  const extensions = { ...credential.clientExtensionResults };
  delete extensions.hmacGetSecret;
  if (extensions.prf?.enabled !== undefined) {
    extensions.prf = { enabled: extensions.prf.enabled };
  } else {
    delete extensions.prf;
  }
  return { ...credential, clientExtensionResults: extensions };
};

const secretBytes = (value) => {
  let bytes;
  if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
  else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else if (typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value)) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  }
  return bytes?.byteLength === 32 ? bytes.slice() : null;
};

export async function isBiometricSupported() {
  try {
    if (
      !window.PublicKeyCredential
      || typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
    ) {
      return false;
    }

    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometricCredential({ requirePrf = false, onError } = {}) {
  try {
    const { startRegistration } = await getWebAuthn();
    const optionsResponse = await api.post("/auth/biometrics/registration/options", {
      allow_additional_credential: requirePrf,
    });
    const optionsJSON = { ...optionsResponse.data };
    if (requirePrf) {
      optionsJSON.extensions = { ...optionsJSON.extensions, prf: {} };
      delete optionsJSON.extensions.hmacCreateSecret;
    }
    console.info("[Cofre/biometria] Solicitando cadastro no dispositivo.");
    const credential = await startRegistration({ optionsJSON });

    console.info("[Cofre/biometria] Enviando registro para verificação.");
    await api.post("/auth/biometrics/registration/verify", {
      credential: credentialForVerification(credential),
    });
    console.info("[Cofre/biometria] Registro biométrico verificado.");

    if (requirePrf && !credential.clientExtensionResults?.prf?.enabled) {
      return reportBiometricFailure("registration-prf",
        "Esta passkey não oferece PRF para proteger o Cofre. Use a senha para desbloqueá-lo.", onError);
    }

    return credential;
  } catch (error) {
    return reportBiometricFailure("registration", error, onError);
  }
}

export async function getBiometricStatus() {
  const response = await api.get("/auth/biometrics/status");
  return Boolean(response.data?.has_credential);
}

export async function removeBiometricCredentials() {
  await api.delete("/auth/biometrics");
}

export async function authenticateWithBiometrics(email) {
  const { startAuthentication } = await getWebAuthn();
  const optionsResponse = await api.post("/auth/biometrics/login/options", { email });
  const credential = await startAuthentication({ optionsJSON: optionsResponse.data });

  return api.post("/auth/biometrics/login/verify", { email, credential });
}

export async function authenticateVaultWithBiometrics(
  email, credentialId, vaultSalt, { keyDerivation = "prf", onError } = {},
) {
  try {
    if (!["prf", "hmac-secret"].includes(keyDerivation)) {
      return reportBiometricFailure("key-derivation", "Configuração biométrica incompatível. Reative a digital usando sua senha.", onError);
    }
    const { startAuthentication } = await getWebAuthn();
    const optionsResponse = await api.post("/auth/biometrics/login/options", { email });
    const allowed = optionsResponse.data.allowCredentials || [];
    const optionsJSON = {
      ...optionsResponse.data,
      allowCredentials: credentialId ? allowed.filter((item) => item.id === credentialId) : allowed,
      extensions: keyDerivation === "prf"
        ? { prf: { eval: { first: vaultSalt } } }
        : { hmacGetSecret: { salt1: vaultSalt } },
    };

    if (!optionsJSON.allowCredentials?.length) {
      return reportBiometricFailure("allowed-credentials",
        "A credencial do Cofre não está mais cadastrada. Reative a digital usando sua senha.", onError);
    }

    console.info("[Cofre/biometria] Solicitando autenticação no dispositivo.");
    const credential = await startAuthentication({ optionsJSON });
    console.info("[Cofre/biometria] Enviando autenticação para /login/verify.");
    await api.post("/auth/biometrics/login/verify", {
      email, credential: credentialForVerification(credential),
    });
    console.info("[Cofre/biometria] Autenticação biométrica verificada pelo servidor.");

    const output = keyDerivation === "prf"
      ? credential.clientExtensionResults?.prf?.results?.first
      : credential.clientExtensionResults?.hmacGetSecret?.output1;
    const secret = secretBytes(output);
    if (!secret) {
      return reportBiometricFailure("authentication-secret",
        "Esta passkey não retornou o segredo seguro do Cofre. Use a senha; o autenticador precisa oferecer PRF.", onError);
    }
    return { credentialId: credential.id, secret };
  } catch (error) {
    return reportBiometricFailure("authentication", error, onError);
  }
}

export async function prepareVaultBiometricUnlock(email, vaultSalt, { onError } = {}) {
  try {
    let credentialId;
    if (await getBiometricStatus()) {
      console.info("[Cofre/biometria] Reutilizando uma passkey cadastrada.");
    } else {
      const credential = await registerBiometricCredential({ requirePrf: true, onError });
      if (!credential) return null;
      credentialId = credential.id;
    }
    return await authenticateVaultWithBiometrics(email, credentialId, vaultSalt, { onError });
  } catch (error) {
    return reportBiometricFailure("setup", error, onError);
  }
}
