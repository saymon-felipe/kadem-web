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
  try {
    const { startRegistration } = await getWebAuthn();
    const optionsResponse = await api.post("/auth/biometrics/registration/options");
    const credential = await startRegistration({ optionsJSON: optionsResponse.data });

    console.info("[Cofre/biometria] Enviando registro para verificação.");
    await api.post("/auth/biometrics/registration/verify", { credential });
    console.info("[Cofre/biometria] Registro biométrico verificado.");

    if (requireHmacSecret && !credential.clientExtensionResults?.hmacCreateSecret) {
      console.error("[Cofre/biometria] hmacCreateSecret não foi disponibilizado pelo autenticador.", {
        extensionNames: Object.keys(credential.clientExtensionResults || {}),
      });
      return null;
    }

    return credential;
  } catch (error) {
    console.error("[Cofre/biometria] Falha ao registrar a credencial.", error);
    return null;
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

export async function authenticateVaultWithBiometrics(email, credentialId, vaultSalt) {
  try {
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
      console.error("[Cofre/biometria] A credencial salva não foi encontrada nas opções de autenticação.", {
        credentialId,
        availableCredentialIds: optionsResponse.data.allowCredentials?.map(
          (credential) => credential.id,
        ),
      });
      return null;
    }

    const credential = await startAuthentication({ optionsJSON });

    // A verificação no servidor deve ocorrer mesmo se a extensão hmac-secret falhar.
    // Assim, a credencial é validada e o console revela exatamente onde o fluxo parou.
    console.info("[Cofre/biometria] Enviando autenticação para /login/verify.");
    await api.post("/auth/biometrics/login/verify", { email, credential });
    console.info("[Cofre/biometria] Autenticação biométrica verificada pelo servidor.");

    const hmacSecret = credential.clientExtensionResults?.hmacGetSecret?.output1;

    if (!(hmacSecret instanceof ArrayBuffer) && !ArrayBuffer.isView(hmacSecret)) {
      console.error("[Cofre/biometria] hmacGetSecret não retornou output1.", {
        extensionNames: Object.keys(credential.clientExtensionResults || {}),
        hasHmacGetSecretResult: Boolean(credential.clientExtensionResults?.hmacGetSecret),
      });
      return null;
    }

    return new Uint8Array(
      hmacSecret instanceof ArrayBuffer ? hmacSecret : hmacSecret.buffer,
    );
  } catch (error) {
    console.error("[Cofre/biometria] Falha na autenticação do Cofre.", error);
    return null;
  }
}
