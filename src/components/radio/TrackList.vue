<template>
  <div class="tracks-table-container"
    :class="{ 'is-mobile-track-list': is_mobile, 'is-search-mode': mode === 'search' }">
    <div class="tracks-table">
      <div v-if="mode === 'playlist'" class="playlist-list-tools">
        <div class="playlist-filter">
          <font-awesome-icon icon="magnifying-glass" class="filter-search-icon" aria-hidden="true" />
          <input v-model="filter_query" type="search"
            aria-label="Filtrar músicas da playlist por título ou artista/canal"
            placeholder="Filtrar músicas nesta playlist" @keydown.esc.stop="filter_query = ''" />
          <button v-if="filter_query" type="button" class="clear-filter" title="Limpar filtro"
            aria-label="Limpar filtro" @click="filter_query = ''">
            <font-awesome-icon icon="xmark" />
          </button>
          <span v-if="filter_query.trim()" class="filter-count" :class="{ 'is-zero': visible_tracks.length === 0 }"
            role="status">
            {{ visible_tracks.length }} de {{ tracks.length }}
          </span>
        </div>

        <div ref="sortDropdownRoot" class="playlist-sort-container">
          <button type="button" class="playlist-sort-trigger"
            :class="{ 'is-open': is_sort_menu_open, 'has-active-sort': !!sort_selection }" aria-haspopup="listbox"
            :aria-expanded="is_sort_menu_open" aria-label="Opções de ordenação e filtragem" @click="toggle_sort_menu"
            @keydown.esc.stop="close_sort_menu">
            <font-awesome-icon icon="filter" class="sort-filter-icon" />
            <span class="sort-current-text">{{ current_sort_label }}</span>
            <font-awesome-icon icon="chevron-down" class="sort-chevron-icon" :class="{ rotated: is_sort_menu_open }" />
          </button>

          <transition name="sort-dropdown-pop">
            <div v-if="is_sort_menu_open" class="playlist-sort-dropdown" role="listbox" aria-label="Opções de ordenação"
              @keydown.esc.stop="close_sort_menu">
              <div class="dropdown-header-label">Ordenar por</div>
              <ul class="sort-options-list">
                <li v-for="opt in sort_options" :key="opt.value" role="option"
                  :aria-selected="sort_selection === opt.value" class="sort-option-item"
                  :class="{ 'is-selected': sort_selection === opt.value }" @click="select_sort_option(opt.value)">
                  <span class="sort-option-left">
                    <font-awesome-icon :icon="opt.icon" class="opt-icon" />
                    <span class="opt-label">{{ opt.label }}</span>
                  </span>
                  <font-awesome-icon v-if="sort_selection === opt.value" icon="check" class="opt-check-icon" />
                </li>
              </ul>
            </div>
          </transition>
        </div>
      </div>
      <div v-show="visible_tracks.length > 0" class="track-row header">
        <template v-if="mode === 'playlist'">
          <button type="button" class="sort-header" title="Restaurar ordem original"
            aria-label="Restaurar ordem original" @click="sort_selection = ''">#</button>
          <button v-for="column in sortable_columns" :key="column.key" type="button" class="sort-header"
            :class="[column.class, { 'sort-active': sort_key === column.key }]" :title="sort_header_title(column)"
            :aria-label="sort_header_title(column)" @click="toggle_sort(column.key)">
            {{ column.label }}
            <span v-if="sort_key === column.key" aria-hidden="true">{{ sort_direction === 'asc' ? '↑' : '↓' }}</span>
          </button>
        </template>
        <template v-else>
          <span>#</span>
          <span>Título</span>
          <span class="col-channel">Canal</span>
          <span class="text-center col-duration">Duração</span>
        </template>
        <span></span>
      </div>

      <draggable v-show="visible_tracks.length > 0" class="tracks-scroll-area" :list="visible_tracks"
        :group="{ name: 'music', pull: 'clone', put: false }" :item-key="(t) => t.local_id || t.youtube_id"
        :sort="false" ghost-class="track-ghost" :disabled="is_mobile" @start="beginGlobalDrag" @end="endGlobalDrag">
        <template #item="{ element: track, index }">
          <div class="track-row" :class="{
            'active-track': is_track_playing(track),
            'unavailable-track': is_track_unavailable(track),
            'row-blink-success': success_feedback_map[track.youtube_id],
          }" @click="handle_row_click(track)" @dblclick="handle_desktop_dbl_click(track)"
            @dragstart="on_drag_start($event, track)">
            <span v-if="is_track_playing(track)" class="playing-icon">
              <font-awesome-icon icon="volume-high" />
            </span>
            <span v-else class="track-index">{{ index + 1 }}</span>

            <div class="track-title-col">
              <div class="thumb-wrapper">
                <img :src="track.thumbnail || kadem_default_music" class="mini-thumb"
                  :class="{ grayscale: is_track_unavailable(track) }" loading="lazy" decoding="async" />

                <div v-if="!is_mobile && !is_track_unavailable(track)" class="play-overlay"
                  @click.stop="play_track(track, null)">
                  <font-awesome-icon icon="pause" v-if="is_track_playing(track) && is_playing" />
                  <font-awesome-icon icon="play" v-if="!is_track_playing(track) || !is_playing" />
                </div>
              </div>

              <div class="meta">
                <div class="title-row" style="display: flex; align-items: center; gap: 6px">
                  <strong :title="decode_html_entities(track.title)">{{ decode_html_entities(track.title) }}</strong>
                  <font-awesome-icon v-if="track.source === 'upload'" icon="cloud-arrow-up" class="upload-badge"
                    title="Música enviada por você" />
                </div>
                <small class="mobile-only-artist">{{ decode_html_entities(track.channel) }}</small>
              </div>

              <div class="lyrics-indicator">
                <font-awesome-icon v-if="is_lyric_loading(track.youtube_id)" icon="spinner" spin
                  class="status-icon loading" title="Baixando legenda..." />
                <font-awesome-icon v-else-if="track_has_lyrics(track)" icon="closed-captioning"
                  class="status-icon success" title="Legenda disponível" />
                <font-awesome-icon v-else-if="track_lyrics_unavailable(track)" icon="closed-captioning"
                  class="status-icon disabled" title="Nenhuma legenda encontrada" />
              </div>

              <div class="status-icons"
                v-if="radioStore.isTrackOffline(track) || radioStore.hasTrackVideo(track) || active_downloads[track.local_id] !== undefined">
                <div v-if="active_downloads[track.local_id] !== undefined" class="progress-ring-container" :title="active_downloads[track.local_id] === 0
                    ? 'Iniciando download...'
                    : `Baixando (${active_download_types[track.local_id] === 'video' ? 'vídeo' : 'áudio'}): ${active_downloads[track.local_id]}%`
                  ">
                  <svg class="progress-ring" width="20" height="20" :class="{
                    'is-indeterminate': active_downloads[track.local_id] === 0,
                  }">
                    <circle class="progress-ring__circle--bg" stroke="currentColor" stroke-width="2" fill="transparent"
                      r="8" cx="10" cy="10" />
                    <circle class="progress-ring__circle" stroke="currentColor" stroke-width="2" fill="transparent"
                      r="8" cx="10" cy="10" stroke-dasharray="50.26"
                      :stroke-dashoffset="get_progress_offset(active_downloads[track.local_id])" />
                  </svg>
                </div>
                <span v-if="radioStore.isTrackOffline(track)" class="status-icon offline-ready"
                  title="Áudio baixado (Disponível Offline)">
                  <font-awesome-icon icon="circle-check" />
                </span>
                <span v-if="radioStore.hasTrackVideo(track)" class="status-icon video-ready"
                  title="Vídeo baixado (Disponível Offline)">
                  <font-awesome-icon icon="film" />
                </span>
              </div>
            </div>

            <div class="col-channel">
              {{ mode === "search" ? track.channel : format_date(track.created_at) }}
            </div>
            <div class="col-duration text-center">
              {{ format_duration(track.duration_seconds) }}
            </div>

            <div class="col-actions">
              <button v-if="mode === 'playlist'" class="btn-circle options" @click.stop="open_menu($event, track)"
                :disabled="is_track_unavailable(track)">
                <font-awesome-icon icon="ellipsis-vertical" />
              </button>
              <button v-else @click.stop="$emit('request-add', track, $event)" class="btn-circle add"
                :class="{ 'success-state': success_feedback_map[track.youtube_id] }"
                :title="success_feedback_map[track.youtube_id] ? 'Adicionado!' : 'Adicionar à Playlist'">
                <font-awesome-icon :icon="success_feedback_map[track.youtube_id] ? 'check' : 'circle-plus'" />
              </button>
            </div>
          </div>
        </template>
      </draggable>

      <div v-if="mode === 'playlist' && visible_tracks.length === 0" class="playlist-empty-state" role="status">
        <template v-if="filter_query.trim()">
          <div class="empty-state-icon-circle">
            <font-awesome-icon icon="magnifying-glass" />
          </div>
          <h4 class="empty-state-title">Nenhuma música encontrada</h4>
          <p class="empty-state-desc">
            Nenhum resultado corresponde a "<strong>{{ filter_query }}</strong>".
          </p>
          <button type="button" class="btn-clear-filter-action" @click="filter_query = ''">
            <font-awesome-icon icon="xmark" />
            <span>Limpar filtro</span>
          </button>
        </template>
        <template v-else>
          <div class="empty-state-icon-circle">
            <font-awesome-icon icon="music" />
          </div>
          <h4 class="empty-state-title">Sua playlist está vazia</h4>
          <p class="empty-state-desc">
            Adicione músicas à playlist através da busca ou enviando seus arquivos.
          </p>
        </template>
      </div>

      <div v-if="mode === 'search' && (has_more || is_loading_more)" ref="infiniteScrollTrigger"
        class="infinite-scroll-trigger">
        <font-awesome-icon v-if="is_loading_more" icon="spinner" spin class="loading-more-icon" />
      </div>

      <Teleport to="body">
        <TrackOptionsMenu v-model="show_options_menu" :position="options_position"
          :has-audio="radioStore.hasTrackAudio(selected_track_for_menu)"
          :has-video="radioStore.hasTrackVideo(selected_track_for_menu)"
          :is-downloading-audio="is_audio_downloading(selected_track_for_menu)"
          :is-downloading-video="is_video_downloading(selected_track_for_menu)"
          :has-lyrics="track_has_lyrics(selected_track_for_menu)"
          :is-downloading-lyrics="is_lyric_loading(selected_track_for_menu?.youtube_id)"
          :lyrics-unavailable="track_lyrics_unavailable(selected_track_for_menu)"
          :can-download-audio="can_download_audio_individually"
          :can-download-video="can_download_video_individually && selected_track_for_menu?.source !== 'upload'"
          :can-download-lyrics="can_download_audio_individually && selected_track_for_menu?.source !== 'upload'"
          :is-uploaded-track="selected_track_for_menu?.source === 'upload'" :video-qualities="video_quality_options"
          :playlists="radioStore.playlists" :existing-in-playlists="existing_track_playlist_ids"
          @close="show_options_menu = false" @copy-link="handle_copy_link" @delete="handle_delete"
          @download-audio="handle_download_audio" @download-video="handle_download_video"
          @download-lyrics="handle_download_lyrics" @add-queue="handle_add_queue"
          @add-to-playlist="handle_add_to_playlist" />
      </Teleport>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { mapState, mapActions } from "pinia";
