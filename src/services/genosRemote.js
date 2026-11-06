import { api } from "@/plugins/api";
import { radioFlowApi } from "@/services/radioFlowApi";
import { radioRepository } from "@/services/localData";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import { useRadioInsightsStore } from "@/stores/radioInsights";
import { useUtilsStore } from "@/stores/utils";
import {
  is_liked_playlist_request,
  match_downloaded_track,
  match_playlist,
  match_track,
} from "@/utils/genos_command";

/**
 * Controle do Radio Flow pelo Genos (app Android pessoal). O Genos abre o PWA instalado com o comando na URL
 * (ver utils/genos_command.js); a sessão já autenticada neste aparelho é usada como está, sem biometria. A chave do
 * Genos é aceita uma vez, por confirmação na tela, e fica só neste dispositivo.
 *
 * O Genos confirma a reprodução lendo a sessão de mídia do Android: o álbum "Kadem Queue" definido em
 * MediaSessionManager identifica o Kadem; não o altere sem atualizar o Genos.
 */
export const GENOS_KEY_STORAGE = "kadem_genos_remote_key";
const LAST_NONCE_STORAGE = "kadem_genos_last_nonce";

const PLAYER_READY_TIMEOUT_MS = 12000;
const INITIAL_SYNC_TIMEOUT_MS = 6000;
const PLAYBACK_START_TIMEOUT_MS = 15000;
const SEARCH_TIMEOUT_MS = 12000;

const LIKED_PLAYLIST = Object.freeze({
  local_id: "liked",
  name: "Músicas Curtidas",
  is_liked_playlist: true,
  cover: null,
});

const wait_until = (condition, timeout_ms, interval_ms = 150) => new Promise((resolve) => {
  if (condition()) return resolve(true);
  const started_at = Date.now();
  const timer = setInterval(() => {
    const done = condition();
    if (done || Date.now() - started_at >= timeout_ms) {
      clearInterval(timer);
      resolve(!!done);
    }
  }, interval_ms);
});

// Igual ao critério do rastreador de escuta: o áudio está de fato saindo, não só pedido.
const is_really_playing = (player) => {
  if (player.is_loading) return false;
  if (player.player_mode === "native") {
    const media = player.native_audio_instance;
    return !!media && !media.paused && !media.ended && media.readyState >= 3;
  }
  if (player.player_mode === "youtube") return player.yt_player_instance?.getPlayerState?.() === 1;
  return false;
};

const read_storage = (storage, key) => {
  try { return storage.getItem(key); } catch { return null; }
};
const write_storage = (storage, key, value) => {
  try { storage.setItem(key, value); } catch { /* armazenamento indisponível */ }
};

async function liked_tracks() {
  const insights = useRadioInsightsStore();
  await insights.loadLocal();
  const rows = Object.values(insights.reactions || {})
    .filter((row) => row.reaction === 1)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

  return Promise.all(rows.map(async (row) => {
    const local = await radioRepository.getLocalTrackByYoutubeId(row.youtube_id);
    return {
      local_id: local?.local_id || `liked_${row.youtube_id}`,
      youtube_id: row.youtube_id,
      title: local?.title || row.title,
      channel: local?.channel || row.channel,
      duration_seconds: local?.duration_seconds || row.duration_seconds || 0,
      thumbnail: local?.thumbnail || row.thumbnail || null,
      source: row.source || local?.source || "youtube",
      created_at: row.updated_at || local?.created_at || new Date().toISOString(),
      playlist_local_id: "liked",
    };
  }));
}

async function library_tracks(playlists) {
  const entries = [];
  for (const playlist of playlists) {
    if (!playlist || playlist.is_liked_playlist || playlist.local_id === "liked") continue;
    const tracks = await radioRepository.getLocalTracks(playlist.local_id);
    for (const track of tracks || []) entries.push({ track, playlist, tracks });
  }
  const liked = await liked_tracks();
  for (const track of liked) entries.push({ track, playlist: LIKED_PLAYLIST, tracks: liked });
  return entries;
}

