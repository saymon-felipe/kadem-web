import { defineStore } from "pinia";
import { markRaw } from "vue";
import { radioRepository } from "../services/localData";
import { api } from "../plugins/api";
import { useRadioStore } from "./radio.js";
import MediaSessionManager from "../services/MediaSessionManager";
import silentAudioUrl from "@/assets/audios/silent-audio.mp3";

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
    current_audio_url: null,
  }),

  actions: {
    /* ==========================================================================
       SECTION 1: INTERNAL HELPERS & SAFETY MECHANISMS
       ========================================================================== */

    _ensure_audio_instance() {
      if (
        !this.native_audio_instance ||
        typeof this.native_audio_instance.play !== "function"
      ) {
        console.warn("[PlayerStore] Instância de áudio recuperada/recriada.");
        this.native_audio_instance = markRaw(new Audio());
        this.native_audio_instance.volume = this.volume;
      }
      return this.native_audio_instance;
    },

    async _activate_silent_anchor() {
      const audio = this._ensure_audio_instance();

      if (!audio.src || !audio.src.includes("silent")) {
        audio.src = silentAudioUrl;
        audio.volume = 0;
        audio.loop = true;
        audio.preload = "auto";
      }

      try {
        await audio.play();
      } catch (error) {
        if (error.name !== "AbortError") {
          console.debug("[PlayerStore] Status âncora:", error.message);
        }
      }
    },

    _reset_native_player() {
      this._ensure_audio_instance();
      this.native_audio_instance.pause();
      this.native_audio_instance.removeAttribute("src");
      this.native_audio_instance.onended = null;
      this.native_audio_instance.ontimeupdate = null;
    },

    /**
     * Centraliza a atualização completa da MediaSession (Handlers + Metadados + Estado)
     */
    _refresh_media_session(track = this.current_music, is_playing = this.is_playing) {
      if (!track) return;
      this._setup_media_session_handlers();
      MediaSessionManager.set_metadata(track);
      MediaSessionManager.set_playback_state(is_playing);
    },

    _setup_media_session_handlers() {
      const store = this;
      MediaSessionManager.set_action_handlers({
        onPlay: () => !store.is_playing && store.toggle_play(),
        onPause: () => store.is_playing && store.toggle_play(),
        onPrev: () => store.prev(),
        onNext: () => store.next(),
        onSeek: (details) =>
          details.seekTime !== undefined && store.seek_to(details.seekTime),
      });
    },

    _force_media_session_override(track) {
      [500, 1500, 3000].forEach((delay) => {
        setTimeout(() => {
          if (this.is_playing && this.player_mode === "youtube") {
            this._refresh_media_session(track, true);
          }
        }, delay);
      });
    },

    _update_media_session_position() {
      const duration = this.get_duration();
      const position = this.get_current_time();
      if (!Number.isFinite(duration) || !Number.isFinite(position) || duration <= 0)
        return;

      MediaSessionManager.set_position_state({
        duration: duration,
        position: Math.min(position, duration),
        playbackRate: this.is_playing ? 1.0 : 0.0,
      });
    },

    async _handle_native_playback(track, blob, should_play) {
      const audio = this._ensure_audio_instance();
      this.is_loading = true;

      try {
        this.current_audio_url = URL.createObjectURL(blob);
        audio.src = this.current_audio_url;
        audio.volume = this.volume;

        audio.ontimeupdate = () => {
          if (Math.floor(audio.currentTime) % 5 === 0)
            this._update_media_session_position();
        };
        audio.onended = () => this.next();

        if (should_play) {
          await audio.play();
          this.is_playing = true;
        } else {
          this.is_playing = false;
        }
      } catch (e) {
        console.error("Erro fatal nativo:", e);
        this.is_playing = false;
      } finally {
        this.is_loading = false;
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
          this._activate_silent_anchor();
        } else {
          await this.yt_player_instance.cueVideoById({
            videoId: track.youtube_id,
            startSeconds: 0,
          });
          this.is_playing = false;
        }

        this.is_loading = false;
        this._force_media_session_override(track);
      } else {
        if (should_play) this.is_loading = true;
      }
    },

    /* ==========================================================================
       SECTION 2: PLAYBACK CONTROL (CORE ACTIONS)
       ========================================================================== */

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

    remove_from_queue(i) {
      this.queue.splice(i, 1);
      this.syncState();
    },

    async play_track(track, playlist = null) {
      const isSameTrack = this.current_music && (
        (track.youtube_id && track.youtube_id === this.current_music.youtube_id) ||
        (track.id && track.id === this.current_music.id) ||
        (track.local_id && track.local_id === this.current_music.local_id)
      );

      if (isSameTrack) {
        this.toggle_play();
        return;
      }

      if (playlist) {
        const current_pl_id = this.current_playlist?.local_id;
        const new_pl_id = playlist.local_id;

        if (current_pl_id !== new_pl_id || this.queue.length === 0) {
          this.current_playlist = playlist;
          const tracks = await radioRepository.getLocalTracks(playlist.local_id);
          if (tracks && tracks.length > 0) this.queue = tracks;
        } else {
          this.current_playlist = playlist;
        }
      }

      this.queue = this.queue.filter((t) => t.youtube_id !== track.youtube_id);

      if (this.current_audio_url) {
        URL.revokeObjectURL(this.current_audio_url);
        this.current_audio_url = null;
      }
      this._reset_native_player();

      let targetTrack = track;
      try {
        let freshTrack = null;

        if (track.local_id) {
          freshTrack = await radioRepository.getLocalTrack(track.local_id);
        }

        if (!freshTrack && track.id) {
          freshTrack = await radioRepository.getLocalTrackByServerId(track.id);
        }

        if (freshTrack) {
          targetTrack = freshTrack;
        }
      } catch (err) {
        console.warn("[PlayerStore] Aviso: Falha ao hidratar metadados da track:", err);
      }

      const { audio_blob, ...cleanTrack } = targetTrack;
      this.current_music = cleanTrack;

      this.is_loading = true;
      this.is_playing = false;

      this._refresh_media_session(targetTrack, false);

      let finalAudioBlob = targetTrack.audio_blob;

      if (!finalAudioBlob) {
        try {
          if (targetTrack.local_id) {
            finalAudioBlob = await radioRepository.getTrackBlob(targetTrack.local_id);
          }

          if (!finalAudioBlob && targetTrack.youtube_id) {
            finalAudioBlob = await radioRepository.getGlobalAudioBlob(targetTrack.youtube_id);
          }
        } catch (e) {
          console.warn("[PlayerStore] Blob não encontrado:", e);
        }
      }

      if (finalAudioBlob) {
        console.log("[Player] Modo: Offline (Nativo) - Recurso validado.");
        this.player_mode = "native";

        if (this.yt_player_instance?.pauseVideo) this.yt_player_instance.pauseVideo();

        await this._handle_native_playback(targetTrack, finalAudioBlob, true);

      } else if (targetTrack.youtube_id) {
        if (!navigator.onLine) {
          console.warn("Sem internet e sem arquivo local. Pulando...");
          this.is_loading = false;
          this.next();
          return;
        }
        console.log("[Player] Modo: YouTube");
        this.player_mode = "youtube";

        await this._activate_silent_anchor();
        await this._playYoutube(targetTrack, true);

      } else {
        this.next();
        return;
      }

      this._refresh_media_session(targetTrack, true);
      this.syncState();
    },

    async toggle_play() {
      if (!this.current_music) return;

      this.$patch((state) => {
        state.is_playing = !state.is_playing;
      });

      const should_play = this.is_playing;

      if (should_play && this.player_mode === "youtube") {
        try {
          const blob = await radioRepository.getTrackBlob(this.current_music.local_id);

          if (blob) {
            console.debug("[PlayerStore] Upgrade para modo Offline detectado no toggle_play.");

            if (this.yt_player_instance?.pauseVideo) {
              this.yt_player_instance.pauseVideo();
            }

            this.player_mode = "native";
            await this._handle_native_playback(this.current_music, blob, true);

            this._refresh_media_session(this.current_music, true);
            this.syncState();
            return;
          }
        } catch (error) {
          console.warn("[PlayerStore] Falha na verificação JIT de blob:", error);
        }
      }

      this._refresh_media_session(this.current_music, should_play);
      this._ensure_audio_instance();

      if (this.player_mode === "native") {
        if (this.native_audio_instance.src) {
          should_play
            ? this.native_audio_instance.play().catch((e) => console.error("Erro playback nativo:", e))
            : this.native_audio_instance.pause();
        }
      } else if (this.player_mode === "youtube") {
        if (this.yt_player_instance?.playVideo) {
          should_play
            ? this.yt_player_instance.playVideo()
            : this.yt_player_instance.pauseVideo();
        }

        if (should_play) {
          this._activate_silent_anchor();
        } else {
          this.native_audio_instance.pause();
        }
      }
      this._update_media_session_position();
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

    seek_to(seconds) {
      if (this.player_mode === "native") {
        this.native_audio_instance.currentTime = seconds;
      } else if (this.player_mode === "youtube" && this.yt_player_instance) {
        this.yt_player_instance.seekTo(seconds, true);
      }
      this._update_media_session_position();
    },

    /* ==========================================================================
       SECTION 3: GETTERS, SETTERS & QUEUE
       ========================================================================== */

    get_current_time() {
      if (this.player_mode === "native")
        return this.native_audio_instance.currentTime || 0;
      if (this.player_mode === "youtube" && this.yt_player_instance?.getCurrentTime)
        return this.yt_player_instance.getCurrentTime() || 0;
      return 0;
    },

    get_duration() {
      if (this.current_music?.duration_seconds)
        return this.current_music.duration_seconds;
      if (this.player_mode === "native") return this.native_audio_instance.duration || 0;
      if (this.player_mode === "youtube")
        return this.yt_player_instance?.getDuration() || 0;
      return 0;
    },

    set_volume(val) {
      this.volume = Math.min(Math.max(val, 0), 1);
      if (this.native_audio_instance) this.native_audio_instance.volume = this.volume;
      if (this.yt_player_instance?.setVolume) {
        this.yt_player_instance.setVolume(this.volume * 100);
        this.syncState();
      }
    },

    register_yt_instance(player) {
      this.yt_player_instance = markRaw(player);
      if (this.yt_player_instance?.setVolume)
        this.yt_player_instance.setVolume(this.volume * 100);
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

    toggle_shuffle() {
      this.is_shuffle = !this.is_shuffle;
      this.syncState();
    },

    setActiveApp(appName) {
      this.active_app = appName;
      this.syncState();
    },

    set_mobile_tab(t) {
      this.mobile_tab = t;
    },

    /* ==========================================================================
       SECTION 4: STATE MANAGEMENT & SYNC
       ========================================================================== */

    async restorePlayerConnection() {
      this._ensure_audio_instance();

      if (this.current_music && this.player_mode === "youtube") {
        if (this.yt_player_instance?.cueVideoById) {
          await this.yt_player_instance.cueVideoById({
            videoId: this.current_music.youtube_id,
            startSeconds: 0,
          });
        }
      } else if (this.current_music && this.player_mode === "native") {
        try {
          const blob = await radioRepository.getTrackBlob(this.current_music.local_id);
          if (blob) {
            await this._handle_native_playback(this.current_music, blob, false);
          }
        } catch (e) {
          console.warn("Falha ao restaurar nativo:", e);
        }
      }

      if (this.current_music) {
        this._refresh_media_session(this.current_music, false);
      }
      this.is_loading = false;
      this.is_playing = false;
    },

    async pullPlayerState() {
      try {
        const response = await api.get("/radio/preferences");
        const prefs = response.data;

        if (prefs && Object.keys(prefs).length > 0) {
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
              this.queue = this.queue.filter((t) => t.youtube_id !== track.youtube_id);
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

    syncState: debounce(async function () {
      if (!this.is_initialized) return;

      let plId = null;
      let trId = null;

      if (this.current_playlist) {
        plId = this.current_playlist.id || null;
        if (!plId && this.current_playlist.local_id) {
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
        trId = this.current_music.id || null;
        if (!trId && this.current_music.local_id) {
          const freshTr = await radioRepository.getLocalTrack(
            this.current_music.local_id
          );
          if (freshTr && freshTr.id) {
            trId = freshTr.id;
            this.current_music.id = freshTr.id;
          }
        }
      }

      const sanitizedQueue = this.queue.map(({ audio_blob, ...rest }) => rest);

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

    clearState() {
      this._reset_native_player();
      if (this.yt_player_instance?.stopVideo) this.yt_player_instance.stopVideo();
      this.played_history = [];
      this.is_initialized = false;
      this.is_playing = false;
      localStorage.removeItem("player");
      this.$reset();
      this.native_audio_instance = markRaw(new Audio());
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
      ctx.store.is_playing = false;
      ctx.store.is_loading = false;
      ctx.store.current_audio_url = null;

      if (ctx.store.volume > 1) ctx.store.volume = ctx.store.volume / 100;

      if (
        !ctx.store.native_audio_instance ||
        typeof ctx.store.native_audio_instance.play !== "function"
      ) {
        ctx.store.native_audio_instance = markRaw(new Audio());
      }
      if (ctx.store.native_audio_instance) {
        ctx.store.native_audio_instance.volume = ctx.store.volume;
      }
    },
  },
});
