// Comandos que o Genos (app Android pessoal) envia ao Radio Flow pela URL de abertura do PWA:
//   /?genos=play&playlist=<nome falado>&shuffle=1&key=<chave do Genos>&nonce=<id>
//   /?genos=play&track=<música falada>&key=<chave do Genos>&nonce=<id>
// Funções puras (sem stores nem alias "@/"), testadas por `npm run test:genos`.

// `req` e `port` são da ponte Agenda/Health/Nexo (utils/genos_bridge.js); saem da URL junto com os demais.
export const GENOS_QUERY_KEYS = Object.freeze(["genos", "playlist", "track", "shuffle", "key", "nonce", "req", "port"]);

const MIN_KEY_LENGTH = 16;
const MAX_NAME_LENGTH = 120;

// Palavras que a fala acrescenta sem identificar a playlist ou a música.
const STOPWORDS = new Set([
  "a", "o", "as", "os", "de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas",
  "um", "uma", "minha", "meu", "minhas", "meus", "com", "pra", "para", "feat", "ft", "the",
]);

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** Minúsculas, sem acentos e só letras/números separados por um espaço. */
export function normalize_spoken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function content_tokens(value) {
  return normalize_spoken(value).split(" ").filter((token) => token && !STOPWORDS.has(token));
}

/** A URL de abertura traz um comando do Genos (válido ou não). */
export function has_genos_query(query) {
  return !!query && first(query.genos) != null;
}

/** A query sem os parâmetros do Genos, para limpar a URL depois de ler o comando. */
export function strip_genos_query(query) {
  const rest = { ...query };
  for (const key of GENOS_QUERY_KEYS) delete rest[key];
  return rest;
}

