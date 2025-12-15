import { defineStore } from "pinia";
import { api } from "../plugins/api";
import { syncService } from "../services/syncService";
import { radioRepository, syncQueueRepository } from "../services/localData";
import { usePlayerStore } from './player';
import { apiServices } from "../plugins/apiServices";

export const useRadioStore = defineStore("radio", {
  state: () => ({
    playlists: [],
    lastSyncTimestamp: localStorage.getItem("kadem_radio_last_sync") || null,
    loading: false,

    // Controles de Estado Volátil (Memória)
    active_downloads: {},
    offline_synced_ids: {},     // IDs locais sincronizados recentemente
    downloaded_youtube_ids: {}  // IDs do YouTube confirmados no cache
  }),

  getters: {
    isTrackOffline: (state) => (track) => {
      if (!track) return false;

      // Prioridade 1: O cache em memória da sessão atual (Verdade Absoluta)
      if (track.youtube_id && state.downloaded_youtube_ids[track.youtube_id]) {
        return true;
      }

      // Prioridade 2: Blob em memória (acabou de baixar)
      if (track.audio_blob) {
        return true;
      }

      // Prioridade 3: Flag do banco de dados (Confiança secundária)
      return !!track.is_offline;
    }
  },

  actions: {

    /* ==========================================================================
       SECTION 1: STATE MANAGEMENT & HELPERS
       ========================================================================== */

    async _loadFromDB() {
      try {
        this.playlists = await radioRepository.getLocalPlaylists();
      } catch (error) {
        console.error("[RadioStore] Falha ao carregar do Dexie:", error);
      }
    },

    async clearState() {
      this.playlists = [];
      this.lastSyncTimestamp = null;
      this.offline_synced_ids = {};
      this.downloaded_youtube_ids = {};
      localStorage.removeItem("kadem_radio_last_sync");
    },

    async update_playlist_cover(playlist_id, cover_base64) {
      const playlist_index = this.playlists.findIndex(p => p.id === playlist_id || p.local_id === playlist_id);
      console.log(playlist_index)
      if (playlist_index === -1) return;

      const playlist = this.playlists[playlist_index];
      const timestamp = new Date().toISOString();
      const previous_cover = playlist.cover;

      this.playlists[playlist_index] = {
        ...playlist,
        cover: cover_base64,
        updated_at: timestamp
      };

      try {
        if (playlist.local_id) {
          await radioRepository.updateLocalPlaylist(playlist.local_id, { cover: cover_base64 });
        }

        await syncQueueRepository.addSyncQueueTask({
          type: "SYNC_PLAYLIST_CHANGE",
          payload: {
            playlist_id: playlist.id,
            localId: playlist.local_id,
            field: "cover",
            value: cover_base64,
            timestamp: timestamp,
          },
          timestamp: timestamp,
        });

        syncService.processSyncQueue();

      } catch (error) {
        console.error("[RadioStore] Erro ao atualizar capa:", error);
        this.playlists[playlist_index].cover = previous_cover;
      }
    },

    _updateLocalState(trackLocalId, changes) {
      // Atualiza nas playlists carregadas
      this.playlists.forEach(p => {
        if (p.tracks) {
          const t = p.tracks.find(x => x.local_id === trackLocalId);
          if (t) Object.assign(t, changes);
        }
      });

      // Atualiza no Player (Queue e Música Atual) se necessário
      const playerStore = usePlayerStore();
      const qTrack = playerStore.queue.find(t => t.local_id === trackLocalId);
      if (qTrack) Object.assign(qTrack, changes);

      if (playerStore.current_music?.local_id === trackLocalId) {
        Object.assign(playerStore.current_music, changes);
      }
    },


    /* ==========================================================================
       SECTION 2: SYNCHRONIZATION (PULL)
       ========================================================================== */

    async pullPlaylists() {
      await this._loadFromDB();

      try {
        const params = {};
        if (this.lastSyncTimestamp) {
          params.since = this.lastSyncTimestamp;
        }

        const response = await api.get("/radio/state", { params });
        const { items, server_timestamp } = response.data;

        if (Array.isArray(items) && items.length > 0) {
          console.log(`[RadioStore] Recebidos ${items.length} itens do servidor.`);
          await radioRepository.mergeApiPlaylists(items);
          await this._loadFromDB();
        }

        if (server_timestamp) {
          this.lastSyncTimestamp = server_timestamp;
          localStorage.setItem("kadem_radio_last_sync", server_timestamp);
        }
      } catch (error) {
        console.warn("[RadioStore] Pull falhou ou offline:", error.message);
      }
    },


    /* ==========================================================================
       SECTION 3: OFFLINE ENGINE & DOWNLOADS
       ========================================================================== */

    /**
     * Verifica e corrige inconsistências entre a flag 'is_offline' e o cache real.
     */
    async checkOfflineAvailability(tracks) {
      if (!tracks || tracks.length === 0) return;

      const allYoutubeIds = [...new Set(tracks.filter(t => t.youtube_id).map(t => t.youtube_id))];
      if (allYoutubeIds.length === 0) return;

      try {
        const foundIds = await radioRepository.filterExistingAudioIds(allYoutubeIds);
        const foundSet = new Set(foundIds);
        const corrections = [];

        tracks.forEach(track => {
          const existsReal = foundSet.has(track.youtube_id);
          const flagLocal = track.is_offline;

          if (existsReal) {
            this.downloaded_youtube_ids[track.youtube_id] = true;
            if (!flagLocal) track.is_offline = true;
          } else {
            // Correção de Integridade: Flag True mas Arquivo Inexistente
            if (flagLocal) {
              console.warn(`[RadioStore] Inconsistência: ${track.title} sem binário.`);
              track.is_offline = false;
              delete this.downloaded_youtube_ids[track.youtube_id];

              corrections.push(radioRepository.updateLocalTrack(track.local_id, {
                is_offline: false,
                audio_blob: null
              }));
            }
          }
        });

        if (corrections.length > 0) {
          Promise.all(corrections).catch(err =>
            console.error("[RadioStore] Falha ao persistir correções:", err)
          );
        }
      } catch (error) {
        console.error("[RadioStore] Erro verificação disponibilidade:", error);
      }
    },

    async downloadPlaylist(playlist) {
      const tracks = await radioRepository.getLocalTracks(playlist.local_id);
      if (!tracks || tracks.length === 0) return;

      console.log(`[RadioStore] Download Playlist: ${playlist.name}`);
      const tracksToDownload = tracks.filter(t => !this.isTrackOffline(t));

      for (const track of tracksToDownload) {
        await this.downloadTrack(track);
      }
    },

    async downloadTrack(track) {
      if (this.active_downloads[track.local_id]) return;

      if (this.downloaded_youtube_ids[track.youtube_id]) {
        console.log(`[RadioStore] Track já em cache: ${track.title}`);
        track.is_offline = true;
        return;
      }

      this.active_downloads[track.local_id] = true;

      try {
        const isCached = await radioRepository.hasGlobalAudio(track.youtube_id);
        let blobData = null;

        if (isCached) {
          console.log(`[RadioStore] Hit Cache Global: ${track.title}`);
        } else {
          console.log(`[RadioStore] Baixando API: ${track.title}`);

          // Cache Busting para evitar arquivos corrompidos
          const endpoint = `${apiServices.MEDIA_ENGINE}/stream/${track.youtube_id}?nocache=${Date.now()}`;

          const response = await api.get(endpoint, {
            responseType: 'blob',
            timeout: 120000,
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });

          blobData = response.data;
        }

        await radioRepository.saveTrackAudio(track.local_id, track.youtube_id, blobData);

        this.offline_synced_ids[track.local_id] = true;
        this.downloaded_youtube_ids[track.youtube_id] = true;
        track.is_offline = true;

        this._updateLocalState(track.local_id, { is_offline: true });

      } catch (error) {
        console.error(`[RadioStore] Erro download:`, error);
        track.is_offline = false;
      } finally {
        delete this.active_downloads[track.local_id];
      }
    },


    /* ==========================================================================
       SECTION 4: CRUD OPERATIONS & PUSH SYNC
       ========================================================================== */

    async createPlaylist(name, cover) {
      const timestamp = new Date().toISOString();
      const playlistData = {
        name,
        cover,
        created_at: timestamp,
        track_count: 0,
      };

      try {
        const localId = await radioRepository.addLocalPlaylist(playlistData);
        this.playlists.unshift({ ...playlistData, local_id: localId });

        await syncQueueRepository.addSyncQueueTask({
          type: "CREATE_PLAYLIST",
          payload: { localId, name, cover, created_at: timestamp },
          timestamp: timestamp,
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
      const plIndex = this.playlists.findIndex((p) => p.local_id === playlist.local_id);

      if (plIndex !== -1) {
        this.playlists[plIndex].name = newName;
      }

      try {
        await radioRepository.updateLocalPlaylist(playlist.local_id, { name: newName });

        await syncQueueRepository.addSyncQueueTask({
          type: "SYNC_PLAYLIST_CHANGE",
          payload: {
            playlist_id: playlist.id,
            localId: playlist.local_id,
            field: "name",
            value: newName,
            timestamp: timestamp,
          },
          timestamp: timestamp,
        });

        syncService.processSyncQueue();
      } catch (error) {
        console.error("[RadioStore] Erro ao renomear playlist:", error);
      }
    },

    async deletePlaylist(localId, serverId) {
      try {
        await radioRepository.deleteLocalPlaylist(localId);
        this.playlists = this.playlists.filter((p) => p.local_id !== localId);

        await syncQueueRepository.addSyncQueueTask({
          type: "DELETE_PLAYLIST",
          payload: { id: serverId, localId: localId },
          timestamp: new Date().toISOString(),
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
        created_at: timestamp,
      };

      try {
        const trackId = await radioRepository.addLocalTrack(trackData);
        const pl = this.playlists.find((p) => p.local_id === playlist.local_id);

        if (pl) pl.track_count = (pl.track_count || 0) + 1;

        await syncQueueRepository.addSyncQueueTask({
          type: "ADD_TRACK",
          payload: {
            ...trackData,
            localId: trackId,
            playlist_local_id: playlist.local_id,
            playlist_id: playlist.id,
            playlist_id_is_server: !!playlist.id,
          },
          timestamp: timestamp,
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
        const pl = this.playlists.find((p) => p.local_id === track.playlist_local_id);

        if (pl) pl.track_count = Math.max(0, (pl.track_count || 1) - 1);

        await syncQueueRepository.addSyncQueueTask({
          type: "DELETE_TRACK",
          payload: { id: track.id, localId: track.local_id },
          timestamp: new Date().toISOString(),
        });

        syncService.processSyncQueue();
      } catch (error) {
        console.error("[RadioStore] Erro ao remover música:", error);
      }
    },
  },
});
