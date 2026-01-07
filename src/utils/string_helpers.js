/**
 * Decodifica entidades HTML (ex: &amp;, &lt;) para seus caracteres reais.
 * Utiliza o DOMParser nativo do browser para garantir precisão.
 * * @param {String} str - A string contendo entidades HTML
 * @returns {String} - A string decodificada
 */
export const decode_html_entities = (str) => {
  if (!str) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  return doc.documentElement.textContent;
};
