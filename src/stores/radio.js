import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import { syncService } from '../services/syncService';
import { radioRepository, syncQueueRepository } from '../services/localData';

export const useRadioStore = defineStore('radio', {
    state: () => ({
        playlists: [],
        lastSyncTimestamp: localStorage.getItem('kadem_radio_last_sync') || null,
        loading: false
    }),

    actions: {
        // --- LOCAL DATA ---
        async _loadFromDB() {
            try {
                this.playlists = await radioRepository.getLocalPlaylists();
            } catch (error) {
                console.error("[RadioStore] Falha ao carregar do Dexie:", error);
            }
        },

        // --- SYNC (PULL) ---
        async pullPlaylists() {
            await this._loadFromDB();

            try {
                const params = {};
                if (this.lastSyncTimestamp) {
                    params.since = this.lastSyncTimestamp;
                }

                const response = await api.get('/radio/state', { params });

                const { items, server_timestamp } = response.data;

                if (Array.isArray(items) && items.length > 0) {
                    console.log(`[RadioStore] Recebidos ${items.length} itens do servidor.`);
                    await radioRepository.mergeApiPlaylists(items);
                    await this._loadFromDB();
                }

                if (server_timestamp) {
                    this.lastSyncTimestamp = server_timestamp;
                    localStorage.setItem('kadem_radio_last_sync', server_timestamp);
                }

            } catch (error) {
                console.warn("[RadioStore] Pull falhou ou offline:", error.message);
            }
        },

        // --- AÇÕES CRUD + PUSH SYNC ---

        async createPlaylist(name, cover) {
            const timestamp = new Date().toISOString();

            const playlistData = {
                name,
                cover,
                created_at: timestamp,
                track_count: 0
            };

            try {
                const localId = await radioRepository.addLocalPlaylist(playlistData);

                this.playlists.unshift({ ...playlistData, local_id: localId });

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_PLAYLIST',
                    payload: {
                        localId,
                        name,
                        cover,
                        created_at: timestamp
                    },
                    timestamp: timestamp
                });

                syncService.processSyncQueue();

                return localId;

            } catch (error) {
                console.error("[RadioStore] Erro ao criar playlist:", error);
            }
        },

        async renamePlaylist(playlist, newName) {
            if (!playlist || !newName || playlist.name === newName) return;

            const timestamp = new Date().toISOString();

            const plIndex = this.playlists.findIndex(p => p.local_id === playlist.local_id);
            if (plIndex !== -1) {
                this.playlists[plIndex].name = newName;
            }

            try {
                await radioRepository.updateLocalPlaylist(playlist.local_id, { name: newName });

                await syncQueueRepository.addSyncQueueTask({
                    type: 'SYNC_PLAYLIST_CHANGE',
                    payload: {
                        playlist_id: playlist.id,
                        localId: playlist.local_id,
                        field: 'name',
                        value: newName,
                        timestamp: timestamp
                    },
                    timestamp: timestamp
                });

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[RadioStore] Erro ao renomear playlist:", error);
            }
        },

        async deletePlaylist(localId, serverId) {
            try {
                await radioRepository.deleteLocalPlaylist(localId);
                this.playlists = this.playlists.filter(p => p.local_id !== localId);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_PLAYLIST',
                    payload: { id: serverId, localId: localId },
                    timestamp: new Date().toISOString()
                });

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[RadioStore] Erro ao excluir playlist:", error);
            }
        },

        async addTrackToPlaylist(playlist, trackObj) {
            const timestamp = new Date().toISOString();

            const trackData = {
                title: trackObj.title,
                youtube_id: trackObj.youtube_id,
                channel: trackObj.channel,
                thumbnail: trackObj.thumbnail,
                duration_seconds: trackObj.duration_seconds || 0,
                playlist_local_id: playlist.local_id,
                created_at: timestamp
            };

            try {
                const trackId = await radioRepository.addLocalTrack(trackData);

                const pl = this.playlists.find(p => p.local_id === playlist.local_id);
                if (pl) pl.track_count = (pl.track_count || 0) + 1;

                await syncQueueRepository.addSyncQueueTask({
                    type: 'ADD_TRACK',
                    payload: {
                        ...trackData,
                        localId: trackId,
                        playlist_local_id: playlist.local_id,
                        playlist_id: playlist.id,
                        playlist_id_is_server: !!playlist.id
                    },
                    timestamp: timestamp
                });

                syncService.processSyncQueue();
                return trackId;

            } catch (error) {
                console.error("[RadioStore] Erro ao adicionar música:", error);
            }
        },

        async removeTrackFromPlaylist(track) {
            try {
                await radioRepository.deleteLocalTrack(track.local_id);

                const pl = this.playlists.find(p => p.local_id === track.playlist_local_id);
                if (pl) pl.track_count = Math.max(0, (pl.track_count || 1) - 1);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_TRACK',
                    payload: { id: track.id, localId: track.local_id },
                    timestamp: new Date().toISOString()
                });

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[RadioStore] Erro ao remover música:", error);
            }
        },

        async clearState() {
            this.playlists = [];
            this.lastSyncTimestamp = null;
            localStorage.removeItem('kadem_radio_last_sync');
        }
    }
});