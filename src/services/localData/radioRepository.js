import { db } from '../../db';

export const radioRepository = {

  /* ========================================================================
     SECTION 1: PLAYLISTS MANAGEMENT
     ======================================================================== */

  async getLocalPlaylists() {
    if (!db.playlists) return [];
    return await db.playlists.orderBy('created_at').reverse().toArray();
  },

  async getLocalPlaylist(localId) {
    return await db.playlists.get(localId);
  },

  async getLocalPlaylistByServerId(serverId) {
    if (!serverId) return null;
    return await db.playlists.where('id').equals(serverId).first();
  },

  async addLocalPlaylist(playlistData) {
    return await db.playlists.add(playlistData);
  },

  async updateLocalPlaylist(localId, updates) {
    return await db.playlists.update(localId, updates);
  },

  async update_playlist_server_id(local_temp_id, server_real_id) {
    return await this.updateLocalPlaylist(local_temp_id, { id: server_real_id });
  },

  async deleteLocalPlaylist(localId) {
    return await db.transaction('rw', db.playlists, db.tracks, async () => {
      await db.tracks.where('playlist_local_id').equals(localId).delete();
      await db.playlists.delete(localId);
    });
  },

  /* ========================================================================
     SECTION 2: TRACKS MANAGEMENT
     ======================================================================== */

  async getLocalTracks(playlistLocalId) {
    if (!db.tracks) return [];
    return await db.tracks.where('playlist_local_id').equals(playlistLocalId).toArray();
  },

  async getLocalTrack(id) { return await db.tracks.get(id); },

  async getLocalTrackByServerId(serverId) {
    if (!serverId) return null;
    return await db.tracks.where('id').equals(serverId).first();
  },

  async addLocalTrack(data) {
    const lyricsStatus = await this._checkRealLyricsStatus(data.youtube_id);

    const payload = {
      ...data,
      has_lyrics: lyricsStatus.has_lyrics,
      lyrics_unavailable: lyricsStatus.lyrics_unavailable
    };
    return await db.tracks.add(payload);
  },

  async updateTrackLyricsStatus(localId, status) {
    return await db.tracks.update(localId, status);
  },

  async updateLocalTrack(id, updates) { return await db.tracks.update(id, updates); },

  async deleteLocalTrack(id) { return await db.tracks.delete(id); },

  /* ========================================================================
     SECTION 3: GLOBAL CACHE (APENAS AUDIO)
     ======================================================================== */

  async saveTrackAudio(trackLocalId, youtubeId, audioBlob) {
    if (!audioBlob) {
      throw new Error("Tentativa de salvar blob nulo ou indefinido.");
    }

    if (audioBlob.size < 50000) {
      throw new Error(`Blob suspeito detectado (Tamanho: ${audioBlob.size} bytes). Abortando persistência.`);
    }

    if (audioBlob.type && !audioBlob.type.startsWith('audio/')) {
      console.warn(`[RadioRepo] Aviso: Tipo MIME incomum (${audioBlob.type}), mas prosseguindo com validação de tamanho.`);
    }

    return await db.transaction('rw', db.tracks, db.global_audio_cache, async () => {
      await db.global_audio_cache.put({
        youtube_id: youtubeId,
        audio_blob: audioBlob,
        created_at: new Date().toISOString()
      });

      await db.tracks.update(trackLocalId, {
        is_offline: true,
        audio_blob: null
      });
    });
  },

  async getGlobalAudioBlob(youtubeId) {
    if (!youtubeId) return null;
    const record = await db.global_audio_cache.get(youtubeId);
    return record ? record.audio_blob : null;
  },

  async getTrackBlob(trackLocalId) {
    const track = await db.tracks.get(trackLocalId);

    if (!track) return null;

    if (track.audio_blob) {
      return track.audio_blob;
    }

    if (track.youtube_id) {
      return await this.getGlobalAudioBlob(track.youtube_id);
    }

    return null;
  },

  /**
   * Verifica se uma música já possui o áudio baixado (Local ou Global)
   */
  async hasAudioBlob(localId) {
    const track = await db.tracks.get(localId);
    if (!track) return false;

    if (track.is_offline && track.youtube_id) {
      return await this.hasGlobalAudio(track.youtube_id);
    }

    return !!track.audio_blob;
  },

  /**
   * Verifica existência no cache global de forma performática
   */
  async hasGlobalAudio(youtube_id) {
    if (!youtube_id) return false;
    const count = await db.global_audio_cache.where('youtube_id').equals(youtube_id).count();
    return count > 0;
  },

  async filterExistingAudioIds(youtubeIds) {
    if (!youtubeIds || youtubeIds.length === 0) return [];
    const uniqueIds = [...new Set(youtubeIds)];
    const results = await db.global_audio_cache.bulkGet(uniqueIds);
    return results
      .filter(item => item !== undefined && item !== null)
      .map(item => item.youtube_id);
  },

  async getAllDownloadedVideoIds() {
    try {
      const files = await db.global_audio_cache.toArray();
      return files.map(f => f.youtube_id);
    } catch (e) {
      return [];
    }
  },

  async _checkRealLyricsStatus(youtube_id) {
    if (!youtube_id) return { has_lyrics: false, lyrics_unavailable: false };

    const entry = await db.lyrics.get(youtube_id);

    if (entry) {
      if (entry.content && Array.isArray(entry.content) && entry.content.length > 0) {
        return { has_lyrics: true, lyrics_unavailable: false };
      }

      return { has_lyrics: false, lyrics_unavailable: true };
    }

    return { has_lyrics: false, lyrics_unavailable: false };
  },

  /* ========================================================================
     SECTION 4: SYNC HELPERS (SMART MERGE IMPLEMENTADO)
     ======================================================================== */
  async mergeApiPlaylists(apiData) {
    if (!db.playlists) return;

    const playlistsFromServer = Array.isArray(apiData) ? apiData : [];

    console.log(`[RadioRepo] Processando Sync de ${playlistsFromServer.length} playlists.`);

    return db.transaction('rw', db.playlists, db.tracks, db.lyrics, async () => {

      const serverIdsSet = new Set(playlistsFromServer.map(p => p.id));
      const allLocalPlaylists = await db.playlists.toArray();

      // 1. Limpeza de Playlists Obsoletas
      for (const localPl of allLocalPlaylists) {
        if (localPl.id && !serverIdsSet.has(localPl.id)) {
          console.log(`[RadioRepo] Excluindo playlist obsoleta localmente: ${localPl.name}`);
          await db.tracks.where('playlist_local_id').equals(localPl.local_id).delete();
          await db.playlists.delete(localPl.local_id);
        }
      }

      // 2. Insert/Update Playlists e Tracks
      for (const apiPl of playlistsFromServer) {
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

          // Remove tracks que sumiram do servidor
          for (const localTrack of localTracks) {
            if (localTrack.id && !serverTrackIds.has(localTrack.id)) {
              await db.tracks.delete(localTrack.local_id);
            }
          }

          // Insere/Atualiza tracks
          for (const apiTrack of apiPl.tracks) {
            const existingTrack = await db.tracks.where('id').equals(apiTrack.id).first();

            const lyricsStatus = await this._checkRealLyricsStatus(apiTrack.youtube_id);

            const trackPayload = {
              id: apiTrack.id,
              playlist_id: apiPl.id,
              playlist_local_id: playlistLocalId,
              youtube_id: apiTrack.youtube_id,
              title: apiTrack.title,
              channel: apiTrack.channel,
              thumbnail: apiTrack.thumbnail,
              duration_seconds: apiTrack.duration_seconds,
              created_at: apiTrack.created_at,
              has_lyrics: lyricsStatus.has_lyrics,
              lyrics_unavailable: lyricsStatus.lyrics_unavailable
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
  }
};
