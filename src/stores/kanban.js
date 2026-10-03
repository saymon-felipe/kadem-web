import { defineStore } from 'pinia';
import { kanbanRepository } from '../services/localData/kanbanRepository';
import { syncQueueRepository } from '../services/localData/syncQueueRepository';
import { projectRepository } from '../services/localData/projectRepository';
import { syncService } from '../services/syncService';
import { useAuthStore } from './auth';
import { api } from '../plugins/api';
import { useUtilsStore } from '../stores/utils';
import { getPlanLimits } from '../services/subscription_plans';
import { canSetTaskParent } from '../utils/taskHierarchy';
import { db } from '../db';
import { DEFAULT_COLUMN_TYPE, isColumnType, normalizeColumn } from '../utils/kanbanTypes';

const loadKanbanSyncs = () => {
  if (localStorage.getItem('kadem_kanban_semantics_version') !== '1') {
    localStorage.removeItem('kadem_kanban_syncs');
    localStorage.setItem('kadem_kanban_semantics_version', '1');
  }
  return JSON.parse(localStorage.getItem('kadem_kanban_syncs') || '{}');
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

export const useKanbanStore = defineStore('kanban', {
  state: () => ({
    columns: {},
    tasks: {},
    lastSyncs: loadKanbanSyncs()
  }),

  getters: {
    taskHierarchy: (state) => {
      const byId = new Map();
      const children = new Map();
      for (const columns of Object.values(state.columns)) {
        for (const task of columns.flatMap(column => state.tasks[column.local_id] || [])) {
          byId.set(task.local_id, task);
          if (task.parent_task_local_id != null) {
            if (!children.has(task.parent_task_local_id)) children.set(task.parent_task_local_id, []);
            children.get(task.parent_task_local_id).push(task);
          }
        }
      }
      return { byId, children };
    },
    getProjectTasks: (state) => (projectId) =>
      (state.columns[projectId] || []).flatMap(column => state.tasks[column.local_id] || []),
    getColumns: (state) => (project_id) => {
      const pid = Number(project_id) || project_id;
      return state.columns[pid] || [];
    },
    getTasks: (state) => (column_local_id) => {
      return state.tasks[column_local_id] || [];
    },
  },

  actions: {
    async setTaskParent(task, parentLocalId) {
      const localTask = await kanbanRepository.get_task_by_local_id(task.local_id);
      if (!localTask) throw new Error('Tarefa não encontrada.');
      await db.transaction('rw', db.kanban_tasks, db.syncQueue, async () => {
        const tasks = await db.kanban_tasks.where('project_id').equals(localTask.project_id).toArray();
        if (!canSetTaskParent(tasks, task.local_id, parentLocalId)) {
          throw new Error('Escolha uma tarefa do mesmo projeto que não forme um vínculo circular.');
        }
        const current = tasks.find(t => t.local_id === task.local_id);
        const timestamp = Math.max(Date.now(), (current.parent_link_timestamp || 0) + 1);
        await kanbanRepository.update_task(task.local_id, { parent_task_local_id: parentLocalId, parent_link_timestamp: timestamp });
        await syncQueueRepository.addSyncQueueTask({
          type: 'UPDATE_TASK_PARENT',
          entity_id: task.local_id,
          payload: { local_id: task.local_id, parent_task_local_id: parentLocalId },
          timestamp,
        });
      });
      const storedTask = this.taskHierarchy.byId.get(task.local_id);
      if (storedTask) storedTask.parent_task_local_id = parentLocalId;
      syncService.processSyncQueue();
    },

    async detachChildren(taskIds) {
      const ids = new Set(taskIds);
      for (const task of this.taskHierarchy.byId.values()) {
        if (ids.has(task.parent_task_local_id) && !ids.has(task.local_id)) {
          await this.setTaskParent(task, null);
        }
      }
    },
    async loadBoardFromLocal(projectId) {
      if (!projectId) return;

      const localColumns = await kanbanRepository.get_columns_by_project(projectId);

      this.columns[projectId] = localColumns;

      // Cada leitura hidrata também os anexos: fazê-la por coluna multiplica
      // consultas, cópias e blobs em memória pelo número de colunas.
      const localTasks = localColumns.length
        ? await kanbanRepository.get_tasks_by_project(projectId)
        : [];
      const tasksByColumn = new Map();
      for (const task of localTasks) {
        if (!tasksByColumn.has(task.column_id)) tasksByColumn.set(task.column_id, []);
        tasksByColumn.get(task.column_id).push(task);
      }
      for (const col of localColumns) {
        const columnTasks = (tasksByColumn.get(col.local_id) || [])
          .sort((a, b) => a.order - b.order);

        this.tasks[col.local_id] = columnTasks;
      }
    },
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

    async editTaskComment(task, comment, newContent) {
      if (this.tasks[task.column_id]) {
        const storedTask = this.tasks[task.column_id].find(t => t.local_id === task.local_id);
        if (storedTask && storedTask.comments) {
          const target = storedTask.comments.find(c => c.local_id === comment.local_id);
          if (target) target.content = newContent;
        }
      }

      await kanbanRepository.edit_comment_content(task.local_id, comment.local_id, newContent);

      await syncQueueRepository.addSyncQueueTask({
        type: 'UPDATE_TASK_COMMENT',
        payload: {
          task_local_id: task.local_id,
          comment_local_id: comment.local_id,
          content: newContent
        },
        entity_id: comment.local_id,
        timestamp: Date.now()
      });
      syncService.processSyncQueue();
    },

    async deleteTaskComment(task, comment) {
      if (this.tasks[task.column_id]) {
        const storedTask = this.tasks[task.column_id].find(t => t.local_id === task.local_id);
        if (storedTask && storedTask.comments) {
          storedTask.comments = storedTask.comments.filter(c => c.local_id !== comment.local_id);
        }
      }

      await kanbanRepository.remove_comment(task.local_id, comment.local_id);

      await syncQueueRepository.addSyncQueueTask({
        type: 'DELETE_TASK_COMMENT',
        payload: {
          task_local_id: task.local_id,
          comment_local_id: comment.local_id,
          server_id: comment.id
        },
        entity_id: comment.local_id,
        timestamp: Date.now()
      });
      syncService.processSyncQueue();
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

    async syncAllBoards() {
      const { useProjectStore } = await import('./projects');
      const projectStore = useProjectStore();

      if (projectStore.projects.length === 0) {
        await projectStore._loadProjectsFromDB();
      }

      for (const proj of projectStore.projects) {
        if (proj.id && proj.localId) {
          this.pullProjectKanban(proj.id, proj.localId);
        }
      }
    },

    async pullProjectKanban(serverProjectId, localProjectId) {
      await this.loadBoardFromLocal(localProjectId);

      const utilsStore = useUtilsStore();

      if (!utilsStore.connection.connected) return;

      try {
        const params = {};
        const lastSync = this.lastSyncs[localProjectId];

        const isDelta = !!lastSync;

        if (isDelta) {
          params.since = lastSync;
        }

        const response = await api.get(`/kanban/projects/${serverProjectId}`, { params });

        let apiData = response.data;
        let serverTimestamp = null;

        if (apiData && (apiData.server_timestamp || apiData.data)) {
          serverTimestamp = apiData.server_timestamp;
          apiData = apiData.data || apiData;
        }

        const { project, columns, tasks, members } = apiData;

        const shouldMerge = !isDelta || (columns && columns.length > 0) || (tasks && tasks.length > 0);

        if (shouldMerge) {
          await kanbanRepository.mergeServerData(localProjectId, columns || [], tasks || [], isDelta);

          if (project) {
            const localProject = await projectRepository.getLocalProject(localProjectId);

            if (localProject) {
              const updatedProject = {
                ...localProject,
                ...project,
                members: members || localProject.members || []
              };

              await projectRepository.saveLocalProject(updatedProject);

              const { useProjectStore } = await import('./projects');
              const projectStore = useProjectStore();

              if (projectStore.projects.length > 0) {
                const idx = projectStore.projects.findIndex(p => p.localId === localProjectId);
                if (idx !== -1) {
                  projectStore.projects[idx] = updatedProject;
                }
              }
            }
          }

          await this.loadBoardFromLocal(localProjectId);
        }

        if (serverTimestamp) {
          this.lastSyncs[localProjectId] = serverTimestamp;
          localStorage.setItem('kadem_kanban_syncs', JSON.stringify(this.lastSyncs));
        }

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

    async createColumn(project_id, title, type = DEFAULT_COLUMN_TYPE) {
      if (!isColumnType(type)) throw new Error('Tipo de coluna inválido.');
      const pid = Number(project_id) || project_id;
      const current_columns = this.columns[pid] || [];
      const new_column_data = {
        id: null,
        project_id: pid,
        title: title,
        type,
        order: current_columns.length
      };

      try {
        const saved_column = await db.transaction('rw', db.kanban_columns, db.syncQueue, async () => {
          const saved = await kanbanRepository.add_column(new_column_data);
          await syncQueueRepository.addSyncQueueTask({
            type: 'CREATE_COLUMN', payload: saved, entity_id: saved.local_id, timestamp: Date.now()
          });
          return saved;
        });

        if (!this.columns[pid]) this.columns[pid] = [];
        this.columns[pid].push(saved_column);

        await syncService.processSyncQueue();
        const refreshedColumn = await kanbanRepository.get_column_by_local_id(saved_column.local_id);
        if (refreshedColumn) {
          Object.assign(saved_column, refreshedColumn);
          const idx = this.columns[pid].findIndex(c => c.local_id === saved_column.local_id);
          if (idx !== -1) this.columns[pid][idx] = refreshedColumn;
          return refreshedColumn;
        }

        return saved_column;

      } catch (error) {
        console.error("[KanbanStore] Erro criar coluna:", error);
        throw error;
      }
    },

    async updateColumn(column) {
      try {
        const clean_column = await db.transaction('rw', db.kanban_columns, db.syncQueue, async () => {
          const existing = await kanbanRepository.get_column_by_local_id(column.local_id);
          if (!existing) throw new Error('Coluna não encontrada.');
          const patch = { ...column };
          if (patch.name !== undefined && patch.title === undefined) patch.title = patch.name;
          if (patch.position !== undefined && patch.order === undefined) patch.order = patch.position;
          const next = normalizeColumn({ ...existing, ...patch });
          if (!isColumnType(next.type)) throw new Error('Tipo de coluna inválido.');
          const payload = { id: existing.id, local_id: column.local_id };
          for (const field of ['title', 'type', 'order']) {
            if (next[field] !== existing[field]) payload[field] = next[field];
          }
          if (Object.keys(payload).length === 2) return next;
          const timestamp = Math.max(Date.now(), (existing.column_change_timestamp || 0) + 1);
          next.column_change_timestamp = timestamp;
          await kanbanRepository.update_column(column.local_id, next);
          await syncQueueRepository.addSyncQueueTask({
            type: 'UPDATE_COLUMN', payload, entity_id: column.local_id, timestamp
          });
          return next;
        });

        const pid = clean_column.project_id;
        const project_cols = this.columns[pid];
        if (project_cols) {
          const idx = project_cols.findIndex(c => c.local_id === column.local_id);
          if (idx !== -1) {
            project_cols[idx] = clean_column;
          }
        }

        for (const task of this.tasks[column.local_id] || []) task.status = clean_column.type;

        await syncService.processSyncQueue();

      } catch (error) {
        console.error("[KanbanStore] Erro update coluna:", error);
        throw error;
      }
    },

    async deleteColumn(column) {
      try {
        await this.detachChildren((this.tasks[column.local_id] || []).map(task => task.local_id));
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
      const parentLocalId = task_data.parent_task_local_id ?? null;
      if (parentLocalId != null) {
        const parent = await kanbanRepository.get_task_by_local_id(parentLocalId);
        if (!parent || parent.project_id !== pid) throw new Error('Tarefa pai inválida.');
      }

      const new_task_obj = {
        id: null,
        column_id: column_local_id,
        parent_task_local_id: parentLocalId,
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
      const column = await kanbanRepository.get_column_by_local_id(column_local_id);
      if (!column || column.project_id !== pid) throw new Error('A coluna deve pertencer ao mesmo projeto da tarefa.');
      new_task_obj.status = column?.type || DEFAULT_COLUMN_TYPE;

      try {
        const saved_task = await db.transaction('rw', db.kanban_tasks, db.syncQueue, async () => {
          const saved = await kanbanRepository.add_task(new_task_obj);
          await syncQueueRepository.addSyncQueueTask({
            type: 'CREATE_TASK',
            payload: saved,
            entity_id: saved.local_id,
            timestamp: Date.now()
          });
          return saved;
        });

        if (!this.tasks[column_local_id]) this.tasks[column_local_id] = [];
        this.tasks[column_local_id].push(saved_task);

        await syncService.processSyncQueue();
        const refreshedTask = await kanbanRepository.get_task_by_local_id(saved_task.local_id);
        if (refreshedTask) {
          Object.assign(saved_task, refreshedTask);
          const idx = this.tasks[column_local_id].findIndex(t => t.local_id === saved_task.local_id);
          if (idx !== -1) this.tasks[column_local_id][idx] = { ...refreshedTask, attachments: [] };
          return { ...refreshedTask, attachments: [] };
        }

        return saved_task;

      } catch (error) {
        console.error("[KanbanStore] Erro CRÍTICO ao criar tarefa:", error);
        throw error;
      }
    },

    async updateTask(task) {
      try {
        const attachments = task.attachments || [];
        const clean_task = JSON.parse(JSON.stringify({ ...task, attachments: undefined, parent_task_local_id: undefined, parent_task_id: undefined, parent_link_timestamp: undefined,
          column_id: undefined, order: undefined, status: undefined, events: undefined, column_move_timestamp: undefined }));
        await kanbanRepository.update_task(task.local_id, clean_task);

        const column_tasks = this.tasks[task.column_id];
        if (column_tasks) {
          const index = column_tasks.findIndex(t => t.local_id === task.local_id);
          if (index !== -1) column_tasks[index] = { ...column_tasks[index], ...clean_task, attachments };
        }

        await syncQueueRepository.addSyncQueueTask({
          type: 'UPDATE_TASK',
          payload: clean_task,
          entity_id: task.local_id,
          timestamp: Date.now()
        });

        await syncService.processSyncQueue();

      } catch (error) {
        console.error("[KanbanStore] Erro update tarefa:", error);
        throw error;
      }
    },

    async deleteTask(task) {
      try {
        await this.detachChildren([task.local_id]);
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

        await syncService.processSyncQueue();

      } catch (error) {
        console.error("[KanbanStore] Erro delete tarefa:", error);
      }
    },

    async updateColumnsForProject({ projectId, columns }) {
      const pid = Number(projectId) || projectId;
      this.columns[pid] = columns.map((column, index) => normalizeColumn({ ...column, order: index }));
      try {
        const plain_columns = JSON.parse(JSON.stringify(columns));
        const updates = plain_columns.map((col, index) => normalizeColumn({ ...col, order: index }));
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
      const column = Object.values(this.columns).flat().find(column => column.local_id === columnId);
      // O vuedraggable move o mesmo objeto entre as listas sem alterá-lo. Sem atualizar
      // column_id/order aqui, deleteTask, updateTask e anexos procurariam a tarefa na coluna
      // de origem (a exclusão só sumia da tela após F5 e a edição devolvia a tarefa à coluna antiga).
      tasks.forEach((task, index) => {
        task.column_id = columnId;
        task.order = index;
        task.status = column?.type || DEFAULT_COLUMN_TYPE;
      });
      this.tasks[columnId] = tasks;
      try {
        const isMove = event && (event.added || event.moved);
        const timestamp = Math.max(Date.now(), ...tasks.map(task => (task.column_move_timestamp || 0) + 1));
        if (isMove) tasks.forEach(task => { task.column_move_timestamp = timestamp; });
        const updates = JSON.parse(JSON.stringify(tasks));
        await db.transaction('rw', db.kanban_tasks, db.syncQueue, async () => {
          await kanbanRepository.bulk_put_tasks(updates);
          if (isMove) await syncQueueRepository.addSyncQueueTask({
            type: 'MOVE_TASK_LIST', payload: { column_id: columnId, tasks: updates }, timestamp
          });
        });
        if (isMove) {
          await syncService.processSyncQueue();
        }
      } catch (error) {
        console.error("Erro mover tarefas:", error);
      }
    },

    async moveTaskToColumn(task, targetColumnId) {
      if (!task || !targetColumnId || task.column_id === targetColumnId) return;
      const fromColumnId = task.column_id;
      const source = this.tasks[fromColumnId];
      if (!source) return;
      const taskIndex = source.findIndex((t) => t.local_id === task.local_id);
      if (taskIndex === -1) return;

      if (!this.tasks[targetColumnId]) {
        this.tasks[targetColumnId] = [];
      }

      const [moved] = source.splice(taskIndex, 1);
      this.tasks[targetColumnId].push(moved);

      await this.updateTasksForColumn({
        columnId: fromColumnId,
        tasks: this.tasks[fromColumnId],
        event: { removed: { element: moved } },
      });
      await this.updateTasksForColumn({
        columnId: targetColumnId,
        tasks: this.tasks[targetColumnId],
        event: { added: { element: moved } },
      });
    },

    // `onSaved` roda assim que o anexo esta gravado no Dexie e visivel na tarefa, antes do envio ao
    // servidor (que pode demorar). Permite a tela trocar o "preparando" pela linha real do anexo.
    async addTaskAttachment(task, file, { onSaved } = {}) {
      const authStore = useAuthStore();
      const limits = getPlanLimits(authStore.user?.plan_tier || 'free');
      const maxSize = limits.max_task_attachment_size_bytes || (5 * 1024 * 1024);

      if (!file) return null;
      if (file.size > maxSize) {
        throw new Error(`Arquivo acima do limite do seu plano (${formatBytes(maxSize)}).`);
      }

      const attachmentData = {
        id: null,
        task_id: task.id || null,
        task_local_id: task.local_id,
        project_id: task.project_id,
        name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        url: null,
        blob: file,
        upload_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedAttachment = await kanbanRepository.add_attachment(attachmentData);
      const columnTasks = this.tasks[task.column_id];
      if (columnTasks) {
        const target = columnTasks.find(t => t.local_id === task.local_id);
        if (target) {
          if (!target.attachments) target.attachments = [];
          target.attachments.push(savedAttachment);
        }
      }

      onSaved?.(savedAttachment);

      await syncQueueRepository.addSyncQueueTask({
        type: 'ADD_TASK_ATTACHMENT',
        payload: {
          attachment_local_id: savedAttachment.local_id,
          task_local_id: task.local_id
        },
        entity_id: savedAttachment.local_id,
        timestamp: Date.now()
      });

      await syncService.processSyncQueue();

      return (await this.refreshTaskAttachment(task, savedAttachment.local_id)) || savedAttachment;
    },

    // Relê o anexo do Dexie (status, id e url vindos do servidor) e troca a cópia da tarefa na store.
    async refreshTaskAttachment(task, attachment_local_id) {
      const refreshedAttachment = await kanbanRepository.get_attachment_by_local_id(attachment_local_id);
      if (!refreshedAttachment) return null;

      const target = this.tasks[task.column_id]?.find(t => t.local_id === task.local_id);
      const idx = target?.attachments?.findIndex(a => a.local_id === attachment_local_id);
      if (idx !== undefined && idx !== -1) {
        target.attachments[idx] = refreshedAttachment;
      }
      return refreshedAttachment;
    },

    async deleteTaskAttachment(task, attachment) {
      await kanbanRepository.delete_attachment(attachment.local_id);

      const columnTasks = this.tasks[task.column_id];
      if (columnTasks) {
        const target = columnTasks.find(t => t.local_id === task.local_id);
        if (target?.attachments) {
          target.attachments = target.attachments.filter(a => a.local_id !== attachment.local_id);
        }
      }

      await syncQueueRepository.addSyncQueueTask({
        type: 'DELETE_TASK_ATTACHMENT',
        payload: {
          id: attachment.id,
          local_id: attachment.local_id
        },
        entity_id: attachment.local_id,
        timestamp: Date.now()
      });

      await syncService.processSyncQueue();
    }
  }
});
