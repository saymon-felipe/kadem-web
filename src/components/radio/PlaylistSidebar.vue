<template>
    <aside class="sidebar glass" :class="{ 'collapsed': collapsed }">
        <div class="sidebar-header">
            <button class="toggle-btn" @click="$emit('toggle-collapse')">
                <font-awesome-icon :icon="collapsed ? 'chevron-right' : 'chevron-left'" />
            </button>

            <div class="header-text" v-if="!collapsed">
                <h3>Radio Flow</h3>
                <span class="subtitle">{{ playlists.length }} playlists criadas</span>
            </div>
        </div>

        <div class="playlist-list">
            <div v-for="pl in playlists" :key="pl.local_id" class="playlist-item"
                :class="{ 'active': selected_playlist_id === pl.local_id }" @click="$emit('select-playlist', pl)"
                :title="collapsed ? pl.name : ''">

                <img :src="pl.cover || default_avatar" class="pl-cover">

                <div class="pl-info" v-if="!collapsed">
                    <strong>{{ pl.name }}</strong>

                    <span v-if="is_playing_this(pl)" class="playing-indicator">
                        <font-awesome-icon icon="volume-high" /> Tocando
                    </span>
                    <span v-else>{{ pl.track_count || 0 }} músicas</span>
                </div>
            </div>
        </div>

        <button class="btn mt-auto new-playlist-btn" :class="collapsed ? 'btn-circle-add' : 'btn-primary'"
            @click="$emit('create-playlist')" :title="collapsed ? 'Nova Playlist' : ''">
            <font-awesome-icon icon="plus" v-if="collapsed" />
            <span v-else>Nova Playlist</span>
        </button>
    </aside>
</template>

<script>
export default {
    props: {
        playlists: { type: Array, required: true },
        selected_playlist_id: { type: Number, default: null },
        current_playing_playlist_id: { type: Number, default: null },
        is_playing: { type: Boolean, default: false },
        default_cover: { type: String, required: true },
        default_avatar: { type: String, required: true },
        collapsed: { type: Boolean, default: false }
    },
    emits: ['select-playlist', 'create-playlist', 'toggle-collapse'],
    methods: {
        is_playing_this(pl) {
            return this.is_playing && this.current_playing_playlist_id === pl.local_id;
        }
    }
}
</script>

<style scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-4);
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: padding 0.3s;
}

.sidebar.collapsed {
    padding: var(--space-3) var(--space-2);
    align-items: center;
}

.sidebar-header {
    margin-bottom: var(--space-4);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
}

.toggle-btn {
    background: none;
    border: none;
    color: var(--gray-400);
    cursor: pointer;
    font-size: 1rem;
    padding: 4px;
    transition: color 0.2s;
}

.toggle-btn:hover {
    color: var(--white);
}

.collapsed .sidebar-header {
    justify-content: center;
    margin-bottom: var(--space-2);
}

.header-text {
    white-space: nowrap;
    overflow: hidden;
}

.playlist-list {
    flex-grow: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    width: 100%;
}

.playlist-list::-webkit-scrollbar {
    display: none;
}

.playlist-list {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.playlist-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
}

.collapsed .playlist-item {
    padding: var(--space-2);
    justify-content: center;
}

.playlist-item:hover,
.playlist-item.active {
    background: rgba(255, 255, 255, 0.2);
}

.pl-cover {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
}

.pl-info {
    overflow: hidden;
    text-overflow: ellipsis;
}

.playing-indicator {
    color: var(--yellow);
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 4px;
}

.new-playlist-btn {
    flex-shrink: 0;
    transition: all 0.3s;
    overflow: hidden;
}

.btn-circle-add {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: var(--boxshadow-md);
}

.btn-circle-add:hover {
    background: var(--primary-dark);
    transform: scale(1.05);
}
</style>