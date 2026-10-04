<template>
  <div class="player-wrapper-container">
    <div
      class="player-wrapper"
      @dblclick="handle_player_dblclick"
      @touchend="handle_player_touchend"
    >
      <div
        v-if="floating_feedback"
        :key="floating_feedback.id"
        class="floating-reaction-feedback"
        :class="`feedback-${floating_feedback.type}`"
        aria-live="polite"
      >
        <div class="feedback-icon-wrapper">
          <font-awesome-icon :icon="floating_feedback.icon" class="feedback-icon" />
          <div v-if="floating_feedback.strike" class="feedback-strike-line"></div>
        </div>
        <span class="feedback-label">{{ floating_feedback.label }}</span>
      </div>

      <div class="music-element">
        <img :src="current_music?.thumbnail || kadem_default_music" />
        <div class="music-info">
          <strong :title="decode_html_entities(current_music?.title)">{{
            decode_html_entities(current_music?.title) || "Aguardando música"
          }}</strong>
          <div class="music-subtitle-row">
            <small :title="decode_html_entities(current_music?.channel)">{{
              decode_html_entities(current_music?.channel) || "Radio Flow"
            }}</small>
            <div
              class="player-status-icons"
              v-if="
                current_music &&
                (radioStore.isTrackOffline(current_music) ||
                  radioStore.hasTrackVideo(current_music) ||
                  radioStore.active_downloads[current_music?.local_id] !== undefined)
              "
            >
              <span
                v-if="radioStore.active_downloads[current_music?.local_id] !== undefined"
                class="player-status-icon downloading"
                :title="`Baixando (${radioStore.active_download_types[current_music?.local_id] === 'video' ? 'vídeo' : 'áudio'}): ${radioStore.active_downloads[current_music?.local_id]}%`"
              >
                <font-awesome-icon icon="spinner" spin />
              </span>
              <span
                v-if="radioStore.isTrackOffline(current_music)"
                class="player-status-icon offline-ready"
                title="Áudio disponível offline"
              >
                <font-awesome-icon icon="circle-check" />
              </span>
              <span
                v-if="radioStore.hasTrackVideo(current_music)"
                class="player-status-icon video-ready"
                title="Vídeo disponível offline"
              >
                <font-awesome-icon icon="film" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="controls-center">
        <div class="playback-controls">
          <div class="audio-controls-mobile">
            <NormalizationToggle :enabled="normalization_enabled"
              :status="normalization_status" :detail="normalization_detail" @toggle="set_normalization_enabled" />
            <button type="button" class="btn-icon expand-audio" :class="{ active: audio_settings_status === 'active' }"
              :aria-expanded="show_audio_settings" aria-haspopup="dialog" aria-label="Expandir ajustes de áudio"
              title="Expandir ajustes de áudio: equalização, mixagem e perfis" @click="open_audio_settings">
              <font-awesome-icon icon="chevron-down" />
            </button>
          </div>
          <div class="controls-left" :class="{ 'disabled-area': is_disabled }">
            <button
              class="btn-control"
              @click="!is_disabled && prev()"
              :disabled="is_disabled"
            >
              <font-awesome-icon icon="backward-step" />
            </button>

            <button
              class="btn-control play-btn"
              @click="!is_disabled && toggle_play()"
              :disabled="is_disabled"
            >
              <font-awesome-icon :icon="is_playing ? 'circle-pause' : 'circle-play'" />
            </button>

            <button
              class="btn-control"
              @click="!is_disabled && next()"
              :disabled="is_disabled"
            >
              <font-awesome-icon icon="forward-step" />
            </button>
          </div>
        </div>

        <div class="progress-container" :class="{ 'disabled-area': is_disabled }">
          <span class="time-text">{{ formatted_current_time }}</span>
          <input
            type="range"
            min="0"
            :max="duration"
            v-model="ui_current_time"
            @input="on_seek_input"
            @change="on_seek_change"
            class="slider progress-slider"
            :style="progress_style"
            :disabled="is_disabled"
          />
          <span class="time-text">{{ formatted_duration }}</span>
        </div>
      </div>

      <div class="controls-right">
        <NormalizationToggle :enabled="normalization_enabled" :status="normalization_status"
          :detail="normalization_detail" @toggle="set_normalization_enabled" />
        <button type="button" class="btn-icon expand-audio" :class="{ active: audio_settings_status === 'active' }"
          :aria-expanded="show_audio_settings" aria-haspopup="dialog" aria-label="Expandir ajustes de áudio"
          title="Expandir ajustes de áudio: equalização, mixagem e perfis" @click="open_audio_settings">
          <font-awesome-icon icon="chevron-down" />
        </button>
        <div class="volume-control" :class="{ 'disabled-area': is_disabled }">
          <button class="btn-icon" @click="toggle_mute">
            <font-awesome-icon :icon="volume_icon" />
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            v-model="ui_volume"
            @input="update_volume"
            class="slider volume-slider"
            :style="volume_style"
          />
        </div>
      </div>

      <div class="player-extra-actions">
        <TrackReaction :track="current_music" />
        <button
          v-if="
            radioStore.hasTrackVideo(current_music) ||
            (radioStore.active_downloads[current_music?.local_id] !== undefined &&
              radioStore.active_download_types[current_music?.local_id] === 'video')
          "
          class="btn-icon video-btn"
          @click="toggle_video"
          :class="{ active: show_video_modal }"
          :disabled="
            radioStore.active_downloads[current_music?.local_id] !== undefined &&
            radioStore.active_download_types[current_music?.local_id] === 'video'
          "
          :title="
            radioStore.active_downloads[current_music?.local_id] !== undefined &&
            radioStore.active_download_types[current_music?.local_id] === 'video'
              ? `Baixando vídeo (${radioStore.active_downloads[current_music?.local_id]}%)...`
              : show_video_modal
              ? 'Fechar vídeo'
              : 'Mostrar vídeo baixado'
          "
        >
          <font-awesome-icon
            v-if="
              radioStore.active_downloads[current_music?.local_id] !== undefined &&
              radioStore.active_download_types[current_music?.local_id] === 'video'
            "
            icon="spinner"
            spin
          />
          <font-awesome-icon v-else icon="film" />
        </button>
        <button
          v-if="
            radioStore.trackHasLyrics(current_music) ||
            radioStore.isLyricDownloading(current_music?.youtube_id)
          "
          class="btn-icon lyrics-btn"
          @click="toggle_lyrics"
          :class="{ active: show_lyrics_modal }"
          :disabled="radioStore.isLyricDownloading(current_music?.youtube_id)"
          :title="
            radioStore.isLyricDownloading(current_music?.youtube_id)
              ? 'Baixando legenda...'
              : show_lyrics_modal
              ? 'Ocultar legendas'
              : 'Mostrar legendas'
          "
        >
          <font-awesome-icon
            v-if="radioStore.isLyricDownloading(current_music?.youtube_id)"
            icon="spinner"
            spin
          />
          <font-awesome-icon v-else icon="closed-captioning" />
        </button>
        <button
          class="btn-icon pip-btn"
          @click="handle_pip_toggle"
          :disabled="!is_playing"
          :title="pip_is_active ? 'Fechar Mini Player' : 'Abrir Mini Player'"
          :class="{ active: pip_is_active }"
        >
          <font-awesome-icon icon="up-right-from-square" />
        </button>
      </div>
    </div>

    <AudioSettingsPanel v-model="show_audio_settings" :settings="audio_settings" :volume="volume"
      :status="audio_settings_status" :detail="audio_settings_detail"
      :normalization-enabled="normalization_enabled" :normalization-status="normalization_status"
      :normalization-detail="normalization_detail" @settings="set_audio_settings" @preset="set_audio_preset"
      @normalization="set_normalization_enabled" @volume="update_volume_from_external"
      @reset="reset_audio_settings" @save="save_audio_settings" />

    <PipManager
      ref="pip_manager"
      :current_music="current_music"
      :is_playing="is_playing"
      :current_time="ui_current_time"
      :duration="duration"
      :volume="ui_volume"
      :current_playlist="current_playlist"
      @toggle-play="handle_pip_play_toggle"
      @set-volume="update_volume_from_external"
    />

    <div @mousedown="bring_lyrics_to_front" @touchstart="bring_lyrics_to_front">
      <LyricsModal
        v-model="show_lyrics_modal"
        :lyrics="current_music?.lyrics"
        :current_time="ui_current_time"
        :track="current_music"
        :default_cover="kadem_default_music"
        :z_index="lyrics_z_index"
      />
    </div>

    <div @mousedown="bring_video_to_front" @touchstart="bring_video_to_front">
      <VideoModal
        v-model="show_video_modal"
        :track="current_music"
        :current_time="ui_current_time"
        :is_playing="is_playing"
        :default_cover="kadem_default_music"
        :z_index="video_z_index"
      />
    </div>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import PipManager from "./PipManager.vue";
