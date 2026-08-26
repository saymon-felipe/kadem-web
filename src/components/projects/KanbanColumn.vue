<template>
  <div class="kanban-column" :class="{ searching: show_search }">
    <header class="column-header">
      <div class="header-left">
        <span class="column-drag-handle" title="Arrastar coluna">
          <font-awesome-icon icon="grip-lines" />
        </span>

        <div v-if="is_renaming" class="rename-wrapper">
          <input
            ref="renameInput"
            v-model="edit_title"
            @blur="save_rename"
            @keydown.enter="save_rename"
            @keydown.esc="cancel_rename"
            class="rename-input"
          />
        </div>
        <span
          class="column-name"
          v-else
          @dblclick="start_rename"
          title="Duplo clique para renomear"
        >
          {{ column.title }}
        </span>

        <span class="task-count">{{ filtered_tasks.length }}</span>
      </div>

      <div class="header-actions">
        <button
          class="btn-icon btn-filter-trigger"
          :class="{ active: show_search || has_active_filters }"
          @click="toggle_search"
          :title="has_active_filters ? `${active_filters_count} filtro(s) ativo(s)` : 'Filtrar tarefas'"
        >
          <font-awesome-icon icon="magnifying-glass" />
          <span v-if="has_active_filters" class="filter-indicator-dot"></span>
        </button>

        <div class="options-wrapper">
          <button class="btn-icon" @click.stop="toggle_options" title="Opções da Coluna">
            <font-awesome-icon icon="ellipsis-vertical" />
          </button>

          <div
            v-if="show_options"
            class="options-dropdown"
            v-click-outside="close_options"
          >
            <button @click="start_rename">
              <font-awesome-icon icon="pencil" /> Renomear
            </button>
            <button class="danger" @click="emit_delete_request">
              <font-awesome-icon icon="trash-can" /> Excluir
            </button>
          </div>
        </div>

        <button
          class="btn-icon add-btn"
          @click.stop="show_new_task_form"
          title="Nova Tarefa"
        >
          <font-awesome-icon icon="plus" />
        </button>
      </div>
    </header>

    <div v-if="show_search" class="search-wrapper filter-panel">
      <div class="search-input-box">
        <input
          ref="searchInput"
          v-model="search_query"
          class="search-input"
          placeholder="Buscar descrição ou #ID..."
          @keydown.esc="close_search"
        />
        <button
          v-if="search_query"
          class="clear-search"
          @click="search_query = ''"
          @mousedown.prevent
          type="button"
        >
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div class="column-filters-row">
        <div class="filter-item">
          <label class="filter-label">Membro</label>
          <SearchableDropdown
            v-model="filter_user"
            :options="member_filter_options"
            :searchable="true"
            searchPlaceholder="Buscar membro..."
            placeholder="Todos"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">Prioridade</label>
          <SearchableDropdown
            v-model="filter_priority"
            :options="priority_filter_options"
            :searchable="false"
            placeholder="Todas"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">Tamanho</label>
          <SearchableDropdown
            v-model="filter_size"
            :options="size_filter_options"
            :searchable="false"
            placeholder="Todos"
          />
        </div>
      </div>

      <div class="filter-footer-actions" v-if="has_active_filters">
        <span class="filtered-results-text">
          {{ filtered_tasks.length }} tarefa{{ filtered_tasks.length === 1 ? '' : 's' }}
        </span>
        <button class="btn-clear-filters" @click="reset_filters" type="button">
          Limpar filtros
        </button>
      </div>
    </div>

    <transition name="task-expand">
      <div v-if="is_creating_task" class="new-task-wrapper">
        <div class="new-task-card" v-click-outside="handle_click_outside_creation">
          <textarea
            v-model="new_task_content"
            placeholder="Descreva a tarefa..."
            ref="new_task_input"
            rows="3"
            class="task-textarea"
            @keydown.enter.exact.prevent="handle_create_task"
            @keydown.esc="cancel_create_task"
          ></textarea>

          <div class="new-task-footer">
            <div class="assignee-selector-wrapper">
              <button
                class="btn-assignee"
                ref="assigneeTrigger"
                @click.stop="toggle_assignee_menu"
                :title="selected_assignee_name"
              >
                <div
                  v-if="is_special_assignee"
                  class="avatar-placeholder"
                  :class="special_assignee_class"
                >
                  <font-awesome-icon :icon="special_assignee_icon" />
                </div>

                <img
                  v-else
                  :src="selected_assignee_avatar"
                  class="avatar-xs"
                  alt="Responsável"
                />

                <span class="assignee-label" v-if="selected_assignee_label">
                  {{ selected_assignee_label }}
                </span>
              </button>

              <Teleport to="body">
                <transition name="fade">
                  <div
                    v-if="show_assignee_menu"
                    class="assignee-dropdown glass"
                    v-click-outside="close_assignee_menu"
                    :style="dropdown_position_style"
                  >
                    <ul>
                      <li @click="select_assignee('all')">
                        <div class="avatar-placeholder all-icon">
                          <font-awesome-icon icon="users" />
                        </div>
                        <span>Todos</span>
                      </li>
                      <li @click="select_assignee('any')">
                        <div class="avatar-placeholder any-icon">
                          <font-awesome-icon icon="dice" />
                        </div>
                        <span>Qualquer</span>
                      </li>
                      <hr class="divider" v-if="members && members.length > 0" />
                      <li
                        v-for="member in members"
                        :key="member.id"
                        @click="select_assignee(member)"
                      >
                        <img :src="member.avatar || default_avatar" class="avatar-xs" />
                        <span>{{ member.name }}</span>
                      </li>
                    </ul>
                  </div>
                </transition>
              </Teleport>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <draggable
      :list="filtered_tasks"
      @change="on_task_change"
      item-key="local_id"
      group="tasks"
      class="task-list custom-scrollbar"
      animation="300"
      force-fallback="true"
      :fallback-on-body="true"
      fallback-class="task-fallback"
      ghost-class="task-ghost"
      drag-class="task-drag"
      @start="on_task_drag_start"
      @end="on_task_drag_end"
      :delay="0"
      :delay-on-touch-only="true"
      :disabled="is_searching || is_mobile"
    >
      <template #item="{ element }">
        <KanbanTask :task="element" @click="handle_task_click(element)" />
      </template>

      <template #footer>
        <div v-if="filtered_tasks.length === 0" class="empty-column-message">
          <span>Nenhuma tarefa</span>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { mapActions, mapState } from "pinia";
