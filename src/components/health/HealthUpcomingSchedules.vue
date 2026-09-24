<template>
  <section class="panel schedules-panel">
    <div class="panel-title">
      <div class="title-group">
        <h3>Rotinas & Agendas</h3>
        <span class="count-badge">{{ sortedSchedules.length }}</span>
      </div>
      <button class="kadem-health-button kadem-health-button--quiet kadem-health-button--compact" type="button" @click="$emit('view-objects')">
        Ver todas
      </button>
    </div>

    <div v-if="!sortedSchedules.length" class="empty-panel">
      <font-awesome-icon icon="calendar-check" class="empty-icon" />
      <p>Nenhuma rotina agendada no momento.</p>
      <button class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact" type="button" @click="$emit('new-schedule')">
        <font-awesome-icon icon="plus" />
        <span>Criar primeira rotina</span>
      </button>
    </div>

    <div v-else class="schedules-list custom-scrollbar">
      <article
        v-for="schedule in sortedSchedules"
        :key="schedule.local_key"
        class="schedule-row"
        :class="scheduleDueClass(schedule)"
      >
        <div class="schedule-icon-wrap" :class="scheduleDueClass(schedule)">
          <font-awesome-icon :icon="scheduleDueIcon(schedule)" />
        </div>

        <div class="schedule-info">
          <div class="schedule-title-line">
            <strong class="schedule-name">{{ schedule.name }}</strong>
            <span class="due-pill" :class="scheduleDueClass(schedule)">
              {{ dueLabel(nextDueAt(schedule)) }}
            </span>
          </div>

          <div class="schedule-meta-line">
            <span class="freq-tag">
              <font-awesome-icon icon="clock" />
              {{ frequencyLabel(schedule) }}
            </span>
            <span v-if="linkedSupplyText(schedule)" class="linked-tag">
              <font-awesome-icon icon="link" />
              {{ linkedSupplyText(schedule) }}
            </span>
          </div>
        </div>

        <div class="schedule-action-wrap">
          <button
            class="kadem-health-button kadem-health-button--success kadem-health-button--compact"
            type="button"
            :title="'Concluir ' + schedule.name"
            @click="$emit('complete-schedule', schedule.local_key)"
          >
            <font-awesome-icon icon="check" />
            <span>Concluir</span>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: "HealthUpcomingSchedules",
  props: {
    schedules: {
      type: Array,
      default: () => [],
    },
    nextDueAt: {
      type: Function,
      required: true,
    },
    dueLabel: {
      type: Function,
      required: true,
    },
    scheduleDueClass: {
      type: Function,
      required: true,
    },
    scheduleDueIcon: {
      type: Function,
      required: true,
    },
    frequencyLabel: {
      type: Function,
      required: true,
    },
    linkedSupplyText: {
      type: Function,
      required: true,
    },
  },
  emits: ["complete-schedule", "view-objects", "new-schedule"],
  computed: {
    sortedSchedules() {
      return [...this.schedules].sort((a, b) => {
        return new Date(this.nextDueAt(a)) - new Date(this.nextDueAt(b));
      });
    },
  },
};
</script>

<style scoped>
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  min-height: 280px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-group h3 {
  margin: 0;
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.count-badge {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 4px;
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.text-btn:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.6;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.empty-panel p {
  margin: 0 0 var(--space-3);
  font-size: var(--fontsize-xs);
}

.subtle-btn {
  background: var(--surface-2);
  border: 1px dashed var(--glass-border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.subtle-btn:hover {
  background: var(--surface-3);
  border-color: #e25373;
}

.schedules-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.schedule-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.schedule-row:hover {
  background: var(--surface-2);
  border-color: var(--glass-border);
  transform: translateY(-1px);
}

.schedule-row.status-urgent {
  border-left: 3px solid #ef4444;
}

.schedule-row.status-today {
  border-left: 3px solid #d97706;
}

.schedule-row.status-soon {
  border-left: 3px solid #3b82f6;
}

.schedule-row.status-healthy {
  border-left: 3px solid #10b981;
}

.schedule-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 0.88rem;
  flex-shrink: 0;
  background: var(--surface-2);
  color: var(--text-secondary);
}

.schedule-icon-wrap.status-urgent {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.schedule-icon-wrap.status-today {
  background: rgba(217, 119, 6, 0.15);
  color: #d97706;
}

.schedule-icon-wrap.status-soon {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.schedule-icon-wrap.status-healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.schedule-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.schedule-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.schedule-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.due-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
  background: var(--surface-2);
  color: var(--text-secondary);
}

.due-pill.status-urgent {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.due-pill.status-today {
  background: rgba(217, 119, 6, 0.18);
  color: #d97706;
}

.due-pill.status-soon {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.due-pill.status-healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.schedule-meta-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.freq-tag,
.linked-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.linked-tag {
  color: #3b82f6;
}

.schedule-action-wrap {
  flex-shrink: 0;
}

.complete-btn {
  border: none;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.complete-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.complete-btn:active {
  transform: scale(0.96);
}
</style>
