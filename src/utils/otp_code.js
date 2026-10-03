/**
 * Saneamento dos códigos de verificação em duas etapas.
 *
 * O servidor já ignora o que não é dígito (código do app e do e-mail) ou não é
 * letra/número (código de backup), mas deixar o usuário digitar `[` ou espaço
 * num campo de código só gera dúvida. Aqui o texto é limpo antes de chegar ao
 * estado do componente.
 */
export const OTP_LENGTH = 6; // app autenticador e código enviado por e-mail
export const RECOVERY_CODE_LENGTH = 10; // XXXXX-XXXXX, sem contar o hífen
const RECOVERY_GROUP_LENGTH = 5;

/** Só dígitos, limitado a `max` (colar "123 456" ou "Código: 123456" vira "123456"). */
export function digitsOnly(value, max = OTP_LENGTH) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, max);
}

/** Código de backup sem hífen e em maiúsculas, que é a forma como o servidor compara. */
export function normalizeRecoveryCode(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, RECOVERY_CODE_LENGTH);
}

/** Código de backup no formato de exibição `XXXXX-XXXXX`; o hífen só entra a partir do 6º caractere. */
export function formatRecoveryCode(value) {
  const code = normalizeRecoveryCode(value);
  if (code.length <= RECOVERY_GROUP_LENGTH) return code;
  return `${code.slice(0, RECOVERY_GROUP_LENGTH)}-${code.slice(RECOVERY_GROUP_LENGTH)}`;
}
