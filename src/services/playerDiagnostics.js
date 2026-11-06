// Registro curto, só na memória da aba (window.__kadem_player_events), de quem pausou ou retomou o player.
// Serve para investigar pausas inesperadas, como a que acontece com o Kadem em segundo plano no Android
// (lido pelo DevTools remoto). Nunca interfere na reprodução nem sai do aparelho.
const MAX_EVENTS = 30;

export function record_player_event(source, detail = {}) {
  try {
    const log = (globalThis.__kadem_player_events ||= []);
    const stack = String(new Error().stack || "")
      .split("\n")
      .slice(2, 8)
      .map((line) => line.trim())
      .join(" | ");
    log.push({
      at: new Date().toISOString(),
      source,
      visibility: globalThis.document?.visibilityState,
      ...detail,
      stack,
    });
    if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
  } catch {
    /* Diagnóstico nunca interfere na reprodução. */
  }
}
