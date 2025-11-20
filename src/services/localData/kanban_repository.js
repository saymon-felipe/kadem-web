import { db } from '../../db';

export const kanban_repository = {
    async get_columns_by_project(project_id) {
        return await db.columns
            .where('project_id')
            .equals(project_id)
            .sortBy('order');
    },

    async add_column(column_data) {
        const local_id = await db.columns.add(column_data);
        return { ...column_data, local_id };
    },

    async update_column(local_id, updates) {
        return await db.columns.update(local_id, updates);
    },
    async delete_column(local_id) {
        return await db.columns.delete(local_id);
    },

    async bulk_put_columns(columns) {
        return await db.columns.bulkPut(columns);
    },

    async get_tasks_by_project(project_id) {
        return await db.tasks
            .where('project_id')
            .equals(project_id)
            .toArray();
    },

    async get_tasks_by_column(column_id) {
        return await db.tasks
            .where('column_id')
            .equals(column_id)
            .sortBy('order');
    },

    async add_task(task_data) {
        const local_id = await db.tasks.add(task_data);
        return { ...task_data, local_id };
    },

    async update_task(local_id, updates) {
        return await db.tasks.update(local_id, updates);
    },

    async delete_task(local_id) {
        return await db.tasks.delete(local_id);
    },

    async bulk_put_tasks(tasks) {
        return await db.tasks.bulkPut(tasks);
    }
};