<template>
  <div class="radio-flow-widget glass">
    <div class="music-data">
      <div class="widget-cover">
        <img :src="current_music?.thumbnail || defaultMusicCover" alt="Capa" />
      </div>
      <div class="radio-data">
        <span :title="current_music?.title">{{
          current_music?.title || "Nenhuma música tocando"
        }}</span>
        <span :title="current_playlist?.name">{{
          current_playlist?.name || "--------"
        }}</span>
      </div>
    </div>
    <div class="time-range progress-container">
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
        :disabled="is_disabled_controls"
      />
      <span class="time-text">{{ formatted_duration }}</span>
    </div>
    <div class="controls">
      <button
        type="button"
        class="prev"
        @click="prev"
        title="Anterior"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon icon="backward-step" />
      </button>

      <button
        type="button"
        class="play"
        @click="handle_play_interaction"
        :title="is_playing ? 'Pausar' : 'Tocar'"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon :icon="'circle-' + (is_playing ? 'pause' : 'play')" />
      </button>

      <button
        type="button"
        class="next"
        @click="next"
        title="Próxima"
        :disabled="is_disabled_controls"
      >
        <font-awesome-icon icon="forward-step" />
      </button>
    </div>
  </div>
</template>
<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useWindowStore } from "@/stores/windows";
import defaultMusicCover from "@/assets/images/kadem-default-music.jpg";

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

    handle_play_interaction() {
      console.log("is_loading: ", this.is_loading);
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
  display: flex;
  align-items: center;
  padding: var(--space-6);
  gap: var(--space-6);

  & .widget-cover {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--deep-blue);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

    & img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  & .music-data {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  & .time-range {
    flex-grow: 1;
    display: flex;
    align-items: center;
  }

  & .radio-data {
    width: 150px;
    display: grid;
    line-height: 1.2;

    & span {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;

      &:first-child {
        color: var(--deep-blue);
        font-size: 0.9rem;
        font-weight: 600;
      }

      &:last-child {
        color: var(--deep-blue-2);
        font-size: 0.75rem;
      }
    }
  }

  & .controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);

    & button {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--deep-blue);
      transition: all 0.2s ease-in-out;

      &:hover {
        color: var(--deep-blue-2);
      }

      &.prev svg,
      &.next svg {
        font-size: calc(1vw + 0.7rem);
      }

      &.play svg {
        font-size: calc(1vw + 1.5rem);
      }
    }
  }
}

@media (max-width: 1100px) {
  .progress-container {
    width: 100%;
  }

  .radio-flow-widget {
    flex-direction: column;
  }

  .radio-data {
    width: 100% !important;
    max-width: 300px;
  }
}
</style>
