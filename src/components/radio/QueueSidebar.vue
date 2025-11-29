<template>
    <aside class="queue-sidebar glass" @dragover.prevent @drop="on_drop">
        <div class="queue-header">
            <h3>Fila de músicas</h3>
        </div>

        <div class="queue-content">
            <div class="section-title">Neste momento</div>
            <div class="queue-item active" v-if="current_music">
                <img :src="current_music.thumbnail" class="q-cover">
                <div class="q-info">
                    <strong>{{ current_music.title }}</strong>
                    <small>{{ current_music.channel }}</small>
                </div>
                <div class="visualizer-icon">
                    <font-awesome-icon icon="chart-simple" />
                </div>
            </div>
            <div v-else class="empty-msg">Nada tocando</div>

            <div class="section-title mt-4">Próximas</div>
            <div class="next-list">
                <div v-for="(track, index) in next_tracks" :key="index" class="queue-item">
                    <img :src="track.thumbnail" class="q-cover">
                    <div class="q-info">
                        <strong>{{ track.title }}</strong>
                        <small>{{ track.channel }}</small>
                    </div>
                    <button class="remove-btn" @click="remove_from_queue_by_id(track)">
                        <font-awesome-icon icon="xmark" />
                    </button>
                </div>

                <div v-if="next_tracks.length === 0" class="empty-msg">
                    Fila vazia. Arraste músicas para cá.
                </div>
            </div>
        </div>
    </aside>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { usePlayerStore } from '@/stores/player';

export default {
    computed: {
        ...mapState(usePlayerStore, ['current_music', 'queue']),

        next_tracks() {
            if (!this.current_music || !this.queue.length) return [];

            const current_index = this.queue.findIndex(t => t.youtube_id === this.current_music.youtube_id);
            if (current_index === -1) return this.queue;

            return this.queue.slice(current_index + 1);
        }
    },
    methods: {
        ...mapActions(usePlayerStore, ['add_to_queue', 'remove_from_queue']),

        on_drop(event) {
            const track_string = event.dataTransfer.getData('application/json');
            if (track_string) {
                const track = JSON.parse(track_string);
                this.add_to_queue(track);
            }
        },

        remove_from_queue_by_id(track) {
            const index = this.queue.findIndex(t => t.youtube_id === track.youtube_id);
            if (index !== -1) {
                this.remove_from_queue(index);
            }
        }
    }
}
</script>

<style scoped>
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

.queue-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    transition: background 0.2s;
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

.empty-msg {
    font-size: 0.8rem;
    color: var(--gray-400);
    font-style: italic;
    padding: var(--space-2);
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
</style>