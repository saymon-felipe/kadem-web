<template>
    <div class="modal-wrapper">
        <div class="modal-overlay" @click="cancel"></div>

        <div class="modal-content glass" @click.stop>
            <p>{{ message }}</p>
            <div class="modal-actions">
                <button class="btn" @click="cancel">Cancelar</button>
                <button class="btn btn-danger" @click="confirm">
                    {{ confirmText }}
                </button>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'ConfirmationModal',
    props: {
        message: {
            type: String,
            required: true
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
}

.modal-content p {
    font-size: var(--fontsize-md);
    color: var(--deep-blue);
    margin-bottom: var(--space-8);
}

.modal-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
}
</style>