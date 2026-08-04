<template>
  <transition name="menu-pop">
    <div v-if="modelValue" class="options-backdrop" @click.self="close">
      <div class="options-menu" :style="position_style">
        <button class="menu-item option-red" @click="$emit('delete')">
          <font-awesome-icon icon="trash-can" />
          <span>Excluir</span>
        </button>

        <div
          class="download-menu-trigger"
          @mouseenter="open_download_menu_on_hover"
          @mouseleave="close_download_menu_on_hover"
        >
          <button
            ref="downloadTrigger"
            class="menu-item"
            :class="{ 'submenu-open': show_download_menu }"
            aria-haspopup="menu"
            :aria-expanded="show_download_menu"
            @click.stop="toggle_download_menu_on_touch"
          >
            <font-awesome-icon icon="download" />
            <span>Baixar</span>
            <font-awesome-icon icon="chevron-right" class="submenu-chevron" />
          </button>

          <div
            v-if="show_download_menu"
            ref="downloadMenu"
            class="download-submenu"
            :style="download_submenu_style"
            role="menu"
            @mouseenter="cancel_download_menu_close"
            @mouseleave="close_download_menu_on_hover"
          >
            <button
              class="menu-item"
              :class="{ 'disabled-item': !canDownloadAudio || isDownloadingAudio || isDownloadingVideo }"
              :disabled="!canDownloadAudio || isDownloadingAudio || isDownloadingVideo"
              :title="download_unavailable_title"
              @click="$emit('download-audio')"
            >
              <font-awesome-icon
                :icon="isDownloadingAudio ? 'spinner' : hasAudio ? 'arrows-rotate' : 'music'"
                :spin="isDownloadingAudio"
              />
              <span>{{ audio_download_label }}</span>
            </button>

            <button
              ref="videoQualityTrigger"
              class="menu-item"
              :class="{ 'disabled-item': !canDownloadVideo || isDownloadingAudio || isDownloadingVideo, 'submenu-open': show_video_quality_menu }"
              :disabled="!canDownloadVideo || isDownloadingAudio || isDownloadingVideo || videoQualities.length === 0"
              :title="video_download_unavailable_title"
              @click.stop="toggle_video_quality_menu"
            >
              <font-awesome-icon
                :icon="isDownloadingVideo ? 'spinner' : hasVideo ? 'arrows-rotate' : 'film'"
                :spin="isDownloadingVideo"
              />
              <span>{{ video_download_label }}</span>
              <font-awesome-icon icon="chevron-right" class="submenu-chevron" />
            </button>

            <div
              v-if="show_video_quality_menu"
              ref="videoQualityMenu"
              class="video-quality-submenu"
              :style="video_quality_submenu_style"
              role="menu"
              @mouseenter="cancel_download_menu_close"
              @mouseleave="close_download_menu_on_hover"
            >
              <button
                v-for="quality in videoQualities"
                :key="quality.height"
                class="menu-item"
                @click="$emit('download-video', quality.height)"
              >
                <font-awesome-icon icon="film" />
                <span>{{ quality.label }}</span>
              </button>
            </div>

            <button
              class="menu-item"
              :class="{ 'disabled-item': !canDownloadAudio || isDownloadingLyrics }"
              :disabled="!canDownloadAudio || isDownloadingLyrics"
              :title="download_unavailable_title"
              @click="$emit('download-lyrics')"
            >
              <font-awesome-icon
                :icon="isDownloadingLyrics ? 'spinner' : hasLyrics ? 'arrows-rotate' : 'closed-captioning'"
                :spin="isDownloadingLyrics"
              />
              <span>{{ lyrics_download_label }}</span>
            </button>
          </div>
        </div>

        <button
          class="menu-item"
          @click="!isInQueue && $emit('add-queue')"
          :class="{ 'disabled-item': isInQueue }"
          :disabled="isInQueue"
        >
          <font-awesome-icon :icon="isInQueue ? 'check' : 'plus'" :class="{ 'success-icon': isInQueue }" />
          <span>{{ isInQueue ? "Na fila" : "Adicionar à fila" }}</span>
        </button>

        <button class="menu-item" @click="$emit('copy-link')">
          <font-awesome-icon icon="link" />
          <span>Copiar link</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    modelValue: { type: Boolean, required: true },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    isInQueue: { type: Boolean, default: false },
    hasAudio: { type: Boolean, default: false },
    hasVideo: { type: Boolean, default: false },
    isDownloadingAudio: { type: Boolean, default: false },
    isDownloadingVideo: { type: Boolean, default: false },
    hasLyrics: { type: Boolean, default: false },
    isDownloadingLyrics: { type: Boolean, default: false },
    lyricsUnavailable: { type: Boolean, default: false },
    canDownloadAudio: { type: Boolean, default: false },
    canDownloadVideo: { type: Boolean, default: false },
    videoQualities: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue", "delete", "download-audio", "download-video", "download-lyrics", "add-queue", "copy-link"],
  data() {
    return {
      show_download_menu: false,
      show_video_quality_menu: false,
      download_menu_close_timer: null,
      download_submenu_position: { top: -9999, left: -9999, transformOrigin: "top left" },
      video_quality_submenu_position: { top: -9999, left: -9999, transformOrigin: "top left" },
    };
  },
  watch: {
    modelValue(isOpen) {
      if (!isOpen) {
        this.cancel_download_menu_close();
        this.show_download_menu = false;
        this.show_video_quality_menu = false;
      }
    },
  },
  mounted() {
    window.addEventListener("resize", this.position_download_submenu);
    window.addEventListener("resize", this.position_video_quality_submenu);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.position_download_submenu);
    window.removeEventListener("resize", this.position_video_quality_submenu);
    this.cancel_download_menu_close();
  },
  computed: {
    position_style() {
      return {
        top: `${this.position.y}px`,
        left: `${this.position.x - 150}px`,
      };
    },
    audio_download_label() {
      if (this.isDownloadingAudio) return "Baixando música...";
      return this.hasAudio ? "Refazer download do áudio" : "Baixar só o áudio";
    },
    video_download_label() {
      if (this.isDownloadingVideo) return "Baixando áudio e vídeo...";
      return this.hasVideo ? "Refazer download de áudio e vídeo" : "Baixar áudio e vídeo";
    },
    lyrics_download_label() {
      if (this.isDownloadingLyrics) return "Baixando legenda...";
      if (this.hasLyrics) return "Refazer download da legenda";
      if (this.lyricsUnavailable) return "Tentar baixar legenda";
      return "Baixar legenda";
    },
    download_unavailable_title() {
      if (this.canDownloadAudio) return "";
      return "Disponível online para planos com modo offline";
    },
    video_download_unavailable_title() {
      if (this.canDownloadVideo) return "";
      return "Seu plano não permite baixar vídeos offline";
    },
    download_submenu_style() {
      return {
        top: `${this.download_submenu_position.top}px`,
        left: `${this.download_submenu_position.left}px`,
        transformOrigin: this.download_submenu_position.transformOrigin,
      };
    },
    video_quality_submenu_style() {
      return {
        top: `${this.video_quality_submenu_position.top}px`,
        left: `${this.video_quality_submenu_position.left}px`,
        transformOrigin: this.video_quality_submenu_position.transformOrigin,
      };
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
    supports_hover() {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    },
    open_download_menu_on_hover() {
      if (this.supports_hover()) this.open_download_menu();
    },
    close_download_menu_on_hover() {
      if (!this.supports_hover()) return;
      this.cancel_download_menu_close();
      this.download_menu_close_timer = window.setTimeout(() => {
        this.show_download_menu = false;
        this.show_video_quality_menu = false;
        this.download_menu_close_timer = null;
      }, 180);
    },
    cancel_download_menu_close() {
      if (this.download_menu_close_timer !== null) {
        window.clearTimeout(this.download_menu_close_timer);
        this.download_menu_close_timer = null;
      }
    },
    toggle_download_menu_on_touch() {
      if (this.supports_hover()) return;
      if (this.show_download_menu) {
        this.show_download_menu = false;
        return;
      }
      this.open_download_menu();
    },
    async open_download_menu() {
      this.cancel_download_menu_close();
      this.show_download_menu = true;
      this.show_video_quality_menu = false;
      await this.$nextTick();
      this.position_download_submenu();
    },
    async toggle_video_quality_menu() {
      if (this.show_video_quality_menu) {
        this.show_video_quality_menu = false;
        return;
      }

      this.cancel_download_menu_close();
      this.show_video_quality_menu = true;
      await this.$nextTick();
      this.position_video_quality_submenu();
    },
    position_download_submenu() {
      if (!this.show_download_menu) return;

      const trigger = this.$refs.downloadTrigger;
      const submenu = this.$refs.downloadMenu;
      if (!trigger || !submenu) return;

      const trigger_rect = trigger.getBoundingClientRect();
      const submenu_rect = submenu.getBoundingClientRect();
      const gap = 0;
      const margin = 8;
      const max_left = Math.max(margin, window.innerWidth - submenu_rect.width - margin);
      const max_top = Math.max(margin, window.innerHeight - submenu_rect.height - margin);
      const has_space_right = window.innerWidth - trigger_rect.right >= submenu_rect.width + gap + margin;
      const has_space_left = trigger_rect.left >= submenu_rect.width + gap + margin;

      let left;
      let top;
      let transformOrigin;

      if (has_space_right || has_space_left) {
        left = has_space_right ? trigger_rect.right + gap : trigger_rect.left - submenu_rect.width - gap;
        top = Math.min(Math.max(trigger_rect.top, margin), max_top);
        transformOrigin = has_space_right ? "top left" : "top right";
      } else {
        const has_space_below = window.innerHeight - trigger_rect.bottom >= submenu_rect.height + gap + margin;
        left = Math.min(Math.max(trigger_rect.left, margin), max_left);
        top = has_space_below ? trigger_rect.bottom + gap : trigger_rect.top - submenu_rect.height - gap;
        top = Math.min(Math.max(top, margin), max_top);
        transformOrigin = has_space_below ? "top center" : "bottom center";
      }

      this.download_submenu_position = { top, left, transformOrigin };
    },
    position_video_quality_submenu() {
      if (!this.show_video_quality_menu) return;

      const trigger = this.$refs.videoQualityTrigger;
      const submenu = this.$refs.videoQualityMenu;
      if (!trigger || !submenu) return;

      const trigger_rect = trigger.getBoundingClientRect();
      const submenu_rect = submenu.getBoundingClientRect();
      const margin = 8;
      const has_space_right = window.innerWidth - trigger_rect.right >= submenu_rect.width + margin;
      const has_space_left = trigger_rect.left >= submenu_rect.width + margin;
      const max_left = Math.max(margin, window.innerWidth - submenu_rect.width - margin);
      const max_top = Math.max(margin, window.innerHeight - submenu_rect.height - margin);

      let left;
      let top;
      let transformOrigin;

      if (has_space_right || has_space_left) {
        left = has_space_right ? trigger_rect.right : trigger_rect.left - submenu_rect.width;
        top = Math.min(Math.max(trigger_rect.top, margin), max_top);
        transformOrigin = has_space_right ? "top left" : "top right";
      } else {
        const has_space_below = window.innerHeight - trigger_rect.bottom >= submenu_rect.height + margin;
        left = Math.min(Math.max(trigger_rect.left, margin), max_left);
        top = has_space_below ? trigger_rect.bottom : trigger_rect.top - submenu_rect.height;
        top = Math.min(Math.max(top, margin), max_top);
        transformOrigin = has_space_below ? "top center" : "bottom center";
      }

      this.video_quality_submenu_position = { top, left, transformOrigin };
    },
  },
};
</script>

<style scoped>
.options-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: transparent;
}

.options-menu {
  position: absolute;
  width: 180px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: visible;
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
}

.disabled-item {
  cursor: not-allowed !important;
  color: var(--text-muted) !important;
  background: none !important;
}

.success-icon {
  color: var(--color-income);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition: background 0.1s;
  font-size: 0.9rem;
}

.menu-item:hover {
  background: var(--surface-3);
}

.download-menu-trigger {
  position: relative;
}

.menu-item.submenu-open {
  background: var(--surface-3);
}

.submenu-chevron {
  margin-left: auto;
  font-size: 0.7rem;
}

.download-submenu {
  position: fixed;
  z-index: 1;
  width: 220px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-float);
}

.video-quality-submenu {
  position: fixed;
  z-index: 2;
  width: 130px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-float);
}

.option-red {
  color: var(--color-expense);
}

/* --- Animação Menu Pop --- */
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.2s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
}

.menu-pop-enter-active .options-menu,
.menu-pop-leave-active .options-menu {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.menu-pop-enter-from .options-menu,
.menu-pop-leave-to .options-menu {
  transform: scale(0.8) translateY(-10px);
}
</style>