import { useKanbanStore } from "@/stores/kanban";
import { useWindowStore } from "@/stores/windows";
import { useAuthStore } from "@/stores/auth";
import KanbanTask from "./KanbanTask.vue";
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";
import defaultAvatar from "@/assets/images/kadem-default-account.jpg";

export default {
  name: "KanbanColumn",
  components: { draggable, KanbanTask, SearchableDropdown },
  props: {
    column: {
      type: Object,
      required: true,
    },
    members: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["task-selected", "delete-column"],

  directives: {
    "click-outside": {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.body.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.body.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },

  data() {
    return {
      is_creating_task: false,
      new_task_content: "",
      show_search: false,
      search_query: "",
      filter_user: "all",
      filter_priority: "all",
      filter_size: "all",
      show_options: false,
      is_renaming: false,
      edit_title: "",
      selected_assignee: "any",
      show_assignee_menu: false,
      default_avatar: defaultAvatar,
      dropdown_position_style: {
        top: "0px",
        left: "0px",
        width: "auto",
      },
    };
  },
  computed: {
    ...mapState(useKanbanStore, { getTasks: "getTasks" }),
    ...mapState(useWindowStore, ["_getOrCreateCurrentUserState"]),
    ...mapState(useAuthStore, ["user"]),

    raw_column_tasks() {
      return this.getTasks(this.column.local_id);
    },
    has_active_filters() {
      return (
        this.search_query.trim().length > 0 ||
        this.filter_user !== "all" ||
        this.filter_priority !== "all" ||
        this.filter_size !== "all"
      );
    },
    active_filters_count() {
      let count = 0;
      if (this.search_query.trim().length > 0) count++;
      if (this.filter_user !== "all") count++;
      if (this.filter_priority !== "all") count++;
      if (this.filter_size !== "all") count++;
      return count;
    },
    is_searching() {
      return this.has_active_filters;
    },
    filtered_tasks() {
      let tasks = this.raw_column_tasks;

      // 1. Filtro textual
      const query = this.search_query.toLowerCase().trim();
      if (query) {
        tasks = tasks.filter((task) => {
          const id_match = String(task.id || task.local_id).includes(query);
          const desc_match = (task.description || "").toLowerCase().includes(query);
          const resp_match = (task.responsible?.name || "").toLowerCase().includes(query);
          return id_match || desc_match || resp_match;
        });
      }

      // 2. Filtro por Responsável / Usuário
      if (this.filter_user !== "all") {
        if (this.filter_user === "any") {
          tasks = tasks.filter(
            (t) => t.responsible === "any" || t.responsible?.type === "any"
          );
        } else if (this.filter_user === "all_members") {
          tasks = tasks.filter(
            (t) => t.responsible === "all" || t.responsible?.type === "all"
          );
        } else if (this.filter_user === "unassigned") {
          tasks = tasks.filter((t) => !t.responsible);
        } else {
          tasks = tasks.filter(
            (t) =>
              t.responsible &&
              (String(t.responsible.id) === String(this.filter_user) ||
                (t.responsible.data && String(t.responsible.data.id) === String(this.filter_user)))
          );
        }
      }

      // 3. Filtro por Prioridade
      if (this.filter_priority !== "all") {
        tasks = tasks.filter((t) => (t.priority || "Normal") === this.filter_priority);
      }

      // 4. Filtro por Tamanho
      if (this.filter_size !== "all") {
        tasks = tasks.filter((t) => (t.size || "").startsWith(this.filter_size));
      }

      return tasks;
    },
    containerDimensions() {
      const userState = this._getOrCreateCurrentUserState();
      const win = userState?.openWindows["projects"];
      return win?.size || { width: 0, height: 0 };
    },

    is_mobile() {
      return this.containerDimensions.width <= 1100;
    },
    is_special_assignee() {
      return this.selected_assignee === "all" || this.selected_assignee === "any";
    },
    special_assignee_icon() {
      if (this.selected_assignee === "all") return "users";
      if (this.selected_assignee === "any") return "dice";
      return "";
    },
    special_assignee_class() {
      if (this.selected_assignee === "all") return "all-icon";
      if (this.selected_assignee === "any") return "any-icon";
      return "";
    },
    selected_assignee_name() {
      if (this.selected_assignee === "all") return "Todos";
      if (this.selected_assignee === "any") return "Qualquer um";
      return this.selected_assignee?.name || "Desconhecido";
    },
    selected_assignee_avatar() {
      if (this.selected_assignee === "all") return this.default_avatar;
      if (this.selected_assignee === "any") return this.default_avatar;
      return this.selected_assignee?.avatar || this.default_avatar;
    },
    selected_assignee_label() {
      if (this.selected_assignee === "all") return "Todos";
      if (this.selected_assignee === "any") return "Qualquer";
      return this.selected_assignee.name;
    },
    member_filter_options() {
      const options = [
        { value: "all", label: "Todos", icon: "users" },
        { value: "any", label: "Qualquer", icon: "dice" },
        { value: "all_members", label: "Todos (Grupo)", icon: "users" },
        { value: "unassigned", label: "Não atribuído", icon: "user" },
      ];

      if (this.members && this.members.length > 0) {
        this.members.forEach((m) => {
          options.push({
            value: m.id,
            label: m.name,
            avatar: m.avatar || this.default_avatar,
            subtitle: m.email || "",
          });
        });
      }

      return options;
    },
    priority_filter_options() {
      return [
        { value: "all", label: "Todas" },
        { value: "Normal", label: "Normal", color: "#355afd" },
        { value: "Importante", label: "Importante", color: "#e67e22" },
        { value: "Urgente", label: "Urgente", color: "#e74c3c" },
      ];
    },
    size_filter_options() {
      return [
        { value: "all", label: "Todos" },
        { value: "P", label: "P (Pequeno)" },
        { value: "M", label: "M (Médio)" },
        { value: "G", label: "G (Grande)" },
      ];
    },
  },
  methods: {
    ...mapActions(useKanbanStore, ["createTask", "updateTasksForColumn", "updateColumn"]),

    toggle_options() {
      this.show_options = !this.show_options;
    },
    close_options() {
      this.show_options = false;
    },

    start_rename() {
      this.edit_title = this.column.title;
      this.is_renaming = true;
      this.close_options();
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus();
          this.$refs.renameInput.select();
        }
      });
    },
    async save_rename() {
      if (this.edit_title.trim() && this.edit_title !== this.column.title) {
        await this.updateColumn({ ...this.column, title: this.edit_title });
      }
      this.is_renaming = false;
    },
    cancel_rename() {
      this.is_renaming = false;
    },

    emit_delete_request() {
      this.close_options();
      this.$emit("delete-column", this.column);
    },
    reset_filters() {
      this.search_query = "";
      this.filter_user = "all";
      this.filter_priority = "all";
      this.filter_size = "all";
    },
    toggle_search() {
      this.show_search = !this.show_search;
      if (this.show_search) {
        this.$nextTick(() => {
          if (this.$refs.searchInput) this.$refs.searchInput.focus();
        });
      } else {
        this.reset_filters();
      }
    },
    close_search() {
      this.reset_filters();
      this.show_search = false;
    },
    on_task_drag_start() {
      this.beginGlobalDrag();
    },
    on_task_drag_end() {
      this.endGlobalDrag();
    },
    on_task_change(event) {
      if (this.is_searching) return;
      if (event.added || event.moved || event.removed) {
        this.updateTasksForColumn({
          columnId: this.column.local_id,
          tasks: this.filtered_tasks,
          event: event,
        });
      }
    },
    handle_task_click(task) {
      this.$emit("task-selected", task);
    },

    show_new_task_form() {
      this.close_options();
      this.close_search();
      this.is_creating_task = true;
      this.new_task_content = "";

      // Definir usuário logado como responsável padrão
      const currentUserId = this.user?.id;
      const memberObj = (this.members || []).find((m) => m.id === currentUserId);
      if (memberObj) {
        this.selected_assignee = memberObj;
      } else if (this.user && this.user.id) {
        this.selected_assignee = {
          id: this.user.id,
          name: this.user.name || "Eu",
          avatar: this.user.avatar || this.default_avatar,
          type: "user",
        };
      } else {
        this.selected_assignee = "any";
      }

      this.$nextTick(() => {
        if (this.$refs.new_task_input) this.$refs.new_task_input.focus();
      });
    },

    cancel_create_task() {
      this.is_creating_task = false;
      this.new_task_content = "";
      this.show_assignee_menu = false;
    },
    handle_click_outside_creation(event) {
      const dropdown = document.querySelector(".assignee-dropdown");
      if (dropdown && dropdown.contains(event.target)) {
        return;
      }

      const btnAssignee = this.$el.querySelector(".btn-assignee");
      if (btnAssignee && btnAssignee.contains(event.target)) {
        return;
      }

      if (this.new_task_content.trim()) {
        this.handle_create_task();
      } else {
        this.cancel_create_task();
      }
    },

    toggle_assignee_menu() {
      this.show_assignee_menu = !this.show_assignee_menu;
      if (this.show_assignee_menu) {
        this.calculate_dropdown_position();
      }
    },
    calculate_dropdown_position() {
      if (!this.$refs.assigneeTrigger) return;

      const rect = this.$refs.assigneeTrigger.getBoundingClientRect();

      this.dropdown_position_style = {
        position: "fixed",
        top: `${rect.bottom + 5}px`,
        left: `${rect.left}px`,
        zIndex: "9999",
      };
    },
    close_assignee_menu() {
      this.show_assignee_menu = false;
    },
    select_assignee(target) {
      this.selected_assignee = target;
      this.close_assignee_menu();

      this.$nextTick(() => {
        if (this.$refs.new_task_input) this.$refs.new_task_input.focus();
      });
    },

    async handle_create_task() {
      if (!this.new_task_content.trim()) {
        this.cancel_create_task();
        return;
      }
      try {
        let responsibleData = null;
        if (this.selected_assignee === "all") responsibleData = { type: "all" };
        else if (this.selected_assignee === "any") responsibleData = { type: "any" };
        else responsibleData = { ...this.selected_assignee };

        const new_task = await this.createTask(this.column.local_id, {
          description: this.new_task_content,
          title: "",
          responsible: responsibleData,
          project_id: this.column.project_id,
        });

        if (new_task && new_task.local_id) {
          this.$emit("task-selected", new_task);
        }
      } catch (error) {
        console.error("Erro ao criar tarefa:", error);
      } finally {
        this.cancel_create_task();
      }
    },
  },
};
</script>

