<template>
    <div class="radio-flow-wrapper">
        <div class="layout-grid" :style="layout_grid_style">

            <PlaylistSidebar :playlists="playlists" :selected_playlist_id="selected_playlist?.local_id"
                :current_playing_playlist_id="current_playlist?.local_id" :is_playing="is_playing"
                :default_cover="default_cover" :default_avatar="default_avatar" :collapsed="is_sidebar_collapsed"
                @select-playlist="select_playlist" @create-playlist="handle_create_playlist"
                @toggle-collapse="toggle_sidebar" />

            <div class="main-content glass">

                <template v-if="selected_playlist">
                    <div class="search-header">
                        <div class="search-input-wrapper">
                            <div class="form-group">
                                <input type="text" v-model="search_query" @keyup.enter="perform_search" placeholder=" "
                                    id="search-input" class="search-input" />
                                <label for="search-input">O que você quer ouvir?</label>
                            </div>
                        </div>
                        <button v-if="view_mode === 'search'" @click="close_search"
                            class="btn btn-secondary exit-search-btn">
                            Sair da Pesquisa
                        </button>
                    </div>

                    <div class="content-scrollable">
                        <template v-if="view_mode === 'playlist'">
                            <PlaylistHeader :playlist="selected_playlist" :track_count="tracks.length"
                                :total_duration_seconds="playlist_total_duration" :default_cover="default_cover"
                                :default_avatar="default_avatar" />

                            <div class="playlist-controls">
                                <div class="play-actions">
                                    <button class="btn-circle play" @click="handle_play_playlist_btn">
                                        <font-awesome-icon :icon="play_button_icon" />
                                    </button>
                                    <button class="btn-icon" :class="{ 'active': is_shuffle }" @click="toggle_shuffle">
                                        <font-awesome-icon icon="shuffle" />
                                    </button>
                                </div>
                            </div>

                            <TrackList mode="playlist" :tracks="tracks" :current_music_id="current_music?.youtube_id"
                                @play-track="play_specific_track" @delete-track="handle_delete_track"
                                @add-to-queue="add_to_queue" />
                        </template>

                        <template v-else-if="view_mode === 'search'">
                            <div class="search-results-header">
                                <h3>Resultados para "{{ search_query }}"</h3>
                            </div>
                            <loading-spinner v-if="is_searching" style="margin: 50px auto;" />
                            <TrackList v-else mode="search" :tracks="search_results"
                                :current_music_id="current_music?.youtube_id" @play-track="play_preview"
                                @request-add="open_playlist_selector" />
                        </template>
                    </div>
                </template>

                <div v-else class="welcome-state">
                    <div class="welcome-card">
                        <div class="brand-logo">
                            <font-awesome-icon icon="radio" />
                        </div>
                        <h1>Radio Flow</h1>
                        <p>Todas as suas músicas favoritas num só lugar!</p>
                    </div>
                    <p class="instruction" v-if="playlists.length === 0">
                        Crie uma nova playlist para começar.
                    </p>
                    <p class="instruction" v-else>
                        Selecione uma playlist ao lado.
                    </p>
                </div>

                <PlayerWrapper />
            </div>

            <QueueSidebar />
        </div>

        <div id="youtube-player-container" class="ghost-player"></div>

        <PlaylistSelector v-if="show_playlist_selector" :playlists="playlists" :position="selector_position"
            :default_avatar="default_avatar" @close="show_playlist_selector = false" @select="verify_and_add_track" />

        <ConfirmationModal :show="show_duplicate_modal" title="Música já existente"
            message="Esta música já está na playlist selecionada. Deseja adicionar mesmo assim?"
            @close="show_duplicate_modal = false" @confirm="confirm_add_duplicate" />
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { usePlayerStore } from '@/stores/player';
import { useRadioStore } from '@/stores/radio';
import { radioRepository } from '@/services/localData/radioRepository';
import { api } from '@/plugins/api';

