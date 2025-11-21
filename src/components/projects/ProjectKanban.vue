<template>
    <div class="kanban-board">
        <div class="kanban-header">
            <button class="btn btn-small" @click="$emit('back-to-list')">
                <font-awesome-icon icon="chevron-left" /> Voltar
            </button>

            <ProjectSelector :current-project-id="project_local_id" @switch-project="handleSwitchProject"
                @back-to-home="$emit('back-to-list')" />

            <div class="header-actions">
                <button class="btn btn-small btn-primary" @click="start_add_column">
                    <font-awesome-icon icon="plus" /> Nova Coluna
                </button>
            </div>
        </div>

        <draggable v-model="columns" @change="on_column_change" @start="on_column_drag_start" @end="on_column_drag_end"
            item-key="local_id" class="kanban-container scroll-custom" handle=".column-drag-handle" animation="300"
            force-fallback="true" :fallback-on-body="true" fallback-class="column-fallback" ghost-class="column-ghost"
            drag-class="column-drag" group="columns" direction="horizontal">
            <template #item="{ element }">
                <KanbanColumn ref="column_refs" :column="element" :members="project_members"
                    @task-selected="open_task_modal" @delete-column="ask_delete_column" />
            </template>
        </draggable>

        <SideModal v-model="is_modal_open" @close="is_modal_open = false">
            <TaskDetailForm v-if="selected_task" :key="selected_task.local_id" :task="selected_task"
                :project-name="project.name" :members="project_members" @close="is_modal_open = false"
                @delete="ask_delete_task" />
        </SideModal>

        <ConfirmationModal v-model="show_confirmation" :message="confirmation_message" confirmText="Excluir"
            @confirmed="handle_confirm_delete" @cancelled="close_confirmation" />
    </div>
</template>

<script>
import draggable from 'vuedraggable';
import { mapActions, mapState } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import { useKanbanStore } from '@/stores/kanban';

import KanbanColumn from './KanbanColumn.vue';
import SideModal from '@/components/SideModal.vue';
import TaskDetailForm from './TaskDetailForm.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue';
import ProjectSelector from './ProjectSelector.vue';

