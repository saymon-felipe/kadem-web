<template>
    <Transition name="slide-over-root">
        <div v-if="modelValue" class="modal-overlay" @click.self="cancel">
            <div class="modal-content glass-panel" role="dialog" aria-modal="true">

                <div class="modal-icon-wrapper" :class="{ 'warning': isWarning }">
                    <font-awesome-icon :icon="iconName" />
                </div>

                <div class="modal-header">
                    <h3>{{ message }}</h3>
                </div>

                <div class="modal-body">
                    <p v-html="sanitizedMessage"></p>
                </div>

                <div class="modal-footer">
                    <button class="btn" @click="cancel">
                        Cancelar
                    </button>
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
        modelValue: { type: Boolean, default: false },
        description: { type: String, default: 'Esta ação não pode ser desfeita.' },
        message: { type: String, required: true },
        confirmText: { type: String, default: 'Confirmar' }
    },
    emits: ['update:modelValue', 'cancelled', 'confirmed'],
    computed: {
        isWarning() {
            const t = this.message.toLowerCase();
            return t.includes('aviso') || t.includes('atenção') || t.includes('segurança') || t.includes('não salvas');
        },
        iconName() {
            return this.isWarning ? 'triangle-exclamation' : 'circle-info';
        },
        sanitizedMessage() {
            return this.sanitize(this.description);
        }
    },
    methods: {
        sanitize(html) {
            if (!html) return '';

            const temp = document.createElement('div');
            temp.textContent = html;

            return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                .replace(/on\w+="[^"]*"/g, "");
        },
        cancel() {
            this.$emit('cancelled');
        },
        confirm() {
            this.$emit('confirmed');
        }
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
}

.modal-content {
    background: #ffffff;
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 450px;
    padding: var(--space-6);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: var(--deep-blue);
}

.modal-icon-wrapper {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--gray-600);
    color: var(--deep-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    margin-bottom: var(--space-4);
}

.modal-icon-wrapper.warning {
    background: #FEF3C7;
    color: #D97706;
}

.modal-header h3 {
    margin: 0 0 var(--space-2) 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--deep-blue);
}

.modal-body p {
    font-size: 0.95rem;
    color: var(--deep-blue);
    line-height: 1.6;
    margin: 0 0 var(--space-6) 0;
}

.modal-footer {
    display: flex;
    gap: var(--space-3);
    width: 100%;
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