<style scoped>
.kanban-column {
  min-width: 320px;
  max-width: 320px;
  height: fit-content;
  max-height: 100%;
  background: rgba(206, 179, 134, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

[data-theme="dark"] .kanban-column {
  background: rgba(30, 34, 55, 0.4);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  gap: var(--space-3);
  flex-shrink: 0;
  position: relative;
}

.column-name {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  flex-grow: 1;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  flex-grow: 1;
  overflow: hidden;
}

.rename-wrapper {
  flex-grow: 1;
  margin-right: 8px;
}

.rename-input {
  width: 100%;
  font-family: inherit;
  font-weight: 700;
  font-size: inherit;
  text-transform: uppercase;
  border: 1px solid var(--color-info);
  border-radius: 4px;
  padding: 2px 4px;
  outline: none !important;
  box-shadow: none !important;
  height: 30px;
  background: var(--surface-1);
  color: var(--text-primary);
}

.column-drag-handle {
  cursor: grab;
  color: var(--text-muted);
  padding: 4px;
  transition: color var(--transition-fast);
}

.column-drag-handle:hover {
  color: var(--text-primary);
}

.column-drag-handle:active {
  cursor: grabbing;
}

.task-count {
  background: var(--surface-3);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 5px;
  transition: all var(--transition-fast);
}

.btn-icon:hover,
.btn-icon.active {
  background-color: var(--surface-3);
  color: var(--text-primary);
}

.header-actions .add-btn:hover {
  color: var(--text-primary);
}

.options-wrapper {
  position: relative;
}

.options-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  min-width: 140px;
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border);
}

