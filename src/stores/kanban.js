import { defineStore } from 'pinia';
import { kanbanRepository } from '../services/localData/kanbanRepository';
import { syncQueueRepository } from '../services/localData/syncQueueRepository';
import { syncService } from '../services/syncService';
import { useAuthStore } from './auth';
import { api } from '../plugins/api';

export const useKanbanStore = defineStore('kanban', {
    state: () => ({
        columns: {},
        tasks: {}
    }),

    getters: {
        getColumns: (state) => (project_id) => {
            const pid = Number(project_id) || project_id;
            return state.columns[pid] || [];
        },
        getTasks: (state) => (column_local_id) => {
            return state.tasks[column_local_id] || [];
        },
    },

    actions: {
        async addCommentToTask(task, content) {
            const authStore = useAuthStore();
            const user = authStore.user;

            const newComment = {
                id: null,
                local_id: Date.now() + Math.floor(Math.random() * 1000),
                task_local_id: task.local_id,
                content: content,
                author: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar
                },
                created_at: new Date().toISOString(),
                likes: 0,
                liked_by_me: false
            };

            try {
                const taskInDb = await kanbanRepository.get_task_by_local_id(task.local_id);

                if (taskInDb) {
                    const commentsList = taskInDb.comments ? [...taskInDb.comments] : [];
                    commentsList.push(newComment);
                    await kanbanRepository.update_task(task.local_id, { comments: commentsList });

                    if (this.tasks[task.column_id]) {
                        const storedTask = this.tasks[task.column_id].find(t => t.local_id === task.local_id);
                        if (storedTask) {
                            if (!storedTask.comments) storedTask.comments = [];
                            storedTask.comments.push(newComment);
                        }
                    }
                }

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_TASK_COMMENT',
                    payload: {
                        content: content,
                        created_at: newComment.created_at,
                        task_local_id: task.local_id,
                        local_id: newComment.local_id
                    },
                    entity_id: newComment.local_id,
                    timestamp: Date.now()
                });

                syncService.processSyncQueue();

                return newComment;

            } catch (error) {
                console.error("[KanbanStore] Erro ao adicionar comentário:", error);
                throw error;
            }
        },

        async toggleCommentLike(task, comment) {
            let storedComment = null;

            if (this.tasks[task.column_id]) {
                const storedTask = this.tasks[task.column_id].find(t => t.local_id === task.local_id);
                if (storedTask && storedTask.comments) {
                    storedComment = storedTask.comments.find(c => c.local_id === comment.local_id);
                }
            }

            const currentStatus = storedComment ? storedComment.liked_by_me : comment.liked_by_me;

            const isLiked = !currentStatus;
            const newCount = isLiked ? (storedComment?.likes || 0) + 1 : (storedComment?.likes || 0) - 1;

            if (storedComment) {
                storedComment.liked_by_me = isLiked;
                storedComment.likes = newCount;
            }

            await kanbanRepository.update_local_comment_state(task.local_id, comment.local_id, {
                liked_by_me: isLiked,
                likes: newCount
            });

            await syncQueueRepository.addSyncQueueTask({
                type: 'TOGGLE_COMMENT_LIKE',
                payload: {
                    comment_local_id: comment.local_id,
                    task_local_id: task.local_id
                },
                entity_id: comment.local_id,
                timestamp: Date.now()
            });

            syncService.processSyncQueue();
        },

        async pullProjectKanban(serverProjectId, localProjectId) {
            if (!navigator.onLine) return;

            try {
                const response = await api.get(`/kanban/projects/${serverProjectId}`);
                const { project, columns, tasks, members } = response.data;

                await kanbanRepository.mergeServerData(localProjectId, columns, tasks);

                if (project) {
                    const { useProjectStore } = await import('./projects');
                    const projectStore = useProjectStore();
                    await projectStore.updateProject({ localId: localProjectId }, {
                        ...project,
                        members: members || []
                    });
                }

                await this.loadProjectKanban(localProjectId);

            } catch (error) {
                console.error("[KanbanStore] Erro pull:", error);
            }
        },

        async loadProjectKanban(project_id) {
            try {
                const pid = Number(project_id) || project_id;

                const local_columns = await kanbanRepository.get_columns_by_project(pid);
                this.columns[pid] = local_columns;

                local_columns.forEach(col => {
                    this.tasks[col.local_id] = [];
                });

                const all_tasks = await kanbanRepository.get_tasks_by_project(pid);

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
            const pid = Number(project_id) || project_id;
            const current_columns = this.columns[pid] || [];
            const new_column_data = {
                id: null,
                project_id: pid,
                title: title,
                order: current_columns.length
            };

            try {
                const saved_column = await kanbanRepository.add_column(new_column_data);

                if (!this.columns[pid]) this.columns[pid] = [];
                this.columns[pid].push(saved_column);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_COLUMN',
                    payload: saved_column,
                    entity_id: saved_column.local_id,
                    timestamp: Date.now()
                });

                syncService.processSyncQueue();

                return saved_column;

            } catch (error) {
                console.error("[KanbanStore] Erro criar coluna:", error);
                throw error;
            }
        },

        async updateColumn(column) {
            try {
                const clean_column = JSON.parse(JSON.stringify(column));
                await kanbanRepository.update_column(column.local_id, clean_column);

                const pid = column.project_id;
                const project_cols = this.columns[pid];
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

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[KanbanStore] Erro update coluna:", error);
            }
        },

        async deleteColumn(column) {
            try {
                const pid = column.project_id;
                if (this.columns[pid]) {
                    this.columns[pid] = this.columns[pid]
                        .filter(c => c.local_id !== column.local_id);
                }
                delete this.tasks[column.local_id];

                await kanbanRepository.delete_column(column.local_id);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_COLUMN',
                    payload: { id: column.id, local_id: column.local_id },
                    entity_id: column.local_id,
                    timestamp: Date.now()
                });

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[KanbanStore] Erro delete coluna:", error);
            }
        },

        async createTask(column_local_id, task_data) {
            const { useAuthStore } = await import('./auth');
            const authStore = useAuthStore();
            const current_tasks = this.tasks[column_local_id] || [];
            const pid = Number(task_data.project_id) || task_data.project_id;

            const new_task_obj = {
                id: null,
                column_id: column_local_id,
                project_id: pid,
                order: current_tasks.length,
                title: '',
                description: task_data.description || '',
                responsible: task_data.responsible || null,
                creator: {
                    id: authStore.user.id,
                    name: authStore.user.name,
                    avatar: authStore.user.avatar
                },
                created_at: new Date().toISOString(),
                priority: 'Normal',
                size: 'M - Médio',
                comments: []
            };

            try {
                const saved_task = await kanbanRepository.add_task(new_task_obj);

                if (!this.tasks[column_local_id]) this.tasks[column_local_id] = [];
                this.tasks[column_local_id].push(saved_task);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_TASK',
                    payload: saved_task,
                    entity_id: saved_task.local_id,
                    timestamp: Date.now()
                });

                syncService.processSyncQueue();

                return saved_task;

            } catch (error) {
                console.error("[KanbanStore] Erro CRÍTICO ao criar tarefa:", error);
                throw error;
            }
        },

        async updateTask(task) {
            try {
                const clean_task = JSON.parse(JSON.stringify(task));
                await kanbanRepository.update_task(task.local_id, clean_task);

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

                syncService.processSyncQueue();

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
                await kanbanRepository.delete_task(task.local_id);
                await syncQueueRepository.addSyncQueueTask({
                    type: 'DELETE_TASK',
                    payload: { id: task.id, local_id: task.local_id },
                    entity_id: task.local_id,
                    timestamp: Date.now()
                });

                syncService.processSyncQueue();

            } catch (error) {
                console.error("[KanbanStore] Erro delete tarefa:", error);
            }
        },

        async updateColumnsForProject({ projectId, columns }) {
            const pid = Number(projectId) || projectId;
            this.columns[pid] = columns;
            try {
                const plain_columns = JSON.parse(JSON.stringify(columns));
                const updates = plain_columns.map((col, index) => ({ ...col, order: index }));
                await kanbanRepository.bulk_put_columns(updates);
                await syncQueueRepository.addSyncQueueTask({
                    type: 'REORDER_COLUMNS',
                    payload: { project_id: pid, columns_order: updates },
                    timestamp: Date.now()
                });
                syncService.processSyncQueue();
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
                await kanbanRepository.bulk_put_tasks(updates);
                if (event && (event.added || event.moved)) {
                    await syncQueueRepository.addSyncQueueTask({
                        type: 'MOVE_TASK_LIST',
                        payload: { column_id: columnId, tasks: updates },
                        timestamp: Date.now()
                    });
                    syncService.processSyncQueue();
                }
            } catch (error) {
                console.error("Erro mover tarefas:", error);
            }
        }
    }
});