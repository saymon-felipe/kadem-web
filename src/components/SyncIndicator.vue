<template>
    <transition name="sync-fade">
        <div v-if="syncing" class="sync-indicator">
            <font-awesome-icon icon="arrows-rotate" class="fa-spin" />
            <span>Sincronizando...</span>
        </div>
    </transition>
</template>

<script>
export default {
    props: ["syncing"]
}
</script>

<style scoped>
.sync-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background-image: var(--deep-blue-gradient);
    color: var(--yellow);
    padding: 8px 12px;
    border-radius: var(--radius-sm, 6px);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fontsize-xs, 12px);
    font-weight: 500;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.sync-fade-enter-active,
.sync-fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.sync-fade-enter-from,
.sync-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>