/** O comando da URL, ou null quando ele está incompleto ou não é reconhecido. */
export function parse_genos_command(query) {
  if (!has_genos_query(query) || first(query.genos) !== "play") return null;

  const key = String(first(query.key) ?? "").trim();
  const playlist = String(first(query.playlist) ?? "").trim().slice(0, MAX_NAME_LENGTH);
  const track = String(first(query.track) ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (key.length < MIN_KEY_LENGTH || (!playlist && !track)) return null;

  return {
    action: "play",
    kind: playlist ? "playlist" : "track",
    name: playlist || track,
    shuffle: ["1", "true", "sim"].includes(String(first(query.shuffle) ?? "").toLowerCase()),
    key,
    nonce: String(first(query.nonce) ?? "").slice(0, 64),
  };
}

const LIKED_REQUEST = /^(?:playlist )?(?:as )?(?:minhas? )?(?:musicas )?(?:curtidas?|favoritas?|que eu curti|que curti|preferidas?)$/;

/** "músicas curtidas", "minhas favoritas"… pedem a playlist virtual de curtidas. */
export function is_liked_playlist_request(name) {
  return LIKED_REQUEST.test(normalize_spoken(name));
}

/** Distância de edição (Levenshtein) com limite: devolve limit + 1 quando passa dele. */
export function edit_distance(a, b, limit = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let row_min = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      row_min = Math.min(row_min, current[j]);
    }
    if (row_min > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

// Uma palavra falada corresponde a outra igual ou, se longa, com uma letra trocada ("evidencia" ~ "evidencias").
const token_matches = (spoken, candidates) =>
  candidates.some((token) => token === spoken
    || (spoken.length >= 5 && token.length >= 5 && edit_distance(spoken, token, 1) <= 1));

/** 0–100: quanto o nome [candidate] corresponde ao que foi dito ([wanted]). */
export function score_name(candidate, wanted) {
  const c = normalize_spoken(candidate);
  const w = normalize_spoken(wanted);
  if (!c || !w) return 0;
  if (c === w) return 100;
  if (c.replace(/ /g, "") === w.replace(/ /g, "")) return 96;

  const limit = w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0;
  if (limit && edit_distance(c, w, limit) <= limit) return 90;

  const candidate_tokens = content_tokens(c);
  const wanted_tokens = content_tokens(w);
  if (!wanted_tokens.length || !candidate_tokens.length) return 0;

  const hits = wanted_tokens.filter((token) => token_matches(token, candidate_tokens)).length;
  if (hits === wanted_tokens.length) {
    // Tudo o que foi dito está no nome; nomes com muitas palavras a mais valem menos.
    return candidate_tokens.length === wanted_tokens.length ? 88 : Math.max(60, 80 - 4 * (candidate_tokens.length - wanted_tokens.length));
  }
  if (c.startsWith(w) || w.startsWith(c)) return 70;

  const ratio = hits / Math.max(wanted_tokens.length, candidate_tokens.length);
  return ratio >= 0.5 ? Math.round(60 * ratio) : 0;
}

const PLAYLIST_THRESHOLD = 45;

/** A playlist cujo nome melhor corresponde à fala, ou null. Empate: o nome mais curto. */
export function match_playlist(playlists, wanted) {
  let best = null;
  let best_score = 0;
  for (const playlist of playlists || []) {
    const score = score_name(playlist?.name, wanted);
    if (score < PLAYLIST_THRESHOLD) continue;
    if (score > best_score || (score === best_score && String(playlist.name).length < String(best.name).length)) {
      best = playlist;
      best_score = score;
    }
  }
  return best;
}

const TRACK_THRESHOLD = 55;

/**
 * A faixa que melhor corresponde à fala ("evidências", "evidências do chitãozinho"), comparando título e canal.
 * [prefer] desempata a favor de uma faixa (ex.: baixada no aparelho).
 */
export function match_track(tracks, wanted, { prefer = () => false, minimumScore = TRACK_THRESHOLD } = {}) {
  const wanted_tokens = content_tokens(wanted);
  if (!wanted_tokens.length) return null;
  const wanted_text = normalize_spoken(wanted);

  let best = null;
  let best_score = 0;
  for (const track of tracks || []) {
    if (!track) continue;
    const title = normalize_spoken(track.title);
    const title_tokens = content_tokens(title);
    const all_tokens = [...title_tokens, ...content_tokens(track.channel || track.artist)];
    if (!all_tokens.length) continue;

    let score;
    if (title === wanted_text) {
      score = 100;
    } else {
      const hits = wanted_tokens.filter((token) => token_matches(token, all_tokens)).length;
      if (hits === wanted_tokens.length) {
        const in_title = wanted_tokens.every((token) => token_matches(token, title_tokens));
        score = in_title ? 90 : 80;
      } else {
        const ratio = hits / wanted_tokens.length;
        score = wanted_tokens.length >= 3 && ratio >= 0.75 ? Math.round(70 * ratio) : 0;
      }
    }
    if (score >= minimumScore && prefer(track)) score += 5;
    if (score > best_score) {
      best = track;
      best_score = score;
    }
  }
  return best_score >= minimumScore ? best : null;
}

/** Busca primeiro uma correspondência forte cujo arquivo esteja realmente presente no cache. */
export async function match_downloaded_track(tracks, wanted, hasFile) {
  const remaining = [...(tracks || [])];
  while (remaining.length) {
    const candidate = match_track(remaining, wanted, { minimumScore: 80 });
    if (!candidate) return null;
    if (await hasFile(candidate)) return candidate;
    remaining.splice(remaining.indexOf(candidate), 1);
  }
  return null;
}

/** Confirma que a mídia realmente iniciada corresponde ao pedido, sem confundir o áudio anterior com o novo. */
export function is_requested_track_playing(player, youtubeId = "") {
  if (player.is_loading || (youtubeId && player.current_music?.youtube_id !== youtubeId)) return false;
  if (player.player_mode === "native") {
    const media = player.native_audio_instance;
    return !!media && !media.paused && !media.ended && media.readyState >= 3;
  }
  if (player.player_mode === "youtube") {
    const yt = player.yt_player_instance;
    if (yt?.getPlayerState?.() !== 1) return false;
    const activeId = yt.getVideoData?.()?.video_id;
    return !youtubeId || activeId === youtubeId;
  }
  return false;
}

/** Texto curto para a notificação na tela, por motivo de falha. */
export function genos_failure_message(reason, name = "") {
  const quoted = name ? `"${name}"` : "o pedido";
  switch (reason) {
    case "playlist_not_found": return `Não encontrei a playlist ${quoted}.`;
    case "playlist_empty": return `A playlist ${quoted} está vazia.`;
    case "offline_not_downloaded": return `Sem internet, e ${quoted} não tem músicas baixadas neste aparelho.`;
    case "offline_not_found": return `Sem internet, e não encontrei ${quoted} entre as músicas baixadas.`;
    case "not_found": return `Não encontrei ${quoted} no YouTube.`;
    case "search_failed": return `Não consegui pesquisar ${quoted} agora.`;
    default: return `Não consegui tocar ${quoted}.`;
  }
}
