<template>
    <div class="radio-flow-widget glass">
        <div class="radio-data">
            <span>{{ currentMusic?.name || "--------------------" }}</span>
            <span>{{ currentPlaylist?.name || "--------" }}</span>
        </div>
        <div class="time-range">
            <input type="range" min="0" :max="currentMusic?.status?.totalDuration || 0"
                :value="currentMusic?.status?.elapsedTime || 0" @input="$emit('request-seek', $event.target.value)"
                class="personalized-input-range"
                :style="{ '--range-progress': `${((currentMusic?.status?.elapsedTime / currentMusic?.status?.totalDuration) || 0) * 100}%` }" />
        </div>
        <div class="controls">
            <button type="button" class="prev" @click="prev" title="Anterior">
                <font-awesome-icon icon="backward-step" />
            </button>
            <button type="button" class="play" @click="togglePlay"
                :title="currentMusic?.status?.playing ? 'Pausar' : 'Tocar'">
                <font-awesome-icon :icon="'circle-' + (currentMusic?.status?.playing ? 'pause' : 'play')" />
            </button>
            <button type="button" class="next" @click="next" title="Próxima">
                <font-awesome-icon icon="forward-step" />
            </button>
        </div>
    </div>
</template>
<script>
import { mapState } from 'pinia';
import { usePlayerStore } from '@/stores/player';

export default {
    computed: {
        ...mapState(usePlayerStore, ['currentMusic', 'currentPlaylist'])
    },
    methods: {
        prev() {
            this.$emit("request:prev");
        },
        togglePlay() {
            if (this.currentMusic?.status?.playing) {
                this.$emit("request:pause");
            } else {
                this.$emit("request:play");
            }
        },
        next() {
            this.$emit("request:next");
        }
    }
}
</script>
<style scoped>
.radio-flow-widget {
    width: 100%;
    display: flex;
    align-items: center;
    padding: var(--space-6);
    gap: var(--space-6);

    & .time-range {
        flex-grow: 1;
    }

    & .radio-data {
        width: calc(10vw) + 1rem;
        display: grid;

        & span {
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;

            &:first-child {
                color: var(--deep-blue);
                font-size: var(--fontsize-md);
            }

            &:last-child {
                color: var(--deep-blue-2);
            }
        }
    }

    & .controls {
        display: flex;
        align-items: center;
        gap: var(--space-3);

        & button {
            cursor: pointer;
            background: none;
            border: none;
            color: var(--deep-blue);
            transition: all 0.2s ease-in-out;

            &:hover {
                color: var(--deep-blue-2);
            }

            &.prev svg,
            &.next svg {
                font-size: calc(1vw + .7rem);
            }

            &.play svg {
                font-size: calc(1vw + 1.5rem);
            }
        }
    }
}
</style>