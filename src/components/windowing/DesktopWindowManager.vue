<template>
    <div class="desktop-manager">
        <SnapIndicator :snap-target="activeSnapTarget" v-if="!isMobile" />

        <TransitionGroup name="window">
            <BaseWindow v-for="window in currentUserWindows" :key="window.id" :window-data="window" />
        </TransitionGroup>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useWindowStore } from '@/stores/windows';
import BaseWindow from './BaseWindow.vue';
import SnapIndicator from './SnapIndicator.vue';
import { useAppStore } from '@/stores/app';

export default {
    components: {
        BaseWindow,
        SnapIndicator
    },
    data() {
        return {
            resize_timeout: null
        };
    },
    computed: {
        ...mapState(useWindowStore, [
            'currentUserWindows',
            'activeSnapTarget'
        ]),
        ...mapState(useAppStore, {
            isMobile: 'getIsMobile'
        }),
    },
    methods: {
        ...mapActions(useWindowStore, ['handle_viewport_resize']),

        on_window_resize() {
            if (this.resize_timeout) clearTimeout(this.resize_timeout);

            this.resize_timeout = setTimeout(() => {
                this.handle_viewport_resize();
            }, 100);
        }
    },
    mounted() {
        window.addEventListener('resize', this.on_window_resize);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.on_window_resize);
        if (this.resize_timeout) clearTimeout(this.resize_timeout);
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