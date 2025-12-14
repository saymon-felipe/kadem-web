<template>
  <div class="player-wrapper-container">
    <div class="player-wrapper">
      <div class="music-element" :style="'opacity: ' + (current_music ? 1 : 0)">
        <img :src="current_music?.thumbnail" />
        <div class="music-info">
          <strong :title="current_music?.title">{{ current_music?.title }}</strong>
          <small :title="current_music?.channel">{{ current_music?.channel }}</small>
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
            max="100"
            v-model="ui_volume"
            @input="update_volume"
            class="slider volume-slider"
            :style="volume_style"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";

export default {
  data() {
    return {
      ui_current_time: 0,
      duration: 0,
      ui_volume: 50,
      is_dragging: false,
      timer_interval: null,
      last_volume: 50,
    };
  },
  computed: {
    ...mapState(usePlayerStore, ["current_music", "is_playing", "volume"]),

    is_disabled() {
      return !this.current_music;
    },

    formatted_current_time() {
      return this.format_seconds_to_time(this.ui_current_time);
    },
    formatted_duration() {
      return this.format_seconds_to_time(this.duration);
    },
    volume_icon() {
      if (this.ui_volume == 0) return "volume-xmark";
      if (this.ui_volume < 50) return "volume-low";
      return "volume-high";
    },
    progress_style() {
      const percent =
        this.duration > 0 ? (this.ui_current_time / this.duration) * 100 : 0;
      return { backgroundSize: `${percent}% 100%` };
    },
    volume_style() {
      return { backgroundSize: `${this.ui_volume}% 100%` };
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
      this.is_dragging = false;
    },
    update_volume() {
      this.set_volume(this.ui_volume);
    },
    toggle_mute() {
      if (this.ui_volume > 0) {
        this.last_volume = this.ui_volume;
        this.ui_volume = 0;
      } else {
        this.ui_volume = this.last_volume || 50;
      }
      this.update_volume();
    },
  },
  watch: {
    current_music: {
      handler(newVal) {
        if (newVal) {
          this.ui_current_time = 0;
          this.duration = newVal.duration_seconds || 0;
        } else {
          this.ui_current_time = 0;
          this.duration = 0;
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
  },
};
</script>

<style scoped>
.player-wrapper-container {
  width: 100%;
}

.player-wrapper {
  height: 80px;
  transform: translateY(-96px);
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

.progress-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
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

/* Sliders */
.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: #e0e0e0;
  border-radius: 5px;
  background-image: linear-gradient(var(--deep-blue), var(--deep-blue));
  background-repeat: no-repeat;
  cursor: pointer;
}

.progress-slider {
  width: 100%;
}

.volume-slider {
  width: 70px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: var(--deep-blue);
  cursor: pointer;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
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

/* Responsividade do Player */
@container (max-width: 600px) {
  .player-wrapper {
    display: flex;
    flex-direction: column;
    height: auto;
    padding: var(--space-3);
    gap: var(--space-2);
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

  .progress-container {
    width: 100%;
  }

  .controls-left {
    justify-content: center;
    width: 100%;
    margin-top: var(--space-2);
  }
}
</style>
