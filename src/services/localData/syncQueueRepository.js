import { db } from '../../db';

export const syncQueueRepository = {
  async getPendingTasks() {
    const now = Date.now();
    const tasks = await db.syncQueue.orderBy('timestamp').toArray();
    return tasks.filter((task) => {
      const status = task.status || 'PENDING';
      const nextAttemptAt = task.next_attempt_at || task.timestamp;
      const nextAttemptTime = typeof nextAttemptAt === 'number'
        ? nextAttemptAt
        : Date.parse(nextAttemptAt);

      return ['PENDING', 'RETRY'].includes(status)
        && (!nextAttemptAt || !Number.isFinite(nextAttemptTime) || nextAttemptTime <= now);
    });
  },
  async getPendingTasksByType(type) {
    const tasks = await this.getPendingTasks();
    return tasks.filter((task) => task.type === type);
  },
  async addSyncQueueTask(task) {
    const timestamp = task.timestamp || new Date().toISOString();
    const idempotency_key = task.idempotency_key || crypto.randomUUID?.() || `${task.type}-${timestamp}-${Math.random()}`;
    const task_with_defaults = {
      ...task,
      timestamp,
      idempotency_key,
      retry_count: task.retry_count || 0,
      status: task.status || 'PENDING',
      next_attempt_at: task.next_attempt_at || timestamp,
      last_error: task.last_error || null,
    };

    if (task_with_defaults.compact_key) {
      const existing = await db.syncQueue
        .where('compact_key')
        .equals(task_with_defaults.compact_key)
        .filter((item) => ['PENDING', 'RETRY'].includes(item.status || 'PENDING'))
        .first();

      if (existing) {
        await db.syncQueue.update(existing.id, {
          ...task_with_defaults,
          id: existing.id,
          retry_count: 0,
          status: 'PENDING',
          last_error: null,
        });
        return existing.id;
      }
    }

    return await db.syncQueue.add(task_with_defaults);
  },
  async updateTask(task_id, updates) {
    return await db.syncQueue.update(task_id, updates);
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
