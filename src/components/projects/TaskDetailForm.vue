<template>
    <div class="task-detail-modal">
        <div class="modal-top-bar">
            <div class="task-context">
                <span class="project-name">{{ project_name || 'Projeto' }}</span>
                <h2 class="task-id-header">#{{ task_display_id }}</h2>
            </div>
            <div class="top-actions">
                <transition name="scale-btn">
                    <button v-if="is_dirty" class="action-btn check" @click="handle_save" title="Salvar Alterações">
                        <font-awesome-icon icon="check" />
                    </button>
                </transition>

                <button class="action-btn delete" @click="$emit('delete', editable_task)" title="Excluir Tarefa">
                    <font-awesome-icon icon="trash-can" />
                </button>

                <button class="action-btn close" @click="$emit('close')" title="Fechar">
                    <font-awesome-icon icon="xmark" />
                </button>
            </div>
        </div>

        <form class="task-form-content" @submit.prevent="handle_save">
            <div class="field-group">
                <label>Descrição da Tarefa</label>
                <textarea v-model="editable_task.description" placeholder="Descreva a tarefa aqui..." rows="6"
                    class="clean-input description-input"></textarea>
            </div>

            <div class="field-group">
                <label>Responsável</label>
                <div class="custom-select-wrapper">
                    <img v-if="editable_task.responsible?.avatar" :src="editable_task.responsible.avatar"
                        class="avatar avatar-xs" />
                    <font-awesome-icon v-else icon="user" class="select-icon" />

                    <select v-model="editable_task.responsible" class="clean-select">
                        <option :value="null">Não atribuído</option>
                        <option v-if="editable_task.responsible" :value="editable_task.responsible">
                            {{ editable_task.responsible.name }}
                        </option>
                    </select>
                    <font-awesome-icon icon="chevron-down" class="select-arrow" />
                </div>
            </div>

            <div class="field-group">
                <label>Prioridade</label>
                <div class="custom-select-wrapper">
                    <span :class="'priority-dot ' + priority_color_class"></span>
                    <select v-model="editable_task.priority" class="clean-select" :class="priority_color_text_class">
                        <option>Normal</option>
                        <option>Importante</option>
                        <option>Urgente</option>
                    </select>
                    <font-awesome-icon icon="chevron-down" class="select-arrow" />
                </div>
            </div>

            <div class="field-group">
                <label>Tamanho</label>
                <div class="custom-select-wrapper">
                    <select v-model="editable_task.size" class="clean-select">
                        <option>P - Pequeno</option>
                        <option>M - Médio</option>
                        <option>G - Grande</option>
                    </select>
                    <font-awesome-icon icon="chevron-down" class="select-arrow" />
                </div>
            </div>

            <div class="meta-info">
                <p><em>Tarefa criada há {{ created_time_ago }}</em></p>
            </div>
        </form>

        <div class="comments-section">
            <h4>Comentários</h4>
            <div class="comment-input-area">
                <img :src="default_account_image" class="avatar avatar-sm" />
                <div class="comment-box">
                    <textarea placeholder="Escreva um comentário..."></textarea>
                    <div class="comment-actions">
                        <button type="button" class="btn-send" title="Enviar">
                            <font-awesome-icon icon="paper-plane" />
                        </button>
                    </div>
                </div>
            </div>
            <div class="comment-list-placeholder">
                <p v-if="!editable_task.comments?.length">Nenhum comentário ainda.</p>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions } from 'pinia';
import { useKanbanStore } from '@/stores/kanban';
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";

export default {
    name: 'TaskDetailForm',
    props: {
        task: {
            type: Object,
            required: true
        },
        projectName: {
            type: String,
            default: 'Projeto'
        }
    },
    emits: ['close', 'delete'],
    data() {
        return {
            editable_task: {},
            original_snapshot: '',
            default_account_image: defaultAccountImage,
            created_time_ago: '2 dias'
        };
    },
    computed: {
        project_name() { return this.projectName; },
        task_display_id() { return this.task.id || this.task.local_id; },
        is_dirty() { return JSON.stringify(this.editable_task) !== this.original_snapshot; },
        priority_color_class() {
            const map = { 'Normal': 'bg-gray', 'Importante': 'bg-orange', 'Urgente': 'bg-red' };
            return map[this.editable_task.priority] || 'bg-gray';
        },
        priority_color_text_class() {
            const map = { 'Normal': 'text-gray', 'Importante': 'text-orange', 'Urgente': 'text-red' };
            return map[this.editable_task.priority] || 'text-gray';
        }
    },
    methods: {
        ...mapActions(useKanbanStore, ['updateTask']),

        snapshot_task() {
            this.editable_task = JSON.parse(JSON.stringify(this.task));

            if (!this.editable_task.priority) this.editable_task.priority = 'Normal';

            if (!this.editable_task.description) {
                this.editable_task.description = this.editable_task.title || '';
            }

            this.original_snapshot = JSON.stringify(this.editable_task);
        },

        async handle_save() {
            if (this.is_dirty) {
                await this.updateTask(this.editable_task);
                this.original_snapshot = JSON.stringify(this.editable_task);
                this.$emit('close');
            }
        }
    },
    watch: {
        task: {
            handler() {
                this.snapshot_task();
            },
            immediate: true,
            deep: true
        }
    }
}
</script>

