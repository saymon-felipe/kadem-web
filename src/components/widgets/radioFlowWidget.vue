<template>
  <div class="radio-flow-widget glass">
    <div class="widget-header">
      <div class="widget-cover">
        <img :src="current_music?.thumbnail || defaultMusicCover" alt="Capa" />
      </div>

      <div class="radio-info">
        <span class="music-title" :title="decode_html_entities(current_music?.title)">
          {{ decode_html_entities(current_music?.title) || "Nenhuma música tocando" }}
        </span>

        <div class="tags-container">
          <span
            class="playlist-tag"
            v-if="current_playlist?.name"
            :title="decode_html_entities(current_playlist?.name)"
          >
            {{ decode_html_entities(current_playlist?.name) }}
          </span>
          <span class="playlist-tag" v-else>--------</span>
        </div>
      </div>
    </div>

    <div class="progress-section">
      <input
        type="range"
        min="0"
        :max="duration"
        v-model="ui_current_time"
        @input="on_seek_input"
        @change="on_seek_change"
        class="slider"
        :style="progress_style"
        :disabled="is_disabled_controls"
      />
      <div class="time-display">
        <span class="time-text">{{ formatted_current_time }}</span>
        <span class="time-text">{{ formatted_duration }}</span>
      </div>
    </div>
    <div class="controls">
      &nbsp;

      <button
        type="button"
        class="control-btn prev"
        @click="prev"
        title="Anterior"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon icon="backward-step" />
      </button>

      <button
        type="button"
        class="play-btn"
        @click="handle_play_interaction"
        :title="is_playing ? 'Pausar' : 'Tocar'"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon :icon="is_playing ? 'pause' : 'play'" />
      </button>

      <button
        type="button"
        class="control-btn next"
        @click="next"
        title="Próxima"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon icon="forward-step" />
      </button>

      &nbsp;
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useWindowStore } from "@/stores/windows";
import defaultMusicCover from "@/assets/images/kadem-default-music.jpg";
import { decode_html_entities } from "@/utils/string_helpers";

export default {
  data() {
    return {
      ui_current_time: 0,
      timer_interval: null,
      is_dragging: false,
      defaultMusicCover: defaultMusicCover,
      duration: 0,
    };
  },
  beforeUnmount() {
    if (this.timer_interval) clearInterval(this.timer_interval);
  },
  computed: {
    ...mapState(usePlayerStore, [
      "current_music",
      "current_playlist",
      "is_playing",
      "is_loading",
    ]),
    is_disabled_controls() {
      return !this.current_music || this.is_loading;
    },
    is_disabled() {
      return !this.current_music;
    },
    progress_style() {
      const percent =
        this.duration > 0 ? (this.ui_current_time / this.duration) * 100 : 0;
      return { backgroundSize: `${percent}% 100%` };
    },
    formatted_current_time() {
      return this.format_seconds_to_time(this.ui_current_time);
    },
    formatted_duration() {
      return this.format_seconds_to_time(this.duration);
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
  mounted: function () {
    this.start_ticker();
  },
  methods: {
    ...mapActions(usePlayerStore, [
      "toggle_play",
      "next",
      "prev",
      "seek_to",
      "get_current_time",
      "get_duration",
      "setActiveApp",
      "set_loading_state",
    ]),
    ...mapActions(useWindowStore, ["openWindow"]),
    decode_html_entities,
    handle_play_interaction() {
      if (this.is_loading) return;

      if (!this.is_playing) {
        this.openWindow({
          id: "productivity",
          title: "Produtividade",
          componentId: "ProductivityWindow",
          start_minimized: true,
        });

        this.setActiveApp("radio_flow");
      }

      this.toggle_play();
    },

    handle_seek(event) {
      this.seek_to(Number(event.target.value));
    },
    on_seek_input() {
      this.is_dragging = true;
    },
    on_seek_change() {
      this.seek_to(this.ui_current_time);
      this.is_dragging = false;
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
  },
};
</script>

<style scoped>
.radio-flow-widget {
  width: 100%;
  max-width: 800px;
  padding: var(--space-7);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  position: relative;
  overflow: hidden;
  color: var(--deep-blue);
}

.radio-flow-widget::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 0;
}

.radio-flow-widget > * {
  position: relative;
  z-index: 1;
}

.widget-header {
  display: flex;
  gap: var(--space-5);
  align-items: center;
}

.widget-cover {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.widget-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.radio-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-2);
  flex-grow: 1;
  overflow: hidden;
}

.music-title {
  font-size: var(--fontsize-md);
  font-weight: 700;
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  color: var(--deep-blue);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.playlist-tag {
  background-color: var(--gray-700);
  color: var(--gray-100);
  padding: 4px var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  backdrop-filter: blur(4px);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.time-text {
  font-size: 0.75rem;
  color: var(--deep-blue);
  min-width: 35px;
  font-weight: 500;

  &:last-child {
    text-align: right;
  }
}

.time-display {
  display: flex;
  justify-content: space-between;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
  padding: 0 var(--space-2);
}

.control-btn {
  background: none;
  border: none;
  color: var(--deep-blue);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2rem;
  opacity: 1;
}

.control-btn.secondary {
  color: var(--gray-300);
  font-size: 1rem;
  opacity: 0.6;
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.play-btn {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: var(--deep-blue);
  color: var(--white);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.play-btn svg {
  margin-left: 2px;
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(255, 255, 255, 0.3);
}

.play-btn:active {
  transform: scale(0.95);
}

@media (max-width: 400px) {
  .radio-flow-widget {
    padding: var(--space-5);
  }

  .widget-cover {
    width: 80px;
    height: 80px;
  }

  .play-btn {
    width: 50px;
    height: 50px;
    font-size: 1.3rem;
  }
}
</style>
