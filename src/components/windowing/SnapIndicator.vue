<template>
    <Transition name="snap-indicator-fade-scale">
        <div v-if="snapTarget" class="snap-indicator glass" :style="indicatorStyle"></div>
    </Transition>
</template>

<script>
export default {
    props: {
        snapTarget: {
            type: Object,
            default: null,
        },
    },
    computed: {
        indicatorStyle() {
            if (!this.snapTarget) return {};

            return {
                top: `${this.snapTarget.yPx}px`,
                left: `${this.snapTarget.xPx}px`,
                width: `${this.snapTarget.widthPx}px`,
                height: `${this.snapTarget.heightPx}px`,
            };
        },
    },
};
</script>

<style scoped>
.snap-indicator {
    position: absolute;
    z-index: 9998;
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    border: 2px dashed var(--color-info);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
    pointer-events: none;
    transform-origin: center center;
    transition: top var(--transition-spring, 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)),
                left var(--transition-spring, 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)),
                width var(--transition-spring, 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)),
                height var(--transition-spring, 0.3s cubic-bezier(0.2, 0.8, 0.2, 1));
}

.snap-indicator-fade-scale-enter-active {
    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.snap-indicator-fade-scale-leave-active {
    transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}

.snap-indicator-fade-scale-enter-from,
.snap-indicator-fade-scale-leave-to {
    opacity: 0;
    transform: scale(0.8);
}

.snap-indicator-fade-scale-enter-to,
.snap-indicator-fade-scale-leave-from {
    opacity: 1;
    transform: scale(1);
}
</style>