<template>
    <div class="kanban-task" @click.stop="$emit('click')">
        <div class="task-header">
            <span class="task-id">#{{ task_display_id }}</span>
            <span class="task-priority" :class="priority_class">
                {{ task.priority }}
            </span>
        </div>

        <p class="task-description">{{ task.description }}</p>

        <div class="task-footer">
            <img v-if="task.responsible?.name" :src="task.responsible?.avatar || default_account_image"
                class="avatar avatar-xs" :title="responsible_name" alt="Responsável" />

            <div v-else class="avatar-placeholder" :class="responsible_class">
                <font-awesome-icon :icon="responsible_icon" />
            </div>

            <span class="responsible-name">{{ responsible_name }}</span>
        </div>
    </div>
</template>

<script>
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";

export default {
    name: 'KanbanTask',
    props: {
        task: {
            type: Object,
            required: true
        }
    },
    emits: ['click'],
    data() {
        return {
            default_account_image: defaultAccountImage
        };
    },
    computed: {
        task_display_id() {
            return this.task.id ? this.task.id : this.task.local_id;
        },
        priority_class() {
            const map = {
                'Normal': 'priority-normal',
                'Importante': 'priority-important',
                'Urgente': 'priority-urgent'
            };
            return map[this.task.priority] || 'priority-normal';
        },
        responsible_icon() {
            const r = this.task.responsible;

            if (r === 'all' || r.type === 'all') return 'users';
            if (r === 'any' || r.type === 'any') return 'dice';

            return '';
        },
        responsible_class() {
            const r = this.task.responsible;

            if (r === 'all' || r.type === 'all') return 'all-icon';
            if (r === 'any' || r.type === 'any') return 'any-icon';

            return '';
        },
        responsible_name() {
            const r = this.task.responsible;

            if (!r) return 'Não atribuído';

            if (r === 'all' || r.type === 'all') return 'Todos';
            if (r === 'any' || r.type === 'any') return 'Qualquer';

            return r.name || 'Não atribuído';
        }
    }
};
</script>

<style scoped>
.kanban-task {
    background: var(--white);
    border-radius: var(--radius-sm);
    padding: var(--space-4);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    cursor: grab;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    border: 1px solid transparent;
    user-select: none;
    position: relative;
}

.kanban-task:active {
    cursor: grabbing;
}

.kanban-task:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--gray-300);
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
    color: var(--gray-100);
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
    background-color: #F0F0F0;
    color: var(--gray-100);
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
    color: var(--black);
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

.avatar {
    border: 2px solid var(--white);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}

.responsible-name {
    font-size: var(--fontsize-xs);
    color: var(--gray-100);
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
    background-color: var(--blue);
}

.any-icon {
    background-color: var(--orange);
}

@container (max-width: 768px) {
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