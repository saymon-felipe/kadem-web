<template>
    <div class="start-menu glass" @mousedown.stop>
        <div class="start-menu-content">
            <avatarComponent :user="user" />
            <h3>Menu Iniciar</h3>
            <p>Seus aplicativos e arquivos aqui.</p>
        </div>
    </div>
</template>

<script>
import avatarComponent from "../avatarComponent.vue";
import { mapState } from 'pinia';
import { useAuthStore } from '@/stores/auth';

export default {
    components: {
        avatarComponent
    },
    computed: {
        ...mapState(useAuthStore, ['user']),
    }
}
</script>
<style scoped>
.start-menu {
    position: fixed;
    z-index: 9000;
    top: 82px;
    left: .5dvw !important;
    height: calc(100dvh - 90px);
    max-height: calc(100dvh - 90px);
    width: 99dvw !important;
    max-width: 99dvw !important;
    padding: var(--space-4);
    overflow: hidden;
}

.start-menu-content {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    color: var(--deep-blue);
}
</style>