import { useRadioStore } from "@/stores/radio";
import { useUtilsStore } from "@/stores/utils";
import { usePlayerStore } from "@/stores/player";
import { useAuthStore } from "@/stores/auth";
import TrackOptionsMenu from "./TrackOptionsMenu.vue";
import { decode_html_entities } from "@/utils/string_helpers";
import { get_visible_playlist_tracks } from "@/utils/playlist_tracks.js";
import { getOfflineVideoQualities, getPlanLimits } from "@/services/subscription_plans.js";
import { db } from "@/db";
import kadem_default_music from "@/assets/images/kadem-default-music.jpg";

export default {
  name: "TrackList",

  components: {
    TrackOptionsMenu,
    draggable,
  },

  props: {
    tracks: {
      type: Array,
      required: true,
    },
    playlist_id: {
      type: [Number, String],
      default: null,
    },
    current_music_id: {
      type: String,
      default: null,
    },
    mode: {
      type: String,
      default: "playlist",
    },
    is_mobile: {
      type: Boolean,
      default: false,
    },
    has_more: {
      type: Boolean,
      default: false,
    },
    is_loading_more: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["play-track", "delete-track", "request-add", "add-to-queue", "add-to-playlist", "load-more"],

  setup() {
    const radioStore = useRadioStore();
    const authStore = useAuthStore();
    return { radioStore, authStore };
  },

  data() {
    return {
      show_options_menu: false,
      options_position: { x: 0, y: 0, top: 0 },
      selected_track_for_menu: null,
      existing_track_playlist_ids: [],
      success_feedback_map: {},
      observer: null,
      kadem_default_music,
      filter_query: "",
      sort_selection: "",
      is_sort_menu_open: false,
      sort_options: [
        { value: "", label: "Ordem original", icon: "list" },
        { value: "title:asc", label: "Título: A–Z", icon: "arrow-down" },
        { value: "title:desc", label: "Título: Z–A", icon: "arrow-up" },
        { value: "created_at:desc", label: "Mais recentes", icon: "clock" },
        { value: "created_at:asc", label: "Mais antigas", icon: "clock-rotate-left" },
        { value: "duration_seconds:asc", label: "Menor duração", icon: "arrow-down" },
        { value: "duration_seconds:desc", label: "Maior duração", icon: "arrow-up" },
      ],
      sortable_columns: [
        { key: "title", label: "Título", class: "" },
        { key: "created_at", label: "Data Adição", class: "col-channel" },
        { key: "duration_seconds", label: "Duração", class: "text-center col-duration" },
      ],
    };
  },

  computed: {
    ...mapState(useRadioStore, ["active_downloads", "active_download_types", "isLyricDownloading"]),
    ...mapState(usePlayerStore, ["current_music", "is_playing"]),
    ...mapState(useUtilsStore, ["connection"]),

    current_sort_label() {
      const match = this.sort_options.find((opt) => opt.value === this.sort_selection);
      return match ? match.label : "Ordem original";
    },
    sort_key() {
      return this.sort_selection.split(":")[0];
    },
    sort_direction() {
      return this.sort_selection.split(":")[1] || "asc";
    },
    visible_tracks() {
      if (this.mode !== "playlist") return this.tracks;
      return get_visible_playlist_tracks(this.tracks, this.filter_query, this.sort_key, this.sort_direction);
    },

    is_offline_mode() {
      return !this.connection.connected;
    },
    plan_limits() {
      return getPlanLimits(this.authStore.user?.plan_tier);
    },
    can_download_audio_individually() {
      return this.connection.connected && this.plan_limits.can_use_offline_radio;
    },
    can_download_video_individually() {
      return this.connection.connected && this.plan_limits.can_download_offline_video;
    },
    video_quality_options() {
      return getOfflineVideoQualities(this.authStore.user?.plan_tier);
    },
    can_download_individually() {
      return this.connection.connected && getPlanLimits(this.authStore.user?.plan_tier).can_use_offline_radio;
    },
  },

  watch: {
    playlist_id() {
      this.filter_query = "";
      this.sort_selection = "";
      this.close_sort_menu();
    },
  },

  mounted() {
    this.setupIntersectionObserver();
  },

  beforeUnmount() {
    this.close_sort_menu();
    if (this.observer) this.observer.disconnect();
  },

  updated() {
    if (!this.observer || !this.$refs.infiniteScrollTrigger) {
      this.setupIntersectionObserver();
    }
  },

  methods: {
    ...mapActions(usePlayerStore, ["play_track"]),
    ...mapActions(useRadioStore, [
      "removeTrackFromPlaylist",
      "downloadTrack",
      "queue_lyrics_download",
      "trackHasLyrics",
      "trackLyricsUnavailable",
    ]),
    decode_html_entities,

    toggle_sort_menu() {
      if (this.is_sort_menu_open) {
        this.close_sort_menu();
      } else {
        this.open_sort_menu();
      }
    },
    open_sort_menu() {
      this.is_sort_menu_open = true;
      this.$nextTick(() => {
        document.addEventListener("pointerdown", this.handle_sort_menu_outside);
      });
    },
    close_sort_menu() {
      if (!this.is_sort_menu_open) return;
      this.is_sort_menu_open = false;
      document.removeEventListener("pointerdown", this.handle_sort_menu_outside);
    },
    handle_sort_menu_outside(event) {
      if (this.$refs.sortDropdownRoot && !this.$refs.sortDropdownRoot.contains(event.target)) {
        this.close_sort_menu();
      }
    },
    select_sort_option(value) {
      this.sort_selection = value;
      this.close_sort_menu();
    },

    toggle_sort(key) {
      if (this.sort_key !== key) {
        this.sort_selection = `${key}:asc`;
      } else if (this.sort_direction === "asc") {
        this.sort_selection = `${key}:desc`;
      } else {
        this.sort_selection = "";
      }
    },
    sort_header_title(column) {
      const current = this.sort_key === column.key
        ? ` (ordem ${this.sort_direction === "asc" ? "crescente" : "decrescente"})`
        : "";
      return `Ordenar por ${column.label.toLocaleLowerCase("pt-BR")}${current}`;
    },

    /* -------------------------------------------------------------------------- */
    /* Infinite Scroll Logic                                                      */
    /* -------------------------------------------------------------------------- */
    setupIntersectionObserver() {
      if (!this.$refs.infiniteScrollTrigger) return;

      if (this.observer) this.observer.disconnect();

      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && this.has_more && !this.is_loading_more) {
            this.$emit("load-more");
          }
        },
        {
          root: null,
          rootMargin: "100px",
          threshold: 0.1,
        },
      );

      this.observer.observe(this.$refs.infiniteScrollTrigger);
    },

    /* -------------------------------------------------------------------------- */
    /* Helpers                                                                    */
    /* -------------------------------------------------------------------------- */
    is_lyric_loading(id) {
      return this.isLyricDownloading(id);
    },
    track_has_lyrics(track) {
      return this.trackHasLyrics(track);
    },
    track_lyrics_unavailable(track) {
      return this.trackLyricsUnavailable(track);
    },
    is_audio_downloading(track) {
      return !!track && this.active_download_types[track.local_id] === "audio";
    },
    is_video_downloading(track) {
      return !!track && this.active_download_types[track.local_id] === "video";
    },
    trigger_add_feedback(track) {
      if (!track || !track.youtube_id) return;
      this.success_feedback_map[track.youtube_id] = true;
      setTimeout(() => {
        delete this.success_feedback_map[track.youtube_id];
      }, 2500);
    },

    get_progress_offset(progress) {
      const circumference = 50.26;
      if (progress === 0) return circumference * 0.75;
      return circumference - (circumference * progress) / 100;
    },

    /* -------------------------------------------------------------------------- */
    /* State Checks & Validation                                                  */
    /* -------------------------------------------------------------------------- */
    is_track_playing(track) {
      if (!this.current_music) return false;
      if (track.local_id && this.current_music.local_id) {
        return track.local_id === this.current_music.local_id;
      }
      return track.youtube_id === this.current_music.youtube_id;
    },

    is_track_unavailable(track) {
      if (!this.is_offline_mode) return false;
      const isAvailable = this.radioStore.isTrackOffline(track);
      return !isAvailable;
    },

    /* -------------------------------------------------------------------------- */
    /* User Interactions                                                          */
    /* -------------------------------------------------------------------------- */
    handle_row_click(track) {
      if (this.is_track_unavailable(track)) return;
      if (this.is_mobile) {
        this.play_track(track, null);
      }
    },

    handle_desktop_dbl_click(track) {
      if (this.is_mobile) return;
      if (this.is_track_unavailable(track)) return;
      this.play_track(track, null);
    },

    async open_menu(event, track) {
      this.selected_track_for_menu = track;
      this.existing_track_playlist_ids = [];
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 210;
      let finalX = rect.left;

      if (finalX + menuWidth > window.innerWidth) {
        finalX = rect.right - menuWidth;
      }

      if (this.is_mobile) {
        finalX += menuWidth - 40;
      }

      this.options_position = {
        x: finalX,
        y: rect.bottom,
        top: rect.top,
      };
      this.show_options_menu = true;

      try {
        const existing_entries = await db.tracks
          .where("youtube_id")
          .equals(track.youtube_id)
          .toArray();
        this.existing_track_playlist_ids = existing_entries.map((t) => t.playlist_local_id);
      } catch (error) {
        console.error("Erro ao verificar playlists existentes:", error);
      }
    },

    handle_delete() {
      if (this.selected_track_for_menu) {
        this.$emit("delete-track", this.selected_track_for_menu);
      }
      this.show_options_menu = false;
    },

    handle_download_video(video_quality) {
      const track = this.selected_track_for_menu;
      if (!track || !this.can_download_video_individually) return;

      this.downloadTrack(track, {
        media: "video",
        force: this.radioStore.hasTrackVideo(track),
        video_quality,
      });
      this.show_options_menu = false;
    },

    handle_add_queue() {
      if (this.selected_track_for_menu) {
        this.trigger_add_feedback(this.selected_track_for_menu);
        this.$emit("add-to-queue", this.selected_track_for_menu);
      }
      this.show_options_menu = false;
    },

    handle_add_to_playlist(playlist) {
      if (this.selected_track_for_menu) {
        this.$emit("add-to-playlist", this.selected_track_for_menu, playlist);
      }
      this.show_options_menu = false;
    },

    handle_download_audio() {
      const track = this.selected_track_for_menu;
      if (!track || !this.can_download_individually) return;

      this.downloadTrack(track, {
        force: this.radioStore.isTrackOffline(track),
      });
      this.show_options_menu = false;
    },

    handle_download_lyrics() {
      const track = this.selected_track_for_menu;
      if (!track || !this.can_download_individually) return;

      this.queue_lyrics_download(track, {
        force: this.track_has_lyrics(track) || this.track_lyrics_unavailable(track),
      });
      this.show_options_menu = false;
    },

    async handle_copy_link() {
      if (this.selected_track_for_menu && this.selected_track_for_menu.youtube_id) {
        const link = `https://youtu.be/${this.selected_track_for_menu.youtube_id}`;
        try {
          await navigator.clipboard.writeText(link);
        } catch (err) {
          console.error("Falha ao copiar link: ", err);
        }
      }
      this.show_options_menu = false;
    },

    /* -------------------------------------------------------------------------- */
    /* Drag and Drop Logic (Custom Ghost)                                         */
    /* -------------------------------------------------------------------------- */
    on_drag_start(event, track) {
      if (this.is_mobile) return;
      if (this.is_track_unavailable(track)) return;
      if (this.mode == "search") return;

      const originalImg = event.currentTarget.querySelector("img");
      const ghost = document.createElement("div");

      Object.assign(ghost.style, {
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "280px",
        height: "64px",
        backgroundColor: "#1f2937",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        padding: "8px",
        gap: "12px",
        zIndex: "99999",
        boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
      });

      let thumbVisual;
      if (originalImg && originalImg.complete && originalImg.naturalWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        Object.assign(canvas.style, {
          width: "48px",
          height: "48px",
          borderRadius: "6px",
          flexShrink: "0",
          objectFit: "cover",
        });
        const ctx = canvas.getContext("2d");
        try {
          ctx.drawImage(originalImg, 0, 0, 48, 48);
          thumbVisual = canvas;
        } catch {
          thumbVisual = this.create_fallback_thumb();
        }
      } else {
        thumbVisual = this.create_fallback_thumb();
      }

      const textGroup = document.createElement("div");
      Object.assign(textGroup.style, {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "2px",
        flexGrow: "1",
        minWidth: "0",
      });

      const title = document.createElement("span");
      title.textContent = track.title;
      Object.assign(title.style, {
        color: "#f3f4f6",
        fontSize: "13px",
        fontWeight: "600",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
        maxWidth: "100%",
      });

      const channel = document.createElement("small");
      channel.textContent = track.channel || "Desconhecido";
      Object.assign(channel.style, {
        color: "#9ca3af",
        fontSize: "11px",
        display: "block",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      });

      textGroup.appendChild(title);
      textGroup.appendChild(channel);
      ghost.appendChild(thumbVisual);
      ghost.appendChild(textGroup);
      document.body.appendChild(ghost);

      if (event.dataTransfer) {
        event.dataTransfer.setDragImage(ghost, 24, 32);
        event.dataTransfer.effectAllowed = "copy";
        const payload = JSON.stringify({
          youtube_id: track.youtube_id,
          title: track.title,
          channel: track.channel,
          thumbnail: track.thumbnail,
          duration_seconds: track.duration_seconds,
        });
        event.dataTransfer.setData("application/json", payload);
      }

      setTimeout(() => {
        if (document.body.contains(ghost)) {
          document.body.removeChild(ghost);
        }
      }, 0);
    },

    create_fallback_thumb() {
      const div = document.createElement("div");
      Object.assign(div.style, {
        width: "48px",
        height: "48px",
        borderRadius: "6px",
        backgroundColor: "#374151",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        flexShrink: "0",
      });
      div.innerHTML =
        '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2z"/><path fill-rule="evenodd" d="M9 3v10H8V3h1z"/><path d="M8 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 13 2.22V4L8 5V2.82z"/></svg>';
      return div;
    },

    /* -------------------------------------------------------------------------- */
    /* Formatters                                                                 */
    /* -------------------------------------------------------------------------- */
    format_date(iso) {
      if (!iso) return "-";
      return new Date(iso).toLocaleDateString("pt-BR");
    },
    format_duration(seconds) {
      return this.format_seconds_to_time(seconds);
    },
  },
};
</script>

