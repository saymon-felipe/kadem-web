import { db } from '../../db';
import { normalizeColumn, DEFAULT_COLUMN_TYPE } from '../../utils/kanbanTypes';

const strip_task_relations = (task) => {
    if (!task) return task;
    const { attachments, ...taskRecord } = task;
    return taskRecord;
};

const attach_files_to_tasks = async (tasks, project_id) => {
    const attachments = await db.kanban_task_attachments
        .where('project_id')
        .equals(project_id)
        .toArray();

    const attachmentsByTask = attachments.reduce((acc, attachment) => {
        if (!acc[attachment.task_local_id]) acc[attachment.task_local_id] = [];
        acc[attachment.task_local_id].push(attachment);
        return acc;
    }, {});

    return tasks.map(task => ({
        ...task,
        attachments: (attachmentsByTask[task.local_id] || [])
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    }));
};

export const kanbanRepository = {
    async get_columns_by_project(project_id) {
        const columns = await db.kanban_columns.where('project_id').equals(project_id).toArray();
        return columns.map(normalizeColumn).sort((a, b) => a.order - b.order);
    },

    async get_column_by_local_id(local_id) {
        return await db.kanban_columns.get(local_id);
    },

    async add_column(data) {
        const column = normalizeColumn(data);
        const id = await db.kanban_columns.add(column);
        return { ...column, local_id: id };
    },

    async update_column(local_id, data) {
        return await db.kanban_columns.update(local_id, data);
    },

    async setServerIdForColumn(localId, serverId) {
        return await db.kanban_columns.update(localId, { id: serverId });
    },

    async delete_column(local_id) {
        await db.transaction('rw', db.kanban_columns, db.kanban_tasks, async () => {
            const tasks = await db.kanban_tasks.where('column_id').equals(local_id).toArray();
            for (const task of tasks) await this.delete_task(task.local_id);
            await db.kanban_columns.delete(local_id);
        });
    },

    async bulk_put_columns(cols) {
        return await db.kanban_columns.bulkPut(cols);
    },

    async get_tasks_by_project(pid) {
        const tasks = await db.kanban_tasks.where('project_id').equals(pid).toArray();
        const columns = await this.get_columns_by_project(pid);
        const types = new Map(columns.map(column => [column.local_id, column.type]));
        return await attach_files_to_tasks(tasks.map(task => ({ ...task, status: types.get(task.column_id) || DEFAULT_COLUMN_TYPE })), pid);
    },

    async get_task_by_local_id(lid) {
        const task = await db.kanban_tasks.get(lid);
        if (!task) return task;
        const column = await db.kanban_columns.get(task.column_id);
        return { ...task, status: column?.type || DEFAULT_COLUMN_TYPE };
    },

    async add_task(data) {
        const id = await db.kanban_tasks.add(data);
        return { ...data, local_id: id };
    },

    async update_task(lid, data) {
        return await db.kanban_tasks.update(lid, strip_task_relations(data));
    },

    async setServerIdForTask(lid, sid) {
        return await db.kanban_tasks.update(lid, { id: sid });
    },

    async delete_task(lid) {
        await db.transaction('rw', db.kanban_tasks, async () => {
            await db.kanban_tasks.where('parent_task_local_id').equals(lid)
                .modify({ parent_task_local_id: null });
            await db.kanban_tasks.delete(lid);
        });
    },

    async bulk_put_tasks(tasks) {
        return await db.kanban_tasks.bulkPut(tasks.map(strip_task_relations));
    },

    async get_attachment_by_local_id(local_id) {
        return await db.kanban_task_attachments.get(local_id);
    },

    async add_attachment(data) {
        const local_id = await db.kanban_task_attachments.add(data);
        return { ...data, local_id };
    },

    async update_attachment(local_id, data) {
        return await db.kanban_task_attachments.update(local_id, data);
    },

    async setServerDataForAttachment(local_id, serverData) {
        return await db.kanban_task_attachments.update(local_id, {
            id: serverData.id,
            task_id: serverData.task_id,
            url: serverData.url,
            upload_status: 'synced',
            blob: null,
            updated_at: serverData.updated_at || new Date().toISOString()
        });
    },

    async delete_attachment(local_id) {
        return await db.kanban_task_attachments.delete(local_id);
    },

    async update_local_comment_state(task_local_id, comment_local_id, updates) {
        await db.transaction('rw', db.kanban_tasks, async () => {
            const task = await db.kanban_tasks.get(task_local_id);
            if (task && task.comments) {
                const commentIndex = task.comments.findIndex(c => c.local_id === comment_local_id);
                if (commentIndex !== -1) {
                    task.comments[commentIndex] = { ...task.comments[commentIndex], ...updates };
                    await db.kanban_tasks.update(task_local_id, { comments: task.comments });
                }
            }
        });
    },

    async edit_comment_content(task_local_id, comment_local_id, new_content) {
        await db.transaction('rw', db.kanban_tasks, async () => {
            const task = await db.kanban_tasks.get(task_local_id);
            if (task && task.comments) {
                const index = task.comments.findIndex(c => c.local_id === comment_local_id);
                if (index !== -1) {
                    task.comments[index].content = new_content;
                    await db.kanban_tasks.update(task_local_id, { comments: task.comments });
                }
            }
        });
    },

    async remove_comment(task_local_id, comment_local_id) {
        await db.transaction('rw', db.kanban_tasks, async () => {
            const task = await db.kanban_tasks.get(task_local_id);
            if (task && task.comments) {
                const newComments = task.comments.filter(c => c.local_id !== comment_local_id);
                await db.kanban_tasks.update(task_local_id, { comments: newComments });
            }
        });
    },

    async mergeServerData(localProjectId, apiColumns, apiTasks, isDelta = false) {
        if (isDelta && (!apiColumns?.length && !apiTasks?.length)) {
            return;
        }

        await db.transaction('rw', db.kanban_columns, db.kanban_tasks, db.kanban_task_attachments, db.syncQueue, async () => {
            // Includes retries scheduled in the future and failed operations: no silent loss.
            const queue = await db.syncQueue.toArray();
            const pendingParents = new Set(queue.filter(t =>
                t.type === 'UPDATE_TASK_PARENT' || t.type === 'CREATE_TASK'
            ).map(t => t.entity_id));
            const deletedTasks = new Set(queue.filter(t => t.type === 'DELETE_TASK').map(t => t.payload.id));
            const deletedColumns = new Set(queue.filter(t => t.type === 'DELETE_COLUMN').map(t => t.payload.id));
            const pendingTasks = new Set(queue.filter(t => t.type === 'UPDATE_TASK').map(t => t.entity_id));
            for (const operation of queue.filter(t => t.type === 'MOVE_TASK_LIST')) {
                for (const task of operation.payload.tasks) pendingTasks.add(task.local_id);
            }
            const pendingColumnFields = new Map();
            const protectColumnFields = (localId, fields) => {
                if (!pendingColumnFields.has(localId)) pendingColumnFields.set(localId, new Set());
                fields.forEach(field => pendingColumnFields.get(localId).add(field));
            };
            for (const operation of queue) {
                if (operation.type === 'UPDATE_COLUMN') protectColumnFields(operation.entity_id, Object.keys(operation.payload));
                if (operation.type === 'REORDER_COLUMNS') {
                    operation.payload.columns_order.forEach(column => protectColumnFields(column.local_id, ['order', 'position']));
                }
            }
            const serverColumnIds = apiColumns.map(c => c.id);
            const serverTaskIds = apiTasks.map(t => t.id);

            if (!isDelta) {
                await db.kanban_columns
                    .where('project_id').equals(localProjectId)
                    .filter(col => col.id != null && !serverColumnIds.includes(col.id) && !pendingColumnFields.has(col.local_id))
                    .delete();

                await db.kanban_tasks
                    .where('project_id').equals(localProjectId)
                    .filter(task => task.id != null && !serverTaskIds.includes(task.id) &&
                        !pendingParents.has(task.local_id) && !pendingTasks.has(task.local_id))
                    .delete();
            }

            const columnIdMap = new Map();

            const currentCols = await db.kanban_columns.where('project_id').equals(localProjectId).toArray();
            currentCols.forEach(c => {
                if (c.id) columnIdMap.set(c.id, c.local_id);
            });

            for (const col of apiColumns) {
                if (deletedColumns.has(col.id)) continue;
                let existingLocalId = columnIdMap.get(col.id);

                if (!existingLocalId) {
                    const existing = await db.kanban_columns.where({ project_id: localProjectId }).filter(c => c.id === col.id).first();
                    if (existing) existingLocalId = existing.local_id;
                }

                const colData = normalizeColumn({
                    id: col.id,
                    project_id: localProjectId,
                    title: col.title,
                    name: col.name,
                    type: col.type || DEFAULT_COLUMN_TYPE,
                    order: col.position ?? col.order ?? col.order_index ?? 0
                });

                if (existingLocalId) {
                    const existing = currentCols.find(column => column.local_id === existingLocalId);
                    for (const field of pendingColumnFields.get(existingLocalId) || []) {
                        if (existing && field in existing) colData[field] = existing[field];
                    }
                    Object.assign(colData, normalizeColumn(colData));
                    await db.kanban_columns.update(existingLocalId, colData);
                    columnIdMap.set(col.id, existingLocalId);
                } else {
                    const newId = await db.kanban_columns.add(colData);
                    columnIdMap.set(col.id, newId);
                }
            }

            for (const task of apiTasks) {
                if (deletedTasks.has(task.id) || deletedColumns.has(task.column_id)) continue;
                const existing = await db.kanban_tasks.where({ project_id: localProjectId }).filter(t => t.id === task.id).first();

                const parentLocalId = columnIdMap.get(task.column_id);

                if (!parentLocalId) continue;

                const taskData = {
                    id: task.id,
                    project_id: localProjectId,
                    column_id: parentLocalId,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    size: task.size,
                    order: task.order !== undefined ? task.order : (task.order_index || 0),
                    responsible: task.responsible,
                    creator: task.creator,
                    comments: task.comments || [],
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                    events: task.events || []
                };

                if (existing) {
                    if (pendingTasks.has(existing.local_id)) Object.assign(taskData, existing);
                    taskData.local_id = existing.local_id;
                    taskData.parent_task_local_id = existing.parent_task_local_id ?? null;
                    taskData.parent_link_timestamp = existing.parent_link_timestamp;
                }

                const taskLocalId = await db.kanban_tasks.put(taskData);

                if (taskLocalId && Array.isArray(task.attachments)) {
                    const serverAttachmentIds = task.attachments.map(a => a.id).filter(Boolean);
                    await db.kanban_task_attachments
                        .where('task_local_id')
                        .equals(taskLocalId)
                        .filter(a => a.id && !serverAttachmentIds.includes(a.id))
                        .delete();

                    for (const attachment of task.attachments) {
                        const existingAttachment = await db.kanban_task_attachments
                            .where({ project_id: localProjectId })
                            .filter(a => a.id === attachment.id)
                            .first();

                        const attachmentData = {
                            id: attachment.id,
                            task_id: task.id,
                            task_local_id: taskLocalId,
                            project_id: localProjectId,
                            name: attachment.name,
                            mime_type: attachment.mime_type,
                            size_bytes: attachment.size_bytes,
                            url: attachment.url,
                            created_at: attachment.created_at,
                            updated_at: attachment.updated_at,
                            upload_status: 'synced',
                            blob: null
                        };

                        if (existingAttachment) {
                            await db.kanban_task_attachments.update(existingAttachment.local_id, attachmentData);
                        } else {
                            await db.kanban_task_attachments.add(attachmentData);
                        }
                    }
                }
            }

            // Resolve after every task has a local ID; API order is not hierarchy order.
            const localTasks = await db.kanban_tasks.where('project_id').equals(localProjectId).toArray();
            const taskIdMap = new Map(localTasks.filter(t => t.id).map(t => [t.id, t.local_id]));
            for (const task of apiTasks) {
                const localId = taskIdMap.get(task.id);
                if (!localId || pendingParents.has(localId)) continue;
                await db.kanban_tasks.update(localId, {
                    parent_task_local_id: taskIdMap.get(task.parent_task_id) ?? null,
                });
            }
            const survivingIds = new Set(localTasks.map(t => t.local_id));
            await db.kanban_tasks.where('project_id').equals(localProjectId)
                .filter(t => t.parent_task_local_id != null && !survivingIds.has(t.parent_task_local_id))
                .modify({ parent_task_local_id: null });
        });
    },

    async clearLocalKanban() {
        return await db.transaction('rw', db.kanban_columns, db.kanban_tasks, db.kanban_task_attachments, async () => {
            await db.kanban_columns.clear();
            await db.kanban_tasks.clear();
            await db.kanban_task_attachments.clear();
        });
    }
};
