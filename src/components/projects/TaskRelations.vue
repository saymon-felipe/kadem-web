<template>
  <section class="task-relations" aria-label="Hierarquia da tarefa">
    <!-- Seção: Tarefa Pai -->
    <div class="hierarchy-card parent-card">
      <div class="hierarchy-card-header">
        <div class="header-label">
          <font-awesome-icon icon="link" class="header-icon" />
          <span class="label-title">Tarefa pai</span>
        </div>
        <button
          v-if="!parent"
          type="button"
          class="btn-subtle-link"
          :disabled="busy"
          @click="toggleMode('parent')"
          :title="mode === 'parent' ? 'Fechar seleção' : 'Vincular esta tarefa a uma tarefa pai'"
        >
          <font-awesome-icon :icon="mode === 'parent' ? 'xmark' : 'plus'" />
          <span>{{ mode === 'parent' ? 'Cancelar' : 'Vincular a um pai' }}</span>
        </button>
      </div>

      <!-- Quando possui tarefa pai vinculada -->
      <div v-if="parent" class="parent-reference-box">
        <div
          class="parent-info-group"
          role="button"
          tabindex="0"
          @click="$emit('open-task', parent)"
          @keydown.enter.prevent="$emit('open-task', parent)"
          :title="`Abrir tarefa pai #${parent.id || parent.local_id}`"
        >
          <span class="parent-tag">PAI</span>
          <span class="parent-id">#{{ parent.id || parent.local_id }}</span>
          <span class="parent-desc">{{ parent.description || parent.title || 'Sem descrição' }}</span>
          <span v-if="columnName(parent.column_id)" class="status-pill">
            {{ columnName(parent.column_id) }}
          </span>
          <font-awesome-icon icon="chevron-right" class="chevron-arrow" />
        </div>
        <button
          type="button"
          class="btn-icon-danger"
          :disabled="busy"
          @click="setParent(current, null)"
          title="Desvincular da tarefa pai"
          aria-label="Desvincular da tarefa pai"
        >
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <!-- Quando não possui tarefa pai: estado limpo e convidativo -->
      <div v-else class="parent-empty-state">
        <span class="empty-note">Esta é uma tarefa principal (sem vínculo superior).</span>
      </div>
    </div>

    <!-- Container Escolher Tarefa Pai (Abre animado abaixo da Tarefa Pai, deslocando Subtarefas) -->
    <Transition
      name="expand-accordion"
      @enter="onExpandEnter"
      @after-enter="onExpandAfterEnter"
      @leave="onExpandLeave"
    >
      <div v-if="mode === 'parent'" class="accordion-wrapper">
        <div class="link-existing-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <font-awesome-icon icon="link" class="panel-icon" />
              <strong>Escolher tarefa pai</strong>
            </div>
            <button type="button" class="btn-panel-close" @click="mode = ''" aria-label="Fechar busca">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="search-box-wrapper">
            <font-awesome-icon icon="magnifying-glass" class="search-icon" />
            <input
              ref="parentSearchInput"
              v-model="search"
              type="search"
              class="search-input"
              placeholder="Buscar por descrição, título ou número (#ID)..."
              aria-label="Buscar tarefa pai para vincular"
              :disabled="busy"
            />
            <button v-if="search" type="button" class="btn-clear-search" @click="search = ''" title="Limpar busca">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="candidate-scroll custom-scrollbar">
            <button
              v-for="candidate in candidates"
              :key="candidate.local_id"
              type="button"
              class="candidate-item"
              :disabled="busy"
              @click="setParent(current, candidate.local_id)"
            >
              <div class="candidate-left">
                <span class="candidate-id">#{{ candidate.id || candidate.local_id }}</span>
                <span class="candidate-title">{{ candidate.description || candidate.title || 'Sem descrição' }}</span>
              </div>
              <div class="candidate-right">
                <span v-if="columnName(candidate.column_id)" class="status-pill">
                  {{ columnName(candidate.column_id) }}
                </span>
                <span class="candidate-action-badge">
                  <font-awesome-icon icon="plus" /> Vincular como pai
                </span>
              </div>
            </button>

            <div v-if="!candidates.length" class="candidates-empty">
              <p>Nenhuma tarefa compatível encontrada.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Seção: Subtarefas (Tarefas Filhas) -->
    <div class="hierarchy-card children-card">
      <div class="hierarchy-card-header">
        <div class="header-label">
          <font-awesome-icon icon="layer-group" class="header-icon" />
          <span class="label-title">Subtarefas</span>
          <span v-if="children.length" class="progress-pill" :class="{ 'is-done': progressPercent === 100 }">
            {{ completedChildrenCount }}/{{ children.length }} concluídas
            <span class="progress-dot">•</span>
            {{ progressPercent }}%
          </span>
          <span v-else class="empty-count-pill">0</span>
        </div>

        <button
          type="button"
          class="btn-subtle-link"
          :disabled="busy"
          @click="toggleMode('child')"
          :title="mode === 'child' ? 'Fechar painel de busca' : 'Vincular tarefa existente como subtarefa'"
        >
          <font-awesome-icon :icon="mode === 'child' ? 'xmark' : 'link'" />
          <span>{{ mode === 'child' ? 'Cancelar' : 'Vincular existente' }}</span>
        </button>
      </div>

      <!-- Barra de progresso visual com transição suave -->
      <div v-if="children.length" class="progress-track" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
        <div
          class="progress-fill"
          :class="{ 'is-done': progressPercent === 100 }"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>

      <!-- Lista de Subtarefas com Animação de Entrada e Saída -->
      <TransitionGroup
        v-if="children.length"
        name="subtask-anim"
        tag="div"
        class="subtasks-container"
      >
        <div
          v-for="child in children"
          :key="child.local_id"
          class="subtask-row"
          :class="{ 'is-completed': isTaskDone(child) }"
        >
          <!-- Checkbox direto com animação de bounce -->
          <button
            type="button"
            class="toggle-checkbox"
            :class="{ checked: isTaskDone(child) }"
            :disabled="busy"
            @click.stop="toggleChildCompletion(child)"
            :title="isTaskDone(child) ? 'Reabrir subtarefa' : 'Marcar como concluída'"
            aria-label="Alternar status de conclusão"
          >
            <font-awesome-icon v-if="isTaskDone(child)" icon="check" class="check-icon" />
          </button>

          <!-- Corpo da subtarefa clicável para abrir detalhes -->
          <div
            class="subtask-content"
            role="button"
            tabindex="0"
            @click="$emit('open-task', child)"
            @keydown.enter.prevent="$emit('open-task', child)"
            :title="`Abrir detalhes de #${child.id || child.local_id}`"
          >
            <span class="subtask-id">#{{ child.id || child.local_id }}</span>
            <span class="subtask-text" :class="{ strike: isTaskDone(child) }">
              {{ child.description || child.title || 'Sem descrição' }}
            </span>
          </div>

          <!-- Metadados e ações da linha -->
          <div class="subtask-actions-group">
            <span v-if="columnName(child.column_id)" class="status-pill" :class="{ 'done-pill': isTaskDone(child) }">
              {{ columnName(child.column_id) }}
            </span>
            <button
              type="button"
              class="btn-row-open"
              @click="$emit('open-task', child)"
              title="Abrir subtarefa"
            >
              <font-awesome-icon icon="chevron-right" />
            </button>
            <button
              type="button"
              class="btn-icon-danger"
              :disabled="busy"
              @click.stop="setParent(child, null)"
              title="Desvincular subtarefa do pai"
              aria-label="Desvincular subtarefa"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
        </div>
      </TransitionGroup>

      <!-- Estado vazio quando não há subtarefas -->
      <div v-else class="subtasks-empty-card">
        <p class="empty-message">Nenhuma subtarefa vinculada ainda.</p>
        <span class="empty-hint">Adicione etapas abaixo para dividir o escopo do trabalho.</span>
      </div>

      <!-- Card de criação com Textarea padronizado igual ao KanbanColumn -->
      <div class="new-subtask-card">
        <textarea
          ref="newSubtaskInput"
          v-model="quickDescription"
          rows="2"
          class="task-textarea"
          placeholder="Descreva a subtarefa..."
          :disabled="busy"
          @keydown.enter.exact.prevent="createChildQuick"
          @keydown.esc="quickDescription = ''"
        ></textarea>

        <div class="new-subtask-footer">
          <span class="hint-text">
            <strong>Enter ↵</strong> para salvar • <strong>Shift + Enter</strong> para quebra de linha
          </span>
          <div class="footer-actions">
            <button
              v-if="quickDescription.trim()"
              type="button"
              class="btn-clear-text"
              :disabled="busy"
              @click="quickDescription = ''"
              title="Limpar texto"
            >
              Limpar
            </button>
            <button
              type="button"
              class="btn-create-subtask"
              :disabled="busy || !quickDescription.trim()"
              @click="createChildQuick"
              title="Criar e vincular subtarefa"
            >
              <font-awesome-icon v-if="isCreatingQuick" icon="spinner" spin />
              <template v-else>
                <font-awesome-icon icon="plus" />
                <span>Adicionar</span>
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Container Vincular Subtarefa Existente (Abre animado abaixo de Subtarefas) -->
    <Transition
      name="expand-accordion"
      @enter="onExpandEnter"
      @after-enter="onExpandAfterEnter"
      @leave="onExpandLeave"
    >
      <div v-if="mode === 'child'" class="accordion-wrapper">
        <div class="link-existing-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <font-awesome-icon icon="layer-group" class="panel-icon" />
              <strong>Vincular tarefa existente como subtarefa</strong>
            </div>
            <button type="button" class="btn-panel-close" @click="mode = ''" aria-label="Fechar busca">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="search-box-wrapper">
            <font-awesome-icon icon="magnifying-glass" class="search-icon" />
            <input
              ref="childSearchInput"
              v-model="search"
              type="search"
              class="search-input"
              placeholder="Buscar por descrição, título ou número (#ID)..."
              aria-label="Buscar tarefa para vincular"
              :disabled="busy"
            />
            <button v-if="search" type="button" class="btn-clear-search" @click="search = ''" title="Limpar busca">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>

          <div class="candidate-scroll custom-scrollbar">
            <button
              v-for="candidate in candidates"
              :key="candidate.local_id"
              type="button"
              class="candidate-item"
              :disabled="busy"
              @click="setParent(candidate, current.local_id)"
            >
              <div class="candidate-left">
                <span class="candidate-id">#{{ candidate.id || candidate.local_id }}</span>
                <span class="candidate-title">{{ candidate.description || candidate.title || 'Sem descrição' }}</span>
              </div>
              <div class="candidate-right">
                <span v-if="columnName(candidate.column_id)" class="status-pill">
                  {{ columnName(candidate.column_id) }}
                </span>
                <span class="candidate-action-badge">
                  <font-awesome-icon icon="plus" /> Vincular como filha
                </span>
              </div>
            </button>

            <div v-if="!candidates.length" class="candidates-empty">
              <p>Nenhuma tarefa compatível encontrada.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Alerta de Erro com Transição -->
    <Transition name="fade-error">
      <div v-if="error" class="error-banner" role="alert">
        <font-awesome-icon icon="xmark" class="error-icon" />
        <span>{{ error }}</span>
        <button type="button" class="btn-dismiss-error" @click="error = ''">Fechar</button>
      </div>
    </Transition>
  </section>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useKanbanStore } from '@/stores/kanban';
