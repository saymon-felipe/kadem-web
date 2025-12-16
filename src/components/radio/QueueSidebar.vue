<template>
  <aside
    class="queue-sidebar glass"
    :class="{ 'mini-mode': collapsed }"
    @dragover.prevent="on_drag_over"
    @dragleave="on_drag_leave"
    @drop="on_drop"
  >
    <div class="queue-header" :class="{ 'center-content': collapsed }">
      <h3 v-if="!collapsed">Fila de músicas</h3>
      <button
        class="btn-icon"
        @click="$emit('toggle-collapse')"
        title="Expandir"
        :style="'margin: ' + (collapsed ? 'auto' : 'initial')"
      >
        <font-awesome-icon :icon="collapsed ? 'chevron-left' : 'chevron-right'" />
      </button>
    </div>

    <div class="queue-content">
      <div class="section-title" v-if="!collapsed">Neste momento</div>

      <transition name="fade-slide" mode="out-in">
        <div
          class="queue-item active"
          v-if="current_music"
          :key="current_music.youtube_id"
          :class="{ 'mini-item': collapsed }"
          :title="collapsed ? current_music.title : ''"
        >
          <img :src="current_music.thumbnail" class="q-cover" />

          <div class="q-info" v-if="!collapsed">
            <strong>{{ current_music.title }}</strong>
            <small>{{ current_music.channel }}</small>
          </div>

          <div class="visualizer-icon" v-if="!collapsed">
            <font-awesome-icon icon="chart-simple" v-if="is_playing" />
          </div>
        </div>
        <div v-else-if="!collapsed" class="empty-msg" key="empty">Nada tocando</div>
      </transition>

      <div class="section-title mt-4" v-if="!collapsed">Próximas</div>

      <div v-if="next_tracks.length === 0 && !collapsed" class="empty-msg">
        Fila vazia.
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
        @start="drag = true"
        @end="drag = false"
      >
        <template #item="{ element: track, index }">
          <div
            class="queue-item"
            :class="{ 'mini-item': collapsed }"
            :title="collapsed ? track.title : ''"
          >
            <img :src="track.thumbnail" class="q-cover" />

            <div class="q-info" v-if="!collapsed">
              <strong>{{ track.title }}</strong>
              <small>{{ track.channel }}</small>
            </div>

            <div class="actions" v-if="!collapsed">
              <button class="remove-btn" @click.stop="$emit('remove-track', index)">
                <font-awesome-icon icon="xmark" />
              </button>
            </div>

            <div
              class="mini-play-overlay"
              v-if="collapsed"
              @click="$emit('play-track', index)"
            >
              <font-awesome-icon icon="play" />
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </aside>
</template>

<script>
import draggable from "vuedraggable";
import { mapState } from "pinia";
import { usePlayerStore } from "@/stores/player";

export default {
  name: "QueueSidebar",
  components: { draggable },
  props: {
    current_music: Object,
    next_tracks: Array,
    collapsed: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["remove-track", "play-track", "update:queue", "toggle-collapse"],
  data() {
    return {
      drag: false,
      is_drag_over: false,
    };
  },
  computed: {
    ...mapState(usePlayerStore, ["is_playing"]),
    queue_model: {
      get() {
        return this.next_tracks;
      },
      set(val) {
        this.$emit("update:queue", val);
      },
    },
  },
  methods: {
    check_move(evt) {
      const dragged_track = evt.draggedContext.element;
      const is_internal_item = this.next_tracks.some(
        (t) => t.youtube_id === dragged_track.youtube_id
      );

      if (is_internal_item) {
        return true;
      }

      return !is_internal_item;
    },

    on_drag_over(e) {
      this.is_drag_over = true;
    },

    on_drag_leave() {
      this.is_drag_over = false;
    },

    on_drop() {
      this.is_drag_over = false;
    },
  },
};
</script>

<style scoped>
.queue-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  transition: width 0.3s ease;
  overflow: hidden; /* Importante para esconder scrollbar horizontal na transição */
}

.mini-mode {
  align-items: center; /* Centraliza tudo no modo mini */
  padding: 0;
}

.queue-header {
  padding: var(--space-4);
  padding-bottom: var(--space-2);
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
}

.queue-header.center-content {
  justify-content: center;
  padding: var(--space-2);
}

.queue-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--deep-blue);
  margin: 0;
  flex: 1;
}

.queue-content {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 var(--space-4) var(--space-4) var(--space-4);
  width: 100%;
}

.mini-mode .queue-content {
  padding: 0 var(--space-2) var(--space-2) var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--gray-400);
  margin-bottom: var(--space-3);
  letter-spacing: 0.5px;
  font-weight: 600;
}

.mt-4 {
  margin-top: var(--space-4);
}

.empty-msg {
  font-size: 0.85rem;
  color: var(--gray-500);
  font-style: italic;
  text-align: center;
  padding: var(--space-4) 0;
}

/* Itens da Fila */
.queue-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
  cursor: grab;
  margin-bottom: 4px;
  position: relative;
}

.queue-item:active {
  cursor: grabbing;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Modo Mini: Itens */
.mini-item {
  justify-content: center;
  padding: 6px;
  width: 50px;
  height: 50px;
}

.q-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.q-info {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.q-info strong {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.q-info small {
  font-size: 0.7rem;
  color: var(--gray-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.visualizer-icon {
  color: var(--yellow);
  animation: pulse 1s infinite;
  font-size: 0.8rem;
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

.mini-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  border-radius: 4px;
  color: white;
  transition: opacity 0.2s;
  cursor: pointer;
}

.queue-item:hover .mini-play-overlay {
  opacity: 1;
}

/* Estado Ativo (Tocando agora) */
.queue-item.active {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  font-size: 1rem;
}

.btn-icon:hover {
  color: var(--text-gray);
}

/* Animações */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Draggable Ghost */

:deep(.queue-ghost) {
  opacity: 0.4;
  background: var(--dark-yellow-2, #rgba(255, 200, 0, 0.1));
  border: 1px dashed var(--yellow, #ffc107);
  border-radius: var(--radius-sm);

  & .q-info,
  & .q-cover,
  & .actions {
    opacity: 0.5;
  }
}

:deep(.queue-drag) {
  opacity: 1;
  background: var(--deep-blue, #0d1b2a);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: grabbing;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
}

:deep(.queue-ghost.track-row) {
  display: flex !important;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  width: 100%;
  border: 1px dashed var(--yellow) !important;
  background: var(--dark-yellow-2) !important;
  border-radius: 6px;
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

:deep(.queue-ghost.track-row .status-icons),
:deep(.queue-ghost.track-row .col-channel),
:deep(.queue-ghost.track-row .col-duration),
:deep(.queue-ghost.track-row .col-actions) {
  display: none;
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
}
</style>
