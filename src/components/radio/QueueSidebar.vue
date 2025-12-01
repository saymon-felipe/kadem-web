<template>
  <aside class="queue-sidebar glass" @dragover.prevent @drop="on_drop">
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

      <transition-group name="queue-list" tag="div" class="next-list">
        <div
          v-for="(track, index) in next_tracks"
          :key="track.youtube_id || index"
          class="queue-item"
        >
          <img :src="track.thumbnail" class="q-cover" />
          <div class="q-info">
            <strong>{{ track.title }}</strong>
            <small>{{ track.channel }}</small>
          </div>
          <button class="remove-btn" @click="remove_from_queue_by_id(track)">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
      </transition-group>

      <div v-if="next_tracks.length === 0" class="empty-msg">
        Fila vazia. Arraste músicas para cá.
      </div>
    </div>
  </aside>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";

export default {
  computed: {
    ...mapState(usePlayerStore, ["current_music", "queue"]),

    next_tracks() {
      if (!this.current_music || !this.queue.length) return [];

      const current_index = this.queue.findIndex(
        (t) => t.youtube_id === this.current_music.youtube_id
      );

      // Se não encontrar a música atual, retorna a fila inteira ou trata como erro
      if (current_index === -1) return this.queue;

      // Retorna apenas as músicas após a atual
      return this.queue.slice(current_index + 1);
    },
  },
  methods: {
    ...mapActions(usePlayerStore, ["add_to_queue", "remove_from_queue"]),

    on_drop(event) {
      const track_string = event.dataTransfer.getData("application/json");
      if (track_string) {
        const track = JSON.parse(track_string);
        this.add_to_queue(track);
      }
    },

    remove_from_queue_by_id(track) {
      const index = this.queue.findIndex((t) => t.youtube_id === track.youtube_id);
      if (index !== -1) {
        this.remove_from_queue(index);
      }
    },
  },
};
</script>

<style scoped>
/* --- ANIMAÇÕES --- */

/* Lista da Fila (Slide e Fade lateral) */
.queue-list-enter-active,
.queue-list-leave-active {
  transition: all 0.3s ease;
}

.queue-list-enter-from,
.queue-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.queue-list-leave-active {
  position: absolute;
  width: 100%;
}

.queue-list-move {
  transition: transform 0.3s ease;
}

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
  background: rgba(255, 255, 255, 0.1);
  border-left: 1px solid rgba(255, 255, 255, 0.05);
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
</style>