import { useAuthStore } from '@/stores/auth';
import { canSetTaskParent } from '@/utils/taskHierarchy';

export default {
  name: 'TaskRelations',
  props: {
    task: { type: Object, required: true },
    members: { type: Array, default: () => [] },
  },
  emits: ['open-task'],
  data: () => ({
    mode: '',
    search: '',
    quickDescription: '',
    isCreatingQuick: false,
    busy: false,
    error: '',
  }),
  computed: {
    ...mapState(useKanbanStore, ['taskHierarchy', 'getProjectTasks', 'getColumns']),
    ...mapState(useAuthStore, ['user']),
    current() { return this.taskHierarchy.byId.get(this.task.local_id) || this.task; },
    parent() { return this.taskHierarchy.byId.get(this.current.parent_task_local_id); },
    children() { return this.taskHierarchy.children.get(this.task.local_id) || []; },
    tasks() { return this.getProjectTasks(this.task.project_id); },
    columns() { return this.getColumns(this.task.project_id) || []; },
    firstColumn() {
      return this.columns.length ? this.columns[0] : null;
    },
    doneColumn() {
      if (!this.columns.length) return null;
      const found = this.columns.find(c => /conclu[ií]d|done|finaliz/i.test(c.title || ''));
      return found || this.columns[this.columns.length - 1];
    },
    completedChildrenCount() {
      return this.children.filter(c => this.isTaskDone(c)).length;
    },
    progressPercent() {
      if (!this.children.length) return 0;
      return Math.round((this.completedChildrenCount / this.children.length) * 100);
    },
    candidates() {
      const query = this.search.trim().toLocaleLowerCase('pt-BR');
      const byId = new Map(this.tasks.map(task => [task.local_id, task]));
      return this.tasks.filter(candidate => {
        if (this.mode === 'parent') {
          if (!canSetTaskParent(byId, this.task.local_id, candidate.local_id)) return false;
        } else {
          // Reparenting is explicit: detach from the old parent first.
          if (candidate.parent_task_local_id != null || !canSetTaskParent(byId, candidate.local_id, this.task.local_id)) return false;
        }
        return `${candidate.id || candidate.local_id} ${candidate.description || ''} ${candidate.title || ''}`.toLocaleLowerCase('pt-BR').includes(query);
      });
    },
  },
  methods: {
    ...mapActions(useKanbanStore, ['setTaskParent', 'createTask', 'moveTaskToColumn']),
    columnName(id) { return this.columns.find(column => column.local_id === id)?.title || ''; },
    isTaskDone(task) {
      if (!task || !this.doneColumn) return false;
      return task.column_id === this.doneColumn.local_id;
    },
    toggleMode(mode) {
      this.mode = this.mode === mode ? '' : mode;
      this.search = '';
      this.error = '';
      if (this.mode === 'parent') {
        this.$nextTick(() => {
          this.$refs.parentSearchInput?.focus();
        });
      } else if (this.mode === 'child') {
        this.$nextTick(() => {
          this.$refs.childSearchInput?.focus();
        });
      }
    },
    onExpandEnter(el) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.marginTop = 'calc(-1 * var(--space-4))';
      el.style.overflow = 'hidden';
      void el.offsetHeight;
      el.style.transition = 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, margin-top 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.height = `${el.scrollHeight}px`;
      el.style.marginTop = '0px';
      el.style.opacity = '1';
    },
    onExpandAfterEnter(el) {
      el.style.height = '';
      el.style.opacity = '';
      el.style.overflow = '';
      el.style.transition = '';
      el.style.marginTop = '';
    },
    onExpandLeave(el) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      el.style.height = `${el.offsetHeight}px`;
      el.style.opacity = '1';
      el.style.marginTop = '0px';
      el.style.overflow = 'hidden';
      void el.offsetHeight;
      el.style.transition = 'height 0.26s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, margin-top 0.26s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.height = '0px';
      el.style.marginTop = 'calc(-1 * var(--space-4))';
      el.style.opacity = '0';
    },
    async setParent(task, parentId) {
      if (this.busy) return;
      this.busy = true;
      this.error = '';
      try {
        await this.setTaskParent(task, parentId);
        this.mode = '';
      } catch (error) { this.error = error.message || 'Não foi possível vincular a tarefa.'; }
      finally { this.busy = false; }
    },
    async createChildQuick() {
      const text = this.quickDescription.trim();
      if (this.busy || !text) return;
      this.busy = true;
      this.isCreatingQuick = true;
      this.error = '';
      const targetColumnId = this.firstColumn?.local_id || this.current.column_id;

      const currentUserId = this.user?.id;
      const memberObj = (this.members || []).find((m) => m.id === currentUserId);
      let responsibleData = null;
      if (memberObj) {
        responsibleData = {
          id: memberObj.id,
          name: memberObj.name,
          avatar: memberObj.avatar || null,
          type: "user",
        };
      } else if (this.user && this.user.id) {
        responsibleData = {
          id: this.user.id,
          name: this.user.name || "Eu",
          avatar: this.user.avatar || null,
          type: "user",
        };
      }

      try {
        await this.createTask(targetColumnId, {
          project_id: this.task.project_id,
          description: text,
          responsible: responsibleData,
          parent_task_local_id: this.task.local_id,
        });
        this.quickDescription = '';
        this.$nextTick(() => {
          this.$refs.newSubtaskInput?.focus();
        });
      } catch (error) {
        this.error = error.message || 'Não foi possível criar a subtarefa.';
      } finally {
        this.busy = false;
        this.isCreatingQuick = false;
      }
    },
    async toggleChildCompletion(child) {
      if (this.busy) return;
      this.busy = true;
      this.error = '';
      try {
        const isDone = this.isTaskDone(child);
        const targetCol = isDone ? this.firstColumn : this.doneColumn;
        if (targetCol && targetCol.local_id !== child.column_id) {
          await this.moveTaskToColumn(child, targetCol.local_id);
        }
      } catch (error) {
        this.error = error.message || 'Não foi possível atualizar o status da subtarefa.';
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style scoped>
.task-relations {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-sizing: border-box;
}

/* Card Container Padronizado com visual moderno */
.hierarchy-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color var(--transition-fast) ease, box-shadow var(--transition-fast) ease;
}

.hierarchy-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.hierarchy-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.header-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 12px;
  color: var(--color-info);
}

