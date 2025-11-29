<template>
    <div class="playlist-hero" :style="hero_background">
        <img :src="playlist.cover || default_avatar" class="hero-cover">
        <div class="hero-details">
            <h1>{{ playlist.name }}</h1>
            <div class="meta-row">
                <span>{{ track_count }} músicas</span>
                <span v-if="total_duration_formatted" class="separator">•</span>
                <span>{{ total_duration_formatted }}</span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        playlist: { type: Object, required: true },
        track_count: { type: Number, default: 0 },
        total_duration_seconds: { type: Number, default: 0 },
        default_cover: { type: String, required: true },
        default_avatar: { type: String, required: true }
    },
    computed: {
        hero_background() {
            return `background: linear-gradient(to right, var(--deep-blue), transparent), url(${this.playlist.cover || this.default_cover}) no-repeat right center; background-size: cover;`;
        },
        total_duration_formatted() {
            return this.format_total_duration_verbose(this.total_duration_seconds);
        }
    }
}
</script>

<style scoped>
.playlist-hero {
    height: 180px;
    padding: var(--space-5);
    display: flex;
    align-items: end;
    gap: var(--space-5);
    color: var(--white);
    position: relative;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.hero-cover {
    width: 140px;
    height: 140px;
    box-shadow: var(--boxshadow-lg);
    border-radius: var(--radius-sm);
    object-fit: cover;
}

.meta-row {
    display: flex;
    gap: var(--space-2);
    font-size: 0.9rem;
    opacity: 0.9;
}

.separator {
    opacity: 0.6;
}
</style>