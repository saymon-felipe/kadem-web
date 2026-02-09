<template>
  <div class="radio-flow-wrapper" ref="containerRef">
    <div class="layout-grid" :style="computed_layout_style">
      <div class="grid-area-sidebar" v-show="!is_mobile || mobile_tab === 'playlists'">
        <PlaylistSidebar
          :playlists="playlists"
          :selected_playlist_id="selected_playlist?.local_id"
          :current_playing_playlist_id="current_playlist?.local_id"
          :is_playing="is_playing"
          :default_cover="default_cover"
          :default_avatar="default_avatar"
          :collapsed="is_sidebar_collapsed && !is_mobile"
          @select-playlist="handle_mobile_select_playlist"
          @create-playlist="handle_create_playlist"
          @toggle-collapse="toggle_sidebar"
          @rename-playlist="handle_rename_playlist"
          @delete-playlist="handle_delete_playlist"
        />
      </div>

      <div
        class="grid-area-main main-content glass"
        v-show="!is_mobile || mobile_tab === 'content'"
      >
        <template v-if="selected_playlist">
          <div class="search-header" v-if="!is_mobile">
            <div class="search-input-wrapper">
              <div class="form-group">
                <input
                  type="text"
                  v-model="search_query"
                  @keyup.enter="perform_search"
                  placeholder=" "
                  id="search-input"
                  class="search-input"
                  :disabled="!connection.connected"
                  :title="
                    !connection.connected
                      ? 'Busca indisponível offline'
                      : 'Buscar músicas'
                  "
                />
                <label for="search-input" class="floating-label">
                  {{
                    !connection.connected
                      ? "Busca Offline (Indisponível)"
                      : "O que você quer ouvir?"
                  }}
                </label>
              </div>
            </div>
            <button
              v-if="view_mode === 'search'"
              @click="close_search"
              class="btn btn-secondary exit-search-btn"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="content-scrollable">
            <template v-if="view_mode === 'playlist'">
              <PlaylistHeader
                :playlist="selected_playlist"
                :track_count="tracks.length"
                :tracks="tracks"
                :total_duration_seconds="playlist_total_duration"
                :default_cover="default_cover"
                :default_avatar="default_avatar"
                :is_mobile="is_mobile"
                @change-cover="handle_change_cover"
                @rename-playlist="handle_rename_playlist"
                @delete-playlist="handle_delete_playlist"
              />

              <div class="playlist-controls">
                <div class="play-actions">
                  <button class="btn-circle play" @click="handle_play_playlist_btn">
                    <font-awesome-icon :icon="play_button_icon" />
                  </button>
                  <button
                    class="btn-icon"
                    :class="{ active: is_shuffle }"
                    @click="toggle_shuffle"
                    title="Ordem Aleatória"
                  >
                    <font-awesome-icon icon="shuffle" />
                  </button>
                </div>
              </div>

              <TrackList
                mode="playlist"
                :tracks="tracks"
                :current_music_id="current_music?.youtube_id"
                :is_mobile="is_mobile"
                @play-track="play_specific_track"
                @delete-track="handle_delete_track"
                @add-to-queue="handle_manual_add_queue"
              />
            </template>

            <template v-else-if="view_mode === 'search' && !is_mobile">
              <div class="search-results-header">
                <h3>Resultados para "{{ last_search_term }}"</h3>
              </div>
              <loading-spinner v-if="is_searching" style="margin: 50px auto" />
              <TrackList
                v-else
                ref="desktopSearchTrackList"
                mode="search"
                :tracks="search_results"
                :current_music_id="current_music?.youtube_id"
                :has_more="!!next_page_token"
                :is_loading_more="is_loading_more"
                @play-track="play_preview"
                @request-add="open_playlist_selector"
                @load-more="handle_load_more"
              />
            </template>
          </div>

          <button
            v-if="is_mobile"
            class="mobile-search-fab"
            @click="open_mobile_search"
            title="Buscar músicas"
          >
            <font-awesome-icon icon="magnifying-glass" />
          </button>
        </template>

        <div v-else class="welcome-state">
          <div class="welcome-card glass">
            <div class="brand-logo">
              <font-awesome-icon icon="radio" />
            </div>
            <h1>Radio Flow</h1>
            <p>Todas as suas músicas favoritas num só lugar!</p>
          </div>
          <p class="instruction" v-if="playlists.length === 0">
            Crie uma nova playlist para começar.
          </p>
          <p class="instruction" v-else>Selecione uma playlist no menu.</p>
        </div>
      </div>

      <div class="grid-area-queue" v-show="!is_mobile || mobile_tab === 'queue'">
        <QueueSidebar
          :current_music="current_music"
          :next_tracks="queue || []"
          :collapsed="is_queue_collapsed && !is_mobile"
          @remove-track="remove_from_queue"
          @play-track="play_from_queue"
          @update:queue="handle_update_queue"
          @toggle-collapse="toggle_queue"
        />
      </div>
    </div>

    <nav class="mobile-bottom-nav glass" v-if="is_mobile">
      <button
        class="nav-item"
        :class="{ active: mobile_tab === 'playlists' }"
        @click="set_mobile_tab('playlists')"
      >
        <font-awesome-icon icon="list-ul" />
        <span>Playlists</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: mobile_tab === 'content' }"
        @click="set_mobile_tab('content')"
      >
        <font-awesome-icon icon="music" />
        <span>Músicas</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: mobile_tab === 'queue' }"
        @click="set_mobile_tab('queue')"
      >
        <font-awesome-icon icon="layer-group" />
        <span>Fila</span>
      </button>
    </nav>
    <BottomSheetModal v-model="show_mobile_search_modal" @close="close_mobile_search">
      <div class="mobile-search-container">
        <h3>Buscar Música</h3>
        <div class="search-input-wrapper mobile">
          <div class="form-group">
            <input
              type="text"
              v-model="search_query"
              @keyup.enter="perform_mobile_search"
              placeholder=" "
              id="mobile-search-input"
              class="search-input"
              ref="mobileSearchInput"
              :disabled="!connection.connected"
            />
            <label for="mobile-search-input" class="floating-label">
              Digite o nome da música ou artista...
            </label>
          </div>
          <button @click="perform_mobile_search" class="search-btn-confirm">
            <font-awesome-icon icon="arrow-right" />
          </button>
        </div>

        <div class="mobile-results-area">
          <loading-spinner v-if="is_searching" style="margin: 20px auto" />

          <div v-else-if="search_results.length > 0">
            <TrackList
              mode="search"
              ref="mobileSearchTrackList"
              :tracks="search_results"
              :current_music_id="current_music?.youtube_id"
              :is_mobile="true"
              :has_more="!!next_page_token"
              :is_loading_more="is_loading_more"
              @play-track="play_preview"
              @request-add="open_playlist_selector"
              @load-more="handle_load_more"
            />
          </div>

          <div v-else-if="has_searched" class="empty-search">
            <p>Nenhum resultado encontrado.</p>
          </div>
        </div>
      </div>
    </BottomSheetModal>
    <Teleport to="body">
      <PlaylistSelector
        v-model="show_playlist_selector"
        :playlists="playlists"
        :existing_in_playlists="target_track_playlist_ids"
        :position="selector_position"
        :default_avatar="default_avatar"
        @close="show_playlist_selector = false"
        @select="verify_and_add_track"
      />
      <ConfirmationModal
        v-model="confirmationState.show"
        :message="confirmationState.message"
        :confirmText="confirmationState.confirmText"
        :description="confirmationState.description"
        @cancelled="confirmationState.show = false"
        @confirmed="execute_confirmation_action"
      />
    </Teleport>

    <div id="youtube-player-container" class="ghost-player"></div>
    <PlayerWrapper />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import { useUtilsStore } from "@/stores/utils";