.label-title {
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.2px;
}

.progress-pill {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-3);
  padding: 2px 9px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all var(--transition-fast) ease;
}

.progress-pill.is-done {
  color: var(--green);
  background: rgba(134, 205, 130, 0.15);
}

.progress-dot {
  color: var(--text-muted);
  font-size: 9px;
}

.empty-count-pill {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-3);
  padding: 1px 7px;
  border-radius: 10px;
}

.btn-subtle-link {
  border: 0;
  background: transparent;
  color: var(--color-info);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background var(--transition-fast) ease, color var(--transition-fast) ease;
}

.btn-subtle-link:hover {
  background: rgba(95, 124, 255, 0.12);
  color: var(--color-info);
}

/* Caixa de referência do Pai */
.parent-reference-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-left: 3px solid var(--color-info);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  transition: all var(--transition-fast) ease;
}

.parent-reference-box:hover {
  border-color: var(--color-info);
  background: var(--card-hover-bg);
}

.parent-info-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.parent-tag {
  font-size: 9px;
  font-weight: 800;
  color: var(--color-info);
  background: rgba(95, 124, 255, 0.15);
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.parent-id {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.parent-desc {
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.chevron-arrow {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 4px;
  flex-shrink: 0;
}

.parent-empty-state {
  padding: 2px 0 2px 2px;
}

.empty-note {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

/* Barra de Progresso Suave */
.progress-track {
  width: 100%;
  height: 5px;
  background: var(--surface-3);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-info), #7c3aed);
  border-radius: 4px;
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.35s ease;
}

.progress-fill.is-done {
  background: linear-gradient(90deg, #10b981, #059669);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

/* Lista de Subtarefas */
.subtasks-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  transition: background var(--transition-fast) ease, border-color var(--transition-fast) ease, transform var(--transition-fast) ease, opacity var(--transition-fast) ease;
}

.subtask-row:hover {
  background: var(--card-hover-bg);
  border-color: rgba(255, 255, 255, 0.16);
}

.subtask-row.is-completed {
  opacity: 0.75;
}

.subtask-row.is-completed:hover {
  opacity: 1;
}

/* Checkbox redondo animado */
.toggle-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--text-muted);
  background: transparent;
  color: var(--white);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all var(--transition-fast) ease;
}

.toggle-checkbox:hover {
  border-color: var(--color-info);
  background: rgba(95, 124, 255, 0.1);
  transform: scale(1.08);
}

.toggle-checkbox.checked {
  background: var(--green);
  border-color: var(--green);
  color: #102131;
  animation: checkBounce 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.check-icon {
  font-size: 10px;
}

@keyframes checkBounce {
  0% { transform: scale(0.7); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.subtask-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.subtask-id {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.subtask-text {
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  transition: color var(--transition-fast) ease;
}

.subtask-text.strike {
  text-decoration: line-through;
  color: var(--text-muted);
}

.subtask-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-pill {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-3);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.2px;
}

.status-pill.done-pill {
  color: var(--green);
  background: rgba(134, 205, 130, 0.15);
}

.btn-row-open {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 10px;
  display: grid;
  place-items: center;
  transition: color var(--transition-fast) ease;
}

.btn-row-open:hover {
  color: var(--text-primary);
}

.btn-icon-danger {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  display: grid;
  place-items: center;
  transition: all var(--transition-fast) ease;
}

.btn-icon-danger:hover {
  color: var(--red);
  background: rgba(239, 68, 68, 0.15);
}

/* Estado vazio */
.subtasks-empty-card {
  padding: 16px 12px;
  text-align: center;
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed var(--card-border);
  border-radius: var(--radius-sm);
}

.empty-message {
  margin: 0;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

/* Card de Criação de Subtarefa - Padrão Kanban */
.new-subtask-card {
  background: var(--surface-2);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition-fast) ease, box-shadow var(--transition-fast) ease;
  display: flex;
  flex-direction: column;
}

.new-subtask-card:focus-within {
  border-color: var(--color-info);
  box-shadow: 0 0 0 2px rgba(95, 124, 255, 0.18);
}

.new-subtask-card .task-textarea {
  width: 100%;
  border: none;
  resize: none;
  font-size: var(--fontsize-xs);
  line-height: 1.5;
  padding: var(--space-2) !important;
  outline: none;
  margin-bottom: 4px;
  font-family: inherit;
  color: var(--text-primary);
  background: transparent;
  box-sizing: border-box;
  min-height: 52px;
}

.new-subtask-card .task-textarea::placeholder {
  color: var(--text-muted);
}

.new-subtask-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  margin-top: 2px;
  gap: 8px;
  flex-wrap: wrap;
}

.hint-text {
  font-size: 11px;
  color: var(--text-muted);
}

.hint-text strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.btn-clear-text {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast) ease;
}

.btn-clear-text:hover:not(:disabled) {
  color: var(--text-primary);
}

.btn-create-subtask {
  border: 0;
  background: var(--color-info);
  color: var(--white);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity var(--transition-fast) ease, transform var(--transition-fast) ease;
}

.btn-create-subtask:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-create-subtask:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Accordion Wrapper para Animação de Expansão que desloca elementos */
.accordion-wrapper {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* Painel de busca e vínculo existente */
.link-existing-panel {
  background: var(--surface-2);
  border: 1px solid var(--color-info);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
}

.panel-icon {
  color: var(--color-info);
  font-size: 11px;
}

.btn-panel-close {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast) ease;
}

.btn-panel-close:hover {
  color: var(--text-primary);
}

.search-box-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 11px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  padding: 8px 32px 8px 32px;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fontsize-xs);
  outline: none;
  transition: border-color var(--transition-fast) ease;
}

.search-input:focus {
  border-color: var(--color-info);
}

.btn-clear-search {
  position: absolute;
  right: 8px;
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 11px;
}

.candidate-scroll {
  max-height: 190px;
  overflow-y: auto;
  overflow-x: hidden !important;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.candidate-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  box-sizing: border-box;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-primary);
  text-align: left;
  gap: 12px;
  transition: background var(--transition-fast) ease, border-color var(--transition-fast) ease;
}

