import { defineStore } from "pinia";
import { markRaw } from "vue";
import { radioRepository } from "../services/localData";
import { api } from "../plugins/api";
import { useRadioStore } from "./radio.js";
import { useUtilsStore } from "../stores/utils";
import MediaSessionManager from "../services/MediaSessionManager";
import silentAudioUrl from "@/assets/audios/silent-audio.mp3";
import { db } from "../db";
import { parse_srt } from "../utils/srt_parser";
import { apiServices } from "../plugins/apiServices";
import { useAuthStore } from "./auth";
import { VolumeNormalizer } from "../services/audio/volumeNormalizer";
import { db_to_gain, profile_key, PROFILE_VERSION } from "../services/audio/loudness";
import { loudnessRepository } from "../services/localData/loudnessRepository";
import { AUDIO_PRESETS, default_audio_settings, sanitize_audio_settings } from "../services/audio/audioSettings";
import { RadioListeningTracker } from '../services/radioListeningTracker';
import { radioInsightsRepository } from '../services/localData/radioInsightsRepository';
import { syncService } from '../services/syncService';

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const DEFAULT_PLAYER_VOLUME = 1;
const PLAYER_VOLUME_STORAGE_PREFIX = "kadem_radio_player_volume";
const NORMALIZATION_STORAGE_PREFIX = "kadem_radio_normalization_enabled";
const AUDIO_SETTINGS_STORAGE_PREFIX = "kadem_radio_audio_settings";
const normalization_runtimes = new WeakMap();
const listening_runtimes = new WeakMap();

function normalization_runtime(store) {
  // Pinia can wrap `this` in a distinct proxy for each action (devtools).
  // The state object is stable across actions and never serializes this runtime.
  const identity = store.$state;
  if (!normalization_runtimes.has(identity)) {
    normalization_runtimes.set(identity, { native: null, video: null, normalizer: null,
      epoch: 0, request: null, volume_timer: null });
  }
  return normalization_runtimes.get(identity);
}