import PlaylistSidebar from './PlaylistSidebar.vue';
import PlaylistHeader from './PlaylistHeader.vue';
import TrackList from './TrackList.vue';
import PlayerWrapper from './PlayerWrapper.vue';
import QueueSidebar from './QueueSidebar.vue';
import PlaylistSelector from './PlaylistSelector.vue';
import LoadingSpinner from '@/components/loadingSpinner.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue';

import defaultCover from '@/assets/images/fundo-auth.webp';
import defaultAvatar from '@/assets/images/kadem-default-playlist.jpg';

export default {
    components: {
        PlaylistSidebar, PlaylistHeader, TrackList, PlayerWrapper,
        QueueSidebar, LoadingSpinner, PlaylistSelector, ConfirmationModal
    },
    data() {
        return {
            // Estado Local da UI
            selected_playlist: null,
            tracks: [],
            default_cover: defaultCover,
            default_avatar: defaultAvatar,
            yt_player: null,

            is_sidebar_collapsed: false,
            view_mode: 'playlist', // 'playlist' | 'search'
            search_query: '',
            search_results: [],
            is_searching: false,

            // Adicionar Música
            show_playlist_selector: false,
            selector_position: { x: 0, y: 0 },
            track_being_added: null,
            target_playlist_for_add: null,
            show_duplicate_modal: false
        }
    },
    computed: {
        // --- PLAYER STORE (Áudio) ---
        ...mapState(usePlayerStore, [
            'current_music',
            'is_playing',
            'current_playlist',
            'is_shuffle'
        ]),

        // --- RADIO STORE (Dados) ---
        ...mapState(useRadioStore, {
            playlists: 'playlists'
        }),

        play_button_icon() {
            if (this.is_current_playlist_active && this.is_playing) return 'circle-pause';
            return 'circle-play';
        },

        is_current_playlist_active() {
            return this.selected_playlist &&
                this.current_playlist &&
                this.selected_playlist.local_id === this.current_playlist.local_id;
        },

        playlist_total_duration() {
            return this.tracks.reduce((total, track) => total + (track.duration_seconds || 0), 0);
        },

        layout_grid_style() {
            const left = this.is_sidebar_collapsed ? '80px' : '250px';
            const right = '300px';
            return {
                'grid-template-columns': `${left} minmax(0, 1fr) ${right}`
            };
        }
    },
    methods: {
        // --- PLAYER ACTIONS ---
        ...mapActions(usePlayerStore, [
            'play_track',
            'register_yt_instance',
            'toggle_play',
            'play_playlist_context',
            'toggle_shuffle',
            'add_to_queue'
        ]),

        // --- RADIO ACTIONS ---
        ...mapActions(useRadioStore, [
            'pullPlaylists',
            'createPlaylist',
            'deletePlaylist',
            'addTrackToPlaylist',
            'removeTrackFromPlaylist'
        ]),

        // --- INICIALIZAÇÃO ---
        async load_data() {
            await this.pullPlaylists();

            if (this.playlists.length > 0) {
                if (!this.selected_playlist) {
                    this.select_playlist(this.playlists[0]);
                } else {
                    const stillExists = this.playlists.find(p => p.local_id === this.selected_playlist.local_id);
                    if (!stillExists) {
                        this.select_playlist(this.playlists[0]);
                    } else {
                        this.select_playlist(stillExists);
                    }
                }
            } else {
                this.selected_playlist = null;
                this.tracks = [];
            }
        },

        async select_playlist(playlist) {
            this.close_search();
            this.selected_playlist = playlist;
            this.tracks = await radioRepository.getLocalTracks(playlist.local_id);
        },

        // --- CRIAÇÃO E EDIÇÃO (Chama a Store) ---

        async handle_create_playlist() {
            const newId = await this.createPlaylist("Nova Playlist", "");

            // Atualiza seleção
            await this.load_data();
            const created = this.playlists.find(p => p.local_id === newId);
            if (created) this.select_playlist(created);
        },

        async handle_delete_track(track) {
            if (confirm("Remover esta música da playlist?")) {
                await this.removeTrackFromPlaylist(track);
                this.tracks = this.tracks.filter(t => t.local_id !== track.local_id);
            }
        },

        async execute_add_track() {
            if (!this.target_playlist_for_add || !this.track_being_added) return;

            const newTrackId = await this.addTrackToPlaylist(this.target_playlist_for_add, this.track_being_added);

            if (this.selected_playlist && this.selected_playlist.local_id === this.target_playlist_for_add.local_id) {
                const savedTrack = await radioRepository.getLocalTrack(newTrackId);
                if (savedTrack) this.tracks.push(savedTrack);
            }

            this.target_playlist_for_add = null;
            this.track_being_added = null;
        },

        // --- BUSCA E UI AUXILIAR ---

        async perform_search() {
            if (!this.search_query.trim()) return;
            this.view_mode = 'search';
            this.is_searching = true;
            this.search_results = [];
            try {
                const response = await api.get('/radio/search', { params: { q: this.search_query } });
                this.search_results = response.data.items;
            } catch (error) {
                console.error("Erro busca:", error);
            } finally {
                this.is_searching = false;
            }
        },

        close_search() {
            this.view_mode = 'playlist';
            this.search_query = '';
            this.search_results = [];
        },

        // --- ADICIONAR MÚSICA (Fluxo de UI) ---
        open_playlist_selector(track, event) {
            this.track_being_added = track;
            this.selector_position = { x: event.clientX, y: event.clientY };
            this.show_playlist_selector = true;
        },

        async verify_and_add_track(playlist) {
            this.target_playlist_for_add = playlist;
            this.show_playlist_selector = false;

            // Verifica duplicidade
            const existing_tracks = await radioRepository.getLocalTracks(playlist.local_id);
            const exists = existing_tracks.some(t => t.youtube_id === this.track_being_added.youtube_id);

            if (exists) {
                this.show_duplicate_modal = true;
            } else {
                await this.execute_add_track();
            }
        },

        async confirm_add_duplicate() {
            this.show_duplicate_modal = false;
            await this.execute_add_track();
        },

        // --- PLAYBACK ---
        handle_play_playlist_btn() {
            if (this.tracks.length === 0) return;
            if (this.is_current_playlist_active) {
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

        // --- UTILS ---
        toggle_sidebar() {
            this.is_sidebar_collapsed = !this.is_sidebar_collapsed;
        },

        async delete_track(track) {
            await this.handle_delete_track(track);
        },

        init_youtube_api() {
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = () => { this.create_yt_player(); };
            } else if (window.YT && window.YT.Player) {
                this.create_yt_player();
            }
        },

        create_yt_player() {
            this.yt_player = new window.YT.Player('youtube-player-container', {
                height: '0', width: '0',
                events: { 'onReady': (event) => { this.register_yt_instance(event.target); } }
            });
        }
    },
    mounted() {
        this.load_data();
        this.init_youtube_api();
    }
}
</script>

<style scoped>
.radio-flow-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.layout-grid {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 300px;
    height: 100%;
    gap: var(--space-3);
    box-sizing: border-box;
    transition: grid-template-columns 0.3s ease;
}

@media (max-width: 1024px) {
    .layout-grid {
        grid-template-columns: 80px minmax(0, 1fr) 250px !important;
    }
}

.main-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
}

/* Header de Busca */
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

.form-group {
    position: relative;
    width: 100%;
}

.exit-search-btn {
    white-space: nowrap;
    padding: 8px 16px;
    font-size: 0.85rem;
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
    color: var(--white);
}

.btn-icon.active {
    color: var(--yellow);
}

.welcome-state {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--white);
    padding: var(--space-5);
    text-align: center;
}

.welcome-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    margin-bottom: var(--space-4);
    max-width: 400px;
}

.brand-logo {
    font-size: 3rem;
    color: var(--yellow);
    margin-bottom: var(--space-3);
}

.welcome-card h1 {
    margin-bottom: var(--space-2);
    font-size: 2rem;
}

.welcome-card p {
    opacity: 0.8;
    margin-bottom: var(--space-4);
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

.ghost-player {
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
}
</style>