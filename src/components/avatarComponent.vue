<template>
    <div class="user-badge-wrapper">
        <div class="avatar-container" :style="progressRingStyle">
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
        }
    },
    methods: {
        getAvatar() {
            console.log("entrou, ", event)
            if (this.user.avatar) return this.user.avatar;

            const initials = this.user.name ? this.user.name.substring(0, 1) : '?';
            return `https://placehold.co/100x100/3B5998/FFFFFF?text=${initials}`;
        }
    }
}
</script>

<style scoped>
/* MUDANÇA: O :root foi removido.
  Agora estamos usando as variáveis globais de 'variables.css'.
*/

.user-badge-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    /* 16px */
    font-family: Roboto, system-ui, sans-serif;
    /* Padrão do main.css */
    padding: var(--space-4);
    /* 12px */
}

.avatar-container {
    position: relative;
    width: 90px;
    height: 90px;
    border-radius: var(--radius-full);

    /* O anel de progresso é o fundo do container */
    background-image: conic-gradient(var(--deep-blue) var(--progress-value-deg),
            var(--gray-700) 0
            /* Usa --gray-700 de variables.css */
        );

    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.avatar-image {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2px solid var(--white);
}

.level-badge {
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);

    background-color: var(--deep-blue);
    color: var(--white);
    font-size: 14px;
    font-weight: bold;
    padding: 2px 10px;
    border-radius: var(--radius-md);
    border: 2px solid var(--white);
}

.info-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.connected-as {
    font-size: 14px;
    color: var(--gray-100);
    /* Usa --gray-100 de variables.css */
    font-weight: 500;
}

.user-name {
    font-size: 26px;
    font-weight: 700;
    color: var(--deep-blue);
    /* Usa --deep-blue de variables.css */
    margin: 0;
    padding: 0;
}

.medals-container {
    display: flex;
    gap: var(--space-3);
    /* 8px */
    margin-top: var(--space-3);
}

/* MUDANÇA: Nova classe para estilizar as imagens das medalhas
*/
.medal-image {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

/* MUDANÇA: Classes de cor de medalha removidas
  (.medal-green, .medal-gold, etc.)
*/
</style>
