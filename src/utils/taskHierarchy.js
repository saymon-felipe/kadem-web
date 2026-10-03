export const canSetTaskParent = (tasks, taskId, parentId) => {
  if (parentId == null) return true;
  const byId = tasks instanceof Map ? tasks : new Map(tasks.map(task => [task.local_id, task]));
  const task = byId.get(taskId);
  const parent = byId.get(parentId);
  if (!task || !parent || task.project_id !== parent.project_id) return false;
  const visited = new Set([taskId]);
  let current = parent;
  while (current) {
    if (visited.has(current.local_id)) return false;
    visited.add(current.local_id);
    current = byId.get(current.parent_task_local_id);
  }
  return true;
};
