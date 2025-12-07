<template>
  <aside
    class="queue-sidebar glass"
    @dragover.prevent="on_drag_over"
    @dragleave="on_drag_leave"
    @drop="on_drop"
  >
    <div class="queue-header">
      <h3>Fila de músicas</h3>
    </div>

    <div class="queue-content">
      <div class="section-title">Neste momento</div>

      <transition name="fade-slide" mode="out-in">
        <div
          class="queue-item active"
          v-if="current_music"
          :key="current_music.youtube_id"
        >
          <img :src="current_music.thumbnail" class="q-cover" />
          <div class="q-info">
            <strong>{{ current_music.title }}</strong>
            <small>{{ current_music.channel }}</small>
          </div>
          <div class="visualizer-icon">
            <font-awesome-icon icon="chart-simple" />
          </div>
        </div>
        <div v-else class="empty-msg" key="empty">Nada tocando</div>
      </transition>

      <div class="section-title mt-4">Próximas</div>

      <div v-if="next_tracks.length === 0" class="empty-msg">
        Fila vazia. Arraste músicas para cá.
      </div>

      <draggable
        v-model="queue_model"
        group="music"
        item-key="youtube_id"
        class="next-list"
        ghost-class="queue-ghost"
        drag-class="queue-drag"
        animation="200"
        :move="check_move"
      >
        <template #item="{ element, index }">
          <div class="queue-item">
            <img :src="element.thumbnail || default_cover" class="q-cover" />
            <div class="q-info">
              <strong>{{ element.title || "Sem título" }}</strong>
              <small>{{ element.channel || "Desconhecido" }}</small>
            </div>

            <button class="remove-btn" @click.stop="$emit('remove-track', index)">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
        </template>
      </draggable>
    </div>
  </aside>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import draggable from "vuedraggable";

export default {
  components: { draggable },
  data() {
    return {
      drag_over_index: -1,
      is_dragging_over: false,
    };
  },
  computed: {
    ...mapState(usePlayerStore, ["current_music", "queue"]),
    queue_model: {
      get() {
        return this.next_tracks;
      },
      set(value) {
        const seen = new Set();
        const unique_queue = value.filter((track) => {
          if (seen.has(track.youtube_id)) return false;
          seen.add(track.youtube_id);
          return true;
        });

        this.$emit("update:queue", unique_queue);
      },
    },
    next_tracks() {
      if (!this.current_music || !this.queue.length) return [];
      const current_index = this.queue.findIndex(
        (t) => t.youtube_id === this.current_music.youtube_id
      );

      if (current_index === -1) return this.queue;
      this.queue.slice(current_index + 1);

      return this.queue;
    },
  },
  methods: {
    ...mapActions(usePlayerStore, ["add_to_queue", "remove_from_queue"]),
    check_move(evt) {
      const dragged_item = evt.draggedContext.element;

      const is_internal_reorder = this.next_tracks.includes(dragged_item);

      if (is_internal_reorder) return true;

      const exists = this.next_tracks.some(
        (t) => t.youtube_id === dragged_item.youtube_id
      );

      return !exists;
    },
    on_drag_enter(event) {
      this.is_dragging_over = true;
    },

    on_drag_over(event) {
      this.is_dragging_over = true;

      const list_container = this.$el.querySelector(".next-list");
      if (!list_container) return;

      const items = Array.from(list_container.children).filter((el) =>
        el.classList.contains("queue-item")
      );

      const mouse_y = event.clientY;
      let found_index = items.length;

      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const center_y = rect.top + rect.height / 2;

        if (mouse_y < center_y) {
          found_index = i;
          break;
        }
      }
      this.drag_over_index = found_index;
    },
    on_drag_leave(event) {
      if (event.currentTarget.contains(event.relatedTarget)) return;

      this.drag_over_index = -1;
      this.is_dragging_over = false;
    },
    on_drop(event) {
      const index = this.drag_over_index;

      // Reset visual
      this.drag_over_index = -1;
      this.is_dragging_over = false;

      const data = event.dataTransfer.getData("application/json");
      if (!data) return;

      try {
        const track = JSON.parse(data);
        this.$emit("insert-track", { track, index });
      } catch (e) {
        console.error("Erro ao processar drop de musica", e);
      }
    },
  },
};
</script>

<style scoped>
.next-list {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 50px;
  padding-bottom: var(--space-4);
}

.queue-placeholder {
  height: 56px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
  transition: all 0.2s ease;
  pointer-events: none;
}

/* --- ANIMAÇÕES --- */

/* Item Atual (Slide e Fade vertical) */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.queue-ghost {
  opacity: 0.4;
  background: var(--dark-yellow-2);
  border: 1px dashed var(--yellow);
}

.queue-drag {
  opacity: 1;
  background: var(--deep-blue);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.next-list {
  flex-grow: 1;
  padding-bottom: 20px;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* --- ESTILOS GERAIS --- */

.queue-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
}

.queue-header h3 {
  margin-bottom: var(--space-4);
  text-align: right;
  font-size: 1.2rem;
}

.queue-content {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

.section-title {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--gray-500);
  margin-bottom: var(--space-2);
}

.mt-4 {
  margin-top: var(--space-4);
}

.empty-msg {
  font-size: 0.8rem;
  color: var(--gray-400);
  font-style: italic;
  padding: var(--space-2);
}

/* --- ITEM DA FILA --- */

.queue-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
  transition: background 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.queue-item.active {
  background: rgba(255, 255, 255, 0.3);

  & strong {
    color: var(--deep-blue) !important;
  }
}

.q-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.q-info {
  flex-grow: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--gray-100);
}

.q-info strong {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-info small {
  font-size: 0.7rem;
  color: var(--gray-400);
}

.visualizer-icon {
  color: var(--yellow);
  animation: pulse 1s infinite;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.queue-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--red);
}

:deep(.queue-ghost.track-row) {
  display: flex !important;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  width: 100%;
  border: 1px dashed var(--yellow) !important;
  background: var(--dark-yellow-2) !important;
  border-radius: var(--radius-sm);
  grid-template-columns: none !important;
  opacity: 0.6;
}

:deep(.queue-ghost.track-row > span),
:deep(.queue-ghost.track-row > .actions) {
  display: none !important;
}

:deep(.queue-ghost.track-row .track-title-col) {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-grow: 1;
  padding: 0;
  border: none;
}

:deep(.queue-ghost.track-row .mini-thumb) {
  width: 40px !important;
  height: 40px !important;
  border-radius: 4px;
}

:deep(.queue-ghost.track-row .meta) {
  display: flex;
  flex-direction: column;
}

:deep(.queue-ghost.track-row .meta strong) {
  font-size: 0.85rem;
  color: var(--gray-100);
}

:deep(.queue-ghost.track-row .meta small) {
  font-size: 0.75rem;
  color: var(--gray-400);
  display: block !important;
  color: var(--gray-100);

  &:last-child {
    display: none !important;
  }
}
</style>
