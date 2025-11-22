import { db } from '../../db';

export const kanbanRepository = {
    async get_columns_by_project(project_id) {
        return await db.columns.where('project_id').equals(project_id).sortBy('order');
    },
    async get_column_by_local_id(local_id) { return await db.columns.get(local_id); },
    async add_column(data) { const id = await db.columns.add(data); return { ...data, local_id: id }; },
    async update_column(local_id, data) { return await db.columns.update(local_id, data); },
    async setServerIdForColumn(localId, serverId) { return await db.columns.update(localId, { id: serverId }); },
    async delete_column(local_id) { return await db.columns.delete(local_id); },
    async bulk_put_columns(cols) { return await db.columns.bulkPut(cols); },

    async get_tasks_by_project(pid) { return await db.tasks.where('project_id').equals(pid).toArray(); },
    async get_task_by_local_id(lid) { return await db.tasks.get(lid); },
    async add_task(data) { const id = await db.tasks.add(data); return { ...data, local_id: id }; },
    async update_task(lid, data) { return await db.tasks.update(lid, data); },
    async setServerIdForTask(lid, sid) { return await db.tasks.update(lid, { id: sid }); },
    async delete_task(lid) { return await db.tasks.delete(lid); },
    async bulk_put_tasks(tasks) { return await db.tasks.bulkPut(tasks); },

    async update_local_comment_state(task_local_id, comment_local_id, updates) {
        await db.transaction('rw', db.tasks, async () => {
            const task = await db.tasks.get(task_local_id);
            if (task && task.comments) {
                const commentIndex = task.comments.findIndex(c => c.local_id === comment_local_id);
                if (commentIndex !== -1) {
                    task.comments[commentIndex] = { ...task.comments[commentIndex], ...updates };
                    await db.tasks.update(task_local_id, { comments: task.comments });
                }
            }
        });
    },

    async edit_comment_content(task_local_id, comment_local_id, new_content) {
        await db.transaction('rw', db.tasks, async () => {
            const task = await db.tasks.get(task_local_id);
            if (task && task.comments) {
                const index = task.comments.findIndex(c => c.local_id === comment_local_id);
                if (index !== -1) {
                    task.comments[index].content = new_content;
                    await db.tasks.update(task_local_id, { comments: task.comments });
                }
            }
        });
    },

    async remove_comment(task_local_id, comment_local_id) {
        await db.transaction('rw', db.tasks, async () => {
            const task = await db.tasks.get(task_local_id);
            if (task && task.comments) {
                const newComments = task.comments.filter(c => c.local_id !== comment_local_id);
                await db.tasks.update(task_local_id, { comments: newComments });
            }
        });
    },

    async mergeServerData(localProjectId, apiColumns, apiTasks) {
        await db.transaction('rw', db.columns, db.tasks, async () => {
            const serverColumnIds = apiColumns.map(c => c.id);
            const serverTaskIds = apiTasks.map(t => t.id);

            await db.columns
                .where('project_id').equals(localProjectId)
                .filter(col => col.id !== null && !serverColumnIds.includes(col.id))
                .delete();

            await db.tasks
                .where('project_id').equals(localProjectId)
                .filter(task => task.id !== null && !serverTaskIds.includes(task.id))
                .delete();

            const columnIdMap = new Map();

            for (const col of apiColumns) {
                let existing = await db.columns.where('id').equals(col.id).first();


                const colData = {
                    id: col.id,
                    project_id: localProjectId,
                    title: col.title,
                    order: col.order || col.order_index || 0
                };

                if (existing) {
                    await db.columns.update(existing.local_id, colData);
                    columnIdMap.set(col.id, existing.local_id);
                } else {
                    const newId = await db.columns.add(colData);
                    columnIdMap.set(col.id, newId);
                }
            }

            for (const task of apiTasks) {
                const existing = await db.tasks.where('id').equals(task.id).first();

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
                    order: task.order || 0,
                    responsible: task.responsible,
                    creator: task.creator,
                    comments: task.comments || [],
                    created_at: task.created_at,
                    updated_at: task.updated_at
                };

                if (existing) {
                    await db.tasks.update(existing.local_id, taskData);
                } else {
                    await db.tasks.add(taskData);
                }
            }
        });
    }
};