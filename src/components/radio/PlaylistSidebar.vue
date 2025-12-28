<template>
  <aside class="sidebar glass" :class="{ collapsed: collapsed }">
    <div class="sidebar-header">
      <button
        class="toggle-btn"
        @click="$emit('toggle-collapse')"
        :style="'margin: ' + (collapsed ? 'auto' : 'initial')"
      >
        <font-awesome-icon :icon="collapsed ? 'chevron-right' : 'chevron-left'" />
      </button>

      <transition name="fade">
        <div class="header-text" v-if="!collapsed">
          <h3>Radio Flow</h3>
        </div>
      </transition>
    </div>

    <div class="playlist-list-container">
      <transition-group name="playlist-anim" tag="div" class="playlist-list">
        <div v-if="playlists.length === 0 && !collapsed" class="empty-msg">
          Nenhuma playlist.
        </div>
        <div
          v-for="pl in playlists"
          :key="pl.local_id"
          class="playlist-item"
          :class="{ active: playlist_id === pl.local_id }"
          @click="$emit('select-playlist', pl)"
          :title="collapsed ? pl.name : ''"
        >
          <img :src="pl.cover || default_avatar" class="pl-cover" />

          <transition name="fade">
            <div class="pl-info" v-if="!collapsed">
              <strong>{{ pl.name }}</strong>
              <span v-if="is_playing_this(pl)" class="playing-indicator">
                <font-awesome-icon icon="volume-high" />
              </span>
            </div>
          </transition>
        </div>
      </transition-group>
    </div>

    <button
      class="btn mt-auto new-playlist-btn"
      :class="collapsed ? 'btn-circle-add' : 'btn-primary'"
      @click="$emit('create-playlist')"
      :title="collapsed ? 'Nova Playlist' : ''"
    >
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
    collapsed: { type: Boolean, default: false },
  },
  computed: {
    playlist_id() {
      return this.current_playing_playlist_id || this.selected_playlist_id;
    },
  },
  emits: ["select-playlist", "create-playlist", "toggle-collapse"],
  methods: {
    is_playing_this(pl) {
      return this.is_playing && this.current_playing_playlist_id === pl.local_id;
    },
  },
};
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-4);
  overflow: hidden;
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar.collapsed {
  padding: var(--space-3) var(--space-2);
  align-items: center;
}

/* Animação da Lista */
.playlist-anim-enter-active,
.playlist-anim-leave-active {
  transition: all 0.3s ease;
}
.playlist-anim-enter-from,
.playlist-anim-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
.playlist-anim-leave-active {
  position: absolute;
  width: 100%;
}
.playlist-anim-move {
  transition: transform 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  display: none;
}

.playlist-list-container {
  flex-grow: 1;
  overflow-y: auto;
  width: 100%;
  position: relative;
}
.playlist-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
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
  width: 100%;
  box-sizing: border-box;
}
.collapsed .playlist-item {
  justify-content: center;
}
.playlist-item:hover,
.playlist-item.active {
  background: var(--dark-yellow-2);
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
  margin: auto;
  color: var(--deep-blue);
}
.toggle-btn:hover {
  color: var(--text-gray);
}
.header-text {
  white-space: nowrap;
  overflow: hidden;
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
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;

  & strong {
    display: inline-block;
    flex-grow: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.playing-indicator {
  color: var(--yellow);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.new-playlist-btn {
  flex-shrink: 0;
  transition: all 0.3s;
  overflow: hidden;
}
.btn-circle-add {
  width: 45px;
  height: 45px;
  min-width: 45px;
  min-height: 45px;
  max-width: 45px;
  max-height: 45px;
  border-radius: 50%;
  background: var(--deep-blue);
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
  background: var(--deep-blue-2);
  transform: scale(1.05);
}
</style>
