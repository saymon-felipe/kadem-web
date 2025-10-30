<template>
    <div class="loading-response"
        :style="styletype == 'small' ? 'margin: var(--space-3) !important;' : 'margin: var(--space-7) 0;'">
        <p :class="type" v-if="msg != '' && !loading" v-html="sanitizeHtml(msg)"></p>
        <loading v-if="loading" type="deep-blue" />
    </div>
</template>
<script>
import loading from "./loadingSpinner.vue";

export default {
    emits: ["eraseError"],
    props: ["msg", "type", "loading", "styletype"],
    components: {
        loading
    }
}
</script>
<style scoped>
.loading-response {
    height: 40px;
    width: 100%;
    display: grid;
    place-items: center;

    & p {
        font-size: var(--fontsize-sm);
        font-weight: 600;
        text-align: center;
        margin: var(--space-3) 0;
    }
}
</style>