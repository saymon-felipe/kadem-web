import { GENOS_KEY_STORAGE } from "./genosAccess.js";

/**
 * Caixa de entrada do Genos. Cada abertura do PWA por intent (URL) carrega uma página nova: o Chrome perde o toque da
 * pessoa (sem ele o som não começa sozinho) e a tela do Kadem recarrega. Por isso, com o Kadem já aberto, o Genos não
 * abre a URL: ele deixa o comando esperando no servidor local do celular e esta página o busca (a mesma `key` do
 * Genos, aceita neste aparelho). O comando tem os mesmos campos da URL (genos=play, playlist|track, shuffle, key, nonce).
 */
export const GENOS_PORT_STORAGE = "kadem_genos_port";
export const DEFAULT_GENOS_PORT = 38517;
export const INBOX_INTERVAL_MS = 2000;

const INBOX_TIMEOUT_MS = 2500;
const ATTEMPTS = [{ targetAddressSpace: "loopback" }, { targetAddressSpace: "local" }, {}];

const default_storage = () => (typeof localStorage === "undefined" ? null : localStorage);

const read = (storage, key) => {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
};

export const is_port = (port) => Number.isInteger(port) && port >= 1024 && port <= 65535;

/** Guarda a porta do servidor do Genos para as próximas vezes (ela chega na URL de abertura). */
export function remember_port(port, storage = default_storage()) {
  if (!is_port(port) || !storage) return;
  try { storage.setItem(GENOS_PORT_STORAGE, String(port)); } catch { /* armazenamento indisponível */ }
}

export function stored_port(storage = default_storage()) {
  const port = Number(read(storage, GENOS_PORT_STORAGE));
  return is_port(port) ? port : DEFAULT_GENOS_PORT;
}

/** A chave do Genos aceita neste aparelho, ou "" quando nenhuma foi aceita (então não há o que consultar). */
export function stored_key(storage = default_storage()) {
  return String(read(storage, GENOS_KEY_STORAGE) ?? "");
}

// Depois que um valor de `targetAddressSpace` funciona, ele é usado primeiro: o aviso de rede local não repete tentativas.
let preferred = 0;

/**
 * Pergunta ao Genos se há comando esperando. Devolve `{ state, command? }`:
 *   command     → comando entregue (campos da URL);
 *   empty       → nada esperando;
 *   rejected    → o Genos recusou (chave que ele não conhece);
 *   unreachable → o servidor do Genos não respondeu.
 */
export async function poll_inbox({ port, key }, { fetchImpl = globalThis.fetch } = {}) {
  if (!is_port(port) || !key || typeof fetchImpl !== "function") return { state: "unreachable" };
  const order = [...ATTEMPTS.slice(preferred), ...ATTEMPTS.slice(0, preferred)];
  for (const attempt of order) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), INBOX_TIMEOUT_MS) : null;
    try {
      const response = await fetchImpl(`http://127.0.0.1:${port}/kadem/v1/inbox`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ key }),
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        ...(controller ? { signal: controller.signal } : {}),
        ...attempt,
      });
      preferred = ATTEMPTS.indexOf(attempt);
      if (!response.ok) return { state: "rejected" };
      const body = await response.json();
      const command = body?.command;
      return command && typeof command === "object" ? { state: "command", command } : { state: "empty" };
    } catch {
      // Tenta o próximo valor de targetAddressSpace; um valor desconhecido pelo navegador falha rápido.
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return { state: "unreachable" };
}
