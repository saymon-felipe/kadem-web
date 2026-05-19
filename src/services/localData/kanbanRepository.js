import { db } from '../../db';

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
        return await db.kanban_columns.where('project_id').equals(project_id).sortBy('order');
    },

    async get_column_by_local_id(local_id) {
        return await db.kanban_columns.get(local_id);
    },

    async add_column(data) {
        const id = await db.kanban_columns.add(data);
        return { ...data, local_id: id };
    },

    async update_column(local_id, data) {
        return await db.kanban_columns.update(local_id, data);
    },

    async setServerIdForColumn(localId, serverId) {
        return await db.kanban_columns.update(localId, { id: serverId });
    },

    async delete_column(local_id) {
        return await db.kanban_columns.delete(local_id);
    },

    async bulk_put_columns(cols) {
        return await db.kanban_columns.bulkPut(cols);
    },

    async get_tasks_by_project(pid) {
        const tasks = await db.kanban_tasks.where('project_id').equals(pid).toArray();
        return await attach_files_to_tasks(tasks, pid);
    },

    async get_task_by_local_id(lid) {
        return await db.kanban_tasks.get(lid);
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
        return await db.kanban_tasks.delete(lid);
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

        await db.transaction('rw', db.kanban_columns, db.kanban_tasks, db.kanban_task_attachments, async () => {
            const serverColumnIds = apiColumns.map(c => c.id);
            const serverTaskIds = apiTasks.map(t => t.id);

            if (!isDelta) {
                await db.kanban_columns
                    .where('project_id').equals(localProjectId)
                    .filter(col => col.id !== null && !serverColumnIds.includes(col.id))
                    .delete();

                await db.kanban_tasks
                    .where('project_id').equals(localProjectId)
                    .filter(task => task.id !== null && !serverTaskIds.includes(task.id))
                    .delete();
            }

            const columnIdMap = new Map();

            const currentCols = await db.kanban_columns.where('project_id').equals(localProjectId).toArray();
            currentCols.forEach(c => {
                if (c.id) columnIdMap.set(c.id, c.local_id);
            });

            for (const col of apiColumns) {
                let existingLocalId = columnIdMap.get(col.id);

                if (!existingLocalId) {
                    const existing = await db.kanban_columns.where({ project_id: localProjectId }).filter(c => c.id === col.id).first();
                    if (existing) existingLocalId = existing.local_id;
                }

                const colData = {
                    id: col.id,
                    project_id: localProjectId,
                    title: col.title,
                    order: col.order !== undefined ? col.order : (col.order_index || 0)
                };

                if (existingLocalId) {
                    await db.kanban_columns.update(existingLocalId, colData);
                    columnIdMap.set(col.id, existingLocalId);
                } else {
                    const newId = await db.kanban_columns.add(colData);
                    columnIdMap.set(col.id, newId);
                }
            }

            for (const task of apiTasks) {
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
                    updated_at: task.updated_at
                };

                if (existing) {
                    taskData.local_id = existing.local_id;
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
