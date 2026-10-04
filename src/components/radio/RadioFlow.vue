<template>
  <div class="radio-flow-wrapper" ref="containerRef">
    <div class="layout-grid" :style="computed_layout_style">
      <div class="grid-area-sidebar" v-show="!is_mobile || mobile_tab === 'playlists'">
        <PlaylistSidebar
          :playlists="playlists"
          :selected_playlist_id="selected_playlist?.local_id"
          :current_playing_playlist_id="current_playlist?.local_id"
          :is_playing="is_playing"
          :default_cover="isDark ? default_cover_dark : default_cover"
          :default_avatar="default_avatar"
          :collapsed="is_sidebar_collapsed && !is_mobile"
          :loading="is_loading_data"
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
                :default_cover="isDark ? default_cover_dark : default_cover"
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

                <div class="upload-actions">
                  <span class="upload-usage" v-if="upload_usage_label">{{ upload_usage_label }}</span>

                  <div class="upload-progress-indicator" v-if="active_upload_list.length > 0">
                    <button
                      type="button"
                      class="btn-icon"
                      @click="show_uploads_dropdown = !show_uploads_dropdown"
                      title="Uploads em andamento"
                    >
                      <div class="progress-ring-container">
                        <svg class="progress-ring" width="22" height="22">
                          <circle class="progress-ring__circle--bg" stroke="currentColor" stroke-width="2" fill="transparent" r="8" cx="11" cy="11" />
                          <circle
                            class="progress-ring__circle"
                            stroke="currentColor" stroke-width="2" fill="transparent" r="8" cx="11" cy="11"
                            stroke-dasharray="50.26"
                            :stroke-dashoffset="get_progress_offset(average_upload_progress)"
                          />
                        </svg>
                      </div>
                      <span class="upload-count-badge" v-if="active_upload_list.length > 1">{{ active_upload_list.length }}</span>
                    </button>

                    <div v-if="show_uploads_dropdown" class="uploads-dropdown">
                      <div class="uploads-dropdown-header">Enviando</div>
                      <div v-for="upload in active_upload_list" :key="upload.id" class="uploads-dropdown-item">
                        <span class="uploads-dropdown-title" :title="upload.title">{{ upload.title }}</span>
                        <span class="uploads-dropdown-percent">{{ upload.progress }}%</span>
                      </div>
                    </div>
                  </div>

                  <button class="btn-icon" @click="show_upload_modal = true" title="Enviar música">
                    <font-awesome-icon icon="cloud-arrow-up" />
                  </button>
                </div>
              </div>

              <UploadTrackModal
                v-model="show_upload_modal"
                :is-submitting="is_modal_submitting"
                :progress="current_upload_progress"
                @submit="handle_upload_submit"
              />

              <TrackList
                mode="playlist"
                :playlist_id="selected_playlist.local_id"
                :tracks="tracks"
                :current_music_id="current_music?.youtube_id"
                :is_mobile="is_mobile"
                @play-track="play_specific_track"
                @delete-track="handle_delete_track"
                @add-to-queue="handle_manual_add_queue"
                @add-to-playlist="handle_add_to_another_playlist"
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

        <div v-else-if="is_loading_data && playlists.length === 0" class="welcome-state">
          <KademLoader size="lg" title="Carregando suas playlists…" />
        </div>

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

    <BaseModal
      v-model="show_mobile_search_modal"
      title="Buscar Músicas"
      size="lg"
      custom-class="radio-search-modal"
      body-class="radio-search-modal-body"
      @close="close_mobile_search"
    >
      <div class="mobile-search-modal-content">
        <!-- Barra de busca no topo (Fixa) -->
        <div class="mobile-search-header-wrap">
          <div
            class="mobile-search-field-pill"
            :class="{ 'is-disabled': !connection.connected, 'is-focused': is_mobile_search_focused }"
          >
            <font-awesome-icon icon="magnifying-glass" class="search-icon-leading" />
            <input
              type="search"
              v-model="search_query"
              @keyup.enter="perform_mobile_search"
              @focus="is_mobile_search_focused = true"
              @blur="is_mobile_search_focused = false"
              :placeholder="!connection.connected ? 'Busca indisponível offline' : 'O que você quer ouvir?'"
              id="mobile-search-input"
              class="mobile-search-input-field"
              ref="mobileSearchInput"
              :disabled="!connection.connected"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
            />
            <button
              v-if="search_query"
              type="button"
              class="search-clear-action-btn"
              @click="clear_mobile_search"
              title="Limpar busca"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <button
            type="button"
            @click="perform_mobile_search"
            class="mobile-search-submit-btn"
            :disabled="!connection.connected || !search_query.trim() || is_searching"
            title="Buscar"
          >
            <font-awesome-icon v-if="is_searching" icon="spinner" spin />
            <span v-else>Buscar</span>
          </button>
        </div>

        <!-- Área de resultados com scroll próprio -->
        <div class="mobile-search-scroll-area custom-scrollbar">
          <!-- Modo Offline -->
          <div v-if="!connection.connected" class="mobile-search-state-box">
            <div class="state-icon-avatar offline">
              <font-awesome-icon icon="wifi" />
            </div>
            <h4>Modo Offline</h4>
            <p>Conecte-se à internet para pesquisar e reproduzir músicas do YouTube.</p>
          </div>

          <!-- Carregando busca -->
          <div v-else-if="is_searching" class="mobile-search-state-box">
            <loading-spinner style="margin: 0 auto 16px auto" />
            <p class="state-subtext">Buscando músicas...</p>
          </div>

          <!-- Resultados encontrados -->
          <div v-else-if="search_results.length > 0" class="mobile-search-results-wrap">
            <div class="search-meta-bar" v-if="last_search_term">
              <span class="search-meta-term">Resultados para "<strong>{{ last_search_term }}</strong>"</span>
            </div>

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

          <!-- Nenhum resultado -->
          <div v-else-if="has_searched" class="mobile-search-state-box">
            <div class="state-icon-avatar empty">
              <font-awesome-icon icon="music" />
            </div>
            <h4>Nenhum resultado encontrado</h4>
            <p>Não encontramos faixas para "<strong>{{ last_search_term || search_query }}</strong>". Verifique a grafia ou tente outros termos.</p>
          </div>

          <!-- Estado inicial (antes de buscar) -->
          <div v-else class="mobile-search-state-box initial">
            <div class="state-icon-avatar initial-icon">
              <font-awesome-icon icon="magnifying-glass" />
            </div>
            <h4>O que você quer ouvir?</h4>
            <p>Busque por músicas, artistas, bandas ou canais do YouTube para ouvir ou salvar nas suas playlists.</p>
          </div>
        </div>
      </div>
    </BaseModal>
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

    <PlayerWrapper />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import { useUtilsStore } from "@/stores/utils";
