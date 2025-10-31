import { defineStore } from 'pinia';

export const usePlayerStore = defineStore('player', {
    state: () => ({
        currentMusic: {},
        currentPlaylist: {},
    }),

    actions: {
        setCurrentMusic(music) {
            this.currentMusic = music;
        },
        setCurrentPlaylist(playlist) {
            this.currentPlaylist = playlist;
        },
    }
});
