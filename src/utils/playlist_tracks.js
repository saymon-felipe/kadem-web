import { decode_html_entities } from "./string_helpers.js";

const title_collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function normalize_search(value) {
  return decode_html_entities(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function sort_value(track, key) {
  if (key === "title") return decode_html_entities(track.title || "");
  if (key === "created_at") {
    const timestamp = track.created_at ? Date.parse(track.created_at) : NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (key === "duration_seconds") {
    if (track.duration_seconds == null || track.duration_seconds === "") return null;
    const duration = Number(track.duration_seconds);
    return Number.isFinite(duration) ? duration : null;
  }
  return null;
}

// A projeção conserva os objetos originais para reprodução, downloads e arrasto para a fila.
export function get_visible_playlist_tracks(tracks, query = "", sort_key = "", sort_direction = "asc") {
  const terms = normalize_search(query).trim().split(/\s+/).filter(Boolean);
  const visible = terms.length
    ? tracks.filter((track) => {
      const text = `${normalize_search(track.title)} ${normalize_search(track.channel)}`;
      return terms.every((term) => text.includes(term));
    })
    : [...tracks];

  if (!["title", "created_at", "duration_seconds"].includes(sort_key)) return visible;

  const direction = sort_direction === "desc" ? -1 : 1;
  return visible.map((track) => ({ track, value: sort_value(track, sort_key) }))
    .sort((a, b) => {
      // Metadados ausentes ficam ao final em ambas as direções.
      if (a.value === null) return b.value === null ? 0 : 1;
      if (b.value === null) return -1;
      const comparison = sort_key === "title"
        ? title_collator.compare(a.value, b.value)
        : a.value - b.value;
      return comparison * direction;
    })
    .map(({ track }) => track);
}
