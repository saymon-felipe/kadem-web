<template>
  <div class="tracks-table-container">
    <div class="tracks-table">
      <div class="track-row header">
        <span>#</span>
        <span>Título</span>
        <span class="col-channel">{{ mode === "search" ? "Canal" : "Data Adição" }}</span>
        <span class="text-center col-duration">Duração</span>
        <span></span>
      </div>

      <draggable
        class="tracks-scroll-area"
        :list="tracks"
        :group="{ name: 'music', pull: 'clone', put: false }"
        item-key="youtube_id"
        :sort="false"
        ghost-class="track-ghost"
        :disabled="is_mobile"
      >
        <template #item="{ element: track, index }">
          <div
            class="track-row"
            :class="{
              'active-track': is_track_playing(track),
              'unavailable-track': is_track_unavailable(track),
              'row-blink-success': success_feedback_map[track.youtube_id],
            }"
            @click="handle_row_click(track)"
            @dblclick="handle_desktop_dbl_click(track)"
            @dragstart="on_drag_start($event, track)"
          >
            <span v-if="is_track_playing(track)" class="playing-icon">
              <font-awesome-icon icon="volume-high" />
            </span>
            <span v-else class="track-index">{{ index + 1 }}</span>

            <div class="track-title-col">
              <div class="thumb-wrapper">
                <img
                  :src="track.thumbnail"
                  class="mini-thumb"
                  :class="{ grayscale: is_track_unavailable(track) }"
                />

                <div
                  v-if="!is_mobile && !is_track_unavailable(track)"
                  class="play-overlay"
                  @click.stop="play_track(track, null)"
                >
                  <font-awesome-icon
                    icon="pause"
                    v-if="is_track_playing(track) && is_playing"
                  />
                  <font-awesome-icon
                    icon="play"
                    v-if="!is_track_playing(track) || !is_playing"
                  />
                </div>
              </div>

              <div class="meta">
                <div
                  class="title-row"
                  style="display: flex; align-items: center; gap: 6px"
                >
                  <strong :title="track.title">{{ track.title }}</strong>
                </div>
                <small class="mobile-only-artist">{{ track.channel }}</small>
              </div>

              <div class="status-icons">
                <div
                  v-if="active_downloads[track.local_id] !== undefined"
                  class="progress-ring-container"
                  :title="
                    active_downloads[track.local_id] === 0
                      ? 'Iniciando download...'
                      : `Baixando: ${active_downloads[track.local_id]}%`
                  "
                >
                  <svg
                    class="progress-ring"
                    width="20"
                    height="20"
                    :class="{
                      'is-indeterminate': active_downloads[track.local_id] === 0,
                    }"
                  >
                    <circle
                      class="progress-ring__circle--bg"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="transparent"
                      r="8"
                      cx="10"
                      cy="10"
                    />

                    <circle
                      class="progress-ring__circle"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="transparent"
                      r="8"
                      cx="10"
                      cy="10"
                      stroke-dasharray="50.26"
                      :stroke-dashoffset="
                        get_progress_offset(active_downloads[track.local_id])
                      "
                    />
                  </svg>
                </div>

                <span
                  v-else-if="radioStore.isTrackOffline(track)"
                  class="status-icon offline-ready"
                  title="Disponível Offline"
                >
                  <font-awesome-icon icon="circle-check" />
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
              <button
                v-if="mode === 'playlist'"
                class="btn-circle"
                @click.stop="open_menu($event, track)"
                :disabled="is_track_unavailable(track)"
              >
                <font-awesome-icon icon="ellipsis-vertical" />
              </button>

              <button
                v-else
                @click.stop="$emit('request-add', track, $event)"
                class="btn-circle add"
                :class="{ 'success-state': success_feedback_map[track.youtube_id] }"
                :title="
                  success_feedback_map[track.youtube_id]
                    ? 'Adicionado!'
                    : 'Adicionar à Playlist'
                "
              >
                <font-awesome-icon
                  :icon="success_feedback_map[track.youtube_id] ? 'check' : 'circle-plus'"
                />
              </button>
            </div>
          </div>
        </template>
      </draggable>

      <Teleport to="body">
        <TrackOptionsMenu
          v-model="show_options_menu"
          :position="options_position"
          :is-in-queue="is_in_queue(selected_track_for_menu)"
          @close="show_options_menu = false"
          @copy-link="handle_copy_link"
          @delete="handle_delete"
          @add-queue="handle_add_queue"
        />
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
import TrackOptionsMenu from "./TrackOptionsMenu.vue";

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
  },

  emits: ["play-track", "delete-track", "request-add", "add-to-queue"],

  setup() {
    const radioStore = useRadioStore();
    return { radioStore };
  },

  data() {
    return {
      show_options_menu: false,
      options_position: { x: 0, y: 0 },
      selected_track_for_menu: null,
      success_feedback_map: {},
    };
  },

  computed: {
    ...mapState(useRadioStore, ["active_downloads"]),
    ...mapState(usePlayerStore, ["current_music", "is_playing", "queue"]),
    ...mapState(useUtilsStore, ["connection"]),

    is_offline_mode() {
      return !this.connection.connected;
    },
  },

  methods: {
    ...mapActions(usePlayerStore, ["play_track"]),
    ...mapActions(useRadioStore, ["removeTrackFromPlaylist", "downloadTrack"]),

    is_in_queue(track) {
      if (!this.queue || !track) return false;

      return this.queue.some(
        (t) =>
          (t.local_id && t.local_id === track.local_id) ||
          t.youtube_id === track.youtube_id
      );
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

      if (progress === 0) {
        return circumference * 0.75;
      }

      return circumference - (circumference * progress) / 100;
    },

    /* -------------------------------------------------------------------------- */
    /* State Checks & Validation                                                  */
    /* -------------------------------------------------------------------------- */
    is_track_playing(track) {
      if (!this.current_music) return false;

      // Compatibilidade para verificar por local_id ou youtube_id
      if (track.local_id && this.current_music.local_id) {
        return track.local_id === this.current_music.local_id;
      }
      return track.youtube_id === this.current_music.youtube_id;
    },

    is_track_unavailable(track) {
      // 1. Se tem internet, consideramos disponível (fallback para YouTube)
      if (!this.is_offline_mode) return false;

      // 2. Se não tem internet, verificamos na Store se o arquivo existe localmente
      const isAvailable = this.radioStore.isTrackOffline(track);

      return !isAvailable;
    },

    /* -------------------------------------------------------------------------- */
    /* User Interactions (Click, Double Click)                                    */
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

    open_menu(event, track) {
      this.selected_track_for_menu = track;

      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 150;

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
      };

      this.show_options_menu = true;
    },
    handle_delete() {
      if (this.selected_track_for_menu) {
        this.$emit("delete-track", this.selected_track_for_menu);
      }
      this.show_options_menu = false;
    },
    handle_add_queue() {
      if (this.selected_track_for_menu) {
        this.trigger_add_feedback(this.selected_track_for_menu);

        this.$emit("add-to-queue", this.selected_track_for_menu);
      }
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

      // Cria elemento fantasma customizado
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
        } catch (e) {
          console.warn("Kadem Drag: Falha ao desenhar canvas", e);
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

.tracks-scroll-area {
  flex-grow: 1;
  padding-bottom: var(--space-4);
}

/* Grid Padrão Desktop */
.track-row {
  display: grid;
  grid-template-columns: 40px 4fr 2fr 1fr 40px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: var(--fontsize-xs);
  color: var(--gray-100);
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
  background: rgba(255, 255, 255, 0.1);
}

/* Novo: Efeito de Hover no Desktop */
/* Apenas aplica se o dispositivo suportar hover (exclui a maioria dos mobiles) */
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
  color: var(--gray-400);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: transparent !important;
  cursor: default;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
}

