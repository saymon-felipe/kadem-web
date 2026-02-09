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
      <button
        v-if="connection.connected && allow_offline && track_count > 0"
        class="btn-options"
        :class="{
          'downloaded-state': is_fully_downloaded,
          'downloading-state': is_downloading_playlist,
        }"
        @click.stop="handle_download_action"
        :title="download_tooltip"
        :disabled="is_downloading_playlist"
      >
        <font-awesome-icon v-if="is_downloading_playlist" icon="spinner" spin />
        <font-awesome-icon v-else-if="is_fully_downloaded" icon="circle-check" />
        <font-awesome-icon v-else icon="download" />
      </button>

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
import { getPlanLimits } from "@/services/subscription_plans.js";

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

  emits: ["rename-playlist", "delete-playlist"],

  data() {
    return {
      showMenu: false,
      isEditing: false,
      tempName: "",
      showDeleteModal: false,
      is_crop_modal_open: false,
      allow_offline: getPlanLimits(useAuthStore().user.plan_tier).can_use_offline_radio,
    };
  },

  computed: {
    ...mapState(useRadioStore, ["active_downloads", "allow_offline", "trackHasLyrics"]),
    ...mapState(useUtilsStore, ["connection"]),

    has_missing_lyrics() {
      if (!this.playlist || !this.tracks) return false;

      return this.tracks.some((t) => {
        if (!t.youtube_id) return false;
        if (this.radioStore.trackHasLyrics(t)) return false;
        if (t.lyrics_unavailable) return false;

        return true;
      });
    },
    missing_lyrics_count() {
      if (!this.playlist || !this.tracks) return 0;

      return this.tracks.filter((t) => {
        return (
          t.youtube_id && !this.radioStore.trackHasLyrics(t) && !t.lyrics_unavailable
        );
      }).length;
    },
    is_downloading_lyrics() {
      if (!this.playlist || !this.tracks) return false;
      return this.tracks.some(
        (t) => t.youtube_id && this.radioStore.isLyricDownloading(t.youtube_id)
      );
    },
    lyrics_btn_title() {
      if (this.is_downloading_lyrics) return "Baixando legendas...";
      if (this.has_missing_lyrics) return "Baixar legendas faltantes";
      return "Todas as legendas disponíveis já foram baixadas";
    },

    hero_background() {
      const cover = this.default_cover;
      return `background: linear-gradient(to top, rgba(255, 255, 255, 0.7), transparent), url(${cover}) no-repeat right center; background-size: cover;`;
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
      return this.tracks.some((t) => this.active_downloads[t.local_id]);
    },

    download_tooltip() {
      if (this.is_downloading_playlist) return "Baixando músicas...";
      if (this.is_fully_downloaded) return "Playlist baixada (Disponível Offline)";
      return "Baixar músicas faltantes";
    },
  },

  methods: {
    ...mapActions(useRadioStore, [
      "downloadPlaylist",
      "isTrackOffline",
      "download_missing_lyrics_for_playlist",
    ]),

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

    /* --- Download Logic --- */
    handle_download_action() {
      if (this.is_fully_downloaded) return;

      if (!this.connection.connected) {
        alert("Sem conexão com a internet para realizar o download.");
        return;
      }

      this.downloadPlaylist(this.playlist);
    },

    /* --- Rename Logic --- */
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

    /* --- Delete Logic --- */
    confirm_delete() {
      this.showMenu = false;
      this.showDeleteModal = true;
    },

    execute_delete() {
      this.showDeleteModal = false;
      this.$emit("delete-playlist", this.playlist);
    },

    /* --- UI Helper Methods --- */
    closeMenu() {
      this.showMenu = false;
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

/* Estado: Baixando (Azul) */
.downloading-state {
  color: var(--blue);
  background: rgba(59, 130, 246, 0.15);
}

/* Transições */
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

/* Layout Principal */
.playlist-hero {
  height: 180px;
  padding: var(--space-5);
  display: flex;
  align-items: end;
  gap: var(--space-5);
  color: var(--white);
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

/* Tipografia e Inputs */
h1 {
  margin: 0 0 var(--space-2) 0;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
  cursor: text;
}

.title-input {
  font-weight: 700;
  color: var(--white);
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
  color: var(--deep-blue-2);
}

.separator {
  opacity: 0.6;
}

/* Botões e Menus */
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
  color: var(--white);
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

.options-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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
  color: var(--deep-blue);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--background-gray);
}

.dropdown-item.danger {
  color: var(--red);
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