import { useWindowStore } from "@/stores/windows";
import { useAppStore } from "@/stores/app";
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
import UploadTrackModal from "./UploadTrackModal.vue";
import LoadingSpinner from "@/components/loadingSpinner.vue";
import KademLoader from "@/components/ui/KademLoader.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import BaseModal from "@/components/BaseModal.vue";

import defaultCover from "@/assets/images/fundo-auth.webp";
import defaultCoverDark from "@/assets/images/system-background-black.webp";
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
    KademLoader,
    PlaylistSelector,
    UploadTrackModal,
    ConfirmationModal,
    BaseModal,
  },
  data() {
    return {
      selected_playlist: null,
      tracks: [],
      default_cover: defaultCover,
      default_cover_dark: defaultCoverDark,
      default_avatar: defaultAvatar,
      container_width: 0,
      resize_observer: null,

      is_sidebar_collapsed: false,
      is_queue_collapsed: false,
      view_mode: "playlist",
      search_query: "",
      last_search_term: "",
      search_results: [],
      is_searching: false,

      show_mobile_search_modal: false,
      is_mobile_search_focused: false,
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
      // Carga inicial das playlists: evita mostrar "Nenhuma playlist" enquanto o servidor ainda responde.
      is_loading_data: true,

      show_upload_modal: false,
      show_uploads_dropdown: false,
      current_upload_id: null,
    };
  },
  computed: {
    ...mapState(usePlayerStore, [
      "current_music",
      "is_playing",
      "current_playlist",
      "viewed_playlist_id",
      "is_shuffle",
      "queue",
      "next",
      "mobile_tab",
      "volume",
    ]),
    ...mapState(useRadioStore, [
      "playlists",
      "upload_usage_bytes",
      "upload_quota_bytes",
      "active_uploads",
    ]),
    ...mapState(useUtilsStore, ["connection"]),
    ...mapState(useWindowStore, ["_getOrCreateCurrentUserState"]),
    ...mapState(useAppStore, ["isDark"]),

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

    is_uploading_track() {
      return Object.keys(this.active_uploads).length > 0;
    },

    active_upload_list() {
      return Object.entries(this.active_uploads).map(([id, info]) => ({ id, ...info }));
    },

    average_upload_progress() {
      const list = this.active_upload_list;
      if (list.length === 0) return 0;
      return Math.round(list.reduce((total, upload) => total + upload.progress, 0) / list.length);
    },

    is_modal_submitting() {
      return !!this.current_upload_id && !!this.active_uploads[this.current_upload_id];
    },

    current_upload_progress() {
      if (!this.current_upload_id) return 0;
      return this.active_uploads[this.current_upload_id]?.progress || 0;
    },

    upload_usage_label() {
      if (!this.upload_quota_bytes) return "";
      return `${this.format_bytes(this.upload_usage_bytes)} de ${this.format_bytes(this.upload_quota_bytes)} usados`;
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
      const width = this.container_width || this.containerDimensions.width;
      return width <= 1100;
    },
  },
  watch: {
    is_mobile: {
      immediate: true,
      handler(isMobile) {
        if (isMobile) {
          if (this.view_mode === "search") this.close_search();
        }
      },
    },
  },
  methods: {
    ...mapActions(usePlayerStore, [
      "play_track",
      "toggle_play",
      "play_playlist_context",
      "toggle_shuffle",
      "add_to_queue",
      "remove_from_queue",
      "play_from_queue",
      "set_queue",
      "set_mobile_tab",
      "setCurrentPlaylist",
      "setViewedPlaylistId",
    ]),
    ...mapActions(useRadioStore, [
      "pullPlaylists",
      "_loadFromDB",
      "createPlaylist",
      "deletePlaylist",
      "renamePlaylist",
      "addTrackToPlaylist",
      "removeTrackFromPlaylist",
      "checkOfflineAvailability",
      "update_playlist_cover",
      "uploadTrackFile",
      "fetchStorageUsage",
      "copyUploadToPlaylist",
    ]),
    async load_data() {
      if (this.connection.connected) {
        await this.pullPlaylists();
      } else {
        await this._loadFromDB();
      }

      if (this.playlists.length > 0) {
        let target_id = null;

        if (this.viewed_playlist_id) {
          target_id = this.viewed_playlist_id;
        }
        else if (this.current_playlist) {
          target_id = this.current_playlist.local_id;
        }

        let target_pl = null;
        if (target_id) {
          target_pl = this.playlists.find((p) => p.local_id === target_id);
        }

        if (!target_pl) {
          target_pl = this.playlists[0];
        }

        if (target_pl) {
          this.select_playlist(target_pl);
        }
      } else {
        this.selected_playlist = null;
        this.tracks = [];
      }
    },

    async select_playlist(playlist) {
      this.close_search();
      this.selected_playlist = playlist;

      this.setViewedPlaylistId(playlist.local_id);

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

      if (this.current_playlist?.local_id === playlist.local_id) {
        this.setCurrentPlaylist(playlist);
      }
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
      this.add_to_queue(track);
    },
    async handle_upload_submit({ file, title }) {
      if (!this.selected_playlist) return;

      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.current_upload_id = uploadId;

      try {
        const newTrack = await this.uploadTrackFile(this.selected_playlist, file, { title, uploadId });
        if (
          this.selected_playlist &&
          this.selected_playlist.local_id === newTrack.playlist_local_id
        ) {
          this.tracks.push(newTrack);
        }
        this.show_upload_modal = false;
      } catch (error) {
        this.openConfirmation({
          message: error.response?.data?.message || error.message || "Não foi possível enviar a música.",
          description: "",
          confirmText: "Ok",
        });
      } finally {
        this.current_upload_id = null;
      }
    },
    close_uploads_dropdown_on_outside_click(event) {
      if (!this.show_uploads_dropdown) return;
      if (event.target.closest(".upload-progress-indicator")) return;
      this.show_uploads_dropdown = false;
    },
    get_progress_offset(progress) {
      const circumference = 50.26;
      if (!progress) return circumference * 0.75;
      return circumference - (circumference * progress) / 100;
    },
    format_bytes(bytes) {
      if (!bytes) return "0 MB";
      const mb = bytes / (1024 * 1024);
      if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
      return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
    },
    async handle_add_to_another_playlist(track, playlist) {
      if (track.source === "upload") {
        try {
          const newTrack = await this.copyUploadToPlaylist(track, playlist);
          if (
            this.selected_playlist &&
            this.selected_playlist.local_id === newTrack.playlist_local_id
          ) {
            this.tracks.push(newTrack);
          }
        } catch (error) {
          this.openConfirmation({
            message: error.response?.data?.message || error.message || "Não foi possível adicionar a música a esta playlist.",
            description: "",
            confirmText: "Ok",
          });
        }
        return;
      }

      this.track_being_added = track;
      await this.verify_and_add_track(playlist);
    },
    handle_play_playlist_btn() {
      if (!this.tracks || this.tracks.length === 0) return;
      // A sessão restaurada pode manter a playlist/faixa atual, mas não ter
      // itens pendentes na fila. Nesse caso, o primeiro play da playlist deve
      // iniciar o seu contexto novamente, em vez de apenas alternar a faixa
      // restaurada e deixar a reprodução terminar sem próxima música.
      if (this.is_current_playlist_active && this.queue.length > 0) {
        this.toggle_play();
      } else {
        this.play_playlist_context(this.selected_playlist, this.tracks);
      }
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
      if (!this.search_query.trim()) return;
      this.last_search_term = this.search_query.trim();
      this.next_page_token = null;
      await this.fetch_search_results(false);
    },

    clear_mobile_search() {
      this.search_query = "";
      this.search_results = [];
      this.has_searched = false;
      this.last_search_term = "";
      this.next_page_token = null;
      this.$nextTick(() => {
        if (this.$refs.mobileSearchInput) this.$refs.mobileSearchInput.focus();
      });
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
      this.last_search_term = "";
      this.next_page_token = null;
      this.show_mobile_search_modal = true;

      setTimeout(() => {
        if (this.$refs.mobileSearchInput) this.$refs.mobileSearchInput.focus();
      }, 350);
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
    update_container_width() {
      const container = this.$refs.containerRef;
      if (!container) return;

      this.container_width = container.clientWidth;
    },
    observe_container_size() {
      this.$nextTick(() => {
        const container = this.$refs.containerRef;
        if (!container) return;

        this.update_container_width();

        if (typeof ResizeObserver === "undefined") return;

        this.resize_observer = new ResizeObserver(([entry]) => {
          this.container_width = entry.contentRect.width;
        });
        this.resize_observer.observe(container);
      });
    },
  },
  mounted() {
    this.load_data().finally(() => {
      this.is_loading_data = false;
    });
    this.observe_container_size();
    this.fetchStorageUsage();
    document.addEventListener("mousedown", this.close_uploads_dropdown_on_outside_click);
  },
  beforeUnmount() {
    this.resize_observer?.disconnect();
    document.removeEventListener("mousedown", this.close_uploads_dropdown_on_outside_click);
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

.btn-icon:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.upload-usage {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  white-space: nowrap;
}

.upload-progress-indicator {
  position: relative;
}

.progress-ring-container {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-info);
}

.progress-ring {
  transform-origin: center;
}

.progress-ring__circle--bg {
  opacity: 0.2;
}

.progress-ring__circle {
  transition: stroke-dashoffset 0.35s ease;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  color: var(--color-info);
}

.upload-count-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: var(--radius-pill);
  background: var(--color-info);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploads-dropdown {
  position: absolute;
  top: calc(100% + var(--space-3));
  right: 0;
  width: 220px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  z-index: 10;
}

.uploads-dropdown-header {
  padding: var(--space-2) var(--space-3);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-3);
  border-bottom: 1px solid var(--glass-border);
}

