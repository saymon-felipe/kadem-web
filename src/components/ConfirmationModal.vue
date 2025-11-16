<template>
    <Transition name="slide-over-root">
        <div class="modal-wrapper" v-if="modelValue">
            <div class="modal-overlay" @click="cancel"></div>

            <div class="modal-content glass" @click.stop>
                <p>{{ message }}</p>
                <p class="subtitle">{{ description }}</p>
                <div class="modal-actions">
                    <button class="btn" @click="cancel">Cancelar</button>
                    <button class="btn" :class="confirmText == 'Excluir' ? 'btn-red' : 'btn-primary'" @click="confirm">
                        {{ confirmText }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>
<script>
export default {
    name: 'ConfirmationModal',
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: 'Esta ação não pode ser desfeita.'
        },
        confirmText: {
            type: String,
            default: 'Confirmar'
        }
    },
    emits: ['confirmed', 'cancelled'],
    methods: {
        confirm() {
            this.$emit('confirmed');
        },
        cancel() {
            this.$emit('cancelled');
        }
    }

}
</script>

<style scoped>
.modal-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
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
    max-width: 400px;
    height: fit-content;
    width: 90%;
    z-index: 2;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    margin: auto;
    display: grid;
}

.modal-content p {
    font-size: var(--fontsize-md);
    color: var(--deep-blue);
    margin: var(--space-3) 0;

    &.subtitle {
        font-size: var(--fontsize-sm);
        color: var(--deep-blue-2);
    }
}

.modal-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-6);
}

.slide-over-root-enter-active,
.slide-over-root-leave-active {
    transition: opacity 0.3s ease;
}

.slide-over-root-enter-active .modal-content,
.slide-over-root-leave-active .modal-content {
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out;
}

.slide-over-root-enter-active .modal-overlay,
.slide-over-root-leave-active .modal-overlay {
    transition: opacity 0.3s ease;
}

.slide-over-root-enter-from,
.slide-over-root-leave-to {
    opacity: 0;
}

.slide-over-root-enter-from .modal-content {
    transform: translateY(20px);
}

.slide-over-root-leave-to .modal-content {
    transform: translateY(20px);
}
</style>