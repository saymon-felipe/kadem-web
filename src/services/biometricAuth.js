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

export async function registerBiometricCredential({ requireHmacSecret = false } = {}) {
  const { startRegistration } = await getWebAuthn();
  const optionsResponse = await api.post("/auth/biometrics/registration/options");
  const credential = await startRegistration({ optionsJSON: optionsResponse.data });

  if (requireHmacSecret && !credential.clientExtensionResults?.hmacCreateSecret) {
    throw new Error(
      "A biometria deste dispositivo não oferece o armazenamento seguro exigido pelo Cofre.",
    );
  }

  await api.post("/auth/biometrics/registration/verify", { credential });
  return credential;
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

export async function authenticateVaultWithBiometrics(email, credentialId, vaultSalt) {
  const { startAuthentication } = await getWebAuthn();
  const optionsResponse = await api.post("/auth/biometrics/login/options", { email });
  const optionsJSON = {
    ...optionsResponse.data,
    allowCredentials: optionsResponse.data.allowCredentials?.filter(
      (credential) => credential.id === credentialId,
    ),
    extensions: {
      ...optionsResponse.data.extensions,
      hmacGetSecret: { salt1: vaultSalt },
    },
  };

  if (!optionsJSON.allowCredentials?.length) {
    throw new Error("A credencial biométrica do Cofre não está disponível neste dispositivo.");
  }

  const credential = await startAuthentication({ optionsJSON });
  const hmacSecret = credential.clientExtensionResults?.hmacGetSecret?.output1;

  if (!(hmacSecret instanceof ArrayBuffer) && !ArrayBuffer.isView(hmacSecret)) {
    throw new Error(
      "A biometria deste dispositivo não oferece o armazenamento seguro exigido pelo Cofre.",
    );
  }

  await api.post("/auth/biometrics/login/verify", { email, credential });

  return new Uint8Array(
    hmacSecret instanceof ArrayBuffer ? hmacSecret : hmacSecret.buffer,
  );
}