import { useWindowStore } from "@/stores/windows";
import { radioRepository } from "@/services/localData/radioRepository";
import { api } from "@/plugins/api";
import { db } from "@/db";

// Components
import PlaylistSidebar from "./PlaylistSidebar.vue";
import PlaylistHeader from "./PlaylistHeader.vue";
import TrackList from "./TrackList.vue";
import PlayerWrapper from "./PlayerWrapper.vue";
import QueueSidebar from "./QueueSidebar.vue";
import PlaylistSelector from "./PlaylistSelector.vue";
import LoadingSpinner from "@/components/loadingSpinner.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import BottomSheetModal from "@/components/BottomSheetModal.vue"; // IMPORTANTE: Importar o novo modal

import defaultCover from "@/assets/images/fundo-auth.webp";
import defaultAvatar from "@/assets/images/kadem-default-playlist.jpg";

export default {
  name: "RadioFlow",
  components: {
    PlaylistSidebar,
    PlaylistHeader,
    TrackList,
    PlayerWrapper,
    QueueSidebar,
    LoadingSpinner,
    PlaylistSelector,
    ConfirmationModal,
    BottomSheetModal,
  },
  data() {
    return {
      selected_playlist: null,
      tracks: [],
      default_cover: defaultCover,
      default_avatar: defaultAvatar,
      yt_player: null,

      is_sidebar_collapsed: false,
      is_queue_collapsed: false,
      view_mode: "playlist",
      search_query: "",
      last_search_term: "",
      search_results: [],
      is_searching: false,

      show_mobile_search_modal: false,
      has_searched: false,

      show_playlist_selector: false,
      selector_position: { x: 0, y: 0 },
      track_being_added: null,
      target_playlist_for_add: null,

      confirmationState: {
        show: false,
        message: "",
        confirmText: "Confirmar",
        action: null,
      },
      next_page_token: null,
      is_loading_more: false,
    };
  },
  computed: {
    ...mapState(usePlayerStore, [
      "current_music",
      "is_playing",
      "current_playlist",
      "is_shuffle",
      "queue",
      "next",
      "mobile_tab",
      "volume",
    ]),
    ...mapState(useRadioStore, { playlists: "playlists" }),
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useWindowStore, ["_getOrCreateCurrentUserState"]),

    play_button_icon() {
      if (this.is_current_playlist_active && this.is_playing) return "circle-pause";
      return "circle-play";
    },

    is_current_playlist_active() {
      return (
        this.selected_playlist &&
        this.current_playlist &&
        this.selected_playlist.local_id === this.current_playlist.local_id
      );
    },

    playlist_total_duration() {
      return this.tracks.reduce(
        (total, track) => total + (track.duration_seconds || 0),
        0
      );
    },

    computed_layout_style() {
      if (this.is_mobile) return {};

      const left = this.is_sidebar_collapsed ? "80px" : "250px";
      const right = this.is_queue_collapsed ? "80px" : "300px";
      return {
        "--sidebar-width": left,
        "--queue-width": right,
      };
    },
    containerDimensions() {
      const userState = this._getOrCreateCurrentUserState();
      const win = userState?.openWindows["productivity"];
      return win?.size || { width: 0, height: 0 };
    },

    is_mobile() {
      return this.containerDimensions.width <= 1100;
    },
  },
  watch: {
    is_mobile: {
      immediate: true,
      handler(isMobile) {
        if (isMobile) {
          if (this.view_mode === "search") this.close_search();
          this.forceMobileVolume();
        }
      },
    },
  },
  methods: {
    ...mapActions(usePlayerStore, [
      "play_track",
      "register_yt_instance",
      "toggle_play",
      "play_playlist_context",
      "toggle_shuffle",
      "add_to_queue",
      "restorePlayerConnection",
      "remove_from_queue",
      "play_from_queue",
      "add_to_queue_at",
      "set_queue",
      "set_mobile_tab",
      "setCurrentPlaylist",
      "set_volume",
    ]),
    ...mapActions(useRadioStore, [
      "pullPlaylists",
      "createPlaylist",
      "deletePlaylist",
      "renamePlaylist",
      "addTrackToPlaylist",
      "removeTrackFromPlaylist",
      "checkOfflineAvailability",
      "update_playlist_cover",
    ]),
    forceMobileVolume() {
      this.set_volume(100);
    },
    async load_data() {
      if (this.connection.connected) await this.pullPlaylists();
      if (this.playlists.length > 0) {
        if (!this.selected_playlist && !this.current_playlist) {
          this.select_playlist(this.playlists[0]);
        } else {
          const playlist_id = this.current_playlist || this.selected_playlist;
          const stillExists = this.playlists.find(
            (p) => p.local_id === playlist_id.local_id
          );
          if (!stillExists) this.select_playlist(this.playlists[0]);
          else this.select_playlist(stillExists);
        }
      } else {
        this.selected_playlist = null;
        this.tracks = [];
      }
    },
    async select_playlist(playlist) {
      this.close_search();
      this.selected_playlist = playlist;
      const localTracks = await radioRepository.getLocalTracks(playlist.local_id);
      this.tracks = localTracks;
      if (this.tracks.length > 0) await this.checkOfflineAvailability(this.tracks);
    },
    handle_mobile_select_playlist(playlist) {
      this.select_playlist(playlist);
      if (this.is_mobile) this.set_mobile_tab("content");
    },
    async handle_create_playlist() {
      const newId = await this.createPlaylist("Nova Playlist", "");
      await this.load_data();
      const created = this.playlists.find((p) => p.local_id === newId);
      if (created) this.handle_mobile_select_playlist(created);
    },
    async handle_rename_playlist(playlist, newName) {
      if (!newName || newName.trim() === "") return;
      await this.renamePlaylist(playlist, newName.trim());
    },
    async handle_change_cover(playlist, image) {
      if (!image || image.trim() === "") return;
      playlist.cover = image;
      this.setCurrentPlaylist(playlist);
      await this.update_playlist_cover(playlist.id || playlist.local_id, image);
    },
    async handle_delete_playlist(playlist) {
      await this.deletePlaylist(playlist.local_id, playlist.id);
      if (
        this.selected_playlist &&
        this.selected_playlist.local_id === playlist.local_id
      ) {
        this.selected_playlist = null;
        this.tracks = [];
      }
      if (this.playlists.length > 0 && !this.selected_playlist) {
        this.select_playlist(this.playlists[0]);
      }
    },
    handle_manual_add_queue(track) {
      const exists = this.queue.some((t) => t.youtube_id === track.youtube_id);
      if (exists) {
        this.openConfirmation({
          message: `A música <strong>${track.title}</strong> já está na fila de reprodução.`,
          description: " ",
          confirmText: "Entendi",
        });
        return;
      }
      this.add_to_queue(track);
    },
    handle_play_playlist_btn() {
      if (!this.tracks || this.tracks.length === 0) return;
      if (this.is_current_playlist_active) this.toggle_play();
      else this.play_playlist_context(this.selected_playlist, this.tracks);
    },
    play_specific_track(track) {
      this.play_playlist_context(this.selected_playlist, this.tracks, track);
    },
    play_preview(video_obj) {
      this.play_track(video_obj, null);
    },
    handle_update_queue(new_queue) {
      this.set_queue(new_queue);
    },

    async fetch_search_results(loadMore = false) {
      if (!this.connection.connected) return;
      if (!this.search_query.trim()) return;

      const pageToken = loadMore ? this.next_page_token : null;

      if (loadMore && !pageToken) return;

      if (loadMore) {
        this.is_loading_more = true;
      } else {
        this.is_searching = true;
        this.search_results = [];
        this.has_searched = true;
      }

      try {
        const response = await api.get("/radio/search", {
          params: {
            q: this.search_query,
            page_token: pageToken,
          },
        });

        const { items, next_page_token } = response.data;

        if (loadMore) {
          this.search_results.push(...items);
        } else {
          this.search_results = items;
        }

        this.next_page_token = next_page_token || null;
      } catch (error) {
        console.error("Erro busca:", error);
      } finally {
        this.is_searching = false;
        this.is_loading_more = false;
      }
    },

    async perform_search() {
      this.last_search_term = this.search_query;
      this.view_mode = "search";
      this.next_page_token = null;
      await this.fetch_search_results(false);
    },

    async perform_mobile_search() {
      await this.fetch_search_results();
    },

    async handle_load_more() {
      if (!this.is_searching && !this.is_loading_more && this.next_page_token) {
        await this.fetch_search_results(true);
      }
    },

    close_search() {
      this.view_mode = "playlist";
      this.search_query = "";
      this.last_search_term = "";
      this.search_results = [];
      this.has_searched = false;
    },

    open_mobile_search() {
      this.search_query = "";
      this.search_results = [];
      this.has_searched = false;
      this.show_mobile_search_modal = true;

      setTimeout(() => {
        if (this.$refs.mobileSearchInput) this.$refs.mobileSearchInput.focus();
      }, 300);
    },

    close_mobile_search() {
      this.show_mobile_search_modal = false;
    },

    async open_playlist_selector(track, event) {
      this.track_being_added = track;
      this.target_track_playlist_ids = [];

      try {
        const existing_entries = await db.tracks
          .where("youtube_id")
          .equals(track.youtube_id)
          .toArray();
        this.target_track_playlist_ids = existing_entries.map((t) => t.playlist_local_id);
      } catch (error) {
        console.error("Erro ao verificar duplicatas:", error);
      }

      const targetElement = event.target.closest("button") || event.target;
      const rect = targetElement.getBoundingClientRect();

      this.selector_position = {
        x: rect.x,
        y: rect.y,
      };

      this.show_playlist_selector = true;
    },
    async verify_and_add_track(playlist) {
      this.target_playlist_for_add = playlist;
      this.show_playlist_selector = false;
      const existing_tracks = await radioRepository.getLocalTracks(playlist.local_id);
      const exists = existing_tracks.some(
        (t) => t.youtube_id === this.track_being_added.youtube_id
      );
      if (exists) {
        this.openConfirmation({
          message: "Esta música já está na playlist selecionada.",
          description: "",
          confirmText: "Ok",
        });
      } else {
        await this.execute_add_track();
      }
    },
    async execute_add_track() {
      if (!this.target_playlist_for_add || !this.track_being_added) return;
      const newTrackId = await this.addTrackToPlaylist(
        this.target_playlist_for_add,
        this.track_being_added
      );
      if (
        this.selected_playlist &&
        this.selected_playlist.local_id === this.target_playlist_for_add.local_id
      ) {
        const savedTrack = await radioRepository.getLocalTrack(newTrackId);
        if (savedTrack) this.tracks.push(savedTrack);
      }

      if (this.$refs.desktopSearchTrackList) {
        this.$refs.desktopSearchTrackList.trigger_add_feedback(this.track_being_added);
      }

      if (this.$refs.mobileSearchTrackList) {
        this.$refs.mobileSearchTrackList.trigger_add_feedback(this.track_being_added);
      }

      this.target_playlist_for_add = null;
      this.track_being_added = null;
    },
    openConfirmation({ description, message, confirmText, action }) {
      this.confirmationState = {
        show: true,
        message: message,
        confirmText: confirmText || "Confirmar",
        action: action,
        description: description,
      };
    },
    async execute_confirmation_action() {
      if (this.confirmationState.action) await this.confirmationState.action();
      this.confirmationState.show = false;
    },
    handle_delete_track(track) {
      this.openConfirmation({
        message: `Tem certeza que deseja remover <br> ${track.title} da playlist?`,
        confirmText: "Remover",
        action: async () => {
          await this.removeTrackFromPlaylist(track);
          this.tracks = this.tracks.filter((t) => t.local_id !== track.local_id);
        },
      });
    },

    async delete_track(track) {
      this.handle_delete_track(track);
    },
    toggle_queue() {
      this.is_queue_collapsed = !this.is_queue_collapsed;
    },
    toggle_sidebar() {
      this.is_sidebar_collapsed = !this.is_sidebar_collapsed;
    },
    init_youtube_api() {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => {
          this.create_yt_player();
        };
      } else if (window.YT && window.YT.Player) {
        this.create_yt_player();
      }
    },
    create_yt_player() {
      if (this.yt_player) {
        try {
          this.yt_player.destroy();
        } catch (e) {
          console.warn("Erro ao destruir player antigo:", e);
        }
      }
      this.yt_player = new window.YT.Player("youtube-player-container", {
        height: "0",
        width: "0",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
        events: {
          onReady: (event) => {
            console.log("[RadioFlow] YouTube Player Pronto.");
            this.register_yt_instance(event.target);
            if (this.is_mobile) this.forceMobileVolume();
            if (typeof this.restorePlayerConnection === "function")
              this.restorePlayerConnection();
          },
          onStateChange: (event) => {
            if (event.data === 0) this.next();
          },
        },
      });
    },
  },
  mounted() {
    this.load_data();
    this.init_youtube_api();
    if (this.player_mode === "native" || !this.current_music) {
      if (typeof this.restorePlayerConnection === "function")
        this.restorePlayerConnection();
    }
  },
};
</script>

