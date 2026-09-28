<template>
  <transition name="menu-pop">
    <div v-if="modelValue" class="options-backdrop" @click.self="close">
      <div class="options-menu" :style="position_style">
        <button class="menu-item option-red" @click="$emit('delete')">
          <font-awesome-icon icon="trash-can" />
          <span>Excluir</span>
        </button>

        <SubmenuTrigger panel-width="220px">
          <template #trigger>
            <font-awesome-icon icon="download" />
            <span>Baixar</span>
          </template>

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

          <SubmenuTrigger
            panel-width="130px"
            :disabled="!canDownloadVideo || isDownloadingAudio || isDownloadingVideo || videoQualities.length === 0"
            :title="video_download_unavailable_title"
          >
            <template #trigger>
              <font-awesome-icon
                :icon="isDownloadingVideo ? 'spinner' : hasVideo ? 'arrows-rotate' : 'film'"
                :spin="isDownloadingVideo"
              />
              <span>{{ video_download_label }}</span>
            </template>

            <button
              v-for="quality in videoQualities"
              :key="quality.height"
              class="menu-item"
              @click="$emit('download-video', quality.height)"
            >
              <font-awesome-icon icon="film" />
              <span>{{ quality.label }}</span>
            </button>
          </SubmenuTrigger>

          <button
            class="menu-item"
            :class="{ 'disabled-item': !canDownloadLyrics || isDownloadingLyrics }"
            :disabled="!canDownloadLyrics || isDownloadingLyrics"
            :title="lyrics_unavailable_title"
            @click="$emit('download-lyrics')"
          >
            <font-awesome-icon
              :icon="isDownloadingLyrics ? 'spinner' : hasLyrics ? 'arrows-rotate' : 'closed-captioning'"
              :spin="isDownloadingLyrics"
            />
            <span>{{ lyrics_download_label }}</span>
          </button>
        </SubmenuTrigger>

        <button class="menu-item" @click="$emit('add-queue')">
          <font-awesome-icon icon="plus" />
          <span>Adicionar à fila</span>
        </button>

        <SubmenuTrigger panel-width="240px" :disabled="playlists.length === 0" title="Nenhuma playlist disponível">
          <template #trigger>
            <font-awesome-icon icon="circle-plus" />
            <span>Adicionar a outra playlist</span>
          </template>

          <button
            v-for="pl in playlists"
            :key="pl.local_id"
            class="menu-item"
            @click="$emit('add-to-playlist', pl)"
          >
            <span class="playlist-name">{{ pl.name }}</span>
            <font-awesome-icon
              v-if="existingInPlaylists.includes(pl.local_id)"
              icon="check"
              class="existing-icon"
              title="Já adicionada"
            />
          </button>
        </SubmenuTrigger>

        <button class="menu-item" @click="$emit('copy-link')">
          <font-awesome-icon icon="link" />
          <span>Copiar link</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
import SubmenuTrigger from "./SubmenuTrigger.vue";

export default {
  components: { SubmenuTrigger },
  props: {
    modelValue: { type: Boolean, required: true },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    hasAudio: { type: Boolean, default: false },
    hasVideo: { type: Boolean, default: false },
    isDownloadingAudio: { type: Boolean, default: false },
    isDownloadingVideo: { type: Boolean, default: false },
    hasLyrics: { type: Boolean, default: false },
    isDownloadingLyrics: { type: Boolean, default: false },
    lyricsUnavailable: { type: Boolean, default: false },
    canDownloadAudio: { type: Boolean, default: false },
    canDownloadVideo: { type: Boolean, default: false },
    canDownloadLyrics: { type: Boolean, default: false },
    isUploadedTrack: { type: Boolean, default: false },
    videoQualities: { type: Array, default: () => [] },
    playlists: { type: Array, default: () => [] },
    existingInPlaylists: { type: Array, default: () => [] },
  },
  emits: [
    "update:modelValue",
    "delete",
    "download-audio",
    "download-video",
    "download-lyrics",
    "add-queue",
    "add-to-playlist",
    "copy-link",
  ],
  computed: {
    position_style() {
      return {
        top: `${this.position.y}px`,
        left: `${this.position.x - 210}px`,
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
      if (this.isUploadedTrack) return "Músicas enviadas não têm vídeo";
      return "Seu plano não permite baixar vídeos offline";
    },
    lyrics_unavailable_title() {
      if (this.canDownloadLyrics) return "";
      if (this.isUploadedTrack) return "Não disponível para músicas enviadas";
      return this.download_unavailable_title;
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
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
  width: 240px;
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

.playlist-name {
  flex-grow: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.existing-icon {
  color: var(--green);
  font-size: 0.8rem;
  margin-left: auto;
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