.options-dropdown button {
  background: none;
  border: none;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.options-dropdown button:hover {
  background: var(--surface-3);
}

.options-dropdown button.danger {
  color: var(--color-expense);
}

.options-dropdown button.danger:hover {
  background: var(--red-high);
}

.btn-filter-trigger {
  position: relative;
}

.filter-indicator-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--color-info);
  border: 1px solid var(--surface-2);
}

.search-wrapper {
  padding: 0 var(--space-4);
  margin: var(--space-1) 0;
  position: relative;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-3) var(--space-2) var(--space-3);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  margin: 0 var(--space-3) var(--space-3) var(--space-3);
  border: 1px solid var(--glass-border);
}

.search-input-box {
  position: relative;
  width: 100%;
  margin-top: var(--space-2);
}

.search-input {
  width: 100%;
  padding: 6px 28px 6px 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  outline: none;
  height: 34px;
  background: var(--surface-1);
  color: var(--text-primary);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-info);
  background: var(--surface-0);
}

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
}

.clear-search:hover {
  color: var(--color-expense);
}

.column-filters-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  width: 100%;
  height: 28px;
  padding: 2px 4px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--glass-border);
  background-color: var(--surface-1);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.filter-select:focus {
  border-color: var(--color-info);
}

.filter-footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-1);
  padding-top: var(--space-1);
  border-top: 1px dashed var(--glass-border);
}