<style scoped>
.radio-flow-wrapper {
  position: relative;
  height: calc(100% - 26px);
  width: 100%;
}

.layout-grid {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr) var(--queue-width);
  height: 100%;
  gap: var(--space-3);
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.main-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.grid-area-sidebar,
.grid-area-main,
.grid-area-queue {
  height: calc(100% - 89px);
  min-height: calc(100% - 89px);
  max-height: calc(100% - 89px);
  overflow: hidden;
}

.grid-area-sidebar > aside,
.grid-area-queue > aside {
  height: 100%;
}

.search-header {
  padding: var(--space-4);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input:disabled {
  background-color: rgba(255, 255, 255, 0.05);
  cursor: not-allowed;
  opacity: 0.6;
}

.search-input:disabled ~ .floating-label {
  color: var(--gray-400);
}

.exit-search-btn {
  white-space: nowrap;
  padding: 8px 16px;
  font-size: 0.85rem;
  width: fit-content;
}

.content-scrollable {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.playlist-controls {
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.play-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.btn-circle {
  font-size: 3.5rem;
  color: var(--yellow);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 0;
  transition: transform 0.2s;
}

.btn-circle:hover {
  transform: scale(1.05);
}

.btn-icon {
  font-size: 1.2rem;
  color: var(--gray-400);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-icon:hover {
  color: var(--text-gray);
}

.btn-icon.active {
  color: var(--yellow);
}

.welcome-state {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--white);
  padding: var(--space-5);
  text-align: center;
}

.welcome-card {
  padding: var(--space-6);
  margin-bottom: var(--space-4);
  max-width: 400px;
  background: var(--dark-yellow);
}

.brand-logo {
  font-size: 3rem;
  color: var(--yellow);
  margin-bottom: var(--space-3);
}

.welcome-card h1 {
  margin-bottom: var(--space-2);
  font-size: 2rem;
}

.welcome-card p {
  opacity: 0.8;
  margin-bottom: var(--space-4);
  color: var(--deep-blue);
}

.youtube-tag {
  background: rgba(0, 0, 0, 0.2);
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.instruction {
  font-size: 0.9rem;
  opacity: 0.6;
}

.search-results-header {
  padding: var(--space-4);
  padding-bottom: 0;
}

.ghost-player {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* Mobile Navigation */
.mobile-bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: var(--space-3);
  position: absolute;
  bottom: 140px;
  width: 100%;
  z-index: 100;
  border-radius: var(--radius-md);
  border-bottom: none;
  flex-shrink: 0;
  margin-bottom: var(--space-2);
}

.nav-item {
  background: none;
  border: none;
  color: var(--gray-400);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-item svg {
  font-size: 1.2rem;
}

.nav-item.active {
  color: var(--blue);
}

.mobile-search-fab {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--deep-blue);
  color: white;
  border: none;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  transition: transform 0.2s, background-color 0.2s;
}

.mobile-search-fab:active {
  transform: scale(0.95);
  background-color: var(--deep-blue-2);
}

.mobile-search-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-search-container h3 {
  margin: 0 0 var(--space-3) 0;
  color: var(--deep-blue);
  font-size: 1.2rem;
}

.search-input-wrapper.mobile {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.search-input-wrapper.mobile .form-group {
  flex-grow: 1;
}

.search-btn-confirm {
  width: 48px;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--deep-blue);
  color: white;
  cursor: pointer;
  font-size: 1.1rem;
}

.mobile-results-area {
  flex-grow: 1;
  overflow-y: auto;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: var(--space-3);
}

.empty-search {
  text-align: center;
  padding: var(--space-5);
  color: var(--gray-400);
}

/* --- Container Queries Logic --- */

@container (max-width: 1100px) {
  .mobile-search-fab {
    position: fixed;
    bottom: 63px;
    right: 8px;
    width: 45px;
    height: 45px;
    min-width: 45px;
    min-height: 45px;
    max-width: 45px;
    max-height: 45px;
  }

  .radio-flow-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: var(--space-2);
    overflow: hidden;

    & iframe {
      position: absolute;
      top: -999vh;
      left: -999vw;
    }
  }

  .layout-grid {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-height: 0;
    overflow: hidden;
  }

  .grid-area-sidebar,
  .grid-area-main,
  .grid-area-queue {
    width: 100%;
    height: 100% !important;
    max-height: none !important;
    flex-grow: 1;
  }

  .queue-sidebar {
    width: 100% !important;
  }

  .grid-area-sidebar > aside,
  .grid-area-queue > aside {
    padding-bottom: 69px;
    height: 100%;
  }
}
</style>
