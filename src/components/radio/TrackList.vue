<template>
    <div class="tracks-table">
        <div class="track-row header">
            <span>#</span>
            <span>Título</span>
            <span>{{ mode === 'search' ? 'Canal' : 'Data Adição' }}</span>
            <span class="text-right">Duração</span>
            <span></span>
        </div>

        <div class="tracks-scroll-area">
            <div v-for="(track, index) in tracks" :key="track.youtube_id" class="track-row"
                :class="{ 'active-track': is_track_playing(track) }" @dblclick="handle_dbl_click(track)">

                <span v-if="is_track_playing(track)" class="playing-icon">
                    <font-awesome-icon icon="volume-high" />
                </span>
                <span v-else>{{ index + 1 }}</span>

                <div class="track-title-col">
                    <img :src="track.thumbnail" class="mini-thumb">
                    <div class="meta">
                        <strong>{{ track.title }}</strong>
                        <small v-if="mode === 'playlist'">{{ track.channel }}</small>
                    </div>
                </div>

                <span>{{ mode === 'search' ? track.channel : format_date(track.created_at) }}</span>

                <span class="text-right duration-text">
                    {{ format_duration(track.duration_seconds) }}
                </span>

                <div class="actions">
                    <button v-if="mode === 'playlist'" @click.stop="$emit('delete-track', track)"
                        title="Remover da Playlist">
                        <font-awesome-icon icon="trash-can" />
                    </button>

                    <button v-else @click.stop="$emit('request-add', track, $event)" class="btn-add"
                        title="Adicionar à Playlist">
                        <font-awesome-icon icon="circle-plus" />
                    </button>
                </div>
            </div>

            <TrackOptionsMenu v-if="show_options_menu" :position="options_position" @close="show_options_menu = false"
                @delete="handle_delete" @add-queue="handle_add_queue" />

            <div v-if="tracks.length === 0 && mode === 'search'" class="empty-state">
                <p>Digite algo acima para pesquisar novas músicas.</p>
            </div>
        </div>
    </div>
</template>

<script>
import TrackOptionsMenu from './TrackOptionsMenu.vue';

export default {
    components: { TrackOptionsMenu },
    props: {
        tracks: { type: Array, required: true },
        current_music_id: { type: String, default: null },
        mode: { type: String, default: 'playlist' }
    },
    emits: ['play-track', 'delete-track', 'request-add'],
    methods: {
        is_track_playing(track) {
            return this.current_music_id === track.youtube_id;
        },
        format_date(iso) {
            if (!iso) return '-';
            return new Date(iso).toLocaleDateString('pt-BR');
        },
        format_duration(seconds) {
            return this.format_seconds_to_time(seconds);
        },
        handle_dbl_click(track) {
            this.$emit('play-track', track);
        },
        open_options(track, event) {
            this.selected_track_for_menu = track;
            this.options_position = { x: event.clientX, y: event.clientY };
            this.show_options_menu = true;
        },
        handle_delete() {
            this.$emit('delete-track', this.selected_track_for_menu);
            this.show_options_menu = false;
        },
        handle_add_queue() {
            this.$emit('add-to-queue', this.selected_track_for_menu);
            this.show_options_menu = false;
        },
        on_drag_start(event, track) {
            event.dataTransfer.setData('application/json', JSON.stringify(track));
            event.dataTransfer.effectAllowed = 'copy';
        }
    }
}
</script>

<style scoped>
.btn-options {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-500);
    padding: 5px;
    transition: color 0.2s;
}

.btn-options:hover {
    color: var(--deep-blue);
}

.tracks-table {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
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
    align-items: center;
    padding: var(--space-3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: var(--fontsize-sm);
    color: var(--gray-100);
    transition: background 0.1s;
    border-radius: var(--radius-sm);
    margin-bottom: 2px;
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
    background: rgba(255, 193, 7, 0.15);
}

.track-row.active-track strong,
.playing-icon {
    color: var(--yellow);
}

.track-title-col {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.mini-thumb {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    object-fit: cover;
}

.meta {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.meta strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.text-right {
    text-align: right;
}

.duration-text {
    font-variant-numeric: tabular-nums;
}

.btn-add {
    color: var(--green);
    font-size: 1.1rem;
    transition: transform 0.2s;
    background: none;
    border: none;
    cursor: pointer;
}

.btn-add:hover {
    transform: scale(1.2);
}

.empty-state {
    text-align: center;
    padding: var(--space-6);
    color: var(--gray-400);
    font-style: italic;
}
</style>