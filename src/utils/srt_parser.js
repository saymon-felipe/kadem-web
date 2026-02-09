/**
 * Converte timestamp string para segundos (fallback para formatos antigos)
 */
function time_to_seconds(time_string) {
  if (!time_string) return 0;
  const normalized = time_string.replace('.', ',');
  const parts = normalized.split(':');
  if (parts.length < 3) return 0;
  const seconds_parts = parts[2].split(',');
  return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + parseInt(seconds_parts[0]) + (parseInt(seconds_parts[1] || 0) / 1000);
}

function clean_text(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
}

/**
 * Parser Híbrido:
 * 1. Se receber um Objeto/Array (JSON3 processado), retorna direto.
 * 2. Se receber String (SRT/VTT), faz o parse via Regex.
 */
export const parse_srt = (srt_content) => {
  if (!srt_content) return [];

  if (Array.isArray(srt_content)) {
    return srt_content;
  }

  if (typeof srt_content === 'string') {
    try {
      const parsed = JSON.parse(srt_content);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Não é JSON, continua para o parser de texto (Regex)
    }
  }

  const content = srt_content.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const pattern = /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/gm;

  const result = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const raw_text = match[3];
    if (!raw_text || !raw_text.trim()) continue;

    result.push({
      start: time_to_seconds(match[1]),
      end: time_to_seconds(match[2]),
      text: clean_text(raw_text)
    });
  }

  return result;
};