.candidate-item:hover {
  border-color: var(--color-info);
  background: rgba(95, 124, 255, 0.08);
}

.candidate-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.candidate-id {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.candidate-title {
  font-size: var(--fontsize-xs);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.candidate-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.candidate-action-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-info);
  background: rgba(95, 124, 255, 0.12);
  border: 1px solid rgba(95, 124, 255, 0.25);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transform: scale(0.96);
  transition: opacity var(--transition-fast) ease, transform var(--transition-fast) ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.candidate-item:hover .candidate-action-badge {
  opacity: 1;
  transform: scale(1);
}

.candidates-empty {
  padding: 14px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

/* Alerta de Erro */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-sm);
  color: var(--red);
  font-size: var(--fontsize-xs);
}

.btn-dismiss-error {
  margin-left: auto;
  background: transparent;
  border: 0;
  color: var(--red);
  cursor: pointer;
  font-size: 11px;
  text-decoration: underline;
}

/* Transições e Animações */
.subtask-anim-enter-active,
.subtask-anim-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.subtask-anim-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.subtask-anim-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

.subtask-anim-move {
  transition: transform 0.25s ease;
}

.fade-error-enter-active,
.fade-error-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-error-enter-from,
.fade-error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 480px) {
  .status-pill {
    display: none;
  }
}
</style>
