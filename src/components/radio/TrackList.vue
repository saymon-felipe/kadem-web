<template>
  <div class="tracks-table">
    <div class="track-row header">
      <span>#</span>
      <span>Título</span>
      <span>{{ mode === "search" ? "Canal" : "Data Adição" }}</span>
      <span class="text-center">Duração</span>
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
          <span v-else>{{ index + 1 }}</span>

          <div class="track-title-col">
            <img :src="track.thumbnail" class="mini-thumb" />
            <div class="meta">
              <strong :title="track.title">{{ track.title }}</strong>
              <small v-if="mode === 'playlist'" :title="track.channel">{{
                track.channel
              }}</small>
            </div>
          </div>

          <span
            :title="mode === 'search' ? track.channel : format_date(track.created_at)"
            >{{ mode === "search" ? track.channel : format_date(track.created_at) }}</span
          >

          <span class="text-center duration-text">
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
      const ghost = document.createElement("div");

      Object.assign(ghost.style, {
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "280px",
        display: "flex",
        alignItems: "center",
        gap: "12px", 
        padding: "8px",
        backgroundColor: "#1e293b", 
        borderRadius: "6px",
        zIndex: "99999",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
      });

      const img = document.createElement("img");
      img.src = track.thumbnail;
      Object.assign(img.style, {
        width: "40px",
        height: "40px",
        borderRadius: "4px",
        objectFit: "cover",
        flexShrink: "0",
      });

      const info = document.createElement("div");
      Object.assign(info.style, {
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexGrow: "1",
        justifyContent: "center",
      });

      // 3. Título
      const title = document.createElement("strong");
      title.innerText = track.title;
      Object.assign(title.style, {
        fontSize: "0.85rem",
        color: "#ffffff",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
      });

      // 4. Canal
      const channel = document.createElement("small");
      channel.innerText = track.channel;
      Object.assign(channel.style, {
        fontSize: "0.75rem",
        color: "#94a3b8", 
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
        marginTop: "2px",
      });

      info.appendChild(title);
      info.appendChild(channel);
      ghost.appendChild(img);
      ghost.appendChild(info);

      document.body.appendChild(ghost);

      event.dataTransfer.setDragImage(ghost, 0, 0);

      setTimeout(() => {
        document.body.removeChild(ghost);
      }, 0);
    },
  },
};
</script>

<style scoped>
.track-ghost {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.1);
}

.tracks-table {
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-4);
}

.tracks-scroll-area {
  overflow-y: auto;
  flex-grow: 1;
  padding-bottom: var(--space-4);
}

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