<style scoped>
.task-detail-modal {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--white);
    color: var(--deep-blue);
    padding: var(--space-6) var(--space-8);
    box-sizing: border-box;
}

.modal-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
    flex-shrink: 0;
}

.task-context {
    display: flex;
    flex-direction: column;
}

.project-name {
    font-size: var(--fontsize-sm);
    color: var(--gray-100);
    font-weight: 500;
}

.task-id-header {
    font-size: var(--fontsize-xl);
    margin: 0;
    color: var(--deep-blue);
}

.top-actions {
    display: flex;
    gap: var(--space-4);
}

.action-btn {
    background: none;
    border: none;
    font-size: var(--fontsize-md);
    cursor: pointer;
    color: var(--gray-300);
    transition: color 0.2s, transform 0.2s;
    padding: var(--space-2);
}

.action-btn.check {
    color: var(--green);
    font-size: 1.3rem;
}

.action-btn.check:hover {
    transform: scale(1.1);
}

.action-btn.delete:hover {
    color: var(--red);
}

.action-btn.close:hover {
    color: var(--deep-blue);
}

.scale-btn-enter-active,
.scale-btn-leave-active {
    transition: all 0.2s ease;
}

.scale-btn-enter-from,
.scale-btn-leave-to {
    opacity: 0;
    transform: scale(0.5);
}

.task-form-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    overflow-y: auto;
    padding-right: var(--space-2);
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.field-group label {
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    font-weight: 600;
}

.clean-input,
.clean-select {
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
    font-size: var(--fontsize-sm);
    font-family: inherit;
    width: 100%;
    background: var(--white);
    box-shadow: none;
    outline: none;
    resize: none;
    color: var(--deep-blue);
}

.description-input {
    font-size: var(--fontsize-md);
    line-height: 1.5;
}

.clean-input:focus,
.clean-select:focus {
    border-color: var(--deep-blue);
}

.custom-select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-3);
    background: var(--white);
}

.custom-select-wrapper .clean-select {
    border: none;
    padding-left: var(--space-2);
    appearance: none;
    cursor: pointer;
}

.select-arrow {
    pointer-events: none;
    color: var(--gray-100);
    font-size: 0.8rem;
}

.select-icon {
    color: var(--gray-300);
    width: 16px;
}

.avatar-xs {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
}

.priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

.bg-orange {
    background-color: var(--orange);
}

.bg-red {
    background-color: var(--red);
}

.bg-gray {
    background-color: var(--gray-300);
}

.text-orange {
    color: var(--orange) !important;
}

.text-red {
    color: var(--red) !important;
}

.text-gray {
    color: var(--text-gray) !important;
}

.meta-info {
    margin-top: var(--space-4);
    font-size: 0.8rem;
    color: var(--gray-100);
}

.comments-section {
    margin-top: var(--space-6);
    border-top: 1px solid var(--gray-300);
    padding-top: var(--space-5);
    flex-shrink: 0;
}

.comments-section h4 {
    font-size: var(--fontsize-md);
    margin-bottom: var(--space-4);
    color: var(--deep-blue);
}

.comment-input-area {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    margin-bottom: var(--space-4);
}

.comment-box {
    flex-grow: 1;
    background: #f5f7fa;
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    border: 1px solid transparent;
    transition: border-color 0.2s;
}

.comment-box:focus-within {
    border-color: var(--gray-300);
    background: var(--white);
}

.comment-box textarea {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    min-height: 40px;
    font-size: 0.9rem;
    outline: none;
    resize: none;
    color: var(--deep-blue);
}

.comment-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-2);
}

.btn-send {
    background: none;
    border: none;
    color: var(--deep-blue);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.btn-send:hover {
    opacity: 1;
}

.comment-list-placeholder {
    font-style: italic;
    color: var(--gray-300);
    font-size: 0.9rem;
    text-align: center;
    padding: var(--space-4);
}
</style>