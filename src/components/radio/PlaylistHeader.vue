<template>
  <div class="playlist-hero" :style="hero_background">
    <img :src="playlist.cover || default_avatar" class="hero-cover" />

    <div class="hero-details">
      <div v-if="isEditing" class="edit-title-wrapper">
        <input
          ref="titleInput"
          v-model="tempName"
          @blur="save_rename"
          @keyup.enter="save_rename"
          class="title-input"
        />
      </div>
      <h1 v-else @dblclick="start_rename">{{ playlist.name }}</h1>

      <div class="meta-row">
        <span>{{
          track_count > 1
            ? track_count + " músicas"
            : track_count == 0
            ? "Nenhuma música"
            : "1 música"
        }}</span>
        <span
          v-if="total_duration_formatted && total_duration_seconds > 0"
          class="separator"
          >•</span
        >
        <span v-if="total_duration_seconds > 0">{{ total_duration_formatted }}</span>
      </div>
    </div>
    <div class="header-options">
      <button
        v-if="connection.connected && allow_offline && track_count > 0"
        class="btn-options"
        :class="{ 'btn-disabled': !has_missing_lyrics && !is_downloading_lyrics }"
        @click.stop="handle_download_lyrics"
        :disabled="is_downloading_lyrics || !has_missing_lyrics"
        :title="lyrics_btn_title"
      >
        <font-awesome-icon v-if="is_downloading_lyrics" icon="spinner" spin />
        <font-awesome-icon v-else icon="closed-captioning" />

        <span
          v-if="has_missing_lyrics && !is_downloading_lyrics"
          class="badge-dot"
        ></span>
      </button>
      <div
        v-if="connection.connected && (allow_offline || allow_offline_video) && track_count > 0"
        class="download-options-wrapper"
        v-click-outside="close_download_menu"
      >
        <button
          class="btn-options"
          :class="{
            'downloaded-state': is_fully_downloaded && !has_downloadable_video_tracks,
            'downloading-state': is_downloading_playlist,
          }"
          @click.stop="toggle_download_menu"
          :title="download_tooltip"
          :disabled="is_downloading_playlist"
        >
          <font-awesome-icon v-if="is_downloading_playlist" icon="spinner" spin />
          <font-awesome-icon v-else-if="is_fully_downloaded && !has_downloadable_video_tracks" icon="circle-check" />
          <font-awesome-icon v-else icon="download" />
        </button>

        <transition name="menu-pop">
          <div v-if="show_download_menu" class="download-options-dropdown">
            <button
              class="dropdown-item"
              :disabled="!allow_offline || !has_downloadable_audio_tracks"
              :class="{ 'btn-disabled': !allow_offline || !has_downloadable_audio_tracks }"
              @click="handle_download_action('audio')"
            >
              <font-awesome-icon icon="music" /> Baixar só o áudio
            </button>
            <button
              ref="video_quality_trigger"
              class="dropdown-item"
              :disabled="!allow_offline_video || !has_downloadable_video_tracks"
              :class="{ 'btn-disabled': !allow_offline_video || !has_downloadable_video_tracks, 'submenu-open': show_video_quality_menu }"
              @click.stop="toggle_video_quality_menu"
            >
              <font-awesome-icon icon="film" />
              <span>Baixar áudio e vídeo</span>
              <font-awesome-icon icon="chevron-right" class="quality-chevron" />
            </button>
            <div v-if="show_video_quality_menu" class="video-quality-dropdown">
              <button
                v-for="quality in video_quality_options"
                :key="quality.height"
                class="dropdown-item"
                @click="handle_download_action('video', quality.height)"
              >
                <font-awesome-icon icon="film" /> {{ quality.label }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <button class="btn-options" @click.stop="showMenu = !showMenu">
        <font-awesome-icon icon="ellipsis-vertical" />
      </button>

      <transition name="menu-pop">
        <div v-if="showMenu" class="options-dropdown" v-click-outside="closeMenu">
          <button @click="start_rename" class="dropdown-item">
            <font-awesome-icon icon="pen" /> Renomear
          </button>
          <button @click="open_cover_modal" class="dropdown-item">
            <font-awesome-icon icon="image" /> Alterar foto
          </button>
          <button @click="confirm_delete" class="dropdown-item danger">
            <font-awesome-icon icon="trash" /> Excluir
          </button>
        </div>
      </transition>
    </div>

    <ConfirmationModal
      v-model="showDeleteModal"
      message="Tem certeza que deseja excluir esta playlist?"
      confirmText="Excluir"
      @cancelled="showDeleteModal = false"
      @confirmed="execute_delete"
    />

    <ImageCropperModal
      v-model="is_crop_modal_open"
      title="Alterar Capa da Playlist"
      :aspect-ratio="1"
      @close="is_crop_modal_open = false"
      @save="handle_cover_save"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useRadioStore } from "@/stores/radio";
