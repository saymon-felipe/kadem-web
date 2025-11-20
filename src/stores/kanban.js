import { defineStore } from 'pinia';
import { kanban_repository } from '../services/localData/kanban_repository';
import { syncQueueRepository } from '../services/localData/syncQueueRepository';

export const useKanbanStore = defineStore('kanban', {
    state: () => ({
        columns: {},
        tasks: {}
    }),

    getters: {
        getColumns: (state) => (project_id) => {
            return state.columns[project_id] || [];
        },
        getTasks: (state) => (column_local_id) => {
            return state.tasks[column_local_id] || [];
        },
    },

    actions: {
        async loadProjectKanban(project_id) {
            try {
                const local_columns = await kanban_repository.get_columns_by_project(project_id);
                this.columns[project_id] = local_columns;

                local_columns.forEach(col => {
                    this.tasks[col.local_id] = [];
                });

                const all_tasks = await kanban_repository.get_tasks_by_project(project_id);

                all_tasks.forEach(task => {
                    if (!task.description && task.title) task.description = task.title;

                    if (this.tasks[task.column_id]) {
                        this.tasks[task.column_id].push(task);
                    }
                });

                for (const col_id in this.tasks) {
                    this.tasks[col_id].sort((a, b) => a.order - b.order);
                }

            } catch (error) {
                console.error("[KanbanStore] Erro ao carregar:", error);
            }
        },

        async createColumn(project_id, title) {
            const current_columns = this.columns[project_id] || [];
            const new_column_data = {
                id: null,
                project_id: project_id,
                title: title,
                order: current_columns.length
            };

            try {
                const saved_column = await kanban_repository.add_column(new_column_data);

                if (!this.columns[project_id]) this.columns[project_id] = [];
                this.columns[project_id].push(saved_column);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_COLUMN',
                    payload: saved_column,
                    entity_id: saved_column.local_id,
                    timestamp: Date.now()
                });

                return saved_column;

            } catch (error) {
                console.error("[KanbanStore] Erro criar coluna:", error);
                throw error;
            }
        },

        async updateColumn(column) {
            try {
                const clean_column = JSON.parse(JSON.stringify(column));
                await kanban_repository.update_column(column.local_id, clean_column);

                const project_cols = this.columns[column.project_id];
                if (project_cols) {
                    const idx = project_cols.findIndex(c => c.local_id === column.local_id);
                    if (idx !== -1) {
                        project_cols[idx] = clean_column;
                    }
                }

                await syncQueueRepository.addSyncQueueTask({
                    type: 'UPDATE_COLUMN',
                    payload: clean_column,
                    entity_id: column.local_id,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error("[KanbanStore] Erro update coluna:", error);
            }
        },

        async deleteColumn(column) {
            try {
                if (this.columns[column.project_id]) {
                    this.columns[column.project_id] = this.columns[column.project_id]
                        .filter(c => c.local_id !== column.local_id);
                }
                delete this.tasks[column.local_id];

                await kanban_repository.delete_column(column.local_id);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_COLUMN',
                    payload: { id: column.id, local_id: column.local_id },
                    entity_id: column.local_id,
                    timestamp: Date.now()
                });

            } catch (error) {
                console.error("[KanbanStore] Erro delete coluna:", error);
            }
        },

        async createTask(column_local_id, task_data) {
            const current_tasks = this.tasks[column_local_id] || [];

            const new_task_obj = {
                id: null,
                column_id: column_local_id,
                project_id: task_data.project_id,
                order: current_tasks.length,
                title: '',
                description: task_data.description || '',
                responsible: task_data.responsible || null,
                priority: 'Normal',
                size: 'M - Médio',
                comments: []
            };

            try {
                const saved_task = await kanban_repository.add_task(new_task_obj);

                if (!this.tasks[column_local_id]) this.tasks[column_local_id] = [];
                this.tasks[column_local_id].push(saved_task);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_TASK',
                    payload: saved_task,
                    entity_id: saved_task.local_id,
                    timestamp: Date.now()
                });

                return saved_task;

            } catch (error) {
                console.error("[KanbanStore] Erro CRÍTICO ao criar tarefa:", error);
                throw error;
            }
        },

        async updateTask(task) {
            try {
                const clean_task = JSON.parse(JSON.stringify(task));
                await kanban_repository.update_task(task.local_id, clean_task);

                const column_tasks = this.tasks[task.column_id];
                if (column_tasks) {
                    const index = column_tasks.findIndex(t => t.local_id === task.local_id);
                    if (index !== -1) column_tasks[index] = clean_task;
                }

                await syncQueueRepository.addSyncQueueTask({
                    type: 'UPDATE_TASK',
                    payload: clean_task,
                    entity_id: task.local_id,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error("[KanbanStore] Erro update tarefa:", error);
            }
        },

        async deleteTask(task) {
            try {
                const column_tasks = this.tasks[task.column_id];
                if (column_tasks) {
                    this.tasks[task.column_id] = column_tasks.filter(t => t.local_id !== task.local_id);
                }
                await kanban_repository.delete_task(task.local_id);
                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_TASK',
                    payload: { id: task.id, local_id: task.local_id },
                    entity_id: task.local_id,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error("[KanbanStore] Erro delete tarefa:", error);
            }
        },

        async updateColumnsForProject({ projectId, columns }) {
            this.columns[projectId] = columns;
            try {
                const plain_columns = JSON.parse(JSON.stringify(columns));
                const updates = plain_columns.map((col, index) => ({ ...col, order: index }));
                await kanban_repository.bulk_put_columns(updates);
                await syncQueueRepository.addSyncQueueTask({
                    type: 'REORDER_COLUMNS',
                    payload: { project_id: projectId, columns_order: updates },
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error("Erro reordenar colunas:", error);
            }
        },

        async updateTasksForColumn({ columnId, tasks, event }) {
            this.tasks[columnId] = tasks;
            try {
                const plain_tasks = JSON.parse(JSON.stringify(tasks));
                const updates = plain_tasks.map((t, index) => ({
                    ...t,
                    column_id: columnId,
                    order: index
                }));
                await kanban_repository.bulk_put_tasks(updates);
                if (event && (event.added || event.moved)) {
                    await syncQueueRepository.addSyncQueueTask({
                        type: 'MOVE_TASK_LIST',
                        payload: { column_id: columnId, tasks: updates },
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error("Erro mover tarefas:", error);
            }
        }
    }
});