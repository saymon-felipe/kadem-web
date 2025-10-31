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
    background: rgba(255, 255, 255, 0.1);
    border: 1px dashed rgba(255, 255, 255, 0.5);
    pointer-events: none;
    transform-origin: center center;
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