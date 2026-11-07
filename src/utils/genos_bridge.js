// Ponte Genos → Kadem para Agenda, Health e Nexo. O Genos abre o PWA com o pedido na URL (como no Radio Flow, ver
// utils/genos_command.js), o Kadem executa nos dados locais (Dexie, offline-first: o que for gravado entra na fila de
// sincronização) e devolve o resultado ao Genos por um servidor local no celular (services/genosBridge/reply.js).
//
//   /?genos=bridge&req=<JSON em base64url>&key=<chave do Genos>&nonce=<id>&port=<porta local do Genos>
//
// `req` = { v: 1, op: "agenda.list", args: {...}, confirmed: true }
//
// Funções puras (sem stores nem alias "@/"), testadas por `npm run test:genos`.

import { normalize_spoken, score_name } from "./genos_command.js";

export const BRIDGE_PROTOCOL = 1;
export const BRIDGE_SCOPES = Object.freeze(["agenda", "health", "nexo"]);

const MIN_KEY_LENGTH = 16;
const MAX_REQUEST_CHARS = 8000;
const MAX_NONCE_LENGTH = 64;

/**
 * Todas as operações aceitas. `write`: altera dados e só roda com `confirmed: true`, que o Genos envia depois de a pessoa
 * confirmar por voz. O Nexo é somente leitura: nenhuma operação dele escreve.
 */
export const BRIDGE_OPS = Object.freeze({
  ping: { scope: null, write: false },
  "agenda.list": { scope: "agenda", write: false },
  "agenda.find": { scope: "agenda", write: false },
  "agenda.create": { scope: "agenda", write: true },
  "agenda.update": { scope: "agenda", write: true },
  "agenda.delete": { scope: "agenda", write: true },
  "health.list": { scope: "health", write: false },
  "health.find": { scope: "health", write: false },
  "health.object.create": { scope: "health", write: true },
  "health.object.update": { scope: "health", write: true },
  "health.object.delete": { scope: "health", write: true },
  "health.supply.entry": { scope: "health", write: true },
  "health.supply.use": { scope: "health", write: true },
  "nexo.summary": { scope: "nexo", write: false },
  "nexo.transactions": { scope: "nexo", write: false },
  "nexo.investments": { scope: "nexo", write: false },
  "nexo.wealth": { scope: "nexo", write: false },
  "nexo.cards": { scope: "nexo", write: false },
  "nexo.budget": { scope: "nexo", write: false },
});

export const BRIDGE_ERRORS = Object.freeze({
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  CONFIRMATION_REQUIRED: "confirmation_required",
  NOT_FOUND: "not_found",
  AMBIGUOUS: "ambiguous",
  UNAVAILABLE: "unavailable",
  FAILED: "failed",
});

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** Erro de negócio com código estável: o Genos decide o que falar a partir do `code`. */
export class BridgeError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.extra = extra;
  }
}

export const bridge_ok = (data = {}) => ({ ok: true, data });
export const bridge_fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

/** Transforma qualquer erro em resposta; só BridgeError revela a mensagem, o resto vira "failed". */
export function bridge_error_result(error) {
  if (error instanceof BridgeError) return bridge_fail(error.code, error.message, error.extra);
  return bridge_fail(BRIDGE_ERRORS.FAILED, "Não consegui concluir no Kadem.");
}

// --- pedido na URL ---

const to_base64url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const from_base64url = (encoded) => {
  const normalized = String(encoded).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

export function encode_bridge_request(request) {
  return to_base64url(JSON.stringify(request));
}

/** O pedido decodificado e validado, ou null. */
export function decode_bridge_request(encoded) {
  const text = String(encoded ?? "");
  if (!text || text.length > MAX_REQUEST_CHARS || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const request = JSON.parse(from_base64url(text));
    if (!request || typeof request !== "object" || Array.isArray(request)) return null;
    if (request.v !== BRIDGE_PROTOCOL || !Object.hasOwn(BRIDGE_OPS, request.op)) return null;
    const args = request.args ?? {};
    if (!args || typeof args !== "object" || Array.isArray(args)) return null;
    return { v: BRIDGE_PROTOCOL, op: request.op, args, confirmed: request.confirmed === true };
  } catch {
    return null;
  }
}

export function is_valid_port(port) {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/** A URL de abertura traz um comando da ponte (válido ou não). */
export function is_bridge_query(query) {
  return !!query && first(query.genos) === "bridge";
}

/** O comando da ponte na URL de abertura, ou null quando está incompleto ou inválido. */
export function parse_bridge_command(query) {
  if (!is_bridge_query(query)) return null;
  const key = String(first(query.key) ?? "").trim();
  const nonce = String(first(query.nonce) ?? "").trim().slice(0, MAX_NONCE_LENGTH);
  const port = Number(first(query.port));
  const request = decode_bridge_request(first(query.req));
  if (key.length < MIN_KEY_LENGTH || !nonce || !is_valid_port(port) || !request) return null;
  return { action: "bridge", op: request.op, args: request.args, confirmed: request.confirmed, key, nonce, port };
}

export const bridge_op_info = (op) => (Object.hasOwn(BRIDGE_OPS, op) ? BRIDGE_OPS[op] : null);

/** Escopos que o pedido precisa que o Kadem tenha autorizado para esta chave. */
export const bridge_required_scopes = (op) => {
  const info = bridge_op_info(op);
  return info?.scope ? [info.scope] : [];
};

// --- datas locais (o Genos e o Kadem rodam no mesmo aparelho, no mesmo fuso) ---

const pad = (value) => String(value).padStart(2, "0");

/** "2026-11-08" ou "2026-11-08T14:30" (hora local) → { date, dateOnly }, ou null se não existir. */
export function parse_local_datetime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(text ?? "").trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const dateOnly = hour === undefined;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 0), Number(minute || 0), 0, 0);
  const valid = date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    && (dateOnly || (date.getHours() === Number(hour) && date.getMinutes() === Number(minute)));
  return valid ? { date, dateOnly } : null;
}

export const format_local_day = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const format_local_datetime = (date) => `${format_local_day(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function add_local_days(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export const is_month_key = (value) => /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(String(value ?? ""));
export const month_key = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

// --- correspondência por nome falado ---

const MATCH_THRESHOLD = 50;

/**
 * Os candidatos cujo nome corresponde ao que foi dito, do melhor para o pior (empate: o nome mais curto).
 * `name` extrai o texto comparado de cada candidato.
 */
export function rank_matches(candidates, query, { name = (item) => item?.name, threshold = MATCH_THRESHOLD, limit = 5 } = {}) {
  if (!normalize_spoken(query)) return [];
  return (candidates || [])
    .map((item) => ({ item, score: score_name(name(item), query) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score || String(name(a.item)).length - String(name(b.item)).length)
    .slice(0, limit);
}

/**
 * Decide se a fala identifica um único candidato: o primeiro vale quando é o único, ou quando é forte e
 * claramente melhor que o segundo. Sem isso o Genos pergunta qual.
 */
export function pick_unique(matches) {
  if (!matches.length) return { status: "none" };
  if (matches.length === 1) return { status: "one", item: matches[0].item, score: matches[0].score };
  const [best, second] = matches;
  if (best.score >= 80 && best.score - second.score >= 10) return { status: "one", item: best.item, score: best.score };
  return { status: "ambiguous", matches };
}

/** Número finito dentro de [min, max], ou null. Aceita texto ("2,5"). */
export function finite_number(value, { min = -Infinity, max = Infinity } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