.filtered-results-text {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-clear-filters {
  background: none;
  border: none;
  color: var(--color-info);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
}

.btn-clear-filters:hover {
  text-decoration: underline;
}

.task-list {
  flex-grow: 0;
  flex-shrink: 1;
  padding: var(--space-3);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 100px;
  position: relative;
}

.empty-column-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  font-style: italic;
  user-select: none;
  pointer-events: none;
  width: 100%;
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.task-ghost {
  opacity: 0.4;
  background: rgba(0, 0, 0, 0.05);
  border: 2px dashed var(--text-muted);
  border-radius: var(--radius-md);
  box-shadow: none;
}

.task-fallback {
  opacity: 1 !important;
  background: var(--surface-2);
  box-shadow: var(--shadow-float) !important;
  border: 1px solid var(--color-info);
  z-index: 9999 !important;
  cursor: grabbing !important;
}

.task-drag {
  opacity: 0;
}

.task-list-anim-move {
  transition: transform 0.3s ease;
}

.new-task-wrapper {
  padding: 0 var(--space-3) var(--space-3) var(--space-3);
}

.new-task-card {
  background: var(--surface-2);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--glass-border);
  transition: border-color var(--transition-fast);
}

.new-task-card:focus-within {
  border-color: var(--color-info);
}

