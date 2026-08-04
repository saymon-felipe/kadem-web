<template>
  <transition name="video-fade">
    <div v-if="modelValue" class="video-modal-overlay" :style="{ zIndex: z_index }" @click.self="close_modal">
      <div class="video-modal-content glass" :class="{ 'is-closing': is_closing, 'is-fullscreen': is_fullscreen }">
        <div class="modal-drag-indicator" v-if="!is_fullscreen"></div>

        <div class="video-header">
          <img :src="track?.thumbnail || default_cover" class="track-art" />
          <div class="track-info-meta">
            <strong class="track-title">{{ decode_html_entities(track?.title) }}</strong>
            <span class="track-channel">{{ decode_html_entities(track?.channel) }}</span>
          </div>
          <div class="header-action-buttons">
            <button
              class="modal-action-btn"
              @click="toggle_native_fullscreen"
              :title="is_fullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
            >
              <font-awesome-icon :icon="is_fullscreen ? 'compress' : 'expand'" />
            </button>
            <button class="close-modal-btn" @click="close_modal" title="Fechar vídeo">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
        </div>

        <div class="video-stage">
          <div v-if="is_loading" class="empty-state-container">
            <font-awesome-icon icon="spinner" spin class="video-loading-icon" />
            <p>Carregando vídeo offline...</p>
          </div>
          <template v-else-if="video_url">
            <div class="video-player-wrapper">
              <video
                ref="video_player"
                class="offline-video"
                :src="video_url"
                playsinline
                preload="metadata"
                @loadedmetadata="sync_playback(true)"
                @canplay="sync_playback()"
                @play="handle_video_play"
                @pause="handle_video_pause"
                @seeking="handle_video_seek"
                @seeked="handle_video_seek"
                @timeupdate="handle_video_timeupdate"
                @volumechange="handle_video_volume"
              ></video>
              <div class="video-hint-badge" v-if="!is_fullscreen">
                <font-awesome-icon icon="circle-info" />
                <span>O vídeo acompanha a reprodução da música</span>
              </div>
            </div>
          </template>
          <div v-else class="empty-state-container">
            <font-awesome-icon icon="film" class="empty-icon" />
            <p>{{ load_error || "Vídeo offline indisponível." }}</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { radioRepository } from "@/services/localData/radioRepository";
import { decode_html_entities } from "@/utils/string_helpers";
import { usePlayerStore } from "@/stores/player";