import { useUtilsStore } from "@/stores/utils";
import { useAuthStore } from "@/stores/auth";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import ImageCropperModal from "@/components/ImageCropperModal.vue";
import { getOfflineVideoQualities, getPlanLimits } from "@/services/subscription_plans.js";

export default {
  name: "PlaylistHeader",

  components: {
    ConfirmationModal,
    ImageCropperModal,
  },

  props: {
    playlist: {
      type: Object,
      required: true,
    },
    track_count: {
      type: Number,
      default: 0,
    },
    total_duration_seconds: {
      type: Number,
      default: 0,
    },
    default_cover: {
      type: String,
      required: true,
    },
    default_avatar: {
      type: String,
      required: true,
    },
    tracks: {
      type: Array,
      default: () => [],
    },
  },

  emits: ["rename-playlist", "delete-playlist", "change-cover"],

  data() {
    return {
      showMenu: false,
      isEditing: false,
      tempName: "",
      showDeleteModal: false,
      show_download_menu: false,
      show_video_quality_menu: false,
      is_crop_modal_open: false,
    };
  },

  computed: {
    ...mapState(useRadioStore, [
      "active_downloads",
      "trackHasLyrics",
      "trackLyricsUnavailable",
      "isLyricDownloading",
      "isTrackOffline",
      "hasTrackAudio",
      "hasTrackVideo",
    ]),
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useAuthStore, ["user"]),

    plan_limits() {
      return getPlanLimits(this.user?.plan_tier);
    },
    allow_offline() {
      return this.plan_limits.can_use_offline_radio;
    },
    allow_offline_video() {
      return this.plan_limits.can_download_offline_video;
    },
    video_quality_options() {
      return getOfflineVideoQualities(this.user?.plan_tier);
    },

    has_missing_lyrics() {
      if (!this.playlist || !this.tracks) return false;

      return this.tracks.some((t) => {
        if (!t.youtube_id) return false;
        if (this.trackHasLyrics(t)) return false;
        if (this.trackLyricsUnavailable(t)) return false;

        return true;
      });
    },
    missing_lyrics_count() {
      if (!this.playlist || !this.tracks) return 0;

      return this.tracks.filter((t) => {
        return (
          t.youtube_id &&
          !this.trackHasLyrics(t) &&
          !this.trackLyricsUnavailable(t)
        );
      }).length;
    },
    is_downloading_lyrics() {
      if (!this.playlist || !this.tracks) return false;
      return this.tracks.some(
        (t) => t.youtube_id && this.isLyricDownloading(t.youtube_id)
      );
    },
    lyrics_btn_title() {
      if (this.is_downloading_lyrics) return "Baixando legendas...";
      if (this.has_missing_lyrics) return "Baixar legendas faltantes";
      return "Todas as legendas disponíveis já foram baixadas";
    },

    hero_background() {
      const cover = this.playlist.cover || this.default_cover;
      return `background: linear-gradient(to top, var(--surface-1), transparent), url(${cover}) no-repeat right center; background-size: cover;`;
    },

    total_duration_formatted() {
      return this.format_total_duration_verbose(this.total_duration_seconds);
    },

    is_fully_downloaded() {
      if (!this.tracks || this.tracks.length === 0) return false;
      return this.tracks.every((t) => this.isTrackOffline(t));
    },

    is_downloading_playlist() {
      if (!this.tracks) return false;
      return this.tracks.some((t) => this.active_downloads[t.local_id] !== undefined);
    },

    has_downloadable_audio_tracks() {
      return this.tracks.some((track) => !this.hasTrackAudio(track));
    },

    has_downloadable_video_tracks() {
      return this.tracks.some((track) => !this.hasTrackVideo(track));
    },

    download_tooltip() {
      if (this.is_downloading_playlist) return "Baixando músicas...";
      if (this.has_downloadable_audio_tracks || this.has_downloadable_video_tracks) return "Escolher mídia para baixar";
      return "Áudio e vídeo já foram baixados";
    },
  },

  methods: {
    ...mapActions(useRadioStore, [
      "downloadPlaylist",
      "download_missing_lyrics_for_playlist",
    ]),

    format_total_duration_verbose(seconds) {
      if (!seconds) return "";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    },

    async handle_download_lyrics() {
      if (!this.playlist?.local_id || !this.has_missing_lyrics) return;
      await this.download_missing_lyrics_for_playlist(this.playlist.local_id);
    },

    open_cover_modal() {
      this.showMenu = false;
      this.is_crop_modal_open = true;
    },

    async handle_cover_save(base64_image) {
      this.$emit("change-cover", this.playlist, base64_image);
      this.is_crop_modal_open = false;
    },

    handle_download_action(media, video_quality = null) {
      const hasTracksToDownload = media === "video"
        ? this.has_downloadable_video_tracks
        : this.has_downloadable_audio_tracks;
      if (!hasTracksToDownload) return;
      if (media === "video" && !this.allow_offline_video) return;
      if (media === "audio" && !this.allow_offline) return;
      if (!this.connection.connected) {
        alert("Sem conexão com a internet para realizar o download.");
        return;
      }
      this.show_download_menu = false;
      this.show_video_quality_menu = false;
      this.downloadPlaylist(this.playlist, { media, video_quality });
    },

    toggle_video_quality_menu() {
      this.show_video_quality_menu = !this.show_video_quality_menu;
    },

    toggle_download_menu() {
      this.show_download_menu = !this.show_download_menu;
      if (!this.show_download_menu) this.show_video_quality_menu = false;
    },

    start_rename() {
      this.tempName = this.playlist.name;
      this.isEditing = true;
      this.showMenu = false;
      this.$nextTick(() => {
        if (this.$refs.titleInput) this.$refs.titleInput.focus();
      });
    },

    save_rename() {
      if (this.isEditing) {
        this.isEditing = false;
        if (this.tempName.trim() && this.tempName !== this.playlist.name) {
          this.$emit("rename-playlist", this.playlist, this.tempName.trim());
        }
      }
    },

    confirm_delete() {
      this.showMenu = false;
      this.showDeleteModal = true;
    },

    execute_delete() {
      this.showDeleteModal = false;
      this.$emit("delete-playlist", this.playlist);
    },

    closeMenu() {
      this.showMenu = false;
    },

    close_download_menu() {
      this.show_download_menu = false;
      this.show_video_quality_menu = false;
    },
  },

  directives: {
    "click-outside": {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.body.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.body.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },
};
</script>

<style scoped>
.badge-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background-color: var(--yellow);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.text-green {
  color: #4ade80;
}

.downloaded-state {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  cursor: default;
}

.downloaded-state:hover {
  background: rgba(74, 222, 128, 0.25);
  transform: none;
}

.downloading-state {
  color: var(--blue);
  background: rgba(59, 130, 246, 0.15);
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

.playlist-hero {
  height: 180px;
  padding: var(--space-5);
  display: flex;
  align-items: end;
  gap: var(--space-5);
  color: var(--text-primary);
  position: relative;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  flex-shrink: 0;
}

.hero-cover {
  width: 140px;
  height: 140px;
  box-shadow: var(--boxshadow-lg);
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.hero-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

h1 {
  margin: 0 0 var(--space-2) 0;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
  cursor: text;
}

.title-input {
  font-weight: 700;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.2);
  border: none;
  width: 98%;
  margin-left: 4px;
  outline: none;
  padding: 0 var(--space-3);
  height: 35px;
  margin-bottom: 7px;
}

.meta-row {
  display: flex;
  gap: var(--space-2);
  font-size: 0.9rem;
  opacity: 0.9;
  color: var(--text-secondary);
}

.separator {
  opacity: 0.6;
}

.header-options {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: flex;
  gap: var(--space-3);
}

.btn-options {
  background: rgba(0, 0, 0, 0.3);
  border: none;
  color: #ffffff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.btn-options:hover {
  background: rgba(0, 0, 0, 0.5);
}

.download-options-wrapper {
  position: relative;
}

.download-options-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  width: 220px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  overflow: visible;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

.video-quality-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 130px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  box-shadow: var(--shadow-float);
}

.quality-chevron {
  margin-left: auto;
  font-size: 0.7rem;
}

.dropdown-item.submenu-open {
  background: var(--surface-3);
}

.download-options-dropdown .dropdown-item.btn-disabled {
  cursor: not-allowed;
  color: var(--text-muted);
}

.options-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  width: 150px;
  overflow: hidden;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  padding: 10px 15px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--surface-3);
}

.dropdown-item.danger {
  color: var(--color-expense);
}

@container (max-width: 1100px) {
  .playlist-hero {
    flex-direction: column;
    height: 213px;
    align-items: start;
  }
  .hero-cover {
    width: 100px;
    height: 100px;
  }
  .hero-details,
  .hero-details h1 {
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
}
</style>
