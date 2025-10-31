<template>
    <div class="desktop-manager">
        <SnapIndicator :snap-target="activeSnapTarget" />

        <TransitionGroup name="window">
            <BaseWindow v-for="window in currentUserWindows" :key="window.id" :window-data="window" />
        </TransitionGroup>
    </div>
</template>

<script>
import { mapState } from 'pinia';
import { useWindowStore } from '@/stores/windows';
import BaseWindow from './BaseWindow.vue';
import SnapIndicator from './SnapIndicator.vue';

export default {
    components: {
        BaseWindow,
        SnapIndicator
    },
    computed: {
        ...mapState(useWindowStore, [
            'currentUserWindows',
            'activeSnapTarget'
        ])
    }
}
</script>

<style>
.desktop-manager {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.window-enter-active,
.window-leave-active {
    transition: all 0.2s ease-in-out;
}

.window-enter-from,
.window-leave-to {
    opacity: 0;
    transform: translate(var(--window-translate-x, 0), var(--window-translate-y, 0)) scale(0.9);
}
</style>