import { db } from '../../db';

export const syncQueueRepository = {
  async getPendingTasks() {
    return await db.syncQueue.orderBy('timestamp').toArray();
  },
  async getPendingTasksByType(type) {
    return await db.syncQueue.where('type').equals(type).toArray();
  },
  async addSyncQueueTask(task) {
    return await db.syncQueue.add(task);
  },
  async deleteTask(taskId) {
    return await db.syncQueue.delete(taskId);
  },
  async deleteTasks(taskIds) {
    if (!taskIds || taskIds.length === 0) {
      return;
    }
    console.log(`[SyncQueue] Deletando ${taskIds.length} tarefas em lote.`);

    return await db.syncQueue.bulkDelete(taskIds);
  },
  async clearSyncQueue() {
    return await db.syncQueue.clear();
  },
};