export const usePlayerStore = defineStore("player", {
  state: () => ({
    current_music: null,
    current_playlist: null,
    viewed_playlist_id: null,
    queue: [],
    played_history: [],
    is_loading: false,
    is_playing: false,
    player_mode: "none",
    volume: DEFAULT_PLAYER_VOLUME,
    normalization_enabled: false,
    normalization_status: "disabled",
    normalization_gain_db: 0,
    normalization_is_estimated: false,
    normalization_detail: "",
    audio_settings: default_audio_settings(),
    audio_settings_status: "disabled",
    audio_settings_detail: "",
    playback_position: 0,
    last_playback_position_sync_at: 0,
    is_shuffle: false,
    active_app: null,
    // Aba ativa por app do Produtividade ({ kadem_nexo: "budget", ... }); so local, sobrevive ao F5.
    active_app_tabs: {},
    mobile_tab: "playlists",
    is_initialized: false,
    is_player_ready: false,
    yt_player_instance: null,
    pending_youtube_restore: null,
    native_audio_instance: markRaw(new Audio()),
    current_audio_url: null,
    current_lyrics: [],
    show_lyrics: false,
    is_video_active: false,
  }),

  actions: {
    start_listening_tracking() {
      if (listening_runtimes.has(this.$state)) return;
      const tracker = new RadioListeningTracker({
        snapshot: () => {
          const video = this.is_video_active ? normalization_runtime(this).video?.element : null;
          const media = video || (this.player_mode === 'native' ? this.native_audio_instance : null);
          const playing = media ? !media.paused && !media.ended && media.readyState >= 3
            : this.player_mode === 'youtube' && this.yt_player_instance?.getPlayerState?.() === 1;
          return { user_id: useAuthStore().user?.id, track: this.current_music,
            position: media ? media.currentTime : this.get_current_time(),
            playing: !!playing && !this.is_loading,
            offline: !!video || !!this.current_audio_url?.startsWith('blob:') };
        },
        persist: async (user_id, rows) => {
          await radioInsightsRepository.addListening(user_id, rows);
          const runtime = listening_runtimes.get(this.$state);
          if (runtime) runtime.needs_sync = true;
        },
        onError: (error) => console.warn('[Radio Flow] Falha no checkpoint de reprodução:', error),
      });
      let ticks = 0;
      const checkpoint = () => {
        tracker.sample();
        return tracker.flush();
      };
      const timer = setInterval(() => {
        tracker.sample();
        if (++ticks % 15 === 0) void tracker.flush();
        if (ticks % 30 === 0) void tracker.flush().then(() => {
          const runtime = listening_runtimes.get(this.$state);
          if (!runtime?.needs_sync) return;
          runtime.needs_sync = false;
          return syncService.processSyncQueue();
        });
      }, 1000);
      const visibility = () => { if (document.visibilityState === 'hidden') void checkpoint(); };
      window.addEventListener('pagehide', checkpoint);
      document.addEventListener('visibilitychange', visibility);
      listening_runtimes.set(this.$state, { tracker, timer, checkpoint, visibility, needs_sync: false });
      tracker.sample();
    },

    async stop_listening_tracking() {
      const runtime = listening_runtimes.get(this.$state);
      if (!runtime) return;
      clearInterval(runtime.timer);
      window.removeEventListener('pagehide', runtime.checkpoint);
      document.removeEventListener('visibilitychange', runtime.visibility);
      await runtime.tracker.finish();
      listening_runtimes.delete(this.$state);
    },

    flush_listening() {
      const runtime = listening_runtimes.get(this.$state);
      return runtime?.checkpoint() || Promise.resolve();
    },

    _listening_event(kind, position) {
      return listening_runtimes.get(this.$state)?.tracker.event(kind, position);
    },

    _finish_listening(reason) {
      return listening_runtimes.get(this.$state)?.tracker.finish(reason);
    },

    _set_normalization_state({ status, gain_db = 0, estimated = false, detail = "" }) {
      this.normalization_status = status;
      this.normalization_gain_db = gain_db;
      this.normalization_is_estimated = estimated;
      this.normalization_detail = detail;
    },

    _get_normalizer() {
      const runtime = normalization_runtime(this);
      if (!runtime.normalizer) {
        runtime.normalizer = new VolumeNormalizer({
          repository: loudnessRepository,
          onState: (state) => this._set_normalization_state(state),
          onAudioState: (status, detail) => {
            this.audio_settings_status = status;
            this.audio_settings_detail = detail;
          },
          onFailure: (element) => {
            if (runtime.video?.element === element) runtime.video.recover?.();
            else this._recover_native_audio(element);
          },
        });
        runtime.normalizer.set_audio_settings(this.audio_settings);
      }
      return runtime.normalizer;
    },

    restore_local_normalization() {
      const user_id = useAuthStore().user?.id;
      if (!user_id) return;
      try {
        const enabled = localStorage.getItem(`${NORMALIZATION_STORAGE_PREFIX}:${user_id}`) === "true";
        if (this.normalization_enabled !== enabled) this.set_normalization_enabled(enabled, { persist: false });
      } catch { /* Storage restrictions do not block playback. */ }
    },

    set_normalization_enabled(enabled, { persist = true } = {}) {
      if (typeof enabled !== "boolean") return;
      this.normalization_enabled = enabled;
      const user_id = useAuthStore().user?.id;
      if (persist && user_id) {
        try { localStorage.setItem(`${NORMALIZATION_STORAGE_PREFIX}:${user_id}`, String(enabled)); } catch { /* Optional preference. */ }
      }
      if (enabled) this._get_normalizer().warmup();
      this._refresh_normalization();
    },

    restore_local_audio_settings() {
      const user_id = useAuthStore().user?.id;
      if (!user_id) return;
      let settings = default_audio_settings();
      try {
        settings = sanitize_audio_settings(JSON.parse(localStorage.getItem(`${AUDIO_SETTINGS_STORAGE_PREFIX}:${user_id}`)));
      } catch { /* Invalid or inaccessible preferences fall back to neutral audio. */ }
      this.set_audio_settings(settings, { persist: false });
    },

    set_audio_settings(patch, { persist = true } = {}) {
      if (!patch || typeof patch !== "object") return;
      this.audio_settings = sanitize_audio_settings({ ...this.audio_settings, ...patch,
        bands: { ...this.audio_settings.bands, ...patch.bands } });
      const user_id = useAuthStore().user?.id;
      if (persist && user_id) {
        try {
          localStorage.setItem(`${AUDIO_SETTINGS_STORAGE_PREFIX}:${user_id}`, JSON.stringify(this.audio_settings));
        } catch { /* Optional device preference. */ }
      }
      const runtime = normalization_runtime(this);
      this.audio_settings_status = this.audio_settings.enabled ? "pending" : "disabled";
      this.audio_settings_detail = "";
      runtime.normalizer?.set_audio_settings(this.audio_settings);
      if (runtime.normalizer?.active && (this.audio_settings.enabled || this.normalization_enabled)) return;
      if (this.audio_settings.enabled) this._get_normalizer().warmup();
      this._refresh_normalization();
    },

    set_audio_preset(id) {
      const preset = AUDIO_PRESETS.find((item) => item.id === id);
      if (!preset) return;
      this.set_audio_settings({ enabled: true, preset: id, bands: preset.bands, night_mode: preset.night_mode });
    },

    reset_audio_settings() {
      this.set_audio_settings(default_audio_settings());
    },

    _refresh_normalization() {
      const runtime = normalization_runtime(this);
      const epoch = ++runtime.epoch;
      runtime.request?.abort();
      runtime.request = null;
      clearInterval(runtime.volume_timer);
      runtime.normalizer?.stop();
      this._set_normalization_state({ status: this.normalization_enabled ? "measuring" : "disabled" });
      this._apply_youtube_volume(!this.normalization_enabled);
      this.audio_settings_status = this.audio_settings.enabled ? "pending" : "disabled";
      this.audio_settings_detail = "";
      if (!this.current_music) return;
      const descriptor = this.is_video_active ? runtime.video : this.player_mode === "native" ? runtime.native : null;
      if (descriptor) {
        if (descriptor.allowed === false) {
          if (this.normalization_enabled) this._set_normalization_state({ status: "unavailable", detail: "Não foi possível processar este áudio. Reprodução original mantida." });
          this.audio_settings_status = "unavailable";
          this.audio_settings_detail = "Esta faixa não permite ajustes de áudio. Reprodução original mantida.";
          return;
        }
        if (!this.normalization_enabled && !this.audio_settings.enabled) return;
        const user_id = useAuthStore().user?.id;
        void this._get_normalizer().start(descriptor.element, {
          key: profile_key(user_id, this.current_music, descriptor.source), user_id,
          remote: typeof descriptor.source === "string" && !descriptor.source.startsWith("blob:"),
          start_position: descriptor.start_position || 0,
          initial_profile: descriptor.initial_profile,
          normalize: this.normalization_enabled,
        });
      } else if (!this.is_video_active && this.player_mode === "youtube") {
        this.audio_settings_status = "unavailable";
        this.audio_settings_detail = "O YouTube online permite volume e normalização, mas não equalização. Use uma faixa baixada para aplicar os perfis.";
        if (this.normalization_enabled) void this._normalize_youtube(epoch);
      }
    },

    async _normalize_youtube(epoch) {
      const runtime = normalization_runtime(this);
      const video_id = this.current_music?.youtube_id;
      const user_id = useAuthStore().user?.id;
      if (!/^[a-zA-Z0-9_-]{11}$/.test(video_id || "")) return;
      const key = `${user_id}:v${PROFILE_VERSION}:youtube:${video_id}`;
      const is_current = () => runtime.epoch === epoch && this.normalization_enabled &&
        this.player_mode === "youtube" && this.current_music?.youtube_id === video_id && !this.is_video_active;
      try {
        let profile = await loudnessRepository.getYoutube(key).catch(() => null);
        if (!is_current()) return;
        if (!profile) {
          const controller = new AbortController();
          runtime.request = controller;
          const response = await api.get(`${apiServices.MEDIA_ENGINE}/loudness/${video_id}`, {
            signal: controller.signal, timeout: 20000,
            headers: { Authorization: `Bearer ${useAuthStore().getToken}` },
          });
          if (!is_current()) return;
          if (response.data?.status !== "ready" || !Number.isFinite(response.data.gain_db)) {
            this._set_normalization_state({ status: "unavailable", detail: "YouTube não forneceu uma medição confiável para esta faixa." });
            return;
          }
          profile = { gain_db: Math.max(-30, Math.min(12, response.data.gain_db)) };
          void loudnessRepository.saveYoutube(key, user_id, profile).catch(() => {});
        }
        if (!is_current()) return;
        this._set_normalization_state({ status: "limited", gain_db: profile.gain_db, estimated: true,
          detail: "YouTube: ajuste estimado, limitado ao volume máximo do player." });
        this._apply_youtube_volume(true);
      } catch {
        if (is_current()) this._set_normalization_state({ status: "unavailable", detail: "Medição indisponível. Reprodução original mantida." });
      } finally {
        if (runtime.epoch === epoch) runtime.request = null;
      }
    },

    _apply_youtube_volume(smooth = false) {
      const runtime = normalization_runtime(this);
      clearInterval(runtime.volume_timer);
      if (!this.yt_player_instance?.setVolume) return;
      const gain = this.normalization_enabled && this.player_mode === "youtube" ? db_to_gain(this.normalization_gain_db) : 1;
      const target = Math.round(Math.min(100, Math.max(0, this.volume * gain * 100)));
      if (!smooth) { this.yt_player_instance.setVolume(target); return; }
      const start = this.yt_player_instance.getVolume?.() ?? this.volume * 100;
      let step = 0;
      runtime.volume_timer = setInterval(() => {
        this.yt_player_instance?.setVolume(Math.round(start + (target - start) * ++step / 6));
        if (step >= 6) clearInterval(runtime.volume_timer);
      }, 40);
    },

    set_video_normalization_element(element, source = null, recover = null, { unavailable = false } = {}) {
      const runtime = normalization_runtime(this);
      if (runtime.video?.element === element && !unavailable) return;
      if (runtime.video?.element) runtime.normalizer?.release(runtime.video.element);
      const initial_profile = runtime.normalizer?.active?.profile || runtime.handoff_profile;
      runtime.video = element ? { element, source, recover, initial_profile,
        start_position: this.get_current_time() } : unavailable ? { allowed: false } : null;
      this._refresh_normalization();
    },

    _recover_native_audio(element) {
      const runtime = normalization_runtime(this);
      if (this.native_audio_instance !== element || !element.src) return;
      runtime.normalizer?.release(element);
      const position = element.currentTime || runtime.native?.start_position || 0;
      const should_play = this.is_playing || !element.paused || runtime.native?.pending_play;
      const recovered = markRaw(new Audio());
      recovered.volume = this.volume;
      recovered.src = element.src;
      recovered.loop = element.loop;
      recovered.onloadedmetadata = () => { recovered.currentTime = Math.min(position, Math.max(0, recovered.duration - 0.25)); };
      recovered.ontimeupdate = () => { if (Math.floor(recovered.currentTime) % 5 === 0) this._update_media_session_position(); };
      recovered.onended = () => this.next({ completed: true });
      element.pause();
      element.removeAttribute("src");
      this.native_audio_instance = recovered;
      runtime.native = { ...runtime.native, element: recovered, allowed: false };
      this.audio_settings_status = "unavailable";
      this.audio_settings_detail = "Não foi possível processar este áudio. Reprodução original mantida.";
      if (should_play) recovered.play().then(() => { this.is_playing = true; }).catch(() => { this.is_playing = false; });
    },

    setViewedPlaylistId(id) {
      this.viewed_playlist_id = id;
    },
    set_player_ready(is_ready) {
      this.is_player_ready = !!is_ready;
    },
    wait_for_player_ready(timeout_ms = 10000) {
      if (this.is_player_ready) return Promise.resolve(true);

      return new Promise((resolve) => {
        const started_at = Date.now();
        const check_ready = setInterval(() => {
          if (this.is_player_ready || Date.now() - started_at >= timeout_ms) {
            clearInterval(check_ready);
            resolve(this.is_player_ready);
          }
        }, 50);
      });
    },
    async download_lyrics_background(video_id) {
      if (!video_id) return;

      try {
        const exists = await db.lyrics.get(video_id);
        if (exists) return;

        const auth_store = useAuthStore();
        const token = auth_store.token || auth_store.getToken;

        if (!token) {
          console.warn(
            "[Player] Tentativa de download de legendas sem token de autenticação."
          );
          return;
        }

        const endpoint = `${apiServices.MEDIA_ENGINE}/subtitles/${video_id}`;

        const response = await api.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          // A detecção de idioma Enterprise pode baixar e analisar uma amostra
          // de áudio antes de devolver a legenda.
          timeout: 0,
        });

        const subtitle_data = response.data?.subtitles || response.data;

        if (subtitle_data) {
          const parsed = parse_srt(subtitle_data);

          await db.lyrics.put({
            video_id: video_id,
            content: parsed,
            downloaded_at: new Date().toISOString(),
          });

          if (this.current_music && this.current_music.youtube_id === video_id) {
            this.current_music.lyrics = parsed;
            this.$forceUpdate();
          }

          console.log(
            `[Player] Legendas sincronizadas via Media Engine para ${video_id}`
          );
        }
      } catch (error) {
        console.warn(
          `[Player] Falha no download de legendas (Media Engine): ${error.message}`
        );
      }
    },

    async load_current_lyrics() {
      this.current_lyrics = [];
      const video_id = this.current_music?.youtube_id || this.current_music?.id;

      if (!video_id) return;

      try {
        let record = await db.lyrics.get(video_id);

        if (!record) {
          await this.download_lyrics_background(video_id);
          record = await db.lyrics.get(video_id);
        }

        if (record) {
          this.current_lyrics = record.content;
        }
      } catch (err) {
        console.error("[Player] Erro ao carregar legendas", err);
      }
    },

    toggle_lyrics() {
      this.show_lyrics = !this.show_lyrics;
    },

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
      const runtime = normalization_runtime(this);
      ++runtime.epoch;
      runtime.request?.abort();
      runtime.normalizer?.stop();
      clearInterval(runtime.volume_timer);
      runtime.native = null;
      this._ensure_audio_instance();
      this.native_audio_instance.pause();
      this.native_audio_instance.loop = false;
      this.native_audio_instance.removeAttribute("src");
      this.native_audio_instance.onended = null;
      this.native_audio_instance.ontimeupdate = null;
      this.native_audio_instance.onloadedmetadata = null;
      this.native_audio_instance.onerror = null;
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

    async _handle_native_playback(track, source, should_play, start_seconds = 0) {
      const audio = this._ensure_audio_instance();
      this.is_loading = true;

      try {
        audio.crossOrigin = "anonymous";
        if (source instanceof Blob) {
          this.current_audio_url = URL.createObjectURL(source);
          audio.src = this.current_audio_url;
        } else {
          // URL remota (ex.: música enviada ainda não cacheada offline): o
          // áudio nativo consome direto via range requests, sem blob local.
          this.current_audio_url = null;
          audio.src = source;
        }
        audio.loop = false;
        audio.volume = this.volume;
        const runtime = normalization_runtime(this);
        runtime.native = { element: audio, source, start_position: start_seconds, pending_play: should_play };
        audio.onerror = () => {
          if (typeof source !== "string" || this.native_audio_instance !== audio) return;
          this._recover_native_audio(audio);
          if (this.normalization_enabled) this._set_normalization_state({ status: "unavailable", detail: "Este upload não permite análise de áudio. Reprodução original mantida." });
        };
        this._refresh_normalization();

        const resume_position = Math.max(0, Number(start_seconds) || 0);
        audio.onloadedmetadata = () => {
          if (resume_position > 0 && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(resume_position, Math.max(0, audio.duration - 0.25));
          }
        };

        audio.ontimeupdate = () => {
          if (Math.floor(audio.currentTime) % 5 === 0)
            this._update_media_session_position();
        };

        audio.onended = () => this.next({ completed: true });

        if (should_play) {
          await audio.play();
          this.is_playing = true;
        } else {
          this.is_playing = false;
        }
      } catch (e) {
        if (this.native_audio_instance !== audio) return;
        console.error("Erro fatal nativo:", e);
        this.is_playing = false;
      } finally {
        const descriptor = normalization_runtime(this).native;
        if (descriptor?.element === audio) descriptor.pending_play = false;
        this.is_loading = false;
      }
    },

    async _playYoutube(track, should_play = true, start_seconds = 0) {
      if (
        this.yt_player_instance &&
        typeof this.yt_player_instance.loadVideoById === "function"
      ) {
        this.is_loading = true;
        this._refresh_normalization();

        if (should_play) {
          await this.yt_player_instance.loadVideoById({
            videoId: track.youtube_id,
            startSeconds: Math.max(0, Number(start_seconds) || 0),
          });
          this.is_playing = true;
          this._activate_silent_anchor();
        } else {
          await this.yt_player_instance.cueVideoById({
            videoId: track.youtube_id,
            startSeconds: Math.max(0, Number(start_seconds) || 0),
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

    async play_from_queue(index) {
      if (index < 0 || index >= this.queue.length) return;

      if (this.current_music) this.played_history.push(this.current_music);
      const [target_track] = this.queue.splice(index, 1);
      await this.play_track(target_track, this.current_playlist);
      this.syncState();
    },

    _are_same_tracks(first_track, second_track) {
      if (!first_track || !second_track) return false;

      return (
        (first_track.youtube_id && first_track.youtube_id === second_track.youtube_id) ||
        (first_track.id && first_track.id === second_track.id) ||
        (first_track.local_id && first_track.local_id === second_track.local_id)
      );
    },

    _shuffle_tracks(tracks) {
      const shuffled_tracks = [...tracks];
      for (let index = shuffled_tracks.length - 1; index > 0; index--) {
        const random_index = Math.floor(Math.random() * (index + 1));
        [shuffled_tracks[index], shuffled_tracks[random_index]] = [
          shuffled_tracks[random_index],
          shuffled_tracks[index],
        ];
      }
      return shuffled_tracks;
    },

    async play_track(track, playlist = null, { force_restart = false } = {}) {
      this.pending_youtube_restore = null;
      const isSameTrack = this._are_same_tracks(track, this.current_music);

      if (isSameTrack && !force_restart) {
        this.toggle_play();
        return;
      }

      await this._finish_listening('skipped');

      if (playlist) {
        const current_pl_id = this.current_playlist?.local_id;
        const new_pl_id = playlist.local_id;

        if (current_pl_id !== new_pl_id || this.queue.length === 0) {
          this.current_playlist = playlist;
          if (!playlist.is_liked_playlist && playlist.local_id !== "liked") {
            const tracks = await radioRepository.getLocalTracks(playlist.local_id);
            if (tracks && tracks.length > 0) this.queue = tracks;
          }
        } else {
          this.current_playlist = playlist;
        }
      }

      let resolved_playlist = playlist;

      if (!resolved_playlist) {
        const radioStore = useRadioStore();

        if (track.playlist_local_id) {
          resolved_playlist = radioStore.playlists.find(
            (p) => p.local_id === track.playlist_local_id
          );
        } else if (track.playlist_id) {
          resolved_playlist = radioStore.playlists.find(
            (p) => p.id === track.playlist_id
          );
        }
      }

      if (resolved_playlist) {
        this.current_playlist = resolved_playlist;
      } else if (!this.current_playlist) {
        this.current_playlist = null;
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

      const { audio_blob: _audio_blob, ...cleanTrack } = targetTrack;
      this.current_music = cleanTrack;
      this.playback_position = 0;
      this.last_playback_position_sync_at = 0;

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
            finalAudioBlob = await radioRepository.getGlobalAudioBlob(
              targetTrack.youtube_id
            );
            if (!finalAudioBlob) {
              finalAudioBlob = await radioRepository.getGlobalVideoBlob(
                targetTrack.youtube_id
              );
            }
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
      } else if (targetTrack.source === "upload" && targetTrack.storage_key) {
        console.log("[Player] Modo: Nativo (streaming do arquivo enviado).");
        this.player_mode = "native";

        if (this.yt_player_instance?.pauseVideo) this.yt_player_instance.pauseVideo();

        await this._handle_native_playback(targetTrack, targetTrack.storage_key, true);
      } else if (targetTrack.youtube_id) {
        const utilsStore = useUtilsStore();

        if (!utilsStore.connection.connected) {
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

    setCurrentPlaylist(playlist) {
      this.current_playlist = playlist;
    },

    async toggle_play() {
      if (!this.current_music) return;
      if (this.normalization_enabled || this.audio_settings.enabled) this._get_normalizer().warmup();

      this.update_playback_position(this.get_current_time(), { force_sync: true });

      this.$patch((state) => {
        state.is_playing = !state.is_playing;
      });

      const should_play = this.is_playing;
      if (!should_play) void this._listening_event('pause');

      if (should_play && this.player_mode === "youtube") {
        try {
          const blob = await radioRepository.getTrackBlob(this.current_music.local_id);

          if (blob) {
            console.debug(
              "[PlayerStore] Upgrade para modo Offline detectado no toggle_play."
            );

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
          if (should_play) {
            this.native_audio_instance
              .play()
              .catch((e) => console.error("Erro playback nativo:", e));
          } else {
            this.native_audio_instance.pause();
          }
        }
      } else if (this.player_mode === "youtube") {
        if (this.yt_player_instance?.playVideo) {
          if (should_play) this.yt_player_instance.playVideo();
          else this.yt_player_instance.pauseVideo();
        }

        if (should_play) {
          this._activate_silent_anchor();
        } else {
          this.native_audio_instance.pause();
        }
      }
      this._update_media_session_position();
    },

    async _rebuild_queue_from_current_playlist() {
      const playlist_id = this.current_playlist?.local_id;
      if (!playlist_id) return { force_restart: false };

      const playlist_tracks = await radioRepository.getLocalTracks(playlist_id);
      if (!playlist_tracks?.length) return { force_restart: false };

      const current_track_index = playlist_tracks.findIndex((track) =>
        this._are_same_tracks(track, this.current_music)
      );

      if (current_track_index === -1) {
        this.queue = this.is_shuffle
          ? this._shuffle_tracks(playlist_tracks)
          : playlist_tracks;
        return { force_restart: false };
      }

      const current_track = playlist_tracks[current_track_index];
      let next_queue = playlist_tracks.filter(
        (_track, index) => index !== current_track_index
      );

      if (this.is_shuffle) next_queue = this._shuffle_tracks(next_queue);

      if (next_queue.length > 0) {
        this.queue = [...next_queue, current_track];
        return { force_restart: false };
      }

      this.queue = [current_track];
      return { force_restart: true };
    },

    async next({ completed = false } = {}) {
      await this._finish_listening(completed ? 'completed' : 'skipped');
      let force_restart = false;

      if (this.queue.length === 0) {
        try {
          ({ force_restart } = await this._rebuild_queue_from_current_playlist());
        } catch (error) {
          console.warn("[PlayerStore] Falha ao recriar a fila da playlist:", error);
        }
      }

      if (this.queue.length === 0) {
        this.is_playing = false;
        this.syncState();
        return;
      }

      if (this.current_music) this.played_history.push(this.current_music);
      const next_track = this.queue.shift();
      await this.play_track(next_track, this.current_playlist, { force_restart });
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
      const position = Math.max(0, Number(seconds) || 0);
      void this._listening_event('seek', position);
      if (this.player_mode === "native") {
        this.native_audio_instance.currentTime = position;
      } else if (this.player_mode === "youtube" && this.yt_player_instance) {
        this.yt_player_instance.seekTo(position, true);
      }
      this.update_playback_position(position, { force_sync: true });
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

    _get_local_volume_storage_key() {
      const user_id = useAuthStore().user?.id;
      return user_id ? `${PLAYER_VOLUME_STORAGE_PREFIX}:${user_id}` : null;
    },

    restore_local_volume() {
      const storage_key = this._get_local_volume_storage_key();
      if (!storage_key) return;

      try {
        const saved_volume = localStorage.getItem(storage_key);
        this.set_volume(
          saved_volume === null ? DEFAULT_PLAYER_VOLUME : saved_volume,
          { persist: false },
        );
      } catch (error) {
        console.warn("[PlayerStore] Falha ao restaurar o volume local:", error);
      }
    },

    _persist_local_volume() {
      const storage_key = this._get_local_volume_storage_key();
      if (!storage_key) return;

      try {
        localStorage.setItem(storage_key, String(this.volume));
      } catch (error) {
        console.warn("[PlayerStore] Falha ao persistir o volume local:", error);
      }
    },

    set_volume(val, { persist = true } = {}) {
      let normalized_volume = Number(val);
      if (!Number.isFinite(normalized_volume)) return;
      if (normalized_volume > 1) normalized_volume /= 100;

      this.volume = Math.min(Math.max(normalized_volume, 0), 1);
      if (this.native_audio_instance) this.native_audio_instance.volume = this.volume;
      this._apply_youtube_volume();
      normalization_runtime(this).normalizer?.update_activity();
      if (persist) this._persist_local_volume();
    },

    set_video_modal_active(active) {
      const runtime = normalization_runtime(this);
      runtime.handoff_profile = runtime.normalizer?.active?.profile || null;
      this.is_video_active = !!active;
      if (this.native_audio_instance) {
        this.native_audio_instance.muted = !!active;
      }
      if (this.yt_player_instance) {
        if (active && this.yt_player_instance.mute) {
          this.yt_player_instance.mute();
        } else if (!active && this.yt_player_instance.unMute) {
          this.yt_player_instance.unMute();
          if (this.yt_player_instance.setVolume) {
            this._apply_youtube_volume();
          }
        }
      }
      this._refresh_normalization();
    },

    register_yt_instance(player) {
      this.yt_player_instance = markRaw(player);
      this._apply_youtube_volume();
      if (this.normalization_enabled && this.player_mode === "youtube") this._refresh_normalization();
    },

    add_to_queue(track) {
      this.queue.unshift(track);
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

    setActiveAppTab(tabKey, tabId) {
      if (!tabKey || !tabId || this.active_app_tabs?.[tabKey] === tabId) return;
      this.active_app_tabs = { ...this.active_app_tabs, [tabKey]: tabId };
    },

    set_mobile_tab(t) {
      this.mobile_tab = t;
    },

    update_playback_position(seconds, { force_sync = false } = {}) {
      const position = Number(seconds);
      if (!Number.isFinite(position) || position < 0) return;

      this.playback_position = Math.round(position * 1000) / 1000;

      const now = Date.now();
      if (
        this.is_initialized &&
        (force_sync || now - this.last_playback_position_sync_at >= 5000)
      ) {
        this.last_playback_position_sync_at = now;
        this.syncState();
      }
    },

    /* ==========================================================================
       SECTION 4: STATE MANAGEMENT & SYNC
       ========================================================================== */

    async restorePlayerConnection() {
      this.set_player_ready(false);
      this._ensure_audio_instance();
      this.restore_local_volume();
      this.restore_local_normalization();
      this.restore_local_audio_settings();
      const resume_position = Math.max(0, Number(this.playback_position) || 0);
      let waiting_for_youtube_cue = false;

      if (this.current_music && this.player_mode === "youtube") {
        this._refresh_normalization();
        if (this.yt_player_instance?.cueVideoById) {
          this.pending_youtube_restore = {
            youtube_id: this.current_music.youtube_id,
            position: resume_position,
          };
          waiting_for_youtube_cue = true;
          await this.yt_player_instance.cueVideoById({
            videoId: this.current_music.youtube_id,
            startSeconds: 0,
          });
        } else {
          this.is_loading = true;
          this.is_playing = false;
          return;
        }
      } else if (this.current_music && this.player_mode === "native") {
        try {
          const blob = await radioRepository.getTrackBlob(this.current_music.local_id);
          if (blob) {
            await this._handle_native_playback(
              this.current_music,
              blob,
              false,
              resume_position,
            );
          } else if (this.current_music.source === "upload" && this.current_music.storage_key) {
            // Ainda não cacheada neste dispositivo: retoma via streaming
            // direto do arquivo, igual ao que play_track já faz.
            await this._handle_native_playback(
              this.current_music,
              this.current_music.storage_key,
              false,
              resume_position,
            );
          }
        } catch (e) {
          console.warn("Falha ao restaurar nativo:", e);
        }
      }

      if (this.current_music) {
        this._refresh_media_session(this.current_music, false);
      }
      this.is_loading = waiting_for_youtube_cue && !!this.pending_youtube_restore;
      this.is_playing = false;

      if (!waiting_for_youtube_cue) this.set_player_ready(true);
    },

    handle_youtube_state_change(event) {
      if (event?.data !== 5 || !this.pending_youtube_restore) return;

      const pending_restore = this.pending_youtube_restore;
      if (this.current_music?.youtube_id !== pending_restore.youtube_id) {
        this.pending_youtube_restore = null;
        this.is_loading = false;
        this.set_player_ready(true);
        return;
      }

      if (this.yt_player_instance?.seekTo) {
        this.yt_player_instance.seekTo(pending_restore.position, true);
        this.yt_player_instance.pauseVideo?.();
      }

      this.playback_position = pending_restore.position;
      this.pending_youtube_restore = null;
      this.is_playing = false;
      this.is_loading = false;
      this.set_player_ready(true);
      this._update_media_session_position();
    },

    async pullPlayerState() {
      this.restore_local_volume();

      try {
        const response = await api.get("/radio/preferences");
        const prefs = response.data;

        if (prefs && Object.keys(prefs).length > 0) {
          if (prefs.is_shuffle !== undefined) this.is_shuffle = !!prefs.is_shuffle;
          if (prefs.active_app) this.active_app = prefs.active_app;
          if (prefs.queue) this.queue = prefs.queue;
          if (prefs.playback_position !== undefined) {
            this.playback_position = Math.max(0, Number(prefs.playback_position) || 0);
          }

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

              if (track.source === "upload") {
                // Música enviada não tem vídeo do YouTube pra cuear: o modo é
                // sempre nativo, com ou sem cache offline (com fallback pra
                // streaming direto do storage_key em restorePlayerConnection).
                this.player_mode = "native";
              } else {
                const hasBlob = await radioRepository.hasGlobalPlayableMedia(track.youtube_id);
                this.player_mode = hasBlob ? "native" : "youtube";
              }
              this.is_playing = false;
            }
          }
        }
      } catch (error) {
        console.warn("[PlayerStore] Falha ao carregar preferências:", error.message);
      } finally {
        this.is_initialized = true;
        if (this.current_music && !this.is_playing) {
          await this.restorePlayerConnection();
        }
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

      const sanitizedQueue = this.queue.map(({ audio_blob: _audio_blob, ...rest }) => rest);

      const payload = {
        active_app: this.active_app,
        is_shuffle: this.is_shuffle,
        playback_position: this.playback_position,
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
      void this.stop_listening_tracking();
      this._reset_native_player();
      normalization_runtime(this).normalizer?.dispose();
      normalization_runtimes.delete(this.$state);
      try {
        if (this.yt_player_instance?.stopVideo) this.yt_player_instance.stopVideo();
      } catch (error) {
        console.warn("[PlayerStore] Falha ao parar player do YouTube (instância já destruída).", error);
      }
      this.played_history = [];
      this.is_initialized = false;
      this.is_player_ready = false;
      this.is_playing = false;
      localStorage.removeItem("player");
      localStorage.removeItem("player:playback_position");
      this.$reset();
      this.native_audio_instance = markRaw(new Audio());
    },
  },

  localPersist: {
    separate: ["playback_position"],
    pick: [
      "current_music",
      "current_playlist",
      "viewed_playlist_id",
      "queue",
      "played_history",
      "playback_position",
      "is_shuffle",
      "active_app",
      "active_app_tabs",
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
    afterHydrate: (ctx) => {
      ctx.store.is_playing = false;
      ctx.store.is_loading = false;
      ctx.store.current_audio_url = null;

      ctx.store.volume = DEFAULT_PLAYER_VOLUME;

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