<style scoped>
.tracks-table-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.track-ghost {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.1);
}

.tracks-table {
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-4);
  height: 100%;
}

.playlist-list-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: 18px;
  margin-bottom: var(--space-3);
  padding: 4px 2px;
  position: relative;
}

/* Input de busca/filtro totalmente integrado sobre o background (sem bordas nem fundo) */
.playlist-filter {
  display: flex;
  align-items: center;
  flex: 1 1 240px;
  max-width: 440px;
  gap: 10px;
  padding: 6px 0;
  background: transparent !important;
  border: none !important;
  border-radius: 0;
  box-shadow: none !important;
  color: var(--text-secondary);
  position: relative;
  transition: color 0.2s ease;
}

.playlist-filter:focus-within {
  color: var(--text-primary);
  border: none !important;
  box-shadow: none !important;
}

.playlist-filter .filter-search-icon {
  font-size: 0.9375rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
  transition: color 0.2s ease, transform 0.2s ease;
  flex-shrink: 0;
}

.playlist-filter:focus-within .filter-search-icon {
  color: var(--blue, #355afd);
  transform: scale(1.05);
}

.playlist-filter input[type="search"],
.playlist-filter input[type="search"]:focus {
  width: 100%;
  min-width: 0;
  height: auto;
  padding: 0;
  padding-left: 5px;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

.playlist-filter input[type="search"]::placeholder {
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
  font-weight: 400;
  transition: color 0.2s ease;
}

.playlist-filter:focus-within input[type="search"]::placeholder {
  color: var(--text-secondary, rgba(255, 255, 255, 0.65));
}

.playlist-filter input::-webkit-search-cancel-button {
  display: none;
}

.clear-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  font-size: 0.8125rem;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.clear-filter:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.filter-count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--blue, #355afd);
  background: rgba(53, 90, 253, 0.12);
  border: 1px solid rgba(53, 90, 253, 0.25);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* Container do Dropdown de Ordenação / Filtragem */
.playlist-sort-container {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

/* Botão gatilho com ícone de filtragem */
.playlist-sort-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

[data-theme="light"] .playlist-sort-trigger {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
  color: var(--text-secondary);
}

.playlist-sort-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--text-primary);
  transform: translateY(-1px);
}

[data-theme="light"] .playlist-sort-trigger:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.14);
  color: var(--text-primary);
}

