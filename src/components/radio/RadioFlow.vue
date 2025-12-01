<template>
    <div class="radio-flow-wrapper">
        <div class="layout-grid" :style="layout_grid_style">

            <PlaylistSidebar
                :playlists="playlists"
                :selected_playlist_id="selected_playlist?.local_id"
                :current_playing_playlist_id="current_playlist?.local_id"
                :is_playing="is_playing"
                :default_cover="default_cover"
                :default_avatar="default_avatar"
                :collapsed="is_sidebar_collapsed"
                @select-playlist="select_playlist"
                @create-playlist="handle_create_playlist"
                @toggle-collapse="toggle_sidebar"
                @rename-playlist="handle_rename_playlist"
                @delete-playlist="handle_delete_playlist"
            />

            <div class="main-content glass">

                <template v-if="selected_playlist">
                    <div class="search-header">
                        <div class="search-input-wrapper">
                            <div class="form-group">
                                <input
                                    type="text"
                                    v-model="search_query"
                                    @keyup.enter="perform_search"
                                    placeholder=" "
                                    id="search-input"
                                    class="search-input"
                                />
                                <label for="search-input">O que você quer ouvir?</label>
                            </div>
                        </div>
                        <button
                            v-if="view_mode === 'search'"
                            @click="close_search"
                            class="btn btn-secondary exit-search-btn"
                        >
                            Sair da Pesquisa
                        </button>
                    </div>

                    <div class="content-scrollable">
                        <template v-if="view_mode === 'playlist'">
                            <PlaylistHeader
                                :playlist="selected_playlist"
                                :track_count="tracks.length"
                                :total_duration_seconds="playlist_total_duration"
                                :default_cover="default_cover"
                                :default_avatar="default_avatar"
                                @rename-playlist="handle_rename_playlist"
                                @delete-playlist="handle_delete_playlist"
                            />

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

                            <TrackList
                                mode="playlist"
                                :tracks="tracks"
                                :current_music_id="current_music?.youtube_id"
                                @play-track="play_specific_track"
                                @delete-track="handle_delete_track"
                                @add-to-queue="add_to_queue"
                            />
                        </template>

                        <template v-else-if="view_mode === 'search'">
                            <div class="search-results-header">
                                <h3>Resultados para "{{ search_query }}"</h3>
                            </div>
                            <loading-spinner v-if="is_searching" style="margin: 50px auto;" />
                            <TrackList
                                v-else
                                mode="search"
                                :tracks="search_results"
                                :current_music_id="current_music?.youtube_id"
                                @play-track="play_preview"
                                @request-add="open_playlist_selector"
                            />
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

        <PlaylistSelector
            v-if="show_playlist_selector"
            :playlists="playlists"
            :position="selector_position"
            :default_avatar="default_avatar"
            @close="show_playlist_selector = false"
            @select="verify_and_add_track"
        />

        <ConfirmationModal
            v-model="confirmationState.show"
            :message="confirmationState.message"
            :confirmText="confirmationState.confirmText"
            @cancelled="confirmationState.show = false"
            @confirmed="execute_confirmation_action"
        />
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
        PlaylistSidebar,
        PlaylistHeader,
        TrackList,
        PlayerWrapper,
        QueueSidebar,
        LoadingSpinner,
        PlaylistSelector,
        ConfirmationModal
    },
    data() {
        return {
            selected_playlist: null,
            tracks: [],
            default_cover: defaultCover,
            default_avatar: defaultAvatar,
            yt_player: null,

            is_sidebar_collapsed: false,
            view_mode: 'playlist',
            search_query: '',
            search_results: [],
            is_searching: false,

            // Adicionar Música
            show_playlist_selector: false,
            selector_position: { x: 0, y: 0 },
            track_being_added: null,
            target_playlist_for_add: null,

            // Estado Genérico de Confirmação (Multimodal)
            confirmationState: {
                show: false,
                message: '',
                confirmText: 'Confirmar',
                action: null // Função a ser executada ao confirmar
            }
        }
    },
    computed: {
        ...mapState(usePlayerStore, ['current_music', 'is_playing', 'current_playlist', 'is_shuffle']),
        ...mapState(useRadioStore, { playlists: 'playlists' }),

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
            return { 'grid-template-columns': `${left} minmax(0, 1fr) ${right}` };
        }
    },
    methods: {
        ...mapActions(usePlayerStore, [
            'play_track',
            'register_yt_instance',
            'toggle_play',
            'play_playlist_context',
            'toggle_shuffle',
            'add_to_queue',
            'restorePlayerConnection'
        ]),
        ...mapActions(useRadioStore, [
            'pullPlaylists',
            'createPlaylist',
            'deletePlaylist',
            'renamePlaylist',
            'addTrackToPlaylist',
            'removeTrackFromPlaylist'
        ]),

        // --- HELPER DE CONFIRMAÇÃO ---
        openConfirmation({ title, message, confirmText, action }) {
            this.confirmationState = {
                show: true,
                title: title || 'Atenção',
                message: message,
                confirmText: confirmText || 'Confirmar',
                action: action
            };
        },

        async execute_confirmation_action() {
            if (this.confirmationState.action) {
                await this.confirmationState.action();
            }
            this.confirmationState.show = false;
        },
        // -----------------------------

        async handle_rename_playlist(playlist, newName) {
            if (!newName || newName.trim() === '') return;
            await this.renamePlaylist(playlist, newName.trim());
        },

        async handle_delete_playlist(playlist) {
            // A confirmação da playlist já é feita no PlaylistHeader, então aqui executamos direto
            await this.deletePlaylist(playlist.local_id, playlist.id);

            if (this.selected_playlist && this.selected_playlist.local_id === playlist.local_id) {
                this.selected_playlist = null;
                this.tracks = [];
            }

            if (this.playlists.length > 0 && !this.selected_playlist) {
                this.select_playlist(this.playlists[0]);
            }
        },

        async load_data() {
            await this.pullPlaylists();
            if (this.playlists.length > 0) {
                if (!this.selected_playlist) {
                    this.select_playlist(this.playlists[0]);
                } else {
                    const stillExists = this.playlists.find(p => p.local_id === this.selected_playlist.local_id);
                    if (!stillExists) this.select_playlist(this.playlists[0]);
                    else this.select_playlist(stillExists);
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

        async handle_create_playlist() {
            const newId = await this.createPlaylist("Nova Playlist", "");
            await this.load_data();
            const created = this.playlists.find(p => p.local_id === newId);
            if (created) this.select_playlist(created);
        },

        // --- ALTERADO: DELETAR TRACK COM MODAL ---
        handle_delete_track(track) {
            this.openConfirmation({
                message: `Tem certeza que deseja remover <br> ${track.title} da playlist?`,
                confirmText: 'Remover',
                action: async () => {
                    await this.removeTrackFromPlaylist(track);
                    this.tracks = this.tracks.filter(t => t.local_id !== track.local_id);
                }
            });
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

        open_playlist_selector(track, event) {
            this.track_being_added = track;
            this.selector_position = { x: event.clientX, y: event.clientY };
            this.show_playlist_selector = true;
        },

        // --- ALTERADO: DUPLICIDADE COM MODAL ---
        async verify_and_add_track(playlist) {
            this.target_playlist_for_add = playlist;
            this.show_playlist_selector = false;

            const existing_tracks = await radioRepository.getLocalTracks(playlist.local_id);
            const exists = existing_tracks.some(t => t.youtube_id === this.track_being_added.youtube_id);

            if (exists) {
                this.openConfirmation({
                    message: 'Esta música já está na playlist selecionada.',
                    confirmText: 'Ok'
                });
            } else {
                await this.execute_add_track();
            }
        },

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

        toggle_sidebar() {
            this.is_sidebar_collapsed = !this.is_sidebar_collapsed;
        },

        // Proxy para o método handle_delete_track
        async delete_track(track) {
            this.handle_delete_track(track);
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
            if (this.yt_player) {
                try { this.yt_player.destroy(); } catch (e) { }
            }

            this.yt_player = new window.YT.Player('youtube-player-container', {
                height: '0',
                width: '0',
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'disablekb': 1
                },
                events: {
                    'onReady': (event) => {
                        console.log("[RadioFlow] YouTube Player Pronto.");
                        this.register_yt_instance(event.target);
                        if (typeof this.restorePlayerConnection === 'function') {
                            this.restorePlayerConnection();
                        }
                    },
                    'onStateChange': (event) => {
                        if (event.data === 0) {
                            this.next();
                        }
                    }
                }
            });
        }
    },
    mounted() {
        this.load_data();
        this.init_youtube_api();
        if (this.player_mode === 'native' || !this.current_music) {
            if (typeof this.restorePlayerConnection === 'function') {
                this.restorePlayerConnection();
            }
        }
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
    transition: grid-template-columns 0.3s cubic-bezier(0.25, 1, 0.5, 1);
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