export const genosRemote = {
  is_authorized(key) {
    const stored = read_storage(localStorage, GENOS_KEY_STORAGE);
    return !!stored && !!key && stored === key;
  },

  authorize(key) {
    write_storage(localStorage, GENOS_KEY_STORAGE, key);
  },

  /** O mesmo comando (nonce) não roda duas vezes na mesma aba, por exemplo depois de recarregar a página. */
  claim_nonce(nonce) {
    if (!nonce) return true;
    if (read_storage(sessionStorage, LAST_NONCE_STORAGE) === nonce) return false;
    write_storage(sessionStorage, LAST_NONCE_STORAGE, nonce);
    return true;
  },

  /** Executa um comando "play". Devolve { ok, reason?, title? }; nunca lança. */
  async run(command) {
    try {
      return await this._run(command);
    } catch (error) {
      console.warn("[Genos] Falha ao executar o comando.", { name: error?.name, status: error?.response?.status });
      return { ok: false, reason: "playback_failed" };
    }
  },

  async _run(command) {
    const player = usePlayerStore();
    const radio = useRadioStore();
    const utils = useUtilsStore();
    const online = () => utils.connection.connected;
    // Sem internet só tocam as faixas com áudio salvo neste aparelho.
    const playable = (track) => online() || radio.hasTrackAudio(track);

    radioFlowApi.open({ focus: true });

    if (!radio.playlists.length) await radioFlowApi.playlists.load_local();
    if (!radio.playlists.length && online()) await radioFlowApi.playlists.refresh().catch(() => {});

    // Antes de tocar, o player termina de restaurar a sessão anterior e a primeira sincronização traz as preferências
    // do servidor (faixa, fila, app ativo). As duas também desistem se algo tocar antes (player.local_play_epoch),
    // mas esperar evita trocar o embaralhamento e o app ativo pedidos agora.
    await player.wait_for_player_ready(online() ? PLAYER_READY_TIMEOUT_MS : 2000);
    if (online()) await wait_until(() => player.is_initialized, INITIAL_SYNC_TIMEOUT_MS);
    radioFlowApi.open({ focus: true });

    if (command.shuffle) radioFlowApi.set_shuffle(true);
    if (player.is_playing) await radioFlowApi.pause();

    if (command.kind === "playlist") {
      const liked = is_liked_playlist_request(command.name);
      const playlist = liked ? LIKED_PLAYLIST : match_playlist(radio.playlists, command.name);
      if (!playlist) return { ok: false, reason: "playlist_not_found" };

      const tracks = liked ? await liked_tracks() : await radioRepository.getLocalTracks(playlist.local_id);
      if (!tracks?.length) return { ok: false, reason: "playlist_empty", name: playlist.name };

      const available = tracks.filter(playable);
      if (!available.length) return { ok: false, reason: "offline_not_downloaded", name: playlist.name };

      await radioFlowApi.play_playlist(playlist, available);
    } else {
      const library = await library_tracks(radio.playlists);
      const tracks = library.map((entry) => entry.track);
      // O youtube_id identifica o arquivo no cache compartilhado; is_offline pode estar desatualizado.
      const hasFile = async (track) => {
        if (track.audio_blob) return true;
        if (!track.youtube_id) return false;
        try { return await radioRepository.hasGlobalPlayableMedia(track.youtube_id); }
        catch { return false; }
      };
      const downloaded = await match_downloaded_track(tracks, command.name, hasFile);
      const found = downloaded || match_track(tracks, command.name, {
        prefer: (track) => radio.hasTrackAudio(track),
      });
      const entry = found ? library.find((item) => item.track === found) : null;

      const foundDownloaded = !!downloaded || (!!found && !online() && await hasFile(found));
      if (entry && (online() || foundDownloaded)) {
        // A faixa toca dentro da sua playlist, que continua depois dela.
        await radioFlowApi.play_playlist(entry.playlist, entry.tracks.filter((track) => playable(track) || (track === found && foundDownloaded)), found);
      } else if (!online()) {
        return { ok: false, reason: found ? "offline_not_downloaded" : "offline_not_found" };
      } else {
        let item;
        try {
          const { data } = await api.get("/radio/search", { params: { q: command.name }, timeout: SEARCH_TIMEOUT_MS });
          item = data?.items?.find((candidate) => candidate?.youtube_id);
        } catch {
          return { ok: false, reason: "search_failed" };
        }
        if (!item) return { ok: false, reason: "not_found" };
        await radioFlowApi.play_track(item, null, { force_restart: true });
      }
    }

    const started = await wait_until(() => is_really_playing(player), PLAYBACK_START_TIMEOUT_MS);
    if (!started) return { ok: false, reason: "playback_failed" };
    return { ok: true, title: player.current_music?.title || "" };
  },
};
