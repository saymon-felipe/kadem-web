import { api } from "@/plugins/api";

export const rememberedEmailKey = "kadem_remembered_email";
export const biometricDeclinedKey = (email) => `kadem_biometric_prompt_declined:${String(email || "").trim().toLowerCase()}`;

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

export async function registerBiometricCredential() {
  const { startRegistration } = await getWebAuthn();
  const optionsResponse = await api.post("/auth/biometrics/registration/options");
  const credential = await startRegistration({ optionsJSON: optionsResponse.data });

  await api.post("/auth/biometrics/registration/verify", { credential });
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
