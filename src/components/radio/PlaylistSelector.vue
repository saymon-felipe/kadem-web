<template>
  <transition name="menu-pop">
    <div v-if="modelValue" class="playlist-selector-backdrop" @click.self="close">
      <div class="selector-menu" :style="position_style">
        <div class="menu-header">Adicionar à playlist:</div>
        <div class="menu-list">
          <button
            v-for="pl in playlists"
            :key="pl.local_id"
            class="menu-item"
            @click="select_playlist(pl)"
          >
            <img :src="pl.cover || default_avatar" class="mini-cover" />
            <span>{{ pl.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    modelValue: { type: Boolean, required: true },
    playlists: { type: Array, required: true },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    default_avatar: { type: String, required: true },
  },
  emits: ["update:modelValue", "select"],
  computed: {
    position_style() {
      return {
        top: `${this.position.y}px`,
        left: `${this.position.x - 200}px`,
      };
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
  position: absolute;
  width: 220px;
  background: white;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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
}

.menu-item:hover {
  background: var(--background-gray);
}

.mini-cover {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
}

.count {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--gray-400);
}

/* --- Animação Menu Pop --- */

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.2s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
}

/* Transição do Menu (Pop Effect) */
.menu-pop-enter-active .selector-menu,
.menu-pop-leave-active .selector-menu {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.menu-pop-enter-from .selector-menu,
.menu-pop-leave-to .selector-menu {
  transform: scale(0.8) translateY(-10px);
}
</style>