.track-row.active-track {
  background: var(--dark-yellow-2);
}

.track-row.active-track strong,
.playing-icon {
  color: var(--deep-blue);
}

.track-index,
.col-channel,
.col-duration {
  font-size: 0.9rem;
  color: var(--gray-300);
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

/* Wrapper da Imagem para posicionar o overlay */
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

/* Estilo do Overlay de Play */
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
  color: var(--white);
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
  width: 24px;
  height: 24px;
  margin-left: 8px;
}

.status-icon {
  font-size: 0.9rem;
  display: flex;
}

.downloading {
  color: var(--blue);
}

.offline-ready {
  color: #4ade80;
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
  transition: background 0.2s, transform 0.2s;
}

.btn-circle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-circle svg {
  transition: transform 0.2s;
}

.btn-circle:hover svg {
  transform: scale(1.05);
}

.btn-circle.add {
  color: var(--green);
}

.btn-circle.remove {
  color: var(--red);
}

.btn-circle.options {
  color: var(--gray-400);
}

.btn-circle.options:hover {
  color: var(--deep-blue);
  background: rgba(255, 255, 255, 0.2);
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

/* Container Queries para Responsividade Mobile */
@container (max-width: 1100px) {
  .track-row {
    grid-template-columns: 30px 1fr 40px;
  }

  .col-channel,
  .col-duration,
  .desktop-only-artist,
  .track-row.header span:nth-child(3),
  .track-row.header span:nth-child(4) {
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
    padding-bottom: 60px;
  }

  .status-icons {
    display: none;
  }
}
</style>
