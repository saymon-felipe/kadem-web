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
      >
        <template #item="{ element: track, index }">
          <div
            class="track-row"
            :class="{ 'active-track': is_track_playing(track) }"
            @dblclick="handle_dbl_click(track)"
            @dragstart="on_drag_start($event, track)"
          >
            <span v-if="is_track_playing(track)" class="playing-icon">
              <font-awesome-icon icon="volume-high" />
            </span>
            <span v-else class="track-index">{{ index + 1 }}</span>

            <div class="track-title-col">
              <img :src="track.thumbnail" class="mini-thumb" />
              <div class="meta">
                <strong :title="track.title">{{ track.title }}</strong>
                <small class="mobile-only-artist">{{ track.channel }}</small>
                <small
                  v-if="mode === 'playlist'"
                  class="desktop-only-artist"
                  :title="track.channel"
                  >{{ track.channel }}</small
                >
              </div>
            </div>

            <span
              class="col-channel"
              :title="mode === 'search' ? track.channel : format_date(track.created_at)"
              >{{
                mode === "search" ? track.channel : format_date(track.created_at)
              }}</span
            >

            <span class="text-center duration-text col-duration">
              {{ format_duration(track.duration_seconds) }}
            </span>

            <div class="actions">
              <button
                v-if="mode === 'playlist'"
                @click.stop="open_options(track, $event)"
                class="btn-circle options"
                title="Mais opções"
              >
                <font-awesome-icon icon="ellipsis-vertical" />
              </button>

              <button
                v-else
                @click.stop="$emit('request-add', track, $event)"
                class="btn-circle add"
                title="Adicionar à Playlist"
              >
                <font-awesome-icon icon="circle-plus" />
              </button>
            </div>
          </div>
        </template>
      </draggable>

      <Teleport to="body">
        <TrackOptionsMenu
          v-model="show_options_menu"
          :position="options_position"
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
import TrackOptionsMenu from "./TrackOptionsMenu.vue";
import draggable from "vuedraggable";

export default {
  components: { TrackOptionsMenu, draggable },
  props: {
    tracks: { type: Array, required: true },
    current_music_id: { type: String, default: null },
    mode: { type: String, default: "playlist" },
    is_mobile: { type: Boolean, default: false },
  },
  emits: ["play-track", "delete-track", "request-add", "add-to-queue"],
  data() {
    return {
      show_options_menu: false,
      options_position: { x: 0, y: 0 },
      selected_track_for_menu: null,
    };
  },
  methods: {
    is_track_playing(track) {
      return this.current_music_id === track.youtube_id;
    },
    format_date(iso) {
      if (!iso) return "-";
      return new Date(iso).toLocaleDateString("pt-BR");
    },
    format_duration(seconds) {
      return this.format_seconds_to_time(seconds);
    },
    handle_dbl_click(track) {
      this.$emit("play-track", track);
    },
    open_options(track, event) {
      this.selected_track_for_menu = track;
      this.options_position = { x: event.clientX - 30, y: event.clientY + 10 };
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
    on_drag_start(event, track) {
      if (this.is_mobile) {
        return;
      }

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
  overflow-y: auto;
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

.mobile-only-artist {
  display: none;
  font-size: 0.75rem;
  color: var(--gray-400);
}

/* Container Queries para Responsividade */
@container (max-width: 600px) {
  .track-row {
    /* Remove Coluna de Data/Canal e Duração, foca no Título */
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
    padding-bottom: 48px;
  }
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

.track-row.header {
  font-weight: bold;
  color: var(--gray-400);
  text-transform: uppercase;
  font-size: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: var(--space-2);
}

.track-row.active-track {
  background: var(--dark-yellow-2);
}

.track-row.active-track strong,
.playing-icon {
  color: var(--deep-blue);
}

.track-title-col {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-grow: 1;
  min-width: 0;
}

.mini-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
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
}

.duration-text {
  font-variant-numeric: tabular-nums;
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

.empty-state {
  text-align: center;
  padding: var(--space-6);
  color: var(--gray-400);
  font-style: italic;
}
</style>