.playlist-sort-trigger.is-open {
  background: rgba(53, 90, 253, 0.12);
  border-color: rgba(53, 90, 253, 0.45);
  color: var(--blue, #355afd);
  box-shadow: 0 0 12px rgba(53, 90, 253, 0.2);
}

.playlist-sort-trigger.has-active-sort:not(.is-open) {
  border-color: rgba(53, 90, 253, 0.3);
  color: var(--text-primary);
}

.sort-filter-icon {
  font-size: 0.8125rem;
  color: var(--blue, #355afd);
  transition: transform 0.2s ease;
}

.playlist-sort-trigger:hover .sort-filter-icon {
  transform: scale(1.1);
}

.sort-current-text {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}

.sort-chevron-icon {
  font-size: 0.6875rem;
  opacity: 0.7;
  transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1);
  margin-left: 2px;
}

.sort-chevron-icon.rotated {
  transform: rotate(180deg);
  opacity: 1;
}

/* Menu Dropdown Personalizado */
.playlist-sort-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 120;
  min-width: 195px;
  padding: 6px;
  background: rgba(18, 22, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transform-origin: top right;
}

[data-theme="light"] .playlist-sort-dropdown {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
}

.dropdown-header-label {
  padding: 6px 10px 4px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
}

.sort-options-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
}

