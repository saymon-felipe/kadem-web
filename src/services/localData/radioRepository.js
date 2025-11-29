import { db } from '../../db';

export const radioRepository = {
    // --- PLAYLISTS ---

    async getLocalPlaylists() {
        if (!db.playlists) return [];
        // Ordena por data de criação (mais recentes primeiro ou conforme preferência)
        return await db.playlists.orderBy('created_at').reverse().toArray();
    },

    async getLocalPlaylist(localId) {
        return await db.playlists.get(localId);
    },

    async addLocalPlaylist(playlistData) {
        // Retorna o ID gerado (autoIncrement)
        return await db.playlists.add(playlistData);
    },

    async updateLocalPlaylist(localId, updates) {
        return await db.playlists.update(localId, updates);
    },

    async deleteLocalPlaylist(localId) {
        // Exclusão em cascata: remove as faixas da playlist também
        return await db.transaction('rw', db.playlists, db.tracks, async () => {
            await db.tracks.where('playlist_local_id').equals(localId).delete();
            await db.playlists.delete(localId);
        });
    },

    // --- TRACKS ---

    async getLocalTracks(playlistLocalId) {
        return await db.tracks.where('playlist_local_id').equals(playlistLocalId).toArray();
    },

    async getLocalTrack(localId) {
        return await db.tracks.get(localId);
    },

    async addLocalTrack(trackData) {
        return await db.tracks.add(trackData);
    },

    async updateLocalTrack(localId, updates) {
        return await db.tracks.update(localId, updates);
    },

    async deleteLocalTrack(localId) {
        return await db.tracks.delete(localId);
    },

    // Método para salvar o Blob de áudio (Offline)
    async saveLocalTrackAudio(localId, audio_blob) {
        return await db.tracks.update(localId, { audio_blob });
    },

    // --- SYNC / MERGE LOGIC ---

    async mergeApiPlaylists(apiData) {
        if (!db.playlists) return;

        const playlists = Array.isArray(apiData) ? apiData : [];
        if (playlists.length === 0) return;

        console.log(`[RadioRepo] Processando Sync de ${playlists.length} playlists.`);

        return db.transaction('rw', db.playlists, db.tracks, async () => {
            for (const apiPl of playlists) {
                if (!apiPl.id) continue;

                let localPl = await db.playlists.where('id').equals(apiPl.id).first();

                const plPayload = {
                    name: apiPl.name,
                    cover: apiPl.cover,
                    id: apiPl.id,
                    user_id: apiPl.user_id,
                    created_at: apiPl.created_at,
                    updated_at: apiPl.updated_at
                };

                let playlistLocalId;
                if (localPl) {
                    plPayload.local_id = localPl.local_id;
                    await db.playlists.put(plPayload);
                    playlistLocalId = localPl.local_id;
                } else {
                    playlistLocalId = await db.playlists.add(plPayload);
                }

                if (apiPl.tracks && Array.isArray(apiPl.tracks)) {

                    const serverTrackIds = new Set(apiPl.tracks.map(t => t.id));

                    const localTracks = await db.tracks.where('playlist_local_id').equals(playlistLocalId).toArray();

                    for (const localTrack of localTracks) {
                        if (localTrack.id && !serverTrackIds.has(localTrack.id)) {
                            console.log(`[RadioRepo] Removendo track obsoleta: ${localTrack.title} (LocalID: ${localTrack.local_id})`);
                            await db.tracks.delete(localTrack.local_id);
                        }
                    }

                    for (const apiTrack of apiPl.tracks) {
                        const existingTrack = await db.tracks.where('id').equals(apiTrack.id).first();

                        const trackPayload = {
                            id: apiTrack.id,
                            playlist_id: apiPl.id,
                            playlist_local_id: playlistLocalId,
                            youtube_id: apiTrack.youtube_id,
                            title: apiTrack.title,
                            channel: apiTrack.channel,
                            thumbnail: apiTrack.thumbnail,
                            duration_seconds: apiTrack.duration_seconds,
                            created_at: apiTrack.created_at
                        };

                        if (existingTrack) {
                            trackPayload.local_id = existingTrack.local_id;
                            if (existingTrack.audio_blob) {
                                trackPayload.audio_blob = existingTrack.audio_blob;
                            }
                            await db.tracks.put(trackPayload);
                        } else {
                            await db.tracks.add(trackPayload);
                        }
                    }
                }
            }
        });
    },

    async clearLocalData() {
        await db.transaction('rw', db.playlists, db.tracks, async () => {
            await db.tracks.clear();
            await db.playlists.clear();
        });
    },

    async update_playlist_server_id(local_temp_id, server_real_id) {
        return await this.updateLocalPlaylist(local_temp_id, { id: server_real_id });
    },

    async update_tracks_playlist_id(old_local_playlist_id, new_server_playlist_id) {
        return await db.tracks
            .where('playlist_local_id')
            .equals(old_local_playlist_id)
            .modify({ playlist_id: new_server_playlist_id });
    }
};