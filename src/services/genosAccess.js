/**
 * Quem pode controlar o Kadem pelo Genos. O Genos (app Android pessoal) tem uma chave aleatória; a pessoa a aceita uma
 * vez, por confirmação na tela, e ela fica só neste aparelho, com os escopos permitidos:
 *   radio   → tocar playlists e músicas do Radio Flow
 *   agenda  → consultar e (com confirmação por voz) criar, editar e apagar compromissos
 *   health  → consultar e (com confirmação por voz) alterar categorias, agendamentos e insumos
 *   nexo    → consultar movimentações, investimentos e patrimônio (somente leitura)
 *
 * Chaves aceitas antes dos escopos existirem não têm registro de escopos e valem como "radio".
 */
export const GENOS_KEY_STORAGE = "kadem_genos_remote_key";
export const GENOS_SCOPES_STORAGE = "kadem_genos_remote_scopes";
export const GENOS_ALL_SCOPES = Object.freeze(["radio", "agenda", "health", "nexo"]);

const LEGACY_SCOPES = ["radio"];

const read = (storage, key) => {
  try { return storage.getItem(key); } catch { return null; }
};
const write = (storage, key, value) => {
  try { storage.setItem(key, value); } catch { /* armazenamento indisponível */ }
};

const default_storage = () => (typeof localStorage === "undefined" ? null : localStorage);

/** Escopos que a chave tem neste aparelho (vazio se a chave não é a aceita). */
export function scopes_for(key, storage = default_storage()) {
  if (!storage || !key || read(storage, GENOS_KEY_STORAGE) !== key) return [];
  const raw = read(storage, GENOS_SCOPES_STORAGE);
  if (raw === null) return [...LEGACY_SCOPES];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((scope) => GENOS_ALL_SCOPES.includes(scope));
  } catch { /* registro corrompido: sem escopos */ }
  return [];
}

export const has_scopes = (key, required, storage = default_storage()) => {
  const granted = scopes_for(key, storage);
  return required.every((scope) => granted.includes(scope));
};

/** Aceita a chave com os escopos pedidos; os que ela já tinha continuam. Uma chave nova substitui a antiga. */
export function authorize_scopes(key, scopes, storage = default_storage()) {
  if (!storage || !key) return;
  const kept = scopes_for(key, storage);
  const merged = GENOS_ALL_SCOPES.filter((scope) => kept.includes(scope) || scopes.includes(scope));
  write(storage, GENOS_KEY_STORAGE, key);
  write(storage, GENOS_SCOPES_STORAGE, JSON.stringify(merged));
}

/** A frase do consentimento para os escopos pedidos (modal do Kadem). */
export function consent_text(scopes) {
  const parts = [];
  if (scopes.includes("radio")) parts.push("tocar suas playlists e músicas do Radio Flow");
  if (scopes.includes("agenda")) parts.push("consultar a Agenda e, com a sua confirmação por voz, criar, editar e apagar compromissos");
  if (scopes.includes("health")) parts.push("consultar o Health e, com a sua confirmação por voz, criar, editar e apagar categorias, agendamentos e insumos e registrar entradas e usos");
  if (scopes.includes("nexo")) parts.push("consultar o Nexo (movimentações, investimentos e patrimônio), somente leitura");
  return parts.length ? `O Genos, seu app de voz neste celular, poderá ${parts.join("; ")}. A permissão fica só neste aparelho.` : "";
}
