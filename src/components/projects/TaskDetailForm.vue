<template>
    <div class="task-detail-modal">
        <div class="modal-header">
            <div class="header-content">
                <span class="project-name">Projeto de {{ project_name_only }}</span>
                <h2 class="task-id">#{{ task_display_id }}</h2>
            </div>
            <div class="header-actions">
                <transition name="scale-btn">
                    <button v-if="is_dirty" class="action-btn check" @click="handle_save" title="Salvar">
                        <font-awesome-icon icon="check" />
                    </button>
                </transition>
                <button class="action-btn delete" @click="$emit('delete', editable_task)" title="Excluir">
                    <font-awesome-icon icon="trash-can" />
                </button>
                <button class="action-btn close" @click="$emit('close')" title="Fechar">
                    <font-awesome-icon icon="xmark" />
                </button>
            </div>
        </div>

        <form class="task-form-content" @submit.prevent="handle_save">
            <div class="form-group">
                <label>Descrição</label>
                <textarea v-model="editable_task.description" rows="3" class="description-input"></textarea>
            </div>

            <div class="form-group">
                <label>Responsável</label>
                <CustomDropdown v-model="selected_responsible_wrapper" :options="responsible_options"
                    placeholder="Selecionar responsável">
                    <template #trigger="{ selected }">
                        <div class="dropdown-row" v-if="selected">
                            <img v-if="selected.avatar" :src="selected.avatar" class="avatar avatar-xs">
                            <div v-else class="avatar-placeholder" :class="selected.iconClass">
                                <font-awesome-icon :icon="selected.icon" />
                            </div>
                            <span>{{ selected.name }}</span>
                        </div>
                        <span v-else class="placeholder-text">Não atribuído</span>
                    </template>
                    <template #option="{ option }">
                        <div class="dropdown-row">
                            <img v-if="option.avatar" :src="option.avatar" class="avatar avatar-xs">
                            <div v-else class="avatar-placeholder" :class="option.iconClass">
                                <font-awesome-icon :icon="option.icon" />
                            </div>
                            <span>{{ option.name }}</span>
                        </div>
                    </template>
                </CustomDropdown>
            </div>

            <div class="form-group">
                <label>Prioridade</label>
                <CustomDropdown v-model="editable_task.priority" :options="priority_options">
                    <template #trigger="{ selected }">
                        <div class="dropdown-row">
                            <span class="priority-dot" :class="get_priority_color(selected)"></span>
                            <span :class="get_priority_text_color(selected)">{{ selected }}</span>
                        </div>
                    </template>
                    <template #option="{ option }">
                        <div class="dropdown-row">
                            <span class="priority-dot" :class="get_priority_color(option)"></span>
                            <span :class="get_priority_text_color(option)">{{ option }}</span>
                        </div>
                    </template>
                </CustomDropdown>
            </div>

            <div class="form-group">
                <label>Tamanho</label>
                <CustomDropdown v-model="editable_task.size" :options="size_options" />
            </div>

            <div class="meta-info">
                <p><em>Tarefa aberta por: <strong>{{ task_creator_name }}</strong> - há {{ created_time_ago }}</em></p>
            </div>
        </form>

        <div class="comments-section">
            <h4>Comentários</h4>

            <div class="comment-list" v-if="editable_task.comments && editable_task.comments.length">
                <div v-for="comment in editable_task.comments" :key="comment.id" class="comment-item">
                    <div class="comment-header">
                        <img :src="comment.author.avatar || default_account_image" class="avatar avatar-sm">
                        <div class="comment-meta">
                            <span class="comment-author">{{ comment.author.name }}</span>
                            <span class="comment-time">{{ format_time_ago(comment.timestamp) }}</span>
                        </div>

                        <div class="comment-options" v-if="is_current_user(comment.author.id)">
                            <button class="btn-icon-small" @click.stop="toggle_comment_menu(comment.id)">
                                <font-awesome-icon icon="ellipsis-vertical" />
                            </button>
                            <transition name="fade-switch">
                                <div v-if="open_comment_menu === comment.id" class="comment-menu glass"
                                    v-click-outside="close_comment_menu">
                                    <button @click="edit_comment(comment)">
                                        <font-awesome-icon icon="pencil" /> Editar
                                    </button>
                                    <button class="danger" @click="delete_comment(comment.id)">
                                        <font-awesome-icon icon="trash-can" /> Excluir
                                    </button>
                                </div>
                            </transition>
                        </div>
                    </div>

                    <div class="comment-content-wrapper">
                        <div v-if="editing_comment_id === comment.id" class="comment-edit-box">
                            <textarea v-model="editing_comment_content" rows="2"></textarea>
                            <div class="edit-actions">
                                <button class="btn-small btn-cancel" @click="cancel_edit_comment">Cancelar</button>
                                <button class="btn-small btn-save" @click="save_edit_comment(comment)">Salvar</button>
                            </div>
                        </div>
                        <div v-else class="comment-bubble">
                            <p>{{ comment.content }}</p>
                        </div>

                        <div class="comment-actions-bar">
                            <button class="btn-like" :class="{ 'liked': comment.liked_by_me }"
                                @click="toggle_like(comment)" title="Curtir">
                                <font-awesome-icon :icon="['fas', 'thumbs-up']" />
                                <span>{{ comment.likes || 0 }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="comment-list-placeholder" v-else>
                <p>Nenhum comentário ainda.</p>
            </div>

            <div class="new-comment-area">
                <img :src="user?.avatar || default_account_image" class="avatar avatar-sm" />
                <div class="new-comment-box">
                    <textarea v-model="new_comment_text" placeholder="Escreva um comentário..." rows="1"
                        @keydown.enter.exact.prevent="submit_comment" ref="commentInput"></textarea>
                    <button class="btn-send" :class="{ 'active': new_comment_text.trim() }" @click="submit_comment"
                        title="Enviar">
                        <font-awesome-icon icon="paper-plane" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { useKanbanStore } from '@/stores/kanban';
import { useAuthStore } from '@/stores/auth';
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";
import CustomDropdown from '../ui/CustomDropdown.vue';

export default {
    name: 'TaskDetailForm',
    components: { CustomDropdown },
    props: {
        task: { type: Object, required: true },
        projectName: { type: String, default: 'Projeto' },
        members: { type: Array, default: () => [] }
    },
    emits: ['close', 'delete'],

    directives: {
        'click-outside': {
            mounted(el, binding) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value(event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unmounted(el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    },

    data() {
        return {
            editable_task: {},
            original_snapshot: '',
            default_account_image: defaultAccountImage,
            priority_options: ['Normal', 'Importante', 'Urgente'],
            size_options: ['P - Pequeno', 'M - Médio', 'G - Grande'],
            selected_responsible_wrapper: null,

            // Comentários
            new_comment_text: '',
            open_comment_menu: null,
            editing_comment_id: null,
            editing_comment_content: ''
        };
    },
    computed: {
        ...mapState(useAuthStore, ['user']),
        project_name_only() { return this.projectName; },
        task_display_id() { return this.task.id || this.task.local_id; },
        is_dirty() { return JSON.stringify(this.editable_task) !== this.original_snapshot; },
        task_creator_name() { return 'Saymon'; }, // Mock
        created_time_ago() { return '2 meses'; }, // Mock

        responsible_options() {
            const base = [
                { id: 'all', name: 'Todos', icon: 'users', iconClass: 'all-icon', type: 'special' },
                { id: 'any', name: 'Qualquer', icon: 'dice', iconClass: 'any-icon', type: 'special' }
            ];
            const members = this.members.map(m => ({
                id: m.id,
                name: m.name,
                avatar: m.avatar || this.default_account_image,
                originalData: m,
                type: 'user'
            }));
            return [...base, ...members];
        }
    },
    methods: {
        ...mapActions(useKanbanStore, ['updateTask']),

        snapshot_task() {
            this.editable_task = JSON.parse(JSON.stringify(this.task));
            // Mock comments se não existirem
            if (!this.editable_task.comments) {
                this.editable_task.comments = [
                    {
                        id: 1,
                        author: { id: 99, name: 'Ricardo', avatar: null },
                        content: 'Eu acho que a gente deveria conversar para validar melhor o requisito dessa tarefa.',
                        timestamp: new Date(Date.now() - 10800000).toISOString(),
                        likes: 4,
                        liked_by_me: false
                    }
                ];
            }

            if (!this.editable_task.priority) this.editable_task.priority = 'Importante';
            if (!this.editable_task.size) this.editable_task.size = 'M - Médio';

            this.sync_responsible_wrapper();
            this.original_snapshot = JSON.stringify(this.editable_task);
        },

        sync_responsible_wrapper() {
            const current = this.editable_task.responsible;
            if (!current) { this.selected_responsible_wrapper = null; return; }

            if (current === 'all') this.selected_responsible_wrapper = this.responsible_options.find(o => o.id === 'all');
            else if (current === 'any') this.selected_responsible_wrapper = this.responsible_options.find(o => o.id === 'any');
            else if (typeof current === 'object') {
                const found = this.responsible_options.find(o => o.id === current.id);
                this.selected_responsible_wrapper = found || {
                    id: current.id,
                    name: current.name,
                    avatar: current.avatar || this.default_account_image,
                    type: 'user'
                };
            }
        },

        async handle_save() {
            if (this.is_dirty) {
                if (this.selected_responsible_wrapper) {
                    if (this.selected_responsible_wrapper.type === 'special') {
                        this.editable_task.responsible = this.selected_responsible_wrapper.id;
                    } else {
                        this.editable_task.responsible = this.selected_responsible_wrapper.originalData || {
                            id: this.selected_responsible_wrapper.id,
                            name: this.selected_responsible_wrapper.name,
                            avatar: this.selected_responsible_wrapper.avatar
                        };
                    }
                } else {
                    this.editable_task.responsible = null;
                }
                await this.updateTask(this.editable_task);
                this.original_snapshot = JSON.stringify(this.editable_task);
                this.$emit('close');
            }
        },

        is_current_user(authorId) {
            return this.user && this.user.id === authorId;
        },
        format_time_ago(timestamp) {
            return 'Há 3 horas';
        },
        toggle_comment_menu(commentId) {
            this.open_comment_menu = this.open_comment_menu === commentId ? null : commentId;
        },
        close_comment_menu() {
            this.open_comment_menu = null;
        },
        toggle_like(comment) {
            comment.liked_by_me = !comment.liked_by_me;
            comment.likes = comment.liked_by_me ? (comment.likes || 0) + 1 : (comment.likes || 0) - 1;
        },
        edit_comment(comment) {
            this.editing_comment_id = comment.id;
            this.editing_comment_content = comment.content;
            this.close_comment_menu();
        },
        cancel_edit_comment() {
            this.editing_comment_id = null;
            this.editing_comment_content = '';
        },
        save_edit_comment(comment) {
            comment.content = this.editing_comment_content;
            this.cancel_edit_comment();
            // Persistir via Store
        },
        delete_comment(commentId) {
            this.editable_task.comments = this.editable_task.comments.filter(c => c.id !== commentId);
            this.close_comment_menu();
            // Persistir via Store
        },
        submit_comment() {
            if (!this.new_comment_text.trim()) return;

            const newComment = {
                id: Date.now(),
                author: { ...this.user },
                content: this.new_comment_text,
                timestamp: new Date().toISOString(),
                likes: 0,
                liked_by_me: false
            };

            if (!this.editable_task.comments) this.editable_task.comments = [];
            this.editable_task.comments.push(newComment);
            this.new_comment_text = '';

            // Auto-save task para persistir o comentário no offline-first
            // ou criar uma action específica 'addComment' na store
        },

        // Helpers Estilo
        get_priority_color(val) {
            const map = { 'Normal': 'bg-gray', 'Importante': 'bg-orange', 'Urgente': 'bg-red' };
            return map[val] || 'bg-gray';
        },
        get_priority_text_color(val) {
            const map = { 'Normal': 'text-gray', 'Importante': 'text-orange', 'Urgente': 'text-red' };
            return map[val] || 'text-gray';
        }
    },
    watch: {
        task: {
            handler() { this.snapshot_task(); },
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
    padding: var(--space-6);
    box-sizing: border-box;
    font-family: 'Roboto', sans-serif;
}

/* --- HEADER --- */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
    flex-shrink: 0;
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.project-name {
    font-size: var(--fontsize-sm);
    color: var(--gray-100);
    font-weight: 700;
}

.task-id {
    font-size: var(--fontsize-xl);
    font-weight: 900;
    color: var(--deep-blue);
    margin: 0;
}

.header-actions {
    display: flex;
    gap: var(--space-3);
}

.action-btn {
    background: none;
    border: none;
    font-size: var(--fontsize-md);
    cursor: pointer;
    color: var(--gray-300);
    padding: 4px;
    transition: color 0.2s, transform 0.1s;
}

.action-btn:hover {
    color: var(--deep-blue);
}

.action-btn.check {
    color: var(--green);
}

.action-btn.check:hover {
    transform: scale(1.1);
}

.action-btn.delete:hover {
    color: var(--red);
}

.task-form-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    overflow-y: auto;
    padding-right: 4px;
    margin-bottom: var(--space-4);
}

.form-group {
    gap: 6px;
    margin: 0 !important;
}

.form-group label {
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    font-weight: 500;
    position: static;
    transform: none;
}

.description-input {
    min-height: 80px;
    resize: none;
    background-color: var(--white);
    border: 1px solid var(--background-gray);
    /* #CCCCCC */
    border-radius: var(--radius-sm);
    padding: 10px;
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.description-input:focus {
    outline: 2px solid var(--deep-blue);
}

.dropdown-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}

.placeholder-text {
    color: var(--gray-300);
}

.priority-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
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
    color: var(--orange);
    font-weight: 500;
}

.text-red {
    color: var(--red);
    font-weight: 500;
}

.text-gray {
    color: var(--gray-100);
}

.avatar-placeholder {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    color: var(--white);
}

.all-icon {
    background-color: var(--blue);
}

.any-icon {
    background-color: var(--orange);
}

.meta-info {
    margin-top: var(--space-4);
    font-style: italic;
    color: var(--deep-blue);
    font-size: var(--fontsize-xs);
    font-weight: 500;
}

/* --- COMENTÁRIOS --- */
.comments-section {
    border-top: 1px solid var(--background-gray);
    padding-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.comments-section h4 {
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: var(--deep-blue);
    margin-bottom: var(--space-2);
}

.comment-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 300px;
    overflow-y: auto;
}

.comment-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.comment-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    position: relative;
}

.comment-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    flex-grow: 1;
}

.comment-author {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--black);
}

.comment-time {
    font-size: 0.75rem;
    color: var(--gray-300);
}

.comment-options {
    position: relative;
}

.btn-icon-small {
    background: none;
    border: none;
    color: var(--gray-300);
    cursor: pointer;
    padding: 4px;
}

.btn-icon-small:hover {
    color: var(--deep-blue);
}

.comment-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--white);
    border-radius: var(--radius-sm);
    padding: 4px 0;
    z-index: 10;
    min-width: 100px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--gray-700);
}

