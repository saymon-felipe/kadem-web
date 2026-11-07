import { BRIDGE_PROTOCOL, is_valid_port } from "@/utils/genos_bridge";

/**
 * Devolve o resultado ao Genos pelo servidor local do app, que só existe no celular (127.0.0.1). A chave do Genos e o
 * nonce do pedido vão no corpo: o Genos só aceita a resposta de um pedido em andamento.
 *
 * O Chrome trata o acesso de um site a este aparelho como "rede local": pede uma permissão uma única vez e, em
 * versões novas, o `fetch` indica o destino por `targetAddressSpace`. Cada valor é tentado em ordem; o nome mudou
 * entre versões, e um valor que o navegador não conhece falha rápido sem enviar nada.
 */
const ATTEMPTS = [{ targetAddressSpace: "loopback" }, { targetAddressSpace: "local" }, {}];
const REPLY_TIMEOUT_MS = 5000;

const DIAGNOSTICS_KEY = "__kadem_genos_bridge_events";

export function record_bridge_event(type, detail = {}) {
  try {
    const list = (globalThis[DIAGNOSTICS_KEY] ||= []);
    list.push({ at: new Date().toISOString(), type, ...detail });
    if (list.length > 30) list.splice(0, list.length - 30);
  } catch { /* diagnóstico indisponível */ }
}

export async function reply_to_genos({ port, key, nonce }, result, { fetchImpl = globalThis.fetch } = {}) {
  if (!is_valid_port(port) || typeof fetchImpl !== "function") return false;
  const body = JSON.stringify({ v: BRIDGE_PROTOCOL, nonce, key, ...result });
  for (const attempt of ATTEMPTS) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REPLY_TIMEOUT_MS) : null;
    try {
      const response = await fetchImpl(`http://127.0.0.1:${port}/kadem/v1/result`, {
        method: "POST",
        // text/plain evita um pré-voo extra só por causa do tipo do conteúdo.
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body,
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        ...(controller ? { signal: controller.signal } : {}),
        ...attempt,
      });
      if (response.ok) {
        record_bridge_event("reply:ok", { attempt: JSON.stringify(attempt) });
        return true;
      }
      record_bridge_event("reply:rejected", { status: response.status });
      // O Genos recusou (pedido já respondido, chave errada): outra tentativa não muda nada.
      return false;
    } catch (error) {
      record_bridge_event("reply:error", { attempt: JSON.stringify(attempt), name: error?.name, message: String(error?.message || "").slice(0, 120) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return false;
}
