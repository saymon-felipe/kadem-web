import { defineStore } from "pinia";
import { markRaw } from "vue";
import { radioRepository } from "../services/localData";
import { api } from "../plugins/api";

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
    is_playing: false,
    player_mode: "none",
    volume: 50,
    is_shuffle: false,
    active_app: null,

    is_initialized: false,
    yt_player_instance: null,
    native_audio_instance: markRaw(new Audio()),
  }),

  actions: {
    async play_playlist_context(playlist, tracks, start_track = null) {
      this.current_playlist = playlist;
      let new_queue = [...tracks];

      // Resetar histórico ao iniciar nova playlist
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
        await this.play_track(first_track);
      }
      this.syncState();
    },

    async play_track(track, playlist = null) {
      if (playlist) {
        this.current_playlist = playlist;
        const tracks = await radioRepository.getLocalTracks(playlist.local_id);
        this.queue = tracks;
      }

      this.current_music = track;
      this.is_playing = true;

      this._handle_media_source(track);
      this._update_media_session(track);

      this.syncState();
    },

    async _handle_media_source(track) {
      if (
        !this.native_audio_instance ||
        typeof this.native_audio_instance.pause !== "function"
      ) {
        console.warn("[PlayerStore] Instância de áudio corrompida. Recriando...");
        this.native_audio_instance = markRaw(new Audio());
      }

      this.native_audio_instance.pause();

      if (
        this.yt_player_instance &&
        typeof this.yt_player_instance.pauseVideo === "function"
      ) {
        this.yt_player_instance.pauseVideo();
      }

      if (track.audio_blob) {
        this.player_mode = "native";
        const url = URL.createObjectURL(track.audio_blob);
        this.native_audio_instance.src = url;
        this.native_audio_instance.volume = this.volume / 100;
        this.native_audio_instance.play();
        this.native_audio_instance.onended = () => this.next();
      } else {
        this.player_mode = "youtube";
        if (
          this.yt_player_instance &&
          typeof this.yt_player_instance.loadVideoById === "function"
        ) {
          this.yt_player_instance.loadVideoById({
            videoId: track.youtube_id,
            startSeconds: 0,
          });
          this.yt_player_instance.setVolume(this.volume);
        }
      }
    },

    toggle_play() {
      this.is_playing = !this.is_playing;

      if (this.player_mode === "native") {
        if (
          this.native_audio_instance &&
          typeof this.native_audio_instance.play === "function"
        ) {
          this.is_playing
            ? this.native_audio_instance.play()
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
        } else {
          console.warn("[PlayerStore] Instância do YouTube inválida ou não pronta.");
        }
      }
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

    // --- CONTROLS ---

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
      if (!this.track_exist_in_queue(track.youtube_id))
        this.queue.splice(index, 0, track);

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

    set_volume(val) {
      this.volume = val;
      if (this.native_audio_instance) this.native_audio_instance.volume = val / 100;
      if (
        this.yt_player_instance &&
        typeof this.yt_player_instance.setVolume === "function"
      ) {
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

    // --- APP STATE ---

    setActiveApp(appName) {
      this.active_app = appName;
    },

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

          if (prefs.current_playlist_id) {
            let pl = await radioRepository.getLocalPlaylistByServerId(
              prefs.current_playlist_id
            );

            if (!pl)
              pl = await radioRepository.getLocalPlaylist(prefs.current_playlist_id);

            if (pl) {
              this.current_playlist = pl;
            }
          }

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
              this.player_mode = track.audio_blob ? "native" : "youtube";

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

    async restorePlayerConnection() {
      console.log("[PlayerStore] Restaurando conexão com UI...");

      if (this.current_music && this.player_mode === "youtube") {
        if (
          this.yt_player_instance &&
          typeof this.yt_player_instance.cueVideoById === "function"
        ) {
          console.log(
            "[PlayerStore] Recarregando vídeo no YouTube:",
            this.current_music.title
          );

          this.yt_player_instance.cueVideoById({
            videoId: this.current_music.youtube_id,
            startSeconds: 0,
          });

          this.yt_player_instance.setVolume(this.volume);
        }
      } else if (this.current_music && this.player_mode === "native") {
        await this._handle_media_source(this.current_music);
        if (!this.is_playing) {
          if (this.native_audio_instance) this.native_audio_instance.pause();
        }
      }
    },

    syncState: debounce(async function () {
      if (!this.is_initialized) return;

      let plId = null;
      let trId = null;

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

      const payload = {
        active_app: this.active_app,
        volume: this.volume,
        is_shuffle: this.is_shuffle,
        current_playlist_id: plId,
        current_track_id: trId,
        queue: this.queue,
      };

      try {
        await api.put("/radio/preferences", payload);
      } catch (error) {
        console.error("[PlayerStore] Erro no sync:", error);
      }
    }, 2000),

    // --- UTILS ---

    get_current_time() {
      if (this.player_mode === "native" && this.native_audio_instance)
        return this.native_audio_instance.currentTime || 0;
      if (
        this.player_mode === "youtube" &&
        this.yt_player_instance &&
        typeof this.yt_player_instance.getCurrentTime === "function"
      ) {
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

    register_yt_instance(player) {
      this.yt_player_instance = markRaw(player);
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

    clearState() {
      this.$reset();
      this.played_history = [];

      if (
        this.native_audio_instance &&
        typeof this.native_audio_instance.pause === "function"
      ) {
        this.native_audio_instance.pause();
        this.native_audio_instance.src = "";
      }
      this.is_initialized = false;
      localStorage.removeItem("player");

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
    ],

    afterRestore: (ctx) => {
      ctx.store.yt_player_instance = null;

      if (
        !ctx.store.native_audio_instance ||
        typeof ctx.store.native_audio_instance.pause !== "function"
      ) {
        console.log("[PlayerStore] Restaurando instância de áudio nativa.");
        ctx.store.native_audio_instance = markRaw(new Audio());
      }
    },
  },
});