.comment-menu button {
    background: none;
    border: none;
    padding: 8px 12px;
    text-align: left;
    font-size: var(--fontsize-xs);
    color: var(--deep-blue);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.comment-menu button:hover {
    background: var(--background-gray);
}

.comment-menu button.danger {
    color: var(--red);
}

.comment-content-wrapper {
    padding-left: calc(40px + var(--space-3));
}

.comment-bubble {
    background-color: #F0F0F0;
    padding: 12px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    color: #333;
    line-height: 1.4;
    position: relative;
}

.comment-actions-bar {
    margin-top: 4px;
    display: flex;
    gap: 10px;
}

.btn-like {
    background: none;
    border: none;
    font-size: 0.75rem;
    color: var(--gray-100);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s;
}

.btn-like.liked,
.btn-like:hover {
    color: var(--deep-blue);
}

.comment-edit-box textarea {
    width: 100%;
    border: 1px solid var(--deep-blue);
    border-radius: var(--radius-sm);
    padding: 8px;
    font-size: 0.85rem;
    resize: vertical;
    outline: none;
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
}

.new-comment-area {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-2);
}

.new-comment-box {
    flex-grow: 1;
    display: flex;
    align-items: center;
    background: var(--white);
    border: 1px solid var(--gray-300);
    border-radius: 20px;
    /* Arredondado estilo chat */
    padding: 4px 12px;
    transition: border-color 0.2s;
}

.new-comment-box:focus-within {
    border-color: var(--deep-blue);
}

.new-comment-box textarea {
    flex-grow: 1;
    border: none;
    background: transparent;
    padding: 8px 0;
    resize: none;
    outline: none;
    font-size: 0.9rem;
    height: 36px;
    color: var(--deep-blue);
}

.btn-send {
    background: none;
    border: none;
    color: var(--gray-300);
    cursor: pointer;
    font-size: 1rem;
    padding: 4px;
    transition: color 0.2s;
}

.btn-send.active,
.btn-send:hover {
    color: var(--deep-blue);
}

.comment-list-placeholder {
    font-style: italic;
    color: var(--gray-300);
    font-size: 0.9rem;
    text-align: center;
    padding: var(--space-4);
}

.task-form-content::-webkit-scrollbar,
.comment-list::-webkit-scrollbar {
    width: 6px;
}

.task-form-content::-webkit-scrollbar-thumb,
.comment-list::-webkit-scrollbar-thumb {
    background-color: var(--background-gray);
    border-radius: 3px;
}
</style>