.sort-option-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  transform: translateX(2px);
}

[data-theme="light"] .sort-option-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.sort-option-item.is-selected {
  background: rgba(53, 90, 253, 0.14);
  color: var(--blue, #355afd);
  font-weight: 600;
}

[data-theme="light"] .sort-option-item.is-selected {
  background: rgba(53, 90, 253, 0.1);
  color: var(--blue, #355afd);
}

.sort-option-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-icon {
  font-size: 0.75rem;
  opacity: 0.7;
  width: 14px;
  text-align: center;
}

.sort-option-item.is-selected .opt-icon {
  opacity: 1;
  color: var(--blue, #355afd);
}

.opt-label {
  white-space: nowrap;
}

.opt-check-icon {
  font-size: 0.75rem;
  color: var(--blue, #355afd);
}

/* Animação Suave do Dropdown */
.sort-dropdown-pop-enter-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.sort-dropdown-pop-leave-active {
  transition: opacity 0.14s cubic-bezier(0.4, 0, 1, 1),
    transform 0.14s cubic-bezier(0.4, 0, 1, 1);
}

.sort-dropdown-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.sort-dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

.clear-filter,
.sort-header {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sort-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  text-align: left;
}

.sort-header.text-center {
  justify-content: center;
}

.sort-header:hover,
.sort-header.sort-active {
  color: var(--color-info);
}

.playlist-empty-state {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px var(--space-4);
  text-align: center;
  color: var(--text-secondary);
  animation: empty-state-fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes empty-state-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-state-icon-circle {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
  margin-bottom: var(--space-3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

[data-theme="light"] .empty-state-icon-circle {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.06);
  color: var(--text-muted);
}

.empty-state-title {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state-desc {
  margin: 0 0 var(--space-4) 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  max-width: 360px;
  line-height: 1.5;
}

.empty-state-desc strong {
  color: var(--text-primary);
  word-break: break-all;
}

.btn-clear-filter-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  outline: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme="light"] .btn-clear-filter-action {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

.btn-clear-filter-action:hover {
  background: rgba(53, 90, 253, 0.18);
  border-color: rgba(53, 90, 253, 0.45);
  color: var(--blue, #5b7fff);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(53, 90, 253, 0.25);
}

.btn-clear-filter-action:active {
  transform: translateY(0);
}

.tracks-scroll-area {
  flex-grow: 1;
  padding-bottom: var(--space-4);
}

.infinite-scroll-trigger {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blue);
  font-size: 1.2rem;
  margin-top: 10px;
}

.track-row {
  display: grid;
  grid-template-columns: 40px 4fr 2fr 1fr 40px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  border-bottom: 1px solid var(--glass-border);
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  transition: background 0.1s;
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
}

.unavailable-track {
  opacity: 0.5;
  cursor: not-allowed !important;
  background-color: rgba(0, 0, 0, 0.2);
}

.unavailable-track:hover {
  background-color: rgba(0, 0, 0, 0.2) !important;
}

.unavailable-track img {
  filter: grayscale(100%);
}

.offline-warning {
  color: var(--red);
  font-size: 0.7rem;
  font-weight: 600;
}

.mobile-only-artist {
  display: none;
  font-size: 0.75rem;
  color: var(--gray-400);
}

.track-row span {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex-grow: 1;
  min-width: 0;
}

.track-row:hover {
  background: var(--surface-3);
}

@media (hover: hover) {
  .track-row:hover .play-overlay {
    opacity: 1;
  }

  .track-row:hover .mini-thumb {
    filter: brightness(0.6);
  }
}

.track-row.header {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: transparent !important;
  cursor: default;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 8px;
}

.track-row.active-track {
  background: var(--surface-3);
}

.track-row.active-track strong,
.playing-icon {
  color: var(--color-info);
}

.track-index,
.col-channel,
.col-duration {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-title-col {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  overflow: hidden;
}

.thumb-wrapper {
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.mini-thumb {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
  transition: filter 0.2s ease;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-size: 0.9rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
  z-index: 5;
}

.meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-grow: 1;
  min-width: 0;
}

.meta strong,
.meta small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.duration-text {
  font-variant-numeric: tabular-nums;
}

.progress-ring {
  transform-origin: center;
}

.is-indeterminate {
  animation: spin 1s linear infinite;
}

.progress-ring-container {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blue);
}

.progress-ring__circle--bg {
  opacity: 0.2;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.progress-ring__circle {
  transition: stroke-dashoffset 0.35s ease;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  color: var(--blue);
}

.status-icons {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 24px;
  gap: 7px;

  & span {
    flex-grow: initial !important;
  }
}

.status-icon {
  font-size: 0.9rem;
  display: flex;
}

.status-icon.video-ready {
  color: var(--color-info);
}

.downloading {
  color: var(--blue);
}

.offline-ready {
  color: var(--color-income);
}

.btn-circle {
  font-size: 1.1rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 0;
  width: 35px;
  height: 35px;
  min-width: 35px;
  min-height: 35px;
  max-width: 35px;
  max-height: 35px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  transition:
    background 0.2s,
    transform 0.2s,
    color 0.2s;
  color: var(--text-secondary);
}

.btn-circle:hover {
  color: var(--text-primary);
  background: var(--surface-3);
}

.btn-circle svg {
  transition: transform 0.2s;
}

.btn-circle:hover svg {
  transform: scale(1.05);
}

.btn-circle.add {
  color: var(--color-income);
}

.btn-circle.remove {
  color: var(--color-expense);
}

.btn-circle.options {
  color: var(--text-secondary);
}

.btn-circle.options:hover {
  color: var(--text-primary);
  background: var(--surface-3);
}

.row-blink-success {
  animation: blink-bg 0.6s ease-in-out 2;
}

@keyframes blink-bg {

  0%,
  100% {
    background-color: transparent;
  }

  50% {
    background-color: rgba(74, 222, 128, 0.2);
  }
}

.btn-circle.add.success-state {
  color: #4ade80 !important;
  transform: scale(1.1);
}

.lyrics-indicator {
  display: inline-flex;
  margin-left: 6px;
  align-items: center;
}

.upload-badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--text-muted, var(--text-secondary));
}

.lyrics-indicator .status-icon {
  font-size: 0.75rem;
}

.lyrics-indicator .status-icon.success {
  color: var(--color-income);
  opacity: 0.8;
}

.lyrics-indicator .status-icon.disabled {
  color: var(--text-secondary);
  opacity: 0.35;
}

.is-mobile-track-list .track-row {
  grid-template-columns: 30px 1fr 40px;
}

.is-mobile-track-list .col-channel,
.is-mobile-track-list .col-duration {
  display: none !important;
}

.is-mobile-track-list .mobile-only-artist {
  display: block;
}

@container (max-width: 1100px) {
  .track-row {
    grid-template-columns: 30px 1fr 40px;
  }

  .col-channel,
  .col-duration,
  .desktop-only-artist {
    display: none !important;
  }

  .mobile-only-artist {
    display: block;
  }

  .tracks-table {
    padding: 0 var(--space-2);
  }

  .col-channel,
  .col-duration {
    display: none;
  }

  .tracks-scroll-area {
    padding-bottom: 100px;
  }
}

.is-search-mode .tracks-scroll-area,
.is-mobile-track-list.is-search-mode .tracks-scroll-area {
  padding-bottom: var(--space-4) !important;
}
</style>
