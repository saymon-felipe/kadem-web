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
          >
            <button
              class="menu-item"
              :class="{ 'disabled-item': !canDownload || isDownloadingAudio }"
              :disabled="!canDownload || isDownloadingAudio"
              :title="download_unavailable_title"
              @click="$emit('download-audio')"
            >
              <font-awesome-icon
                :icon="isDownloadingAudio ? 'spinner' : isOffline ? 'arrows-rotate' : 'download'"
                :spin="isDownloadingAudio"
              />
              <span>{{ audio_download_label }}</span>
            </button>

            <button
              class="menu-item"
              :class="{ 'disabled-item': !canDownload || isDownloadingLyrics }"
              :disabled="!canDownload || isDownloadingLyrics"
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
    isOffline: { type: Boolean, default: false },
    isDownloadingAudio: { type: Boolean, default: false },
    hasLyrics: { type: Boolean, default: false },
    isDownloadingLyrics: { type: Boolean, default: false },
    lyricsUnavailable: { type: Boolean, default: false },
    canDownload: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "delete", "download-audio", "download-lyrics", "add-queue", "copy-link"],
  data() {
    return {
      show_download_menu: false,
      download_submenu_position: { top: -9999, left: -9999, transformOrigin: "top left" },
    };
  },
  watch: {
    modelValue(isOpen) {
      if (!isOpen) this.show_download_menu = false;
    },
  },
  mounted() {
    window.addEventListener("resize", this.position_download_submenu);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.position_download_submenu);
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
      return this.isOffline ? "Refazer download da música" : "Baixar música";
    },
    lyrics_download_label() {
      if (this.isDownloadingLyrics) return "Baixando legenda...";
      if (this.hasLyrics) return "Refazer download da legenda";
      if (this.lyricsUnavailable) return "Tentar baixar legenda";
      return "Baixar legenda";
    },
    download_unavailable_title() {
      if (this.canDownload) return "";
      return "Disponível online para planos com modo offline";
    },
    download_submenu_style() {
      return {
        top: `${this.download_submenu_position.top}px`,
        left: `${this.download_submenu_position.left}px`,
        transformOrigin: this.download_submenu_position.transformOrigin,
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
      if (this.supports_hover()) this.show_download_menu = false;
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
      this.show_download_menu = true;
      await this.$nextTick();
      this.position_download_submenu();
    },
    position_download_submenu() {
      if (!this.show_download_menu) return;

      const trigger = this.$refs.downloadTrigger;
      const submenu = this.$refs.downloadMenu;
      if (!trigger || !submenu) return;

      const trigger_rect = trigger.getBoundingClientRect();
      const submenu_rect = submenu.getBoundingClientRect();
      const gap = 4;
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
