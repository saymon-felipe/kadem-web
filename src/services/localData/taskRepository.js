import { db } from '../../db';

export const taskRepository = {
    async add_local_task(task_data) {
        return await db.tasks.add(task_data);
    },

    async save_local_task(task) {
        return await db.tasks.put(task);
    },

    async get_tasks_by_project(project_id) {
        return await db.tasks.where('project_id').equals(project_id).sortBy('position');
    },

    async delete_local_task(local_id) {
        return await db.tasks.delete(local_id);
    },

    async bulk_put_tasks(tasks) {
        return await db.tasks.bulkPut(tasks);
    },

    async clear_local_tasks() {
        return await db.tasks.clear();
    }
};