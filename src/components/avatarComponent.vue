<template>
    <div class="user-badge-wrapper">
        <div class="avatar-container" :style="progressRingStyle"
            :title="percentToNextLevel + '% para o próximo nível.'">
            <img :src="getAvatar()" :alt="user.name" class="avatar-image" />
            <div class="level-badge">{{ user.level }}</div>
        </div>
        <div class="info-container">
            <span class="connected-as">Conectado como</span>
            <h2 class="user-name">{{ user.name }}</h2>

            <div class="medals-container" v-if="user.medals && user.medals.length">
                <img v-for="medal in user.medals.slice(0, 3)" :key="medal.id" :src="medal.image" :title="medal.name"
                    class="medal-image" />
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "avatarComponent",
    props: {
        user: {
            type: Object,
            required: true,
            default: () => ({
                avatar: "https://placehold.co/100x100/3B5998/FFFFFF?text=?",
                name: "Usuário",
                level: 1,
                level_progress: 0,
                medals: []
            })
        }
    },
    computed: {
        progressRingStyle() {
            const progressDegrees = (this.user.level_progress / 100) * 360;

            return {
                '--progress-value-deg': `${progressDegrees}deg`
            };
        },
        percentToNextLevel() {
            return Math.floor(this.user.level_progress);
        }
    },
    methods: {
        getAvatar() {
            if (this.user.avatar) return this.user.avatar;

            const initials = this.user.name ? this.user.name.substring(0, 1) : '?';
            return `https://placehold.co/100x100/3B5998/FFFFFF?text=${initials}`;
        }
    }
}
</script>

<style scoped>
.user-badge-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-5);
}

.avatar-container {
    position: relative;
    width: 90px;
    height: 90px;
    border-radius: var(--radius-full);
    background-image: conic-gradient(var(--deep-blue) var(--progress-value-deg),
            var(--gray-700) 0);
    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.avatar-image {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    object-fit: cover;
}

@media (max-width: 768px) {
    .avatar-container {
        width: 70px;
        height: 70px;
    }

    .avatar-image {
        width: 60px;
        height: 60px;
    }
}

.level-badge {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    background-image: var(--deep-blue-gradient);
    color: var(--white);
    font-size: var(--fontsize-xs);
    font-weight: bold;
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-md);
    border: 2px solid var(--white);
}

.info-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.connected-as {
    font-size: var(--fontsize-xs);
    color: var(--gray-100);
    font-weight: 500;
}

.user-name {
    font-size: var(--fontsize-md);
    font-weight: 700;
    color: var(--deep-blue);
    margin: 0;
    padding: 0;
}

.medals-container {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
}

.medal-image {
    width: 24px;
    height: 24px;
    object-fit: contain;
}
</style>
