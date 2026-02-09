<template>
  <div class="player-wrapper-container">
    <div class="player-wrapper">
      <div class="music-element">
        <img :src="current_music?.thumbnail || kadem_default_music" />
        <div class="music-info">
          <strong :title="decode_html_entities(current_music?.title)">{{
            decode_html_entities(current_music?.title) || "Aguardando música"
          }}</strong>
          <small :title="decode_html_entities(current_music?.channel)">{{
            decode_html_entities(current_music?.channel) || "Radio Flow"
          }}</small>
        </div>
      </div>

      <div class="controls-center">
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

      <div class="controls-right" :class="{ 'disabled-area': is_disabled }">
        <div class="volume-control">
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

    <LyricsModal
      v-model="show_lyrics_modal"
      :lyrics="current_music?.lyrics"
      :current_time="ui_current_time"
      :track="current_music"
      :default_cover="kadem_default_music"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import PipManager from "./PipManager.vue";
import { decode_html_entities } from "@/utils/string_helpers";
import kadem_default_music from "@/assets/images/kadem-default-music.jpg";
import { db } from "@/db";
import LyricsModal from "./LyricsModal.vue";

export default {
  components: {
    PipManager,
    LyricsModal,
  },
  setup() {
    const radioStore = useRadioStore();
    return { radioStore };
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
    };
  },
  computed: {
    ...mapState(usePlayerStore, [
      "current_music",
      "is_playing",
      "volume",
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
    ...mapActions(usePlayerStore, [
      "toggle_play",
      "next",
      "prev",
      "seek_to",
      "set_volume",
      "get_current_time",
      "get_duration",
    ]),
    decode_html_entities,
    toggle_lyrics() {
      this.show_lyrics_modal = !this.show_lyrics_modal;
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
  },
  watch: {
    current_music: {
      handler(new_val) {
        if (new_val) {
          this.ui_current_time = 0;
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
  },
  mounted() {
    this.start_ticker();
    this.ui_volume = this.volume;
  },
  beforeUnmount() {
    if (this.timer_interval) clearInterval(this.timer_interval);
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
  color: var(--primary);
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
  color: var(--primary-color);
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
  background: #ffffff;
  border-radius: var(--radius-md);
  display: grid;
  grid-template-columns: 25% 50% 25%;
  padding: 0 var(--space-5);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  margin-top: auto;
  color: var(--deep-blue);
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
  color: var(--deep-blue);
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
  color: var(--primary);
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
  color: var(--deep-blue);
  opacity: 0.8;
  margin-top: -5px;
}

/* Direita */
.controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: var(--space-8);
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
  color: var(--deep-blue);
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
  display: grid;

  & strong,
  & small {
    flex-grow: 1;
    min-width: 0;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
}

.pip-btn,
.lyrics-btn {
  margin-left: 10px;
  transition: all 0.2s ease;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto;
  right: var(--space-5);
}

.lyrics-btn {
  right: var(--space-12);
}

.pip-btn:hover {
  color: var(--blue);
  transform: scale(1.1);
}

.pip-btn.active {
  color: var(--blue);
  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
}

.pip-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

/* Responsividade do Player */
@container (max-width: 1100px) {
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
  }

  /* Esconde volume e botão de lista no mobile para simplificar */
  .controls-right,
  .volume-control {
    display: none !important;
  }

  .music-element {
    width: 100%;
    justify-content: flex-start;
  }

  .controls-center {
    width: 100%;
  }

  .controls-left {
    justify-content: center;
    width: 100%;
    margin-top: var(--space-2);
  }

  .pip-btn {
    top: var(--space-5);
    bottom: initial;
    right: var(--space-5);
    margin-left: 0;
  }

  .lyrics-btn {
    right: var(--space-5) !important;
    display: inline-block;
    height: fit-content;
  }

  .music-info {
    max-width: 83%;
    display: flex;
    flex-direction: column;
    padding-right: 40px;
  }
}
</style>
