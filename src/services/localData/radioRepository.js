import { db } from '../../db';

export const radioRepository = {
    // --- PLAYLISTS ---

    async getLocalPlaylists() {
        if (!db.playlists) return [];
        return await db.playlists.orderBy('created_at').reverse().toArray();
    },

    async getLocalPlaylist(localId) {
        return await db.playlists.get(localId);
    },

    async addLocalPlaylist(playlistData) {
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

    async saveLocalTrackAudio(localId, audio_blob) {
        return await db.tracks.update(localId, { audio_blob });
    },

    // --- SYNC / MERGE LOGIC (CORRIGIDO) ---

    async mergeApiPlaylists(apiData) {
        if (!db.playlists) return;

        const playlistsFromServer = Array.isArray(apiData) ? apiData : [];

        console.log(`[RadioRepo] Processando Sync de ${playlistsFromServer.length} playlists.`);

        return db.transaction('rw', db.playlists, db.tracks, async () => {

            // 1. LIMPEZA DE PLAYLISTS EXCLUÍDAS NO SERVIDOR (NOVO BLOCO)
            // ------------------------------------------------------------
            const serverIdsSet = new Set(playlistsFromServer.map(p => p.id));
            const allLocalPlaylists = await db.playlists.toArray();

            for (const localPl of allLocalPlaylists) {
                if (localPl.id && !serverIdsSet.has(localPl.id)) {
                    console.log(`[RadioRepo] Excluindo playlist obsoleta localmente: ${localPl.name}`);

                    await db.tracks.where('playlist_local_id').equals(localPl.local_id).delete();
                    await db.playlists.delete(localPl.local_id);
                }
            }
            // ------------------------------------------------------------

            // 2. ATUALIZAÇÃO / INSERÇÃO
            for (const apiPl of playlistsFromServer) {
                if (!apiPl.id) continue;

                let localPl = await db.playlists.where('id').equals(apiPl.id).first();

                const plPayload = {
                    name: apiPl.name,
                    cover: apiPl.cover,
                    id: apiPl.id, // ID Servidor
                    user_id: apiPl.user_id,
                    created_at: apiPl.created_at,
                    updated_at: apiPl.updated_at
                };

                let playlistLocalId;

                if (localPl) {
                    // Update preservando ID local
                    plPayload.local_id = localPl.local_id;
                    await db.playlists.put(plPayload);
                    playlistLocalId = localPl.local_id;
                } else {
                    // Insert
                    playlistLocalId = await db.playlists.add(plPayload);
                }

                // 3. Sincroniza Tracks (Adição, Atualização e Remoção)
                if (apiPl.tracks && Array.isArray(apiPl.tracks)) {

                    const serverTrackIds = new Set(apiPl.tracks.map(t => t.id));
                    const localTracks = await db.tracks.where('playlist_local_id').equals(playlistLocalId).toArray();

                    // Remove tracks que sumiram do servidor
                    for (const localTrack of localTracks) {
                        if (localTrack.id && !serverTrackIds.has(localTrack.id)) {
                            await db.tracks.delete(localTrack.local_id);
                        }
                    }

                    // Insere/Atualiza tracks
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
    },
    async getLocalPlaylistByServerId(serverId) {
        if (!serverId) return null;
        return await db.playlists.where('id').equals(serverId).first();
    },
    async getLocalTrackByServerId(serverId) {
        if (!serverId) return null;
        return await db.tracks.where('id').equals(serverId).first();
    },
};