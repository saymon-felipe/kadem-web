import { defineStore } from "pinia";
import { api } from "../plugins/api";
import { syncService } from "../services/syncService";
import { radioRepository, syncQueueRepository } from "../services/localData";
import { usePlayerStore } from "./player";
import { apiServices } from "../plugins/apiServices";
import { useAuthStore } from "@/stores/auth";
import { useUtilsStore } from "@/stores/utils";

export const useRadioStore = defineStore("radio", {
  state: () => ({
    playlists: [],
    lastSyncTimestamp: localStorage.getItem("kadem_radio_last_sync") || null,
    loading: false,
    active_downloads: {},
    offline_synced_ids: {},
    downloaded_youtube_ids: {},
    active_lyrics_downloads: {},
    downloaded_lyrics_map: {},
  }),

  getters: {
    isTrackOffline: (state) => (track) => {
      if (!track) return false;

      if (track.youtube_id && state.downloaded_youtube_ids[track.youtube_id]) {
        return true;
      }

      if (track.audio_blob) {
        return true;
      }

      return !!track.is_offline;
    },
    isLyricDownloading: (state) => (video_id) => {
      return !!state.active_lyrics_downloads[video_id];
    },
    trackHasLyrics: (state) => (track) => {
      if (!track || !track.youtube_id) return false;
      if (state.downloaded_lyrics_map[track.youtube_id]) return true;
      return !!track.has_lyrics;
    },
  },

  actions: {
    /* ==========================================================================
       SECTION 1: STATE MANAGEMENT & HELPERS
       ========================================================================== */

    getPlaylistByMusic(track) {
      if (!track.playlist_local_id) return null;
      return this.playlists.find((p) => p.local_id === track.playlist_local_id) || null;
    },

    async _loadFromDB() {
      try {
        this.playlists = await radioRepository.getLocalPlaylists();

        const offlineIds = await radioRepository.getAllDownloadedVideoIds();

        this.downloaded_youtube_ids = {};
        offlineIds.forEach((id) => {
          this.downloaded_youtube_ids[id] = true;
        });

        console.log(
          `[RadioStore] Sistema Offline Inicializado: ${offlineIds.length} faixas disponíveis.`
        );
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
      const playlist_index = this.playlists.findIndex(
        (p) => p.id === playlist_id || p.local_id === playlist_id
      );

      if (playlist_index === -1) return;

      const playlist = this.playlists[playlist_index];
      const timestamp = new Date().toISOString();
      const previous_cover = playlist.cover;

      this.playlists[playlist_index] = {
        ...playlist,
        cover: cover_base64,
        updated_at: timestamp,
      };

      try {
        if (playlist.local_id) {
          await radioRepository.updateLocalPlaylist(playlist.local_id, {
            cover: cover_base64,
          });
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
      this.playlists.forEach((p) => {
        if (p.tracks) {
          const t = p.tracks.find((x) => x.local_id === trackLocalId);
          if (t) Object.assign(t, changes);
        }
      });

      // Atualiza no Player (Queue e Música Atual) se necessário
      const playerStore = usePlayerStore();
      const qTrack = playerStore.queue.find((t) => t.local_id === trackLocalId);
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

    async checkOfflineAvailability(tracks) {
      if (!tracks || tracks.length === 0) return;

      const allYoutubeIds = [
        ...new Set(tracks.filter((t) => t.youtube_id).map((t) => t.youtube_id)),
      ];
      if (allYoutubeIds.length === 0) return;

      try {
        const foundIds = await radioRepository.filterExistingAudioIds(allYoutubeIds);
        const foundSet = new Set(foundIds);
        const corrections = [];

        tracks.forEach((track) => {
          const existsReal = foundSet.has(track.youtube_id);
          const flagLocal = track.is_offline;

          if (existsReal) {
            this.downloaded_youtube_ids[track.youtube_id] = true;
            if (!flagLocal) track.is_offline = true;
          } else {
            if (flagLocal) {
              console.warn(`[RadioStore] Inconsistência: ${track.title} sem binário.`);
              track.is_offline = false;
              delete this.downloaded_youtube_ids[track.youtube_id];

              corrections.push(
                radioRepository.updateLocalTrack(track.local_id, {
                  is_offline: false,
                  audio_blob: null,
                })
              );
            }
          }
        });

        if (corrections.length > 0) {
          Promise.all(corrections).catch((err) =>
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
      const tracksToDownload = tracks.filter((t) => !this.isTrackOffline(t));

      for (const track of tracksToDownload) {
        await this.downloadTrack(track);
      }
    },

    async downloadTrack(track) {
      if (this.active_downloads[track.local_id] !== undefined) return;

      const has_audio = this.downloaded_youtube_ids[track.youtube_id];
      if (has_audio) {
        track.is_offline = true;
        return;
      }

      this.active_downloads[track.local_id] = 0;

      const BYTES_PER_SECOND = 16000;

      const estimatedTotal = (track.duration_seconds || 0) * BYTES_PER_SECOND;

      try {
        const is_audio_cached = await radioRepository.hasGlobalAudio(track.youtube_id);
        let audio_blob = null;

        if (!is_audio_cached) {
          console.log(`[RadioStore] Baixando Áudio: ${track.title}`);
          const authStore = useAuthStore();
          const token = authStore.getToken;

          const endpoint = `${apiServices.MEDIA_ENGINE}/stream/${
            track.youtube_id
          }?nocache=${Date.now()}`;

          const response = await api.get(endpoint, {
            responseType: "blob",
            timeout: 0,
            headers: {
              "Cache-Control": "no-cache",
              Authorization: `Bearer ${token}`,
            },
            onDownloadProgress: (progressEvent) => {
              const total = progressEvent.total || estimatedTotal;
              const current = progressEvent.loaded;

              if (total > 0) {
                let percent = Math.floor((current / total) * 100);

                if (percent >= 100) percent = 99;

                this.active_downloads[track.local_id] = percent;
              }
            },
          });
          audio_blob = response.data;
        }

        if (audio_blob) {
          await radioRepository.saveTrackAudio(
            track.local_id,
            track.youtube_id,
            audio_blob
          );
        }

        this.active_downloads[track.local_id] = 100;

        this.queue_lyrics_download(track);

        const has_audio = this.downloaded_youtube_ids[track.youtube_id];

        setTimeout(() => {
          delete this.active_downloads[track.local_id];
          this.downloaded_youtube_ids[track.youtube_id] = true;
          this._updateLocalState(track.local_id, { is_offline: true });
        }, 500);
      } catch (error) {
        console.error(`[RadioStore] Erro download:`, error);
        track.is_offline = false;
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
        if (pl) {
          pl.track_count = (pl.track_count || 0) + 1;

          if (pl.tracks && Array.isArray(pl.tracks)) {
            pl.tracks.push({
              ...trackData,
              local_id: trackId,
              has_lyrics: false,
              lyrics_unavailable: false,
            });
          }
        }

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

        await this.queue_lyrics_download({ ...trackData, local_id: trackId });

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

        if (pl) {
          pl.track_count = Math.max(0, (pl.track_count || 1) - 1);
          if (pl.tracks && Array.isArray(pl.tracks)) {
            pl.tracks = pl.tracks.filter((t) => t.local_id !== track.local_id);
          }
        }

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

    update_track_lyrics_status_in_memory(video_id, { has_lyrics, lyrics_unavailable }) {
      if (has_lyrics) {
        this.downloaded_lyrics_map[video_id] = true;
      }

      const updatePayload = {};
      if (has_lyrics !== undefined) updatePayload.has_lyrics = has_lyrics;
      if (lyrics_unavailable !== undefined)
        updatePayload.lyrics_unavailable = lyrics_unavailable;

      this.playlists.forEach((playlist) => {
        if (playlist.tracks && Array.isArray(playlist.tracks)) {
          const tracks = playlist.tracks.filter((t) => t.youtube_id === video_id);
          tracks.forEach((track) => Object.assign(track, updatePayload));
        }
      });

      const playerStore = usePlayerStore();

      if (playerStore.queue && Array.isArray(playerStore.queue)) {
        const queueTracks = playerStore.queue.filter((t) => t.youtube_id === video_id);
        queueTracks.forEach((track) => Object.assign(track, updatePayload));
      }

      if (
        playerStore.current_music &&
        playerStore.current_music.youtube_id === video_id
      ) {
        console.log(
          `[RadioStore] Sincronizando estado da legenda no Player: ${video_id}`
        );

        Object.assign(playerStore.current_music, updatePayload);

        if (has_lyrics !== undefined) playerStore.current_music.has_lyrics = has_lyrics;
        if (lyrics_unavailable !== undefined)
          playerStore.current_music.lyrics_unavailable = lyrics_unavailable;
      }
    },

    set_lyric_downloading(video_id, status) {
      if (status) {
        this.active_lyrics_downloads[video_id] = true;
      } else {
        delete this.active_lyrics_downloads[video_id];
      }
    },

    async queue_lyrics_download(track) {
      if (!track.youtube_id || track.has_lyrics || track.lyrics_unavailable) return;

      this.set_lyric_downloading(track.youtube_id, true);

      await syncQueueRepository.addSyncQueueTask({
        type: "DOWNLOAD_LYRICS",
        payload: {
          video_id: track.youtube_id,
          track_local_id: track.local_id,
        },
        timestamp: new Date().toISOString(),
      });

      const utilsStore = useUtilsStore();
      if (utilsStore?.connection?.connected) {
        syncService.processSyncQueue();
      }
    },

    async download_missing_lyrics_for_playlist(playlist_local_id) {
      const tracks = await radioRepository.getLocalTracks(playlist_local_id);
      let count = 0;

      for (const track of tracks) {
        if (!this.trackHasLyrics(track) && !track.lyrics_unavailable) {
          await this.queue_lyrics_download(track);
          count++;
        }
      }

      if (count > 0) {
        console.log(`[RadioStore] Agendado download de legendas para ${count} músicas.`);
        syncService.processSyncQueue();
      }
    },
  },
});
