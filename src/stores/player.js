import { defineStore } from 'pinia';
import { radioRepository } from '../services/localData';

export const usePlayerStore = defineStore('player', {
    state: () => ({
        current_music: null,
        current_playlist: null,
        queue: [],
        is_playing: false,
        player_mode: 'none', // 'native' | 'youtube'
        volume: 50,
        is_shuffle: false,

        // Instâncias
        yt_player_instance: null,
        native_audio_instance: new Audio(),
    }),

    actions: {
        // --- PLAYBACK CONTROL ---

        async play_playlist_context(playlist, tracks, start_track = null) {
            this.current_playlist = playlist;
            let new_queue = [...tracks];

            if (this.is_shuffle) {
                for (let i = new_queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [new_queue[i], new_queue[j]] = [new_queue[j], new_queue[i]];
                }
            }

            if (start_track) {
                new_queue = new_queue.filter(t => t.youtube_id !== start_track.youtube_id);
                new_queue.unshift(start_track);
            }

            this.queue = new_queue;

            if (this.queue.length > 0) {
                await this.play_track(this.queue[0], playlist);
            }
        },

        async play_track(track, playlist = null) {
            if (playlist) {
                this.current_playlist = playlist;
                const tracks = await radioRepository.getLocalTracks(playlist.local_id);
                this.queue = tracks;
            }

            this.current_music = track;
            this.is_playing = true;

            this._handle_media_source(track);
            this._update_media_session(track);
        },

        // Lógica Híbrida (Youtube vs Nativo)
        async _handle_media_source(track) {
            this.native_audio_instance.pause();
            if (this.yt_player_instance && typeof this.yt_player_instance.pauseVideo === 'function') {
                this.yt_player_instance.pauseVideo();
            }

            if (track.audio_blob) {
                // Modo Offline (Blob)
                this.player_mode = 'native';
                const url = URL.createObjectURL(track.audio_blob);
                this.native_audio_instance.src = url;
                this.native_audio_instance.play();
                this.native_audio_instance.onended = () => this.next();
            } else {
                // Modo Online (Youtube)
                this.player_mode = 'youtube';
                if (this.yt_player_instance && typeof this.yt_player_instance.loadVideoById === 'function') {
                    this.yt_player_instance.loadVideoById({
                        videoId: track.youtube_id,
                        startSeconds: 0
                    });
                }
            }
        },

        toggle_play() {
            this.is_playing = !this.is_playing;
            if (this.player_mode === 'native') {
                this.is_playing ? this.native_audio_instance.play() : this.native_audio_instance.pause();
            } else if (this.player_mode === 'youtube' && this.yt_player_instance) {
                this.is_playing ? this.yt_player_instance.playVideo() : this.yt_player_instance.pauseVideo();
            }
        },

        next() {
            if (!this.queue.length) return;
            const current_index = this.queue.findIndex(t => t.youtube_id === this.current_music?.youtube_id);
            const next_index = current_index + 1;
            if (next_index < this.queue.length) {
                this.play_track(this.queue[next_index], this.current_playlist);
            } else {
                this.is_playing = false;
            }
        },

        prev() {
            if (!this.queue.length) return;
            const current_index = this.queue.findIndex(t => t.youtube_id === this.current_music?.youtube_id);
            const prev_index = current_index - 1;
            if (prev_index >= 0) {
                this.play_track(this.queue[prev_index], this.current_playlist);
            }
        },

        // Queue Management
        add_to_queue(track) {
            const exists = this.queue.find(t => t.youtube_id === track.youtube_id);
            if (!exists) this.queue.push(track);
        },

        remove_from_queue(index) {
            this.queue.splice(index, 1);
        },

        toggle_shuffle() {
            this.is_shuffle = !this.is_shuffle;
        },

        // Audio Controls
        set_volume(val) {
            this.volume = val;
            if (this.native_audio_instance) this.native_audio_instance.volume = val / 100;
            if (this.yt_player_instance && typeof this.yt_player_instance.setVolume === 'function') {
                this.yt_player_instance.setVolume(val);
            }
        },

        seek_to(seconds) {
            if (this.player_mode === 'native') {
                this.native_audio_instance.currentTime = seconds;
            } else if (this.player_mode === 'youtube' && this.yt_player_instance) {
                this.yt_player_instance.seekTo(seconds, true);
            }
        },

        get_current_time() {
            if (this.player_mode === 'native') return this.native_audio_instance.currentTime || 0;
            if (this.player_mode === 'youtube' && this.yt_player_instance && typeof this.yt_player_instance.getCurrentTime === 'function') {
                return this.yt_player_instance.getCurrentTime() || 0;
            }
            return 0;
        },

        get_duration() {
            if (this.current_music?.duration_seconds) return this.current_music.duration_seconds;
            if (this.player_mode === 'native') return this.native_audio_instance.duration || 0;
            if (this.player_mode === 'youtube' && this.yt_player_instance) return this.yt_player_instance.getDuration() || 0;
            return 0;
        },

        register_yt_instance(player) {
            this.yt_player_instance = player;
        },

        _update_media_session(track) {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: track.channel || 'Kadem Radio',
                    artwork: [{ src: track.thumbnail || '', sizes: '96x96', type: 'image/png' }]
                });
                navigator.mediaSession.setActionHandler('play', () => this.toggle_play());
                navigator.mediaSession.setActionHandler('pause', () => this.toggle_play());
                navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
                navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            }
        }
    }
});