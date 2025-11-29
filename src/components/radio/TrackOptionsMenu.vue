<template>
    <div class="options-backdrop" @click.self="$emit('close')">
        <div class="options-menu" :style="position_style">
            <button class="menu-item" @click="$emit('delete')">
                <font-awesome-icon icon="trash-can" class="icon-danger" />
                <span>Excluir</span>
            </button>
            <button class="menu-item" @click="$emit('add-queue')">
                <font-awesome-icon icon="plus" />
                <span>Adicionar à fila</span>
            </button>
            <button class="menu-item" @click="$emit('close')">
                <font-awesome-icon icon="link" />
                <span>Copiar link</span>
            </button>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        position: { type: Object, default: () => ({ x: 0, y: 0 }) }
    },
    emits: ['close', 'delete', 'add-queue'],
    computed: {
        position_style() {
            return {
                top: `${this.position.y}px`,
                left: `${this.position.x - 150}px`
            };
        }
    }
}
</script>

<style scoped>
.options-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: transparent;
}

.options-menu {
    position: absolute;
    width: 180px;
    background: white;
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    padding: var(--space-2) 0;
    display: flex;
    flex-direction: column;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    width: 100%;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    color: var(--deep-blue);
    transition: background 0.1s;
    font-size: 0.9rem;
}

.menu-item:hover {
    background: var(--gray-100);
}

.icon-danger {
    color: var(--red);
}
</style>