<template>
  <div class="kanban-task" @click.stop="$emit('click')">
    <div class="task-header">
      <span class="task-id">#{{ task_display_id }}</span>
      <div class="task-header-right">
        <span
          v-if="parent_task"
          class="child-link-icon"
          :title="`Filha de #${parent_task.id || parent_task.local_id}: ${parent_task.description || parent_task.title || ''}`"
        >
          <font-awesome-icon icon="link" />
        </span>
        <span
          v-if="child_count"
          class="subtasks-progress-indicator"
          :class="{ 'is-complete': completed_child_count === child_count }"
          :title="`${completed_child_count} de ${child_count} subtarefas concluídas`"
        >
          {{ completed_child_count }}/{{ child_count }}
        </span>
        <span class="task-priority" :class="priority_class">
          {{ task.priority }}
        </span>
      </div>
    </div>

    <p class="task-description">{{ task.description }}</p>

    <div class="task-footer">
      <img
        v-if="task.responsible?.name"
        :src="task.responsible?.avatar || default_account_image"
        class="avatar avatar-xs"
        :title="responsible_name"
        alt="Responsável"
      />

      <div v-else class="avatar-placeholder" :class="responsible_class">
        <font-awesome-icon :icon="responsible_icon" />
      </div>

      <span class="responsible-name">{{ responsible_name }}</span>
    </div>
  </div>
</template>

<script>
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";
import { mapState } from 'pinia';
import { useKanbanStore } from '@/stores/kanban';

export default {
  name: "KanbanTask",
  props: {
    task: {
      type: Object,
      required: true,
    },
  },
  emits: ["click"],
  data() {
    return {
      default_account_image: defaultAccountImage,
    };
  },
  computed: {
    ...mapState(useKanbanStore, ['taskHierarchy', 'getColumns']),
    columns() {
      return this.getColumns(this.task.project_id) || [];
    },
    done_column() {
      if (!this.columns.length) return null;
      const found = this.columns.find(c => /conclu[ií]d|done|finaliz/i.test(c.title || ''));
      return found || this.columns[this.columns.length - 1];
    },
    parent_task() { return this.taskHierarchy.byId.get(this.task.parent_task_local_id); },
    children() { return this.taskHierarchy.children.get(this.task.local_id) || []; },
    child_count() { return this.children.length; },
    completed_child_count() {
      if (!this.done_column) return 0;
      return this.children.filter(c => c.column_id === this.done_column.local_id).length;
    },
    progress_percent() {
      if (!this.child_count) return 0;
      return Math.round((this.completed_child_count / this.child_count) * 100);
    },
    task_display_id() {
      return this.task.id ? this.task.id : this.task.local_id;
    },
    priority_class() {
      const map = {
        Normal: "priority-normal",
        Importante: "priority-important",
        Urgente: "priority-urgent",
      };
      return map[this.task.priority] || "priority-normal";
    },
    responsible_icon() {
      const r = this.task.responsible;

      if (r === "all" || r?.type === "all") return "users";
      if (r === "any" || r?.type === "any") return "dice";

      return "";
    },
    responsible_class() {
      const r = this.task.responsible;

      if (r === "all" || r?.type === "all") return "all-icon";
      if (r === "any" || r?.type === "any") return "any-icon";

      return "";
    },
    responsible_name() {
      const r = this.task.responsible;

      if (!r) return "Não atribuído";

      if (r === "all" || r.type === "all") return "Todos";
      if (r === "any" || r.type === "any") return "Qualquer";

      return r.name || "Não atribuído";
    },
  },
};
</script>

<style scoped>
.kanban-task {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  box-shadow: var(--card-shadow);
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: box-shadow var(--transition-fast) ease, border-color var(--transition-fast) ease, background var(--transition-fast) ease;
  border: 1px solid var(--card-border);
  user-select: none;
  position: relative;
}

.kanban-task:active {
  cursor: grabbing;
}

.kanban-task:hover {
  box-shadow: var(--card-hover-shadow);
  border-color: var(--card-hover-border);
  background: var(--card-hover-bg);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.task-id {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-muted);
}

.task-priority {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-normal {
  background-color: var(--surface-3);
  color: var(--text-secondary);
}

.priority-important {
  background-color: var(--orange);
  color: var(--white);
}

.priority-urgent {
  background-color: var(--red);
  color: var(--white);
}

.task-description {
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0;
  pointer-events: none;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: auto;
  pointer-events: none;
  gap: 8px;
}

.task-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.child-link-icon {
  font-size: 11px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast) ease;
}

.child-link-icon:hover {
  color: var(--color-info);
}

.subtasks-progress-indicator {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--surface-3);
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.4;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;
}

.subtasks-progress-indicator.is-complete {
  color: var(--green);
  background: rgba(134, 205, 130, 0.15);
}

.avatar {
  border: 2px solid var(--glass-border);
  box-shadow: var(--shadow-xs);
  flex-shrink: 0;
}

.responsible-name {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--white);
}

.all-icon {
  background-color: var(--color-info);
}

.any-icon {
  background-color: var(--orange);
}

@container (max-width: 1100px) {
  .kanban-task {
    height: 100%;
    width: 200px;
    min-width: 200px;
    max-width: 200px;
  }

  .task-description {
    -webkit-line-clamp: 2;
  }
}
</style>
