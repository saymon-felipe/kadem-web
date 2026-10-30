// Links e endereços digitados em texto livre nos compromissos da Agenda (local e anotações).

const TLDS = "com|net|org|edu|gov|br|io|dev|app|co|me|us|tv|ai|be|ly|info|biz|xyz|online|site|link|page";
const LINK_PATTERN = new RegExp(
  `(?:https?:\\/\\/|www\\.)[^\\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLDS})(?::\\d{2,5})?(?:[/?#][^\\s<>"']*)?`,
  "gi",
);
const MEETING_HOSTS = /(^|\.)(meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|whereby\.com)$/i;

const CEP_PATTERN = /\b(\d{5})-?(\d{3})\b/;
const STREET_PATTERN =
  /^(?:r|rua|av|avenida|al|alameda|tv|travessa|pça|pca|praça|praca|rod|rodovia|estr|estrada|largo|beco|viela|via|quadra|setor)\b\.?/i;
const NUMBERED_PATTERN = /[a-zà-ÿ]{3,}[^,]*,\s*(?:n[º°o]?\.?\s*)?\d{1,5}(?![\dº°ª])/i;

const WORD_CHAR = /[\p{L}\p{N}_@]/u;

export const mapsUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

// Tira a pontuação que costuma colar no fim de um link ("veja meet.google.com/abc.") e o parêntese que não abriu.
function trimTrailing(raw) {
  let value = raw.replace(/[.,;:!?'"]+$/, "");
  while (/[)\]}]$/.test(value)) {
    const closer = value.slice(-1);
    const opener = { ")": "(", "]": "[", "}": "{" }[closer];
    if (value.split(closer).length <= value.split(opener).length) break;
    value = value.slice(0, -1).replace(/[.,;:!?'"]+$/, "");
  }
  return value;
}

// Só http(s): o que o usuário digitou nunca vira outro protocolo (javascript:, data:…).
export function toHref(raw) {
  const hasProtocol = /^https?:\/\//i.test(raw);
  if (!hasProtocol && /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return null;
  const candidate = hasProtocol ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function describeLink(href) {
  const url = new URL(href);
  const host = url.host.replace(/^www\./i, "");
  const path = url.pathname === "/" ? "" : url.pathname;
  const short = `${host}${path}`;
  return {
    meeting: MEETING_HOSTS.test(url.hostname),
    detail: short.length > 42 ? `${short.slice(0, 41)}…` : short,
  };
}

// Posição e endereço de cada link do texto, na ordem em que aparecem (e-mails e "palavra.palavra" ficam de fora).
export function findLinks(text) {
  const source = String(text || "");
  const found = [];
  LINK_PATTERN.lastIndex = 0;
  let match;
  while ((match = LINK_PATTERN.exec(source))) {
    const start = match.index;
    const raw = trimTrailing(match[0]);
    const before = source[start - 1];
    const after = source[start + raw.length];
    // Colado em outra palavra ("a@b.com", "x.y.com") ou depois de um protocolo que não é http(s) ("ftp://…").
    const glued =
      (before && /[\p{L}\p{N}_@.-]/u.test(before)) ||
      (after && WORD_CHAR.test(after)) ||
      source.slice(Math.max(0, start - 3), start) === "://";
    const href = glued || !raw ? null : toHref(raw);
    if (href) found.push({ start, end: start + raw.length, text: raw, href });
    LINK_PATTERN.lastIndex = Math.max(LINK_PATTERN.lastIndex, start + Math.max(raw.length, 1));
  }
  return found;
}

// O texto em pedaços, com `href` nos que são link (para exibir anotações com links clicáveis).
export function linkSegments(text) {
  const source = String(text || "");
  const segments = [];
  let cursor = 0;
  for (const link of findLinks(source)) {
    if (link.start > cursor) segments.push({ text: source.slice(cursor, link.start) });
    segments.push({ text: link.text, href: link.href });
    cursor = link.end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor) });
  return segments;
}

export function isAddressLike(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return CEP_PATTERN.test(value) || STREET_PATTERN.test(value) || NUMBERED_PATTERN.test(value);
}

function linkChip(link) {
  const { meeting, detail } = describeLink(link.href);
  return { kind: "link", href: link.href, label: meeting ? "Entrar na reunião" : "Abrir link", detail };
}

// Selo que acompanha o campo "Local": link montado e clicável, ou endereço/CEP que leva ao Google Maps.
// Nome de lugar sem cara de endereço ("Sala 2", "Escritório") não ganha selo.
export function locationChip(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const [first] = findLinks(text);
  if (first) return linkChip(first);

  if (!isAddressLike(text)) return null;
  const cep = text.match(CEP_PATTERN);
  const onlyCep = cep && text.replace(CEP_PATTERN, "").replace(/[\s,.-]/g, "") === "";
  const formatted = cep ? `${cep[1]}-${cep[2]}` : "";
  return {
    kind: "maps",
    href: mapsUrl(onlyCep ? `${formatted}, Brasil` : text),
    label: "Ver no Google Maps",
    detail: onlyCep ? `CEP ${formatted}` : text.length > 42 ? `${text.slice(0, 41)}…` : text,
  };
}

// Links que aparecem nas anotações, sem repetir o mesmo endereço.
export function linkChips(text, { limit = 4 } = {}) {
  const seen = new Set();
  const chips = [];
  for (const link of findLinks(text)) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    chips.push(linkChip(link));
    if (chips.length >= limit) break;
  }
  return chips;
}