export default {
  name: "VideoModal",
  setup() {
    const playerStore = usePlayerStore();
    return { playerStore };
  },
  props: {
    modelValue: Boolean,
    track: Object,
    current_time: Number,
    is_playing: Boolean,
    default_cover: String,
    z_index: {
      type: Number,
      default: 2500,
    },
  },
  data() {
    return {
      video_url: null,
      is_loading: false,
      load_error: null,
      is_closing: false,
      is_fullscreen: false,
      is_internal_seeking: false,
    };
  },
  computed: {
    video_id() {
      return this.track?.youtube_id || null;
    },
    store_volume() {
      return this.playerStore?.volume ?? 1;
    },
  },
  watch: {
    modelValue(is_open) {
      if (is_open) {
        this.load_video();
      } else {
        this.pause_video();
        this.release_video_url();
        this.exit_fullscreen_if_active();
        if (this.playerStore?.set_video_modal_active) {
          this.playerStore.set_video_modal_active(false);
        }
      }
    },
    video_id() {
      if (this.modelValue) this.load_video();
    },
    current_time() {
      if (this.modelValue && !this.is_internal_seeking) this.sync_playback();
    },
    is_playing() {
      if (this.modelValue) this.sync_playback();
    },
    store_volume(new_vol) {
      const video = this.$refs.video_player;
      if (video) {
        video.volume = new_vol;
        video.muted = new_vol === 0;
      }
    },
  },
  methods: {
    decode_html_entities,
    async toggle_native_fullscreen() {
      const video = this.$refs.video_player;
      if (!video) return;

      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        try {
          video.controls = true;
          if (video.requestFullscreen) {
            await video.requestFullscreen();
          } else if (video.webkitRequestFullscreen) {
            await video.webkitRequestFullscreen();
          } else if (video.msRequestFullscreen) {
            await video.msRequestFullscreen();
          }
        } catch (e) {
          console.warn("[VideoModal] Erro ao entrar em tela cheia nativa:", e);
        }
      } else {
        this.exit_fullscreen_if_active();
      }
    },

    exit_fullscreen_if_active() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    },

    handle_fullscreen_change() {
      const is_fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      this.is_fullscreen = is_fs;
      const video = this.$refs.video_player;
      if (video) {
        video.controls = is_fs;
      }
    },

    /* Sincronização bidirecional de eventos do vídeo para o Player Store */
    handle_video_play() {
      if (!this.is_playing && this.playerStore) {
        if (this.playerStore.toggle_play) this.playerStore.toggle_play();
      }
    },

    handle_video_pause() {
      const video = this.$refs.video_player;
      if (video && video.ended) return;
      if (this.is_playing && !this.is_internal_seeking && this.playerStore) {
        if (this.playerStore.toggle_play) this.playerStore.toggle_play();
      }
    },

    handle_video_seek() {
      const video = this.$refs.video_player;
      if (!video || !this.playerStore) return;

      this.is_internal_seeking = true;
      const target_time = video.currentTime;
      if (Math.abs(Number(this.current_time) - target_time) > 0.4) {
        this.playerStore.seek_to(target_time);
      }
      setTimeout(() => {
        this.is_internal_seeking = false;
      }, 250);
    },

    handle_video_timeupdate() {
      const video = this.$refs.video_player;
      if (!video || !this.playerStore || this.is_internal_seeking) return;

      const target_time = video.currentTime;
      if (Math.abs(Number(this.current_time) - target_time) > 0.8) {
        this.playerStore.update_playback_position(target_time);
      }
    },

    handle_video_volume() {
      const video = this.$refs.video_player;
      if (!video || !this.playerStore) return;

      const new_vol = video.muted ? 0 : video.volume;
      if (Math.abs((this.playerStore.volume || 0) - new_vol) > 0.02) {
        this.playerStore.set_volume(new_vol);
      }
    },

    async load_video() {
      const requested_id = this.video_id;
      if (!requested_id) return;

      this.is_loading = true;
      this.load_error = null;
      this.release_video_url();

      try {
        const blob = await radioRepository.getGlobalVideoBlob(requested_id);
        if (requested_id !== this.video_id) return;

        if (!blob) {
          this.load_error = "O arquivo de vídeo não foi encontrado no dispositivo.";
          return;
        }

        this.video_url = URL.createObjectURL(blob);
        if (this.playerStore?.set_video_modal_active) {
          this.playerStore.set_video_modal_active(true);
        }
        this.$nextTick(() => this.sync_playback(true));
      } catch (error) {
        console.error("[VideoModal] Erro ao abrir vídeo offline:", error);
        this.load_error = "Não foi possível abrir o vídeo offline.";
      } finally {
        if (requested_id === this.video_id) this.is_loading = false;
      }
    },

    sync_playback(force_seek = false) {
      const video = this.$refs.video_player;
      if (!video || !Number.isFinite(Number(this.current_time))) return;

      const target_time = Math.max(0, Number(this.current_time));
      if (force_seek || Math.abs(video.currentTime - target_time) > 0.6) {
        try {
          video.currentTime = target_time;
        } catch (error) {
          // O navegador ainda pode estar carregando os metadados
        }
      }

      if (this.playerStore) {
        video.volume = this.playerStore.volume;
        video.muted = this.playerStore.volume === 0;
      }

      if (this.is_playing) {
        video.play().catch((error) => {
          if (error?.name !== "AbortError") {
            console.warn("[VideoModal] Reprodução de vídeo bloqueada:", error);
          }
        });
      } else {
        this.pause_video();
      }
    },

    pause_video() {
      const video = this.$refs.video_player;
      if (video && !video.paused) video.pause();
    },

    release_video_url() {
      if (this.video_url) URL.revokeObjectURL(this.video_url);
      this.video_url = null;
    },

    close_modal() {
      this.is_closing = true;
      this.pause_video();
      this.exit_fullscreen_if_active();
      if (this.playerStore?.set_video_modal_active) {
        this.playerStore.set_video_modal_active(false);
      }
      setTimeout(() => {
        this.$emit("update:modelValue", false);
        this.is_closing = false;
      }, 400);
    },
  },
  mounted() {
    if (this.modelValue) this.load_video();
    document.addEventListener("fullscreenchange", this.handle_fullscreen_change);
    document.addEventListener("webkitfullscreenchange", this.handle_fullscreen_change);
  },
  beforeUnmount() {
    this.pause_video();
    this.release_video_url();
    this.exit_fullscreen_if_active();
    if (this.playerStore?.set_video_modal_active) {
      this.playerStore.set_video_modal_active(false);
    }
    document.removeEventListener("fullscreenchange", this.handle_fullscreen_change);
    document.removeEventListener("webkitfullscreenchange", this.handle_fullscreen_change);
  },
};
</script>

