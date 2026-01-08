<template>
  <transition name="menu-pop">
    <div v-if="modelValue" class="playlist-selector-backdrop" @click.self="close">
      <div class="selector-menu" :style="menu_styles">
        <div class="menu-header">Adicionar à playlist:</div>
        <div class="menu-list">
          <button
            v-for="pl in playlists"
            :key="pl.local_id"
            class="menu-item"
            @click="select_playlist(pl)"
          >
            <img :src="pl.cover || default_avatar" class="mini-cover" alt="cover" />
            <span style="flex-grow: 1">{{ pl.name }}</span>

            <font-awesome-icon
              v-if="existing_in_playlists.includes(pl.local_id)"
              icon="check"
              class="existing-icon"
              title="Já adicionada"
            />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "PlaylistSelector",
  props: {
    modelValue: { type: Boolean, required: true },
    playlists: { type: Array, required: true },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    default_avatar: { type: String, required: true },
    existing_in_playlists: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue", "select"],
  computed: {
    menu_styles() {
      const MENU_WIDTH = 220;
      const ITEM_HEIGHT = 32;
      const HEADER_HEIGHT = 22;
      const MAX_HEIGHT = 222;

      const content_height = this.playlists.length * ITEM_HEIGHT + HEADER_HEIGHT;
      const final_height = Math.min(content_height, MAX_HEIGHT);

      const space_below = window.innerHeight - this.position.y;

      const open_upwards = space_below < final_height;

      const styles = {
        left: `${this.position.x - MENU_WIDTH}px`,
        width: `${MENU_WIDTH}px`,
      };

      if (open_upwards) {
        styles.top = `${this.position.y - final_height + 5}px`;
        styles.transformOrigin = "bottom right";
      } else {
        styles.top = `${this.position.y + 5}px`;
        styles.transformOrigin = "top right";
      }

      return styles;
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
    select_playlist(pl) {
      this.$emit("select", pl);
    },
  },
};
</script>

<style scoped>
.playlist-selector-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: transparent;
}

.selector-menu {
  position: fixed;
  background: white;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--gray-200);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.menu-header {
  padding: var(--space-2) var(--space-3);
  font-size: 0.75rem;
  color: var(--gray-500);
  background: var(--background-gray);
  border-bottom: 1px solid var(--gray-200);
  font-weight: 600;
}

.menu-list {
  max-height: 200px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  color: var(--deep-blue);
  height: 32px;
}

.menu-item:hover {
  background: var(--background-gray);
}

.existing-icon {
  color: var(--green);
  font-size: 0.8rem;
  margin-left: auto;
}

.mini-cover {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
