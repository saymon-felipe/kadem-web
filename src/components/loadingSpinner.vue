<template>
    <svg class="loading-spinner" viewBox="0 0 50 50">
        <circle class="spinner-path" :style="'stroke: var(--' + type + ')'" cx="25" cy="25" r="20" fill="none"
            stroke-width="5"></circle>
    </svg>
</template>
<script>
export default {
    props: ["type"]
}
</script>

<style scoped>
.loading-spinner {
    animation: spinner-rotate 2s linear infinite;
    width: 70px;
    height: 70px;
}

.spinner-path {
    stroke: var(--yellow);
    stroke-linecap: round;
    animation: spinner-dash 1.5s ease-in-out infinite;
}

@keyframes spinner-rotate {
    100% {
        transform: rotate(360deg);
    }
}

@keyframes spinner-dash {
    0% {
        stroke-dasharray: 1, 125.6;
        stroke-dashoffset: 0;
    }

    50% {
        stroke-dasharray: 94.2, 125.6;
        stroke-dashoffset: -31.4;
    }

    100% {
        stroke-dasharray: 94.2, 125.6;
        stroke-dashoffset: -125.6;
    }
}
</style>