export default {
    name: 'ProjectKanban',
    components: { draggable, KanbanColumn, SideModal, TaskDetailForm, ConfirmationModal, ProjectSelector },
    props: {
        project_local_id: {
            type: [String, Number],
            required: true
        }
    },
    emits: ['back-to-list', 'switch-project'],
    data() {
        return {
            selected_task: null,
            is_modal_open: false,
            drag_ctx: { is_dragging: false, start_mouse_x: 0, current_mouse_x: 0, initial_top: 0 },
            show_confirmation: false,
            item_to_delete: null,
            delete_type: null
        };
    },
    computed: {
        ...mapState(useProjectStore, {
            project(state) {
                return state.projects.find(p => p.localId === this.project_local_id) || { name: 'Carregando...' };
            }
        }),
        ...mapState(useKanbanStore, {
            getColumns: 'getColumns'
        }),
        project_members() {
            return this.project.members || [];
        },
        columns: {
            get() {
                return this.getColumns(this.project_local_id);
            },
            set(new_columns) {
                this.updateColumnsForProject({
                    projectId: this.project_local_id,
                    columns: new_columns
                });
            }
        },
        confirmation_message() {
            if (this.delete_type === 'column') {
                return "Tem certeza que deseja excluir esta coluna e todas as suas tarefas?";
            }
            return "Tem certeza que deseja excluir esta tarefa permanentemente?";
        }
    },
    methods: {
        ...mapActions(useKanbanStore, [
            'loadProjectKanban',
            'createColumn',
            'updateColumnsForProject',
            'deleteTask',
            'deleteColumn',
            'pullProjectKanban'
        ]),

        handleSwitchProject(newProjectId) {
            this.loadProjectKanban(newProjectId);

            this.$emit('switch-project', newProjectId);
        },
        async start_add_column() {
            const new_column = await this.createColumn(this.project_local_id, "NOVA COLUNA");
            if (new_column) {
                await this.$nextTick();
                const refs = this.$refs.column_refs;
                if (Array.isArray(refs)) {
                    const target_component = refs.find(comp => comp.column.local_id === new_column.local_id);
                    if (target_component) {
                        target_component.start_rename();
                        target_component.$el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                    }
                }
            }
        },

        ask_delete_task(task) {
            this.item_to_delete = task;
            this.delete_type = 'task';
            this.show_confirmation = true;
        },
        ask_delete_column(column) {
            this.item_to_delete = column;
            this.delete_type = 'column';
            this.show_confirmation = true;
        },
        async handle_confirm_delete() {
            if (!this.item_to_delete) return;
            if (this.delete_type === 'task') {
                await this.deleteTask(this.item_to_delete);
                this.is_modal_open = false;
            } else if (this.delete_type === 'column') {
                await this.deleteColumn(this.item_to_delete);
            }
            this.close_confirmation();
        },
        close_confirmation() {
            this.item_to_delete = null;
            this.delete_type = null;
            this.show_confirmation = false;
        },
        track_mouse(e) { this.drag_ctx.current_mouse_x = e.clientX || (e.touches && e.touches[0].clientX); },
        on_column_drag_start(evt) {
            this.drag_ctx.is_dragging = true;
            const client_x = evt.originalEvent.clientX || (evt.originalEvent.touches && evt.originalEvent.touches[0].clientX);
            this.drag_ctx.start_mouse_x = client_x;
            this.drag_ctx.current_mouse_x = client_x;
            const rect = evt.item.getBoundingClientRect();
            this.drag_ctx.initial_top = rect.top;
            window.addEventListener('mousemove', this.track_mouse);
            window.addEventListener('touchmove', this.track_mouse);
            const force_axis_loop = () => {
                if (!this.drag_ctx.is_dragging) return;
                const fallback_el = document.querySelector('.column-fallback');
                if (fallback_el) {
                    const delta_x = this.drag_ctx.current_mouse_x - this.drag_ctx.start_mouse_x;
                    fallback_el.style.setProperty('top', `${this.drag_ctx.initial_top}px`, 'important');
                    fallback_el.style.setProperty('transform', `translate3d(${delta_x}px, 0px, 0px)`, 'important');
                }
                requestAnimationFrame(force_axis_loop);
            };
            requestAnimationFrame(force_axis_loop);
        },
        on_column_drag_end() {
            this.drag_ctx.is_dragging = false;
            window.removeEventListener('mousemove', this.track_mouse);
            window.removeEventListener('touchmove', this.track_mouse);
        },
        on_column_change(event) { console.log(event); },
        open_task_modal(task) {
            if (!task || !task.local_id) return;
            this.selected_task = task;
            this.is_modal_open = true;
        },
        cancel_create_column() { },
        handle_create_column() { }
    },
    async mounted() {
        await this.loadProjectKanban(this.project_local_id);

        this.$nextTick(async () => {
            if (this.project && this.project.id) {
                await this.pullProjectKanban(this.project.id, this.project_local_id);
            }
        });
    }
}
</script>

<style scoped>
.kanban-board {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: transparent;
    position: relative;
}

.kanban-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    flex-shrink: 0;
}

.header-actions {
    display: flex;
    gap: var(--space-3);
}

.kanban-container {
    flex-grow: 1;
    display: flex;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-6);
    overflow-x: auto;
    overflow-y: hidden;
    align-items: flex-start;
}

.column-ghost {
    opacity: 0.2;
    background: rgba(0, 0, 0, 0.1);
    border: 2px dashed var(--gray-300);
    border-radius: var(--radius-md);
}

.column-fallback {
    transition: none !important;
    opacity: 1 !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
    cursor: grabbing !important;
    z-index: 10000 !important;
    pointer-events: none;
}

.column-drag {
    opacity: 0;
}
</style>