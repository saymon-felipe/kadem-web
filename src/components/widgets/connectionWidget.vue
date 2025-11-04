<template>
    <div class="connection-status" :title="connection.connected ? 'Conectado' : 'Sem internet'">
        <font-awesome-icon :icon="connection.connected ? 'wifi' : 'globe'" />
    </div>
</template>
<script>
import { mapState } from 'pinia';
import { useUtilsStore } from '@/stores/utils';

export default {
    computed: {
        ...mapState(useUtilsStore, ['connection'])
    }
}
</script>
<style scoped>
.connection-status {
    & svg {
        color: var(--white);
        font-size: var(--fontsize-md);
        position: absolute;
        right: 0;
    }
}
</style>