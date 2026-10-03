/**
 * Decodifica entidades HTML (ex: &amp;, &lt;) para seus caracteres reais.
 * Utiliza o DOMParser nativo do browser para garantir precisão.
 * * @param {String} str - A string contendo entidades HTML
 * @returns {String} - A string decodificada
 */
const decoded_cache = new Map();
let html_parser;

export const decode_html_entities = (str) => {
  if (!str) return '';
  if (!/[&<]/.test(str)) return str;
  if (decoded_cache.has(str)) return decoded_cache.get(str);
  html_parser ||= new DOMParser();
  const decoded = html_parser.parseFromString(str, 'text/html').documentElement.textContent;
  if (decoded_cache.size >= 500) decoded_cache.delete(decoded_cache.keys().next().value);
  decoded_cache.set(str, decoded);
  return decoded;
};
