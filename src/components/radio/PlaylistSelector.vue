<template>
    <div class="playlist-selector-backdrop" @click.self="$emit('close')">
        <div class="selector-menu" :style="position_style">
            <div class="menu-header">Adicionar à playlist:</div>
            <div class="menu-list">
                <button v-for="pl in playlists" :key="pl.local_id" class="menu-item" @click="$emit('select', pl)">
                    <img :src="pl.cover || default_avatar" class="mini-cover">
                    <span>{{ pl.name }}</span>
                    <span class="count">{{ pl.track_count || 0 }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        playlists: { type: Array, required: true },
        position: { type: Object, default: () => ({ x: 0, y: 0 }) },
        default_avatar: { type: String, required: true }
    },
    emits: ['close', 'select'],
    computed: {
        position_style() {
            return {
                top: `${this.position.y}px`,
                left: `${this.position.x - 200}px`
            };
        }
    }
}
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
    animation: fadeIn 0.1s ease-out;
}

.menu-header {
    padding: var(--space-2) var(--space-3);
    font-size: 0.75rem;
    color: var(--gray-500);
    background: var(--gray-100);
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
    background: var(--gray-100);
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

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>