.task-textarea {
  width: 100%;
  border: none;
  resize: none;
  font-size: var(--fontsize-sm);
  padding: var(--space-4) !important;
  outline: none;
  margin-bottom: var(--space-2);
  font-family: inherit;
  color: var(--text-primary);
  background: transparent;
}

.task-textarea:focus {
  outline: 2px solid var(--color-info) !important;
}

.new-task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
}

.hint-text {
  font-size: 10px;
  color: var(--text-muted);
}

.assignee-selector-wrapper {
  position: relative;
}

.btn-assignee {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-3);
  border: none;
  padding: 2px 8px 2px 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-assignee:hover {
  background: var(--surface-2);
}

.avatar-xs {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.assignee-label {
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  font-weight: 500;
}

.assignee-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 150;
  background: var(--surface-2);
  min-width: 160px;
  max-height: 200px;
  overflow-y: auto;
  padding: var(--space-2) 0;
  box-shadow: var(--shadow-float);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
}

.assignee-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.assignee-dropdown li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.assignee-dropdown li:hover {
  background: var(--surface-3);
}

.divider {
  border: 0;
  border-top: 1px solid var(--gray-500);
  margin: 4px 0;
  opacity: 0.3;
}

.avatar-placeholder {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  color: var(--white);
}

.all-icon {
  background-color: var(--color-info);
}

.any-icon {
  background-color: var(--orange);
}

.task-expand-enter-active,
.task-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  max-height: 300px;
  opacity: 1;
  overflow: hidden;
}

.task-expand-enter-from,
.task-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
  padding-bottom: 0;
  margin-bottom: 0;
}

@container (max-width: 1100px) {
  .new-task-card {
    height: 100%;

    & textarea {
      margin-bottom: 0;
      height: 117px;
    }

    & .new-task-footer {
      display: none;
    }
  }

  .kanban-column,
  .column-fallback {
    width: 100%;
    height: 215px;
    min-width: 100%;
    max-width: 100%;
  }

  .kanban-column.searching {
    height: 320px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .task-list {
    flex-direction: row;
    overflow-y: hidden;
    overflow-x: auto;
  }
}
</style>