import { decode_html_entities } from "@/utils/string_helpers";
import kadem_default_music from "@/assets/images/kadem-default-music.jpg";
import { db } from "@/db";
import LyricsModal from "./LyricsModal.vue";
import VideoModal from "./VideoModal.vue";
import { radioFlowApi } from "@/services/radioFlowApi";
import NormalizationToggle from "./NormalizationToggle.vue";
import AudioSettingsPanel from "./AudioSettingsPanel.vue";
import TrackReaction from './TrackReaction.vue';
import { useRadioInsightsStore } from "@/stores/radioInsights";

export default {
  components: {
    TrackReaction,
    NormalizationToggle,
    AudioSettingsPanel,
    PipManager,
    LyricsModal,
    VideoModal,
  },
  setup() {
    const radioStore = useRadioStore();
    const insightsStore = useRadioInsightsStore();
    return { radioStore, insightsStore };
  },
  data() {
    return {
      ui_current_time: 0,
      duration: 0,
      ui_volume: 0.5,
      is_dragging: false,
      timer_interval: null,
      last_volume: 0.5,
      pip_is_active: false,
      kadem_default_music,
      show_lyrics_modal: false,
      show_video_modal: false,
      show_audio_settings: false,
      audio_settings_trigger: null,
      top_z_index: 2500,
      lyrics_z_index: 2500,
      video_z_index: 2500,
      floating_feedback: null,
      feedback_timer: null,
      last_tap_timestamp: 0,
      last_tap_position: { x: 0, y: 0 },
    };
  },
  computed: {
    ...mapState(usePlayerStore, [
      "current_music",
      "is_playing",
      "volume",
      "normalization_enabled",
      "normalization_status",
      "normalization_detail",
      "audio_settings",
      "audio_settings_status",
      "audio_settings_detail",
      "playback_position",
      "is_loading",
      "current_playlist",
    ]),
    has_lyrics_available() {
      return (
        this.current_music &&
        Array.isArray(this.current_music.lyrics) &&
        this.current_music.lyrics.length > 0
      );
    },
    current_lyric_text() {
      if (!this.show_lyrics) return null;

      if (!this.has_lyrics_available) return null;

      const current_time = this.ui_current_time;

      const active_lines = this.current_music.lyrics.filter(
        (line) => line.start <= current_time
      );

      if (active_lines.length === 0) return null;

      return active_lines.pop().text;
    },
    is_disabled() {
      return !this.current_music || this.is_loading;
    },
    formatted_current_time() {
      return this.format_seconds_to_time(this.ui_current_time);
    },
    formatted_duration() {
      return this.format_seconds_to_time(this.duration);
    },
    volume_icon() {
      if (this.ui_volume == 0) return "volume-xmark";
      if (this.ui_volume < 0.5) return "volume-low";
      return "volume-high";
    },
    progress_style() {
      const percent =
        this.duration > 0 ? (this.ui_current_time / this.duration) * 100 : 0;
      return { backgroundSize: `${percent}% 100%` };
    },
    volume_style() {
      return { backgroundSize: `${this.ui_volume * 100}% 100%` };
    },
  },
  methods: {
    decode_html_entities,
    handle_player_touchend(event) {
      if (!this.current_music) return;
      if (
        event.target.closest(
          "button, input, select, textarea, .slider, .dropdown-item, [role='button'], .progress-container, .audio-settings-panel, .volume-control"
        )
      ) {
        return;
      }
      const touch = event.changedTouches ? event.changedTouches[0] : null;
      const now = Date.now();
      const timeDiff = now - this.last_tap_timestamp;
      if (touch && timeDiff > 0 && timeDiff < 350) {
        const dist = Math.hypot(
          touch.clientX - this.last_tap_position.x,
          touch.clientY - this.last_tap_position.y
        );
        if (dist < 30) {
          event.preventDefault();
          this.cycle_reaction();
        }
      }
      this.last_tap_timestamp = now;
      if (touch) {
        this.last_tap_position = { x: touch.clientX, y: touch.clientY };
      }
    },
    handle_player_dblclick(event) {
      if (!this.current_music) return;
      if (
        event.target.closest(
          "button, input, select, textarea, .slider, .dropdown-item, [role='button'], .progress-container, .audio-settings-panel, .volume-control"
        )
      ) {
        return;
      }
      this.cycle_reaction();
    },
    async cycle_reaction() {
      if (!this.current_music) return;
      const currentVote = this.insightsStore.reactionFor(this.current_music);
      let nextVote = 0;
      let feedbackType = "like";
      let feedbackIcon = "thumbs-up";
      let feedbackLabel = "Curtida";

      if (currentVote === 0) {
        nextVote = 1;
        feedbackType = "like";
        feedbackIcon = "thumbs-up";
        feedbackLabel = "Curtida";
      } else if (currentVote === 1) {
        nextVote = -1;
        feedbackType = "dislike";
        feedbackIcon = "thumbs-down";
        feedbackLabel = "Não gostei";
      } else {
        nextVote = 0;
        feedbackType = "removed";
        feedbackIcon = "thumbs-up";
        feedbackLabel = "Avaliação removida";
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch {}
      }

      await this.insightsStore.setReaction(this.current_music, nextVote);

      if (this.feedback_timer) clearTimeout(this.feedback_timer);
      this.floating_feedback = {
        id: Date.now(),
        type: feedbackType,
        icon: feedbackIcon,
        label: feedbackLabel,
        strike: feedbackType === "removed",
      };
      this.feedback_timer = setTimeout(() => {
        this.floating_feedback = null;
      }, 1000);
    },
    toggle_play() {
      return radioFlowApi.toggle();
    },
    next() {
      return radioFlowApi.next();
    },
    prev() {
      return radioFlowApi.previous();
    },
    seek_to(seconds) {
      return radioFlowApi.seek(seconds);
    },
    set_volume(value) {
      return radioFlowApi.set_volume(value);
    },
    set_normalization_enabled(enabled) {
      return radioFlowApi.set_normalization_enabled(enabled);
    },
    open_audio_settings(event) {
      this.audio_settings_trigger = event.currentTarget;
      this.show_audio_settings = true;
    },
    set_audio_settings(settings, options) {
      return radioFlowApi.set_audio_settings(settings, options);
    },
    save_audio_settings() {
      return radioFlowApi.set_audio_settings({});
    },
    set_audio_preset(id) {
      return radioFlowApi.set_audio_preset(id);
    },
    reset_audio_settings() {
      return radioFlowApi.reset_audio_settings();
    },
    get_current_time() {
      return radioFlowApi.get_current_time();
    },
    get_duration() {
      return radioFlowApi.get_duration();
    },
    update_playback_position(seconds) {
      return radioFlowApi.update_playback_position(seconds);
    },
    async load_lyrics_from_cache() {
      if (!this.current_music || !this.current_music.youtube_id) return;

      const video_id = this.current_music.youtube_id;

      try {
        const cached = await db.lyrics.get(video_id);

        if (cached && cached.content) {
          console.log(`[Player] Legenda carregada do cache para: ${video_id}`);

          this.current_music.lyrics = cached.content;

          this.$forceUpdate();
        }
      } catch (e) {
        console.warn("[Player] Erro ao carregar legenda:", e);
      }
    },
    format_seconds_to_time(seconds) {
      if (isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    },
    start_ticker() {
      this.timer_interval = setInterval(() => {
        if (!this.is_dragging && this.is_playing) {
          this.ui_current_time = this.get_current_time();
          this.update_playback_position(this.ui_current_time);
          if (this.duration === 0 || isNaN(this.duration)) {
            this.duration = this.get_duration();
          }
        }
      }, 500);
    },
    on_seek_input() {
      this.is_dragging = true;
    },
    on_seek_change() {
      this.seek_to(this.ui_current_time);
      setTimeout(() => {
        this.is_dragging = false;
      }, 50);
    },
    update_volume() {
      this.ui_volume = parseFloat(this.ui_volume);
      this.set_volume(this.ui_volume);
    },
    update_volume_from_external(vol) {
      this.ui_volume = parseFloat(vol);
      this.set_volume(this.ui_volume);
    },
    toggle_mute() {
      if (this.ui_volume > 0) {
        this.last_volume = this.ui_volume;
        this.ui_volume = 0;
      } else {
        this.ui_volume = this.last_volume || 0.5;
      }
      this.update_volume();
    },
    handle_pip_play_toggle(should_play) {
      if (should_play !== this.is_playing) {
        this.toggle_play();
      }
    },

    async handle_pip_toggle() {
      if (!this.$refs.pip_manager) return;
      this.pip_is_active = await this.$refs.pip_manager.toggle_pip();
    },

    on_pip_closed() {
      this.pip_is_active = false;
    },
    toggle_lyrics() {
      if (!this.show_lyrics_modal) {
        this.bring_lyrics_to_front();
        this.show_lyrics_modal = true;
      } else {
        this.show_lyrics_modal = false;
      }
    },
    toggle_video() {
      if (!this.show_video_modal) {
        this.bring_video_to_front();
        this.show_video_modal = true;
      } else {
        this.show_video_modal = false;
      }
    },
    bring_lyrics_to_front() {
      this.top_z_index += 1;
      this.lyrics_z_index = this.top_z_index;
    },
    bring_video_to_front() {
      this.top_z_index += 1;
      this.video_z_index = this.top_z_index;
    },
  },
  watch: {
    show_audio_settings(visible) {
      if (!visible) this.$nextTick(() => {
        const trigger = this.audio_settings_trigger?.getClientRects().length
          ? this.audio_settings_trigger
          : Array.from(this.$el.querySelectorAll('.expand-audio')).find((button) => button.getClientRects().length);
        trigger?.focus();
      });
    },
    current_music: {
      handler(new_val) {
        this.show_video_modal = false;
        if (new_val) {
          this.ui_current_time = Number(this.playback_position) || 0;
          this.duration = new_val.duration_seconds || 0;
        } else {
          this.ui_current_time = 0;
          this.duration = 0;
        }

        this.load_lyrics_from_cache();
      },
      immediate: true,
    },
    is_playing: {
      handler(is_playing) {
        if (is_playing) {
          this.is_dragging = false;

          this.$nextTick(() => {
            try {
              const currentTime = this.get_current_time();
              if (!isNaN(currentTime)) {
                this.ui_current_time = currentTime;
              }
            } catch (e) {
              console.warn("Erro ao sincronizar tempo UI no play:", e);
            }
          });
        }
      },
      immediate: true,
    },
    volume: {
      handler(new_vol) {
        this.ui_volume = new_vol;
      },
      immediate: true,
    },
    playback_position: {
      handler(position) {
        if (!this.is_dragging && Number.isFinite(Number(position))) {
          this.ui_current_time = Number(position);
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.start_ticker();
    this.ui_volume = this.volume;
  },
  beforeUnmount() {
    if (this.timer_interval) clearInterval(this.timer_interval);
    if (this.feedback_timer) clearTimeout(this.feedback_timer);
  },
};
</script>

<style scoped>
.lyrics-btn {
  font-size: 1.2rem;
  transition: all 0.2s ease;
  margin-right: var(--space-2);
}

.lyrics-btn.active {
  color: var(--color-info);
  opacity: 1;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.lyrics-overlay {
  position: absolute;
  bottom: 90px;
  left: 20px;
  width: 300px;
  max-height: 100px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 100;
  pointer-events: none;
}

.active-lyric {
  color: var(--white);
  font-size: 1.1rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s ease-out, opacity 0.2s ease-in-out;
}

.waiting-lyric {
  color: var(--gray-400);
}

.btn-control.active {
  color: var(--color-info);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.player-wrapper-container {
  width: 100%;
}

.player-wrapper {
  height: 80px;
  transform: translateY(-95px);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  display: grid;
  grid-template-columns: 25% 50% 25%;
  padding: 0 var(--space-5);
  box-shadow: var(--shadow-card);
  margin-top: auto;
  color: var(--text-primary);
  gap: var(--space-4);
  transition: opacity 0.3s;
  align-items: center;
  position: relative;
  padding-right: 80px;
}

/* Área desabilitada visualmente */
.disabled-area {
  pointer-events: none;
  opacity: 0.8;
}

/* Esquerda */
.controls-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: 1.5rem;
  color: var(--text-primary);
}

.btn-control {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  transition: transform 0.2s;
  padding: 0;
}

.btn-control:hover {
  transform: scale(1.1);
  color: var(--color-info);
}

.btn-control:disabled {
  cursor: not-allowed;
}

.play-btn {
  font-size: 2.5rem;
}

/* Centro */
.controls-center {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.playback-controls {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.track-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.track-title {
  font-weight: bold;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.track-artist {
  font-size: 0.8rem;
  opacity: 0.7;
}

.time-display {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
  margin-top: -5px;
}

/* Direita */
.controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: 70px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--text-secondary);
  opacity: 0.8;
  display: grid;
  place-items: center;
}

.btn-icon:hover {
  opacity: 1;
}

.music-element {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-grow: 1;
  min-width: 0;

  & img {
    width: 46px;
    height: 46px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
}

.music-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;

  & strong {
    font-weight: bold;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
  }
}

.music-subtitle-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;

  & small {
    min-width: 0;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    font-size: 0.8rem;
    opacity: 0.7;
  }
}

.player-status-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.player-status-icon {
  font-size: 0.82rem;
  display: flex;
  align-items: center;
}

.player-status-icon.offline-ready {
  color: var(--color-income);
}

.player-status-icon.video-ready {
  color: var(--color-info);
}

.player-status-icon.downloading {
  color: var(--color-info);
}

.player-extra-actions {
  position: absolute;
  right: var(--space-5);
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: auto 0;
}

.pip-btn,
.lyrics-btn,
.video-btn {
  position: static;
  margin: 0;
  transition: all 0.2s ease;
}

.video-btn.active,
.lyrics-btn.active {
  color: var(--color-info);
  opacity: 1;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.pip-btn:hover {
  color: var(--color-info);
  transform: scale(1.1);
}

.pip-btn.active {
  color: var(--color-info);
  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
}

.pip-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

/* Responsividade do Player */
.audio-controls-mobile { display: none; }
.expand-audio { width: 24px; height: 28px; padding: 0; flex-shrink: 0; transform: rotate(180deg); }
.expand-audio.active { color: var(--color-info); }
.expand-audio:focus-visible { outline: 2px solid var(--color-info); outline-offset: 2px; border-radius: 3px; }
@container (max-width: 1100px) {
  .audio-controls-mobile { display: flex; gap: 2px; position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
  .lyrics-overlay {
    bottom: 150px;
    width: calc(100% - 40px);
  }

  .player-wrapper-container {
    flex-shrink: 0;
  }

  .player-wrapper {
    display: flex;
    flex-direction: column;
    height: auto;
    padding: var(--space-3);
    gap: var(--space-2);
    transform: initial;
    position: relative;
  }

  /* Esconde volume e botão de lista no mobile para simplificar */
  .controls-right,
  .volume-control {
    display: none !important;
  }

  .music-element {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-right: 76px;
  }

  .music-info {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    padding-right: 0;
  }

  .player-extra-actions {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    bottom: initial;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: var(--space-3);
    margin: 0;
  }

  .player-extra-actions :deep(.track-reaction),
  .player-extra-actions .track-reaction {
    display: none !important;
  }

  .controls-center {
    width: 100%;
  }

  .controls-left {
    justify-content: center;
    width: 100%;
    margin-top: var(--space-2);
  }
}

@media (max-width: 1100px) {
  .player-extra-actions :deep(.track-reaction),
  .player-extra-actions .track-reaction {
    display: none !important;
  }
}

.floating-reaction-feedback {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  z-index: 3000;
  animation: instagram-pop 0.95s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.feedback-icon-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.feedback-icon {
  font-size: 2.2rem;
  transition: transform 0.2s ease;
}

.feedback-like .feedback-icon-wrapper {
  border: 2px solid rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6);
}
.feedback-like .feedback-icon {
  color: #38bdf8;
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.8));
}

.feedback-dislike .feedback-icon-wrapper {
  border: 2px solid rgba(239, 68, 68, 0.6);
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6);
}
.feedback-dislike .feedback-icon {
  color: #ef4444;
  filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.8));
}

.feedback-removed .feedback-icon-wrapper {
  border: 2px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 0 16px rgba(148, 163, 184, 0.3), 0 8px 32px rgba(0, 0, 0, 0.6);
}
.feedback-removed .feedback-icon {
  color: #94a3b8;
}

.feedback-strike-line {
  position: absolute;
  width: 44px;
  height: 3px;
  background: #ef4444;
  border-radius: 2px;
  transform: rotate(-45deg);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
}

.feedback-label {
  background: rgba(15, 23, 42, 0.9);
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
}

@keyframes instagram-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(-10deg);
  }
  25% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.22) rotate(0deg);
  }
  42% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.96) rotate(0deg);
  }
  70% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85) translateY(-32px);
  }
}
</style>
