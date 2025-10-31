<template>
    <div class="context-menu glass" :style="menuStyle" @mousedown.stop>
        <ul>
            <li v-for="option in options" :key="option.action" @click="onMenuClick(option.action)">
                {{ option.label }}
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    props: {
        options: { type: Array, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
    },
    emits: ['menu-click'],
    computed: {
        menuStyle() {
            return {
                top: `${this.y}px`,
                left: `${this.x}px`,
            };
        },
    },
    methods: {
        onMenuClick(action) {
            this.$emit('menu-click', action);
        },
    },
};
</script>

<style scoped>
.context-menu {
    position: fixed;
    z-index: 10000;
    min-width: 150px;
    padding: var(--space-2);
    border-radius: var(--radius-md);
    box-shadow: var(--boxshadow-default);
    transform-origin: top left;
    overflow: hidden;
}

.context-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
}

.context-menu li {
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;
    font-size: var(--fontsize-sm);
}

.context-menu li:hover {
    background-color: rgba(0, 0, 0, 0.1);
}
</style>