<template>
    <Transition name="modal-fade">
        <div v-if="modelValue" class="modal-wrapper">
            <div class="modal-overlay" @click="close"></div>

            <div class="modal-content glass" @click.stop>
                <slot></slot>
            </div>
        </div>
    </Transition>
</template>

<script>
export default {
    name: 'BaseModal',
    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:modelValue'],
    methods: {
        close() {
            this.$emit('update:modelValue', false)
        },
    },
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
    transition: all 0.2s ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
    transform: scale(0.95);
    opacity: 0;
}

.modal-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10001;
    display: grid;
    place-items: center;
}

.modal-overlay,
.modal-content {
    grid-area: 1 / 1;
}

.modal-overlay {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
}

.modal-content {
    padding: var(--space-6);
    max-width: 450px;
    height: fit-content;
    width: 90%;
    z-index: 2;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    margin: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}
</style>