<style scoped>
.video-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100% - 108px);
  z-index: 2500;
  display: flex;
  justify-content: center;
}

.video-modal-content {
  width: calc(100% - 42px);
  height: 100%;
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.modal-drag-indicator {
  width: 40px;
  height: 1px;
  background: var(--gray-600);
  margin: 0 auto var(--space-6);
}

.video-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.track-art {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  box-shadow: var(--boxshadow-default);
}

.track-info-meta {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.track-title {
  color: var(--deep-blue);
  font-size: 1.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-channel {
  color: var(--text-gray);
  font-size: 0.95rem;
}

.header-action-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.modal-action-btn,
.close-modal-btn {
  font-size: 1.3rem;
  color: var(--deep-blue);
  transition: transform 0.2s, background-color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.modal-action-btn:hover,
.close-modal-btn:hover {
  transform: scale(1.1);
  background: rgba(0, 0, 0, 0.06);
}

.close-modal-btn {
  font-size: 1.8rem;
}

.video-stage {
  flex-grow: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: #050505;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
}

.video-player-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.offline-video {
  width: 100%;
  height: 100%;
  max-height: calc(100% - 40px);
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: #000;
  border-radius: var(--radius-sm);
}

.video-hint-badge {
  position: absolute;
  bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.82rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.empty-state-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-gray);
  opacity: 0.7;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--space-4);
  color: var(--gray-300);
}

.video-loading-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
  color: var(--color-info);
}

.empty-state-container p {
  font-size: 1.1rem;
  font-weight: 500;
}

/* Modo Tela Cheia (Mapeado para a área acima do player) */
.video-modal-content.is-fullscreen {
  width: 100% !important;
  height: 100% !important;
  border-radius: 0 !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: #000 !important;
}

.video-modal-content.is-fullscreen .video-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  margin-bottom: 0;
  padding: var(--space-4) var(--space-6);
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.85), transparent);
  border: none;
}

.video-modal-content.is-fullscreen .track-title {
  color: #ffffff;
}

.video-modal-content.is-fullscreen .track-channel {
  color: rgba(255, 255, 255, 0.7);
}

.video-modal-content.is-fullscreen .modal-action-btn,
.video-modal-content.is-fullscreen .close-modal-btn {
  color: #ffffff;
}

.video-modal-content.is-fullscreen .modal-action-btn:hover,
.video-modal-content.is-fullscreen .close-modal-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.video-modal-content.is-fullscreen .video-stage {
  border-radius: 0;
  box-shadow: none;
}

.video-modal-content.is-fullscreen .offline-video {
  max-height: 100%;
  border-radius: 0;
}

/* Animações */
.video-fade-enter-active {
  animation: overlayFadeIn 0.4s ease;
}
.video-fade-leave-active {
  animation: overlayFadeIn 0.4s ease reverse;
}

.video-fade-enter-active .video-modal-content {
  animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.video-fade-leave-active .video-modal-content {
  animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@container (max-width: 1100px) {
  .video-modal-content {
    width: 100%;
    border-radius: 0;
  }

  .video-modal-overlay {
    height: calc(100% - 163px);
  }
}
</style>
