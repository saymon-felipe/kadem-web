<template>
    <div class="kanban-column">
        <header class="column-header">
            <div class="header-left">
                <span class="column-drag-handle" title="Arrastar coluna">
                    <font-awesome-icon icon="grip-lines" />
                </span>

                <div v-if="is_renaming" class="rename-wrapper">
                    <input ref="renameInput" v-model="edit_title" @blur="save_rename" @keydown.enter="save_rename"
                        @keydown.esc="cancel_rename" class="rename-input" />
                </div>
                <strong v-else @dblclick="start_rename" title="Duplo clique para renomear">
                    {{ column.title }}
                </strong>

                <span class="task-count">{{ filtered_tasks.length }}</span>
            </div>

            <div class="header-actions">
                <button class="btn-icon" :class="{ 'active': show_search }" @click="toggle_search"
                    title="Filtrar tarefas">
                    <font-awesome-icon icon="magnifying-glass" />
                </button>

                <div class="options-wrapper">
                    <button class="btn-icon" @click.stop="toggle_options" title="Opções da Coluna">
                        <font-awesome-icon icon="ellipsis-vertical" />
                    </button>

                    <div v-if="show_options" class="options-dropdown" v-click-outside="close_options">
                        <button @click="start_rename">
                            <font-awesome-icon icon="pencil" /> Renomear
                        </button>
                        <button class="danger" @click="emit_delete_request">
                            <font-awesome-icon icon="trash-can" /> Excluir
                        </button>
                    </div>
                </div>

                <button class="btn-icon add-btn" @click.stop="show_new_task_form" title="Nova Tarefa">
                    <font-awesome-icon icon="plus" />
                </button>
            </div>
        </header>

        <div v-if="show_search" class="search-wrapper">
            <input ref="searchInput" v-model="search_query" class="search-input" placeholder="Filtrar..."
                @keydown.esc="close_search" @blur="handle_blur_search" />
            <button v-if="search_query" class="clear-search" @click="search_query = ''" @mousedown.prevent>
                <font-awesome-icon icon="xmark" />
            </button>
        </div>

        <div v-if="is_creating_task" class="new-task-wrapper">
            <div class="new-task-card">
                <textarea v-model="new_task_content" placeholder="Descreva a tarefa..." ref="new_task_input" rows="3"
                    @keydown.enter.prevent="handle_create_task" @keydown.esc="cancel_create_task"></textarea>
                <div class="new-task-footer">
                    <button class="btn-cancel" @click="cancel_create_task">Cancelar</button>
                    <button class="btn-save" @click="handle_create_task">Salvar</button>
                </div>
            </div>
        </div>

        <draggable :list="filtered_tasks" @change="on_task_change" item-key="local_id" group="tasks"
            class="task-list scroll-custom" animation="300" force-fallback="true" :fallback-on-body="true"
            fallback-class="task-fallback" ghost-class="task-ghost" drag-class="task-drag" :delay="0"
            :delay-on-touch-only="true" :disabled="is_searching">
            <template #item="{ element }">
                <KanbanTask :task="element" @click="handle_task_click(element)" />
            </template>
        </draggable>
    </div>
</template>

<script>
import draggable from 'vuedraggable';
import { mapActions, mapState } from 'pinia';
import { useKanbanStore } from '@/stores/kanban';
import KanbanTask from './KanbanTask.vue';

export default {
    name: 'KanbanColumn',
    components: { draggable, KanbanTask },
    props: {
        column: {
            type: Object,
            required: true
        }
    },
    emits: ['task-selected', 'delete-column'],

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
            is_creating_task: false,
            new_task_content: '',
            show_search: false,
            search_query: '',
            show_options: false,
            is_renaming: false,
            edit_title: ''
        };
    },
    computed: {
        ...mapState(useKanbanStore, { getTasks: 'getTasks' }),

        raw_column_tasks() { return this.getTasks(this.column.local_id); },
        is_searching() { return this.search_query.trim().length > 0; },
        filtered_tasks() {
            const query = this.search_query.toLowerCase().trim();
            if (!query) return this.raw_column_tasks;

            return this.raw_column_tasks.filter(task => {
                const id_match = String(task.id || task.local_id).includes(query);
                const desc_match = (task.description || '').toLowerCase().includes(query);
                const resp_match = (task.responsible?.name || '').toLowerCase().includes(query);
                return id_match || desc_match || resp_match;
            });
        }
    },
    methods: {
        ...mapActions(useKanbanStore, ['createTask', 'updateTasksForColumn', 'updateColumn']),

        toggle_options() { this.show_options = !this.show_options; },
        close_options() { this.show_options = false; },

        start_rename() {
            this.edit_title = this.column.title;
            this.is_renaming = true;
            this.close_options();
            this.$nextTick(() => {
                if (this.$refs.renameInput) {
                    this.$refs.renameInput.focus();
                    this.$refs.renameInput.select();
                }
            });
        },
        async save_rename() {
            if (this.edit_title.trim() && this.edit_title !== this.column.title) {
                await this.updateColumn({ ...this.column, title: this.edit_title });
            }
            this.is_renaming = false;
        },
        cancel_rename() {
            this.is_renaming = false;
        },

        emit_delete_request() {
            this.close_options();
            this.$emit('delete-column', this.column);
        },
        toggle_search() {
            this.show_search = !this.show_search;
            if (this.show_search) {
                this.$nextTick(() => { if (this.$refs.searchInput) this.$refs.searchInput.focus(); });
            } else {
                this.search_query = '';
            }
        },
        handle_blur_search() {
            if (!this.search_query.trim()) {
                this.show_search = false;
            }
        },
        close_search() {
            this.search_query = '';
            this.show_search = false;
        },
        on_task_change(event) {
            if (this.is_searching) return;
            if (event.added || event.moved || event.removed) {
                this.updateTasksForColumn({
                    columnId: this.column.local_id,
                    tasks: this.filtered_tasks,
                    event: event
                });
            }
        },
        handle_task_click(task) { this.$emit('task-selected', task); },
        show_new_task_form() {
            this.close_search();
            this.is_creating_task = true;
            this.$nextTick(() => { if (this.$refs.new_task_input) this.$refs.new_task_input.focus(); });
        },
        cancel_create_task() {
            this.is_creating_task = false;
            this.new_task_content = '';
        },
        async handle_create_task() {
            if (!this.new_task_content.trim()) {
                this.cancel_create_task();
                return;
            }
            try {
                const new_task = await this.createTask(this.column.local_id, {
                    description: this.new_task_content,
                    title: '',
                    responsible: null,
                    project_id: this.column.project_id
                });
                if (new_task && new_task.local_id) {
                    this.$emit('task-selected', new_task);
                }
            } catch (error) {
                console.error("Erro ao criar tarefa:", error);
            } finally {
                this.cancel_create_task();
            }
        }
    }
}
</script>

