<template>
    <div class="widgets">
        <dateWidget />
        <radioFlowWidget />
        <connectionWidget />
    </div>
</template>
<script>
import dateWidget from "./widgets/dateWidget.vue";
import radioFlowWidget from "./widgets/radioFlowWidget.vue";
import connectionWidget from "./widgets/connectionWidget.vue";

export default {
    components: {
        dateWidget,
        radioFlowWidget,
        connectionWidget
    }
}
</script>
<style scoped>
.widgets {
    display: grid;
    place-items: center;
    flex-grow: 1;
    user-select: none;
    max-width: 65%;
    width: 99%;
    position: relative;
}

@media (max-width: 768px) {
    .widgets {
        max-width: 99%;
    }
}
</style>