.uploads-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--fontsize-xs);
}

.uploads-dropdown-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.uploads-dropdown-percent {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.welcome-state {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  padding: var(--space-5);
  text-align: center;
}

.welcome-card {
  padding: var(--space-6);
  margin-bottom: var(--space-4);
  max-width: 400px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
}

.brand-logo {
  font-size: 3rem;
  color: var(--yellow);
  margin-bottom: var(--space-3);
}

.welcome-card h1 {
  margin-bottom: var(--space-2);
  font-size: 2rem;
  color: var(--text-primary);
}

.welcome-card p {
  opacity: 0.8;
  margin-bottom: var(--space-4);
  color: var(--text-secondary);
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
  background-color: var(--color-info);
  color: #ffffff;
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
  filter: brightness(0.9);
}

/* --- Mobile Search Modal Styles --- */

:global(.radio-search-modal.is-bottom-sheet) {
  height: min(85dvh, calc(100dvh - 76px)) !important;
  max-height: calc(100dvh - 76px) !important;
}

:global(.radio-search-modal:not(.is-bottom-sheet)) {
  height: 640px !important;
  max-height: 80vh !important;
}

:global(.radio-search-modal-body) {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  height: 100% !important;
}

.mobile-search-modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.mobile-search-header-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-0);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.mobile-search-field-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3) 0 var(--space-4);
  height: 44px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.mobile-search-field-pill.is-focused {
  border-color: var(--blue);
  background: var(--surface-0);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.15);
}

.mobile-search-field-pill.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-icon-leading {
  color: var(--text-muted);
  font-size: 0.95rem;
  flex-shrink: 0;
}

.mobile-search-field-pill input.mobile-search-input-field,
[data-theme='dark'] .mobile-search-field-pill input.mobile-search-input-field {
  flex: 1;
  min-width: 0;
  width: 100% !important;
  height: 100% !important;
  min-height: unset !important;
  max-height: unset !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 var(--space-1) !important;
  color: var(--text-primary);
  font-size: 0.95rem !important;
  line-height: normal !important;
  outline: none !important;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.mobile-search-field-pill input.mobile-search-input-field:focus,
[data-theme='dark'] .mobile-search-field-pill input.mobile-search-input-field:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

.mobile-search-field-pill input.mobile-search-input-field::-webkit-search-decoration,
.mobile-search-field-pill input.mobile-search-input-field::-webkit-search-cancel-button,
.mobile-search-field-pill input.mobile-search-input-field::-webkit-search-results-button,
.mobile-search-field-pill input.mobile-search-input-field::-webkit-search-results-decoration {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}

.mobile-search-input-field::placeholder {
  color: var(--text-muted);
  opacity: 0.75;
}

.search-clear-action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  font-size: 0.85rem;
  padding: 0;
  flex-shrink: 0;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.search-clear-action-btn:hover,
.search-clear-action-btn:active {
  color: var(--text-primary);
  background: var(--surface-3);
}

.mobile-search-submit-btn {
  height: 44px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  border: none;
  background: var(--blue);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex-shrink: 0;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    opacity var(--transition-fast);
}

.mobile-search-submit-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.mobile-search-submit-btn:active:not(:disabled) {
  transform: scale(0.96);
  filter: brightness(0.92);
}

.mobile-search-submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mobile-search-scroll-area {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
}

.mobile-search-results-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

.search-meta-bar {
  padding: var(--space-2) var(--space-4);
  font-size: 0.78rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-1);
}

.search-meta-term strong {
  color: var(--text-primary);
}

.mobile-search-state-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6) var(--space-4);
  gap: var(--space-2);
}

.mobile-search-state-box h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
}

.mobile-search-state-box p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 300px;
  line-height: 1.45;
}

.state-subtext {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.state-icon-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.35rem;
  margin-bottom: var(--space-2);
  background: rgba(53, 90, 253, 0.1);
  color: var(--blue);
}

.state-icon-avatar.offline {
  background: rgba(245, 158, 11, 0.12);
  color: var(--amber);
}

.state-icon-avatar.empty {
  background: var(--surface-3);
  color: var(--text-muted);
}

.state-icon-avatar.initial-icon {
  background: rgba(53, 90, 253, 0.08);
  color: var(--blue);
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
