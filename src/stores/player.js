import { defineStore } from "pinia";
import { markRaw } from "vue";
import { radioRepository } from "../services/localData";
import { api } from "../plugins/api";

// Helper para evitar chamadas excessivas à API
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
    // Dados da Música e Contexto
    current_music: null,
    current_playlist: null,

    // Filas e Histórico
    queue: [],
    played_history: [],

    is_loading: false,

    // Estado do Player
    is_playing: false,
    player_mode: "none", // 'native' | 'youtube' | 'none'
    volume: 50,
    is_shuffle: false,

    // UI e Navegação
    active_app: null,
    mobile_tab: "playlists",
    is_initialized: false,

    // Instâncias de Mídia (Não Reativas para Performance)
    yt_player_instance: null,
    native_audio_instance: markRaw(new Audio()),
    current_audio_url: null, // Referência para revogação de Blob URL
  }),

  actions: {

    /* ==========================================================================
       SECTION 1: CORE PLAYBACK LOGIC (Engine)
       ========================================================================== */

    /**
     * Inicia uma playlist completa, resetando histórico e aplicando shuffle se necessário.
     */
    async play_playlist_context(playlist, tracks, start_track = null) {
      this.current_playlist = playlist;
      let new_queue = [...tracks];

      // Reseta histórico para novo contexto
      this.played_history = [];

      if (this.is_shuffle) {
        // Algoritmo Fisher-Yates shuffle
        for (let i = new_queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [new_queue[i], new_queue[j]] = [new_queue[j], new_queue[i]];
        }
      }

      // Se há uma faixa inicial específica, garante que ela seja a primeira
      if (start_track) {
        new_queue = new_queue.filter((t) => t.youtube_id !== start_track.youtube_id);
        new_queue.unshift(start_track);
      }

      this.queue = new_queue;

      if (this.queue.length > 0) {
        const first_track = this.queue.shift();
        await this.play_track(first_track);
      }
      this.syncState();
    },

    setCurrentPlaylist(playlist) {
      this.current_playlist = playlist;
    },

    /**
     * Toca uma faixa específica e gerencia a transição de blobs/URLs.
     */
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

      this.syncState();
    },

    /**
     * Centraliza a decisão entre tocar nativo (Offline) ou YouTube (Online).
     * [CRÍTICO] Lógica Offline-First implementada aqui.
     */
    async _handle_media_source(track, should_play = true) {
      if (!this.native_audio_instance || typeof this.native_audio_instance.pause !== "function") {
        this.native_audio_instance = markRaw(new Audio());
      }

      try {
        this.native_audio_instance.pause();
        this.native_audio_instance.src = "";
      } catch (e) {
        console.error("[PlayerStore] Erro ao limpar instância de áudio:", e);
      }

      if (this.yt_player_instance && typeof this.yt_player_instance.pauseVideo === "function") {
        this.yt_player_instance.pauseVideo();
      }

      let finalAudioBlob = track.audio_blob;
      let hasGlobalCache = false;

      if (!finalAudioBlob && track.youtube_id) {
        try {
          hasGlobalCache = await radioRepository.hasGlobalAudio(track.youtube_id);
        } catch (error) {
          console.error("[PlayerStore] Falha ao verificar cache global:", error);
        }
      }

      if (finalAudioBlob || track.is_offline || hasGlobalCache) {
        try {
          if (!finalAudioBlob && track.youtube_id) {
            finalAudioBlob = await radioRepository.getGlobalAudioBlob(track.youtube_id);
          }
        } catch (err) {
          console.error("[PlayerStore] Erro crítico I/O Cache Global:", err);
        }
      }

      if (finalAudioBlob) {
        // --- MODO NATIVO ---
        console.log("[Player] Modo: Offline (Nativo)");
        this.player_mode = "native";
        this.is_loading = true;

        if (finalAudioBlob.size < 1000) {
          if (navigator.onLine) {
            this.player_mode = "youtube";
            this._playYoutube(track, should_play);
          }
          return;
        }

        try {
          this.current_audio_url = URL.createObjectURL(finalAudioBlob);
          this.native_audio_instance.src = this.current_audio_url;
          this.native_audio_instance.volume = this.volume / 100;

          if (should_play) {
            await this.native_audio_instance.play();
            this.is_playing = true;
          } else {
            this.is_playing = false;
          }

          this.is_loading = false;
        } catch (e) {
          console.error("[PlayerStore] Erro play nativo:", e);
          if (navigator.onLine) {
            this.player_mode = "youtube";
            this._playYoutube(track, should_play);
          }
        }

        this.native_audio_instance.onended = () => this.next();

      } else {
        // --- MODO YOUTUBE ---
        if (!navigator.onLine) {
          this.is_loading = false;
          return;
        }
        console.log("[Player] Modo: Online (YouTube)");
        this.player_mode = "youtube";
        this._playYoutube(track, should_play);
      }
    },

    async _playYoutube(track, should_play = true) {
      if (this.yt_player_instance && typeof this.yt_player_instance.loadVideoById === "function") {
        this.is_loading = true;

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
      } else {
        if (should_play) this.is_loading = true;
      }
    },

    toggle_play() {
      this.is_playing = !this.is_playing;

      if (this.player_mode === "native") {
        if (this.native_audio_instance && typeof this.native_audio_instance.play === "function") {
          if (this.native_audio_instance.src) {
            this.is_playing
              ? this.native_audio_instance.play()
              : this.native_audio_instance.pause();
          }
        }
      } else if (this.player_mode === "youtube") {
        if (this.yt_player_instance && typeof this.yt_player_instance.playVideo === "function") {
          this.is_playing
            ? this.yt_player_instance.playVideo()
            : this.yt_player_instance.pauseVideo();
        } else if (this.is_playing) {
          this.is_loading = true;
        }
      }
    },

    set_loading_state(state) {
      this.is_loading = state;
    },

    next() {
      if (this.queue.length === 0) {
        this.is_playing = false;
        return;
      }

      if (this.current_music) {
        this.played_history.push(this.current_music);
      }

      const next_track = this.queue.shift();
      this.play_track(next_track);
      this.syncState();
    },

    prev() {
      if (this.played_history.length === 0) return;

      if (this.current_music) {
        this.queue.unshift(this.current_music);
      }

      const prev_track = this.played_history.pop();
      this.play_track(prev_track);
      this.syncState();
    },


    /* ==========================================================================
       SECTION 2: QUEUE & LIST MANAGEMENT
       ========================================================================== */

    track_exist_in_queue(youtube_id) {
      const exists = this.queue.find((t) => t.youtube_id === youtube_id);
      return exists;
    },

    add_to_queue(track) {
      if (!this.track_exist_in_queue(track.youtube_id)) this.queue.push(track);
      this.syncState();
    },

    set_queue(new_queue) {
      this.queue = [...new_queue];
      this.syncState();
    },

    add_to_queue_at(track, index) {
      if (!this.track_exist_in_queue(track.youtube_id)) {
        this.queue.splice(index, 0, track);
      }
      this.syncState();
    },

    remove_from_queue(index) {
      console.log("index to remove: ", index);
      this.queue.splice(index, 1);
      this.syncState();
    },

    toggle_shuffle() {
      this.is_shuffle = !this.is_shuffle;
      this.syncState();
    },


    /* ==========================================================================
       SECTION 3: CONTROLS & UI STATE
       ========================================================================== */

    set_volume(val) {
      this.volume = val;
      if (this.native_audio_instance) this.native_audio_instance.volume = val / 100;
      if (this.yt_player_instance && typeof this.yt_player_instance.setVolume === "function") {
        this.yt_player_instance.setVolume(val);
      }
      this.syncState();
    },

    seek_to(seconds) {
      if (this.player_mode === "native" && this.native_audio_instance) {
        this.native_audio_instance.currentTime = seconds;
      } else if (this.player_mode === "youtube" && this.yt_player_instance) {
        this.yt_player_instance.seekTo(seconds, true);
      }
    },

    set_mobile_tab(tab_name) {
      this.mobile_tab = tab_name;
    },

    setActiveApp(appName) {
      this.active_app = appName;
    },

    // Métodos estilo "Getter" para UI
    get_current_time() {
      if (this.player_mode === "native" && this.native_audio_instance) {
        return this.native_audio_instance.currentTime || 0;
      }
      if (this.player_mode === "youtube" && this.yt_player_instance && typeof this.yt_player_instance.getCurrentTime === "function") {
        return this.yt_player_instance.getCurrentTime() || 0;
      }
      return 0;
    },

    get_duration() {
      if (this.current_music?.duration_seconds) {
        return this.current_music.duration_seconds;
      }
      if (this.player_mode === "native" && this.native_audio_instance) {
        return this.native_audio_instance.duration || 0;
      }
      if (this.player_mode === "youtube" && this.yt_player_instance) {
        return this.yt_player_instance.getDuration() || 0;
      }
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
            let pl = await radioRepository.getLocalPlaylistByServerId(prefs.current_playlist_id);
            if (!pl) pl = await radioRepository.getLocalPlaylist(prefs.current_playlist_id);
            if (pl) this.current_playlist = pl;
          }

          // Restaura Track e define modo
          if (prefs.current_track_id) {
            let track = await radioRepository.getLocalTrackByServerId(prefs.current_track_id);
            if (!track) track = await radioRepository.getLocalTrack(prefs.current_track_id);

            if (!track && this.queue.length > 0) {
              track = this.queue.find((t) => t.id === prefs.current_track_id);
            }

            if (track) {
              this.current_music = track;
              // Ajuste importante: verifica se é offline
              this.player_mode = (track.is_offline || track.audio_blob) ? "native" : "youtube";
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
          const freshPl = await radioRepository.getLocalPlaylist(this.current_playlist.local_id);
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
          const freshTr = await radioRepository.getLocalTrack(this.current_music.local_id);
          if (freshTr && freshTr.id) {
            trId = freshTr.id;
            this.current_music.id = freshTr.id;
          }
        }
      }

      // Sanitização: Remove blobs da queue antes de enviar
      const sanitizedQueue = this.queue.map(t => {
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
        if (this.yt_player_instance && typeof this.yt_player_instance.cueVideoById === "function") {
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
      if (this.yt_player_instance && typeof this.yt_player_instance.stopVideo === "function") {
        try {
          this.yt_player_instance.stopVideo();
          this.yt_player_instance.clearVideo();
        } catch (e) {
          console.warn("[PlayerStore] Erro ao limpar YouTube:", e);
        }
      }

      // 2. Parar Execução (Nativo) e Limpar Memória
      if (this.native_audio_instance && typeof this.native_audio_instance.pause === "function") {
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
      console.log("[PlayerStore] Instância YouTube registrada.");

      if (this.is_playing && this.current_music) {
        console.log("[PlayerStore] Play pendente detectado. Iniciando vídeo...");
        this._playYoutube(this.current_music, true);
      }
    },

    _update_media_session(track) {
      if ("mediaSession" in navigator) {
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
      }
    },
  },

  /* ==========================================================================
     PERSISTENCE CONFIGURATION
     ========================================================================== */

  persist: {
    paths: [
      "current_music",
      "current_playlist",
      "queue",
      "played_history",
      "volume",
      "is_shuffle",
      "active_app",
      "mobile_tab"
    ],

    // Serializer customizado para sanitizar dados sensíveis/pesados (Blobs)
    serializer: {
      serialize: (state) => {
        return JSON.stringify(state, (key, value) => {
          if (key === 'audio_blob') return undefined; // Nunca salvar blobs no localStorage
          return value;
        });
      },
      deserialize: (value) => {
        return JSON.parse(value);
      }
    },

    afterRestore: (ctx) => {
      ctx.store.yt_player_instance = null;
      ctx.store.is_playing = false;
      ctx.store.is_loading = false;

      // Restaura instância de áudio nativa após reload
      if (!ctx.store.native_audio_instance || typeof ctx.store.native_audio_instance.pause !== "function") {
        console.log("[PlayerStore] Restaurando instância de áudio nativa.");
        ctx.store.native_audio_instance = markRaw(new Audio());
      }
    },
  },
});