<style scoped>
.kanban-column {
    min-width: 320px;
    max-width: 320px;
    height: 100%;
    background: rgba(206, 179, 134, 0.15);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    position: relative;
}

.column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    flex-shrink: 0;
    position: relative;
}

.header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--text-gray);
    font-size: var(--fontsize-xs);
    text-transform: uppercase;
    letter-spacing: 1px;
    flex-grow: 1;
    overflow: hidden;
}

.rename-wrapper {
    flex-grow: 1;
    margin-right: 8px;
}

.rename-input {
    width: 100%;
    font-family: inherit;
    font-weight: 700;
    font-size: inherit;
    text-transform: uppercase;
    border: 1px solid var(--deep-blue);
    border-radius: 4px;
    padding: 2px 4px;
    outline: none;
}

.column-drag-handle {
    cursor: grab;
    color: var(--gray-300);
    padding: 4px;
    transition: color 0.2s;
}

.column-drag-handle:hover {
    color: var(--deep-blue);
}

.column-drag-handle:active {
    cursor: grabbing;
}

.task-count {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
}

.header-actions {
    display: flex;
    gap: var(--space-2);
}

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-100);
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
}

.btn-icon:hover,
.btn-icon.active {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--deep-blue);
}

.header-actions .add-btn:hover {
    color: var(--deep-blue);
}

.options-wrapper {
    position: relative;
}

.options-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
    min-width: 140px;
    z-index: 100;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.options-dropdown button {
    background: none;
    border: none;
    padding: 10px 12px;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    transition: background 0.2s;
}

.options-dropdown button:hover {
    background: #f5f7fa;
}

.options-dropdown button.danger {
    color: var(--red);
}

.options-dropdown button.danger:hover {
    background: #fff5f5;
}

.search-wrapper {
    padding: 0 var(--space-4) var(--space-3) var(--space-4);
    position: relative;
}

.search-input {
    width: 100%;
    padding: 6px 24px 6px 10px;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    font-size: var(--fontsize-xs);
    outline: none;
    background: rgba(255, 255, 255, 0.8);
}

.search-input:focus {
    border-color: var(--deep-blue);
    background: var(--white);
}

.clear-search {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-60%);
    background: none;
    border: none;
    color: var(--gray-300);
    cursor: pointer;
    font-size: 10px;
}

.clear-search:hover {
    color: var(--red);
}

.task-list {
    flex-grow: 1;
    padding: var(--space-3);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 100px;
}

.task-ghost {
    opacity: 0.4;
    background: rgba(0, 0, 0, 0.05);
    border: 2px dashed var(--gray-300);
    border-radius: var(--radius-md);
    box-shadow: none;
}

.task-fallback {
    transition: none !important;
    opacity: 1 !important;
    background: var(--white);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3) !important;
    border: 1px solid var(--deep-blue);
    z-index: 9999 !important;
    cursor: grabbing !important;
}

.task-drag {
    opacity: 0;
}

.new-task-wrapper {
    padding: 0 var(--space-3) var(--space-3) var(--space-3);
}

.new-task-card {
    background: var(--white);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.new-task-card textarea {
    width: 100%;
    border: none;
    resize: none;
    font-size: var(--fontsize-sm);
    outline: none;
    margin-bottom: var(--space-2);
    font-family: inherit;
}

.new-task-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
}

.btn-save {
    background: var(--deep-blue);
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.btn-cancel {
    background: transparent;
    color: var(--gray-300);
    border: none;
    font-size: 12px;
    cursor: pointer;
}
</style>