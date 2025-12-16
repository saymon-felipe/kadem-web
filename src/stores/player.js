import { defineStore } from "pinia";
import { markRaw } from "vue";
import { radioRepository } from "../services/localData";
import { api } from "../plugins/api";
import { useRadioStore } from "./radio.js";

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

export const usePlayerStore = defineStore("player", {
  state: () => ({
    current_music: null,
    current_playlist: null,
    queue: [],
    played_history: [],
    is_loading: false,
    is_playing: false,
    player_mode: "none",
    volume: 0.5,
    is_shuffle: false,
    active_app: null,
    mobile_tab: "playlists",
    is_initialized: false,
    yt_player_instance: null,
    native_audio_instance: markRaw(new Audio()),
    current_audio_url: null
  }),

  actions: {
    async play_playlist_context(playlist, tracks, start_track = null) {
      this.current_playlist = playlist;
      let new_queue = [...tracks];
      this.played_history = [];

      if (this.is_shuffle) {
        for (let i = new_queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [new_queue[i], new_queue[j]] = [new_queue[j], new_queue[i]];
        }
      }

      if (start_track) {
        new_queue = new_queue.filter((t) => t.youtube_id !== start_track.youtube_id);
        new_queue.unshift(start_track);
      }

      this.queue = new_queue;

      if (this.queue.length > 0) {
        const first_track = this.queue.shift();
        await this.play_track(first_track, playlist);
      }
      this.syncState();
    },

    setCurrentPlaylist(playlist) {
      this.current_playlist = playlist;
    },

    async play_track(track, playlist = null) {
      if (playlist) {
        this.current_playlist = playlist;
        const tracks = await radioRepository.getLocalTracks(playlist.local_id);
        this.queue = tracks;
      }

      if (this.current_audio_url) {
        URL.revokeObjectURL(this.current_audio_url);
        this.current_audio_url = null;
      }

      const { audio_blob, ...cleanTrack } = track;
      this.current_music = cleanTrack;
      this.is_loading = true;

      await this._handle_media_source(track, true);
      this._update_media_session(track);
      this._update_media_session_position();
      this.syncState();
    },

    async _handle_media_source(track, should_play = true) {
      if (!this.native_audio_instance || typeof this.native_audio_instance.pause !== "function") {
        this.native_audio_instance = markRaw(new Audio());
      }

      try {
        this.native_audio_instance.pause();
        this.native_audio_instance.src = "";
        this.native_audio_instance.ontimeupdate = null;
        this.native_audio_instance.onended = null; // Limpa listener anterior
      } catch (e) {
        console.error("[PlayerStore] Erro ao limpar instância de áudio:", e);
      }

      if (this.yt_player_instance && typeof this.yt_player_instance.pauseVideo === "function") {
        this.yt_player_instance.pauseVideo();
      }

      let finalAudioBlob = track.audio_blob;

      if (!finalAudioBlob && track.youtube_id) {
        try {
          const storedBlob = await radioRepository.getGlobalAudioBlob(track.youtube_id);

          if (storedBlob && storedBlob.size > 1000) {
            finalAudioBlob = storedBlob;
          }
        } catch (err) {
          console.error("[PlayerStore] Erro ao recuperar áudio do armazenamento local:", err);
        }
      }

      if (finalAudioBlob) {
        // --- MODO NATIVO (OFFLINE) ---
        console.log("[Player] Modo: Offline (Nativo) - Blob recuperado");
        this.player_mode = "native";
        this.is_loading = true;

        try {
          this.current_audio_url = URL.createObjectURL(finalAudioBlob);
          this.native_audio_instance.src = this.current_audio_url;
          this.native_audio_instance.volume = this.volume;

          // Sincronia fina para o Media Session
          this.native_audio_instance.ontimeupdate = () => {
            if (Math.floor(this.native_audio_instance.currentTime) % 5 === 0) {
              this._update_media_session_position();
            }
          };

          this.native_audio_instance.onended = () => {
            this.next();
          };

          if (should_play) {
            const playPromise = this.native_audio_instance.play();
            if (playPromise !== undefined) {
              await playPromise.catch((e) => {
                console.warn("[PlayerStore] Autoplay bloqueado ou interrompido:", e);
                this.is_playing = false;
              });
            }
            this.is_playing = true;
          } else {
            this.is_playing = false;
          }
          this.is_loading = false;
        } catch (e) {
          console.error("[PlayerStore] Erro fatal no play nativo:", e);
          // Fallback para YouTube se tiver internet
          if (navigator.onLine) {
            console.warn("[PlayerStore] Fallback para YouTube devido a erro no blob.");
            this.player_mode = "youtube";
            this._playYoutube(track, should_play);
          }
        }

      } else {
        // --- MODO YOUTUBE (ONLINE) ---
        if (!navigator.onLine) {
          console.warn("[PlayerStore] Sem blob e sem internet. Reprodução impossível.");
          this.is_loading = false;
          this.is_playing = false;
          return;
        }

        console.log("[Player] Modo: Online (YouTube)");
        this.player_mode = "youtube";
        this._playYoutube(track, should_play);
      }
    },

    async _playYoutube(track, should_play = true) {
      if (
        this.yt_player_instance &&
        typeof this.yt_player_instance.loadVideoById === "function"
      ) {
        this.is_loading = true;
        this.yt_player_instance.setVolume(this.volume * 100);

        if (should_play) {
          await this.yt_player_instance.loadVideoById({
            videoId: track.youtube_id,
            startSeconds: 0,
          });
          this.is_playing = true;
        } else {
          await this.yt_player_instance.cueVideoById({
            videoId: track.youtube_id,
            startSeconds: 0,
          });
          this.is_playing = false;
        }
        this.is_loading = false;
        this._update_media_session_position();
      } else {
        if (should_play) this.is_loading = true;
      }
    },

    toggle_play() {
      // Se não há música carregada, não faz nada
      if (!this.current_music) return;

      this.is_playing = !this.is_playing;

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = this.is_playing ? "playing" : "paused";
      }

      if (this.player_mode === "native") {
        if (this.native_audio_instance && this.native_audio_instance.src) {
          this.native_audio_instance.volume = this.volume;
          this.is_playing
            ? this.native_audio_instance.play().catch(e => console.warn("Play interrompido", e))
            : this.native_audio_instance.pause();
        }
      } else if (this.player_mode === "youtube") {
        if (
          this.yt_player_instance &&
          typeof this.yt_player_instance.playVideo === "function"
        ) {
          this.is_playing
            ? this.yt_player_instance.playVideo()
            : this.yt_player_instance.pauseVideo();
        }
      }

      this._update_media_session_position();
    },

    set_loading_state(state) {
      this.is_loading = state;
    },

    next() {
      if (this.queue.length === 0) {
        this.is_playing = false;
        return;
      }
      if (this.current_music) this.played_history.push(this.current_music);

      const next_track = this.queue.shift();
      this.play_track(next_track, this.current_playlist);
      this.syncState();
    },

    prev() {
      if (this.played_history.length === 0) return;

      if (this.current_music) this.queue.unshift(this.current_music);

      const prev_track = this.played_history.pop();
      this.play_track(prev_track, this.current_playlist);
      this.syncState();
    },

    track_exist_in_queue(id) {
      return this.queue.find((t) => t.youtube_id === id);
    },
    add_to_queue(track) {
      if (!this.track_exist_in_queue(track.youtube_id)) this.queue.push(track);
      this.syncState();
    },
    set_queue(q) {
      this.queue = [...q];
      this.syncState();
    },
    add_to_queue_at(t, i) {
      if (!this.track_exist_in_queue(t.youtube_id)) this.queue.splice(i, 0, t);
      this.syncState();
    },
    remove_from_queue(i) {
      this.queue.splice(i, 1);
      this.syncState();
    },
    toggle_shuffle() {
      this.is_shuffle = !this.is_shuffle;
      this.syncState();
    },
    set_mobile_tab(t) {
      this.mobile_tab = t;
    },
    setActiveApp(a) {
      this.active_app = a;
    },
    set_volume(val) {
      let clean_val = Math.min(Math.max(val, 0), 1);
      this.volume = clean_val;
      if (this.native_audio_instance) this.native_audio_instance.volume = clean_val;
      if (this.yt_player_instance?.setVolume) {
        this.yt_player_instance.setVolume(clean_val * 100);
      }

      this.syncState();
    },

    seek_to(seconds) {
      if (this.player_mode === "native" && this.native_audio_instance) {
        this.native_audio_instance.currentTime = seconds;
      } else if (this.player_mode === "youtube" && this.yt_player_instance) {
        this.yt_player_instance.seekTo(seconds, true);
      }
      this._update_media_session_position();
    },

    get_current_time() {
      if (this.player_mode === "native" && this.native_audio_instance) {
        return this.native_audio_instance.currentTime || 0;
      }
      if (this.player_mode === "youtube" && this.yt_player_instance?.getCurrentTime) {
        return this.yt_player_instance.getCurrentTime() || 0;
      }
      return 0;
    },

    get_duration() {
      if (this.current_music?.duration_seconds)
        return this.current_music.duration_seconds;
      if (this.player_mode === "native" && this.native_audio_instance)
        return this.native_audio_instance.duration || 0;
      if (this.player_mode === "youtube" && this.yt_player_instance)
        return this.yt_player_instance.getDuration() || 0;
      return 0;
    },

    /* ==========================================================================
       SECTION 4: SYSTEM, SYNC & INITIALIZATION
       ========================================================================== */

    async pullPlayerState() {
      try {
        const response = await api.get("/radio/preferences");
        const prefs = response.data;

        if (prefs && Object.keys(prefs).length > 0) {
          console.log("[PlayerStore] Preferências recebidas:", prefs);

          if (prefs.volume !== undefined) this.volume = prefs.volume;
          if (prefs.is_shuffle !== undefined) this.is_shuffle = !!prefs.is_shuffle;
          if (prefs.active_app) this.active_app = prefs.active_app;
          if (prefs.queue) this.queue = prefs.queue;

          // Restaura Playlist
          if (prefs.current_playlist_id) {
            let pl = await radioRepository.getLocalPlaylistByServerId(
              prefs.current_playlist_id
            );
            if (!pl)
              pl = await radioRepository.getLocalPlaylist(prefs.current_playlist_id);
            if (pl) this.current_playlist = pl;
          }

          // Restaura Track e define modo
          if (prefs.current_track_id) {
            let track = await radioRepository.getLocalTrackByServerId(
              prefs.current_track_id
            );
            if (!track)
              track = await radioRepository.getLocalTrack(prefs.current_track_id);

            if (!track && this.queue.length > 0) {
              track = this.queue.find((t) => t.id === prefs.current_track_id);
            }

            if (track) {
              this.current_music = track;

              const hasBlob = await radioRepository.hasGlobalAudio(track.youtube_id);
              this.player_mode = hasBlob ? "native" : "youtube";
              this.is_playing = false;
            }
          }
        }
      } catch (error) {
        console.warn("[PlayerStore] Falha ao carregar preferências:", error.message);
      } finally {
        this.is_initialized = true;
      }
    },

    /**
     * Sincroniza estado local com API, com debounce para evitar flood.
     */
    syncState: debounce(async function () {
      if (!this.is_initialized) return;

      let plId = null;
      let trId = null;

      // Resolução de IDs (Local vs Server)
      if (this.current_playlist) {
        if (this.current_playlist.id) {
          plId = this.current_playlist.id;
        } else if (this.current_playlist.local_id) {
          const freshPl = await radioRepository.getLocalPlaylist(
            this.current_playlist.local_id
          );
          if (freshPl && freshPl.id) {
            plId = freshPl.id;
            this.current_playlist.id = freshPl.id;
          }
        }
      }

      if (this.current_music) {
        if (this.current_music.id) {
          trId = this.current_music.id;
        } else if (this.current_music.local_id) {
          const freshTr = await radioRepository.getLocalTrack(
            this.current_music.local_id
          );
          if (freshTr && freshTr.id) {
            trId = freshTr.id;
            this.current_music.id = freshTr.id;
          }
        }
      }

      const sanitizedQueue = this.queue.map((t) => {
        const { audio_blob, ...rest } = t;
        return rest;
      });

      const payload = {
        active_app: this.active_app,
        volume: this.volume,
        is_shuffle: this.is_shuffle,
        current_playlist_id: plId,
        current_track_id: trId,
        queue: sanitizedQueue,
      };

      try {
        await api.put("/radio/preferences", payload);
      } catch (error) {
        console.error("[PlayerStore] Erro no sync:", error);
      }
    }, 2000),

    /**
     * Restaura a conexão visual/áudio do player após reload da página.
     */
    async restorePlayerConnection() {
      console.log("[PlayerStore] Restaurando conexão com UI...");

      if (this.current_music && this.player_mode === "youtube") {
        if (
          this.yt_player_instance &&
          typeof this.yt_player_instance.cueVideoById === "function"
        ) {
          await this.yt_player_instance.cueVideoById({
            videoId: this.current_music.youtube_id,
            startSeconds: 0,
          });
        }
      } else if (this.current_music && this.player_mode === "native") {
        await this._handle_media_source(this.current_music, false);
      }

      this.is_loading = false;
      this.is_playing = false;
    },

    clearState() {
      // 1. Parar Execução (YouTube)
      if (
        this.yt_player_instance &&
        typeof this.yt_player_instance.stopVideo === "function"
      ) {
        try {
          this.yt_player_instance.stopVideo();
          this.yt_player_instance.clearVideo();
        } catch (e) {
          console.warn("[PlayerStore] Erro ao limpar YouTube:", e);
        }
      }

      // 2. Parar Execução (Nativo) e Limpar Memória
      if (
        this.native_audio_instance &&
        typeof this.native_audio_instance.pause === "function"
      ) {
        this.native_audio_instance.pause();
        this.native_audio_instance.currentTime = 0;
        this.native_audio_instance.src = "";
      }

      if (this.current_audio_url) {
        URL.revokeObjectURL(this.current_audio_url);
        this.current_audio_url = null;
      }

      // 3. Reset de Estado e Persistência
      this.played_history = [];
      this.is_initialized = false;
      this.is_playing = false;
      localStorage.removeItem("player");

      this.$reset();

      this.native_audio_instance = markRaw(new Audio());
    },

    /* ==========================================================================
       SECTION 5: HELPERS & UTILS
       ========================================================================== */

    register_yt_instance(player) {
      this.yt_player_instance = markRaw(player);
      if (this.yt_player_instance?.setVolume)
        this.yt_player_instance.setVolume(this.volume * 100);
      if (this.is_playing && this.current_music)
        this._playYoutube(this.current_music, true);
    },

    _update_media_session(track) {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.channel || "Kadem Radio",
        album: this.current_playlist?.name || "Radio Flow",
        artwork: [{ src: track.thumbnail || "", sizes: "96x96", type: "image/png" }],
      });

      navigator.mediaSession.setActionHandler("play", () => this.toggle_play());
      navigator.mediaSession.setActionHandler("pause", () => this.toggle_play());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.next());

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          this.seek_to(details.seekTime);
        }
      });
    },

    _update_media_session_position() {
      if (!("mediaSession" in navigator)) return;

      const duration = this.get_duration();
      const position = this.get_current_time();

      if (!Number.isFinite(duration) || !Number.isFinite(position) || duration <= 0)
        return;

      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: this.is_playing ? 1.0 : 0.0,
          position: Math.min(position, duration),
        });
      } catch (e) {
        // Ignora erros de arredondamento
      }
    },
  },

  persist: {
    paths: [
      "current_music",
      "current_playlist",
      "queue",
      "played_history",
      "volume",
      "is_shuffle",
      "active_app",
      "mobile_tab",
    ],
    serializer: {
      serialize: (state) =>
        JSON.stringify(state, (key, value) => {
          if (key === "audio_blob") return undefined;
          return value;
        }),
      deserialize: (value) => JSON.parse(value),
    },
    afterRestore: (ctx) => {
      ctx.store.yt_player_instance = null;
      ctx.store.is_playing = false;
      ctx.store.is_loading = false;
      ctx.store.current_audio_url = null;

      if (ctx.store.volume > 1) ctx.store.volume = ctx.store.volume / 100;

      if (
        !ctx.store.native_audio_instance ||
        typeof ctx.store.native_audio_instance.pause !== "function"
      ) {
        ctx.store.native_audio_instance = markRaw(new Audio());
      }
      if (ctx.store.native_audio_instance) {
        ctx.store.native_audio_instance.volume = ctx.store.volume;
      }
    },
  },
});
