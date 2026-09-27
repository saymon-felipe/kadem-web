import { api } from "@/plugins/api";

// Segurança da conta: 2FA, e-mail de recuperação, passkeys e dispositivos/sessões.
// As ações sensíveis podem responder 403 REAUTH_REQUIRED; o interceptor de `api` pede a confirmação
// de identidade e repete a chamada, então nada aqui precisa tratar isso.
// A troca de senha não passa por aqui: é o link enviado por e-mail (ver views/resetPasswordView.vue).

const data = (response) => response.data;

export const securityService = {
  getOverview: () => api.get("/security/overview").then(data),

  // Verificação em duas etapas
  beginTotpSetup: () => api.post("/security/mfa/totp/setup").then(data),
  confirmTotpSetup: (setupToken, code) =>
    api.post("/security/mfa/totp/confirm", { setup_token: setupToken, code }).then(data),
  disableMfa: () => api.delete("/security/mfa").then(data),
  regenerateRecoveryCodes: () => api.post("/security/mfa/recovery-codes").then(data),

  // E-mail de recuperação (o endereço só vale depois de confirmado por código)
  beginRecoveryEmail: (email) => api.post("/security/recovery-email", { email }).then(data),
  confirmRecoveryEmail: (code) => api.post("/security/recovery-email/confirm", { code }).then(data),
  removeRecoveryEmail: () => api.delete("/security/recovery-email").then(data),

  // Passkeys (o cadastro está em services/biometricAuth.js)
  removePasskey: (id) => api.delete(`/security/passkeys/${id}`).then(data),

  // Dispositivos e sessões
  getDevices: () => api.get("/security/devices").then((response) => response.data.devices),
  disconnectDevice: (id) => api.post(`/security/devices/${id}/disconnect`).then(data),
  removeDevice: (id) => api.delete(`/security/devices/${id}`).then(data),
  disconnectAll: (includeCurrent = false) =>
    api.post("/security/devices/disconnect-all", { include_current: includeCurrent }).then(data),
  trustCurrentDevice: () => api.post("/security/devices/current/trust").then(data),
  untrustDevice: (id) => api.delete(`/security/devices/${id}/trust`).then(data),

  // Confirmação de identidade (sessão aberta)
  reauthenticate: ({ password, mfa }) => api.post("/auth/reauth", { password, mfa }).then(data),
  sendReauthEmailCode: () => api.post("/auth/reauth/email/send").then(data),

  // Login em duas etapas (público)
  verifyMfa: ({ mfaToken, method, code }) =>
    api.post("/auth/mfa/verify", { mfa_token: mfaToken, method, code }),
  sendLoginEmailCode: (mfaToken, email) => api.post("/auth/mfa/email/send", { mfa_token: mfaToken, email }).then(data),

  // Redefinição de senha pelo link do e-mail (público: o token do link é a credencial)
  getResetDevices: ({ email, token }) =>
    api.post("/auth/reset_password/sessions", { email, token }).then((response) => response.data.devices),
};

export const mfaMethodLabels = {
  totp: "App autenticador",
  email: "E-mail",
  recovery_code: "Código de backup",
};

export const apiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const apiErrorCode = (error) => error?.response?.data?.data?.code || null;
