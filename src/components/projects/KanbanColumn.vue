<template>
  <div class="kanban-column" :class="{ searching: show_search, 'task-drop-disabled': is_searching }">
    <header class="column-header">
      <div class="header-left">
        <span class="column-drag-handle" title="Arrastar coluna">
          <font-awesome-icon icon="grip-lines" />
        </span>

        <div v-if="is_renaming" class="rename-wrapper">
          <input ref="renameInput" v-model="edit_title" @blur="save_rename" @keydown.enter="save_rename"
            @keydown.esc="cancel_rename" class="rename-input" />
        </div>
        <span class="column-name" v-else @dblclick="start_rename" title="Duplo clique para renomear">
          {{ column.title }}
        </span>

        <span class="task-count">{{ filtered_tasks.length }}</span>
      </div>

      <div class="header-actions">
        <button ref="filterTrigger" class="btn-icon btn-filter-trigger"
          :class="{ active: show_search || has_active_filters }" @click="toggle_search"
          :title="has_active_filters ? `${active_filters_count} filtro(s) ativo(s)` : 'Filtrar tarefas'">
          <font-awesome-icon icon="magnifying-glass" />
          <span v-if="has_active_filters" class="filter-indicator-dot"></span>
        </button>

        <div class="options-wrapper">
          <button class="btn-icon" @click.stop="toggle_options" title="Opções da Coluna">
            <font-awesome-icon icon="ellipsis-vertical" />
          </button>

          <div v-if="show_options" class="options-dropdown" v-click-outside="close_options">
            <button @click="start_rename">
              <font-awesome-icon icon="pencil" /> Renomear
            </button>
            <button @click="open_type_config">
              <font-awesome-icon icon="cog" /> Configurar tipo
            </button>
            <button class="danger" @click="emit_delete_request">
              <font-awesome-icon icon="trash-can" /> Excluir
            </button>
          </div>
        </div>

        <button class="btn-icon add-btn" @click.stop="show_new_task_form" title="Nova Tarefa">
          <font-awesome-icon icon="plus" />
        </button>
      </div>
    </header>
    <button class="column-type-label" :title="`Configurar tipo: ${column_type.description}`" @click="open_type_config">
      <span class="column-type-dot" :style="{ backgroundColor: column_type.color || 'var(--text-muted)' }"></span>
      <span class="column-type-name">{{ column_type.label }}</span>
    </button>
    <BaseModal v-model="show_type_config" size="md" :show-close="!is_saving_type" :close-on-backdrop="!is_saving_type"
      :close-on-escape="!is_saving_type">
      <template #title>
        <div class="column-type-modal-title">
          <div class="title-icon-box">
            <font-awesome-icon icon="sliders" />
          </div>
          <div class="title-meta">
            <h3 class="title-text">Configurar tipo da coluna</h3>
            <span class="title-subtitle">Defina o comportamento e o status desta etapa no fluxo</span>
          </div>
        </div>
      </template>

      <form :id="`column-type-form-${column.local_id}`" class="column-type-modal-form"
        @submit.prevent="save_column_type">
        <!-- Banner de Contexto da Coluna -->
        <div class="column-context-card">
          <div class="context-pill-row">
            <div class="context-tag">
              <font-awesome-icon icon="table-cells-large" class="context-icon" />
              <span>Coluna alvo</span>
            </div>
            <span class="context-column-name" :title="column.title">{{ column.title }}</span>
          </div>
          <p class="context-explanation">
            O tipo define a categoria semântica e o status automático das tarefas nesta coluna. O nome do título
            continua
            livre para você renomear como quiser.
          </p>
        </div>

        <!-- Seletor em Lista de Cards Interativos -->
        <div class="type-selection-block">
          <div class="selection-header">
            <span class="selection-label">Selecione o tipo de etapa</span>
            <span class="selection-count">{{ column_types.length }} etapas disponíveis</span>
          </div>

          <div class="type-cards-grid custom-scrollbar" role="radiogroup" aria-label="Tipos de coluna disponíveis">
            <div v-for="(option, idx) in column_types" :key="option.value" class="type-card" :class="{
              'is-selected': edit_column_type === option.value,
              'is-current': column.type === option.value,
              'is-disabled': is_saving_type
            }" :style="{ '--type-accent': option.color }" role="radio"
              :aria-checked="edit_column_type === option.value" :tabindex="is_saving_type ? -1 : 0"
              @click="!is_saving_type && (edit_column_type = option.value)"
              @dblclick="!is_saving_type && save_column_type()" @keydown="handle_type_keydown($event, idx)">
              <div class="type-card-icon" :style="{
                color: option.color,
                backgroundColor: option.color + '1a',
                borderColor: option.color + '33'
              }">
                <font-awesome-icon :icon="option.icon" />
              </div>

              <div class="type-card-body">
                <div class="type-card-title-row">
                  <span class="type-card-name">{{ option.label }}</span>
                  <span v-if="column.type === option.value" class="type-current-pill">Atual</span>
                </div>
                <p class="type-card-desc">{{ option.description }}</p>
              </div>

              <div class="type-card-radio" :class="{ 'is-checked': edit_column_type === option.value }">
                <font-awesome-icon v-if="edit_column_type === option.value" icon="check" class="check-icon" />
              </div>
            </div>
          </div>
        </div>

        <!-- Mensagem de erro caso ocorra -->
        <transition name="fade">
          <div v-if="type_error" class="column-type-error-alert" role="alert">
            <font-awesome-icon icon="triangle-exclamation" class="error-alert-icon" />
            <span class="error-alert-text">{{ type_error }}</span>
          </div>
        </transition>
      </form>

      <template #footer>
        <div class="column-type-modal-footer">
          <button type="button" class="modal-btn modal-btn-cancel" :disabled="is_saving_type"
            @click="show_type_config = false">
            Cancelar
          </button>
          <button type="submit" class="modal-btn modal-btn-save" :form="`column-type-form-${column.local_id}`"
            :disabled="is_saving_type">
            <font-awesome-icon v-if="is_saving_type" icon="circle-notch" spin class="btn-spin" />
            <font-awesome-icon v-else icon="check" class="btn-check" />
            <span>{{ is_saving_type ? 'Salvando...' : 'Salvar Alterações' }}</span>
          </button>
        </div>
      </template>
    </BaseModal>

    <transition name="filter-expand" @after-leave="reset_filters">
      <div v-if="show_search" class="filter-panel-wrapper" v-click-outside="handle_click_outside_search">
        <div class="filter-panel-content">
          <div class="search-wrapper filter-panel">
            <div class="search-input-box">
              <input ref="searchInput" v-model="search_query" class="search-input"
                placeholder="Buscar descrição ou #ID..." @keydown.esc="close_search" />
              <button v-if="search_query" class="clear-search" @click="search_query = ''" @mousedown.prevent
                type="button">
                <font-awesome-icon icon="xmark" />
              </button>
            </div>

            <div class="column-filters-row">
              <div class="filter-item">
                <label class="filter-label">Membro</label>
                <SearchableDropdown v-model="filter_user" :options="member_filter_options" :searchable="true"
                  searchPlaceholder="Buscar membro..." placeholder="Todos" />
              </div>

              <div class="filter-item">
                <label class="filter-label">Prioridade</label>
                <SearchableDropdown v-model="filter_priority" :options="priority_filter_options" :searchable="false"
                  placeholder="Todas" />
              </div>

              <div class="filter-item">
                <label class="filter-label">Tamanho</label>
                <SearchableDropdown v-model="filter_size" :options="size_filter_options" :searchable="false"
                  placeholder="Todos" />
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
        </div>
      </div>
    </transition>

    <transition name="task-expand">
      <div v-if="is_creating_task" class="new-task-wrapper">
        <div class="new-task-card" v-click-outside="handle_click_outside_creation">
          <textarea v-model="new_task_content" placeholder="Descreva a tarefa..." ref="new_task_input" rows="3"
            class="task-textarea" @keydown.enter.exact.prevent="handle_create_task"
            @keydown.esc="cancel_create_task"></textarea>

          <div class="new-task-footer">
            <div class="assignee-selector-wrapper">
              <button class="btn-assignee" ref="assigneeTrigger" @click.stop="toggle_assignee_menu"
                :title="selected_assignee_name">
                <div v-if="is_special_assignee" class="avatar-placeholder" :class="special_assignee_class">
                  <font-awesome-icon :icon="special_assignee_icon" />
                </div>

                <img v-else :src="selected_assignee_avatar" class="avatar-xs" alt="Responsável" />

                <span class="assignee-label" v-if="selected_assignee_label">
                  {{ selected_assignee_label }}
                </span>
              </button>

              <Teleport to="body">
                <transition name="fade">
                  <div v-if="show_assignee_menu" class="assignee-dropdown glass" v-click-outside="close_assignee_menu"
                    :style="dropdown_position_style">
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
                      <li v-for="member in members" :key="member.id" @click="select_assignee(member)">
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

    <draggable ref="taskList" :list="filtered_tasks" @change="on_task_change" item-key="local_id" group="tasks"
      class="task-list custom-scrollbar" animation="300" force-fallback="true" :fallback-on-body="true"
      :scroll-sensitivity="100" fallback-class="task-fallback" ghost-class="task-ghost" drag-class="task-drag"
      @start="on_task_drag_start" @end="on_task_drag_end" :delay="0" :delay-on-touch-only="true"
      :disabled="is_searching || is_mobile">
      <template #item="{ element }">
        <KanbanTask :task="element" :data-task-id="element.local_id" @click="handle_task_click(element)" />
      </template>

      <template #footer>
        <div v-if="filtered_tasks.length === 0" key="empty-column" class="empty-column-message">
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
import { KANBAN_COLUMN_TYPES } from '@/utils/kanbanTypes';
import BaseModal from '@/components/BaseModal.vue';

export default {
  name: "KanbanColumn",
  components: { draggable, KanbanTask, SearchableDropdown, BaseModal },
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

  created() {
    this._task_drag_preview = null;
    this._task_drag_pointer = null;
    this._task_drag_pointer_frame = 0;
    this._task_drag_preview_cleanups = new Map();
    this._filter_task_animations = new Set();
    this._filter_task_clones = new Set();
  },

  beforeUnmount() {
    this.cancel_filter_task_animations();
    this.stop_tracking_task_drag();
    const preview = this._task_drag_preview;
    if (preview?.column?.isConnected) {
      preview.column.classList.remove("task-drop-target");
      preview.column.style.removeProperty("height");
    }

    this._task_drag_preview_cleanups.forEach((cleanup, column) => {
      clearTimeout(cleanup.timer);
      column.removeEventListener("transitionend", cleanup.on_transition_end);
      if (column.isConnected) column.style.removeProperty("height");
    });
    this._task_drag_preview_cleanups.clear();
  },

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
      show_type_config: false,
      edit_column_type: 'TODO',
      is_saving_type: false,
      type_error: '',
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
    column_types() { return KANBAN_COLUMN_TYPES; },
    column_type() { return KANBAN_COLUMN_TYPES.find(option => option.value === this.column.type) || KANBAN_COLUMN_TYPES[1]; },
    selected_column_type() { return KANBAN_COLUMN_TYPES.find(option => option.value === this.edit_column_type) || KANBAN_COLUMN_TYPES[1]; },
    ...mapState(useKanbanStore, { getTasks: "getTasks" }),
    ...mapState(useWindowStore, ["_getOrCreateCurrentUserState"]),
    ...mapState(useAuthStore, ["user"]),

    raw_column_tasks() {
      return this.getTasks(this.column.local_id);
    },
    filter_values() {
      return [this.search_query, this.filter_user, this.filter_priority, this.filter_size];
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
  watch: {
    filter_values() {
      this.animate_filter_change();
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
        await this.updateColumn({ local_id: this.column.local_id, title: this.edit_title.trim() });
      }
      this.is_renaming = false;
    },
    cancel_rename() {
      this.is_renaming = false;
    },
    open_type_config() {
      this.edit_column_type = this.column.type || 'TODO';
      this.type_error = '';
      this.close_options();
      this.show_type_config = true;
      this.$nextTick(() => {
        const activeCard = document.querySelector('.type-card.is-selected');
        if (activeCard) {
          activeCard.focus?.();
          activeCard.scrollIntoView?.({ block: 'nearest' });
        }
      });
    },
    handle_type_keydown(e, index) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (index + 1) % this.column_types.length;
        this.edit_column_type = this.column_types[nextIndex].value;
        this.$nextTick(() => {
          const cards = document.querySelectorAll('.type-card');
          cards[nextIndex]?.focus?.();
          cards[nextIndex]?.scrollIntoView?.({ block: 'nearest' });
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (index - 1 + this.column_types.length) % this.column_types.length;
        this.edit_column_type = this.column_types[prevIndex].value;
        this.$nextTick(() => {
          const cards = document.querySelectorAll('.type-card');
          cards[prevIndex]?.focus?.();
          cards[prevIndex]?.scrollIntoView?.({ block: 'nearest' });
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.edit_column_type = this.column_types[index].value;
      }
    },
    async save_column_type() {
      if (this.is_saving_type) return;
      this.is_saving_type = true;
      this.type_error = '';
      try {
        await this.updateColumn({ local_id: this.column.local_id, type: this.edit_column_type });
        this.show_type_config = false;
      } catch (error) {
        this.type_error = error.message || 'Não foi possível salvar o tipo da coluna.';
      } finally {
        this.is_saving_type = false;
      }
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
      if (this.show_search) {
        this.close_search();
        return;
      }
      this.show_search = true;
      this.$nextTick(() => {
        if (this.$refs.searchInput) this.$refs.searchInput.focus();
      });
    },
    close_search() {
      this.show_search = false;
    },
    handle_click_outside_search(event) {
      if (this.$refs.filterTrigger?.contains(event.target)) return;
      this.close_search();
    },
    cancel_filter_task_animations() {
      this._filter_task_animations.forEach((animation) => animation.cancel());
      this._filter_task_animations.clear();
      this._filter_task_clones.forEach((el) => el.remove());
      this._filter_task_clones.clear();
    },
    animate_filter_change() {
      const list = this.$refs.taskList?.$el;
      if (!list?.isConnected) return;
      const previous_list_rect = list.getBoundingClientRect();

      // Captura as posições antes de o Vue aplicar o novo filtro ao DOM.
      const previous = new Map(
        [...list.querySelectorAll(":scope > .kanban-task:not(.task-filter-leaving)")].map((el) => [
          el.dataset.taskId,
          { el, rect: el.getBoundingClientRect(), opacity: getComputedStyle(el).opacity },
        ])
      );
      this.cancel_filter_task_animations();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const next_ids = new Set(this.filtered_tasks.map((task) => String(task.local_id)));
      const leaving = [...previous.entries()]
        .filter(([id]) => !next_ids.has(id))
        .map(([, card]) => ({ ...card, el: card.el.cloneNode(true) }));

      this.$nextTick(() => {
        if (!list.isConnected) return;
        const list_rect = list.getBoundingClientRect();
        if (previous_list_rect.height !== list_rect.height) {
          this.animate_filter_task(list, [
            { height: `${previous_list_rect.height}px` },
            { height: `${list_rect.height}px` },
          ]);
        }
        leaving.forEach(({ el, rect, opacity }) => {
          el.classList.add("task-filter-leaving");
          el.removeAttribute("data-draggable");
          el.setAttribute("aria-hidden", "true");
          Object.assign(el.style, {
            left: `${rect.left - list_rect.left + list.scrollLeft - list.clientLeft}px`,
            top: `${rect.top - list_rect.top + list.scrollTop - list.clientTop}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          list.appendChild(el);
          this._filter_task_clones.add(el);
          this.animate_filter_task(el, [
            { opacity, transform: "none" },
            { opacity: 0, transform: "translateY(6px) scale(0.97)" },
          ], true);
        });

        list.querySelectorAll(":scope > .kanban-task:not(.task-filter-leaving)").forEach((el) => {
          const old = previous.get(el.dataset.taskId);
          const rect = el.getBoundingClientRect();
          const x = old ? old.rect.left - rect.left : 0;
          const y = old ? old.rect.top - rect.top : 10;
          if (old && !x && !y && old.opacity === "1") return;
          this.animate_filter_task(el, [
            { opacity: old?.opacity ?? 0, transform: `translate(${x}px, ${y}px) scale(${old ? 1 : 0.97})` },
            { opacity: 1, transform: "none" },
          ]);
        });
      });
    },
    animate_filter_task(el, keyframes, remove_after = false) {
      const animation = el.animate(keyframes, {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      });
      this._filter_task_animations.add(animation);
      animation.finished.then(() => {
        this._filter_task_animations.delete(animation);
        animation.cancel();
        if (remove_after) {
          el.remove();
          this._filter_task_clones.delete(el);
        }
      }, () => { });
    },
    on_task_drag_start(evt) {
      this.cancel_filter_task_animations();
      this.beginGlobalDrag();
      const item_rect = evt.item.getBoundingClientRect();
      const point = evt.originalEvent?.touches?.[0] || evt.originalEvent;
      const start_x = point?.clientX ?? item_rect.left + item_rect.width / 2;
      const start_y = point?.clientY ?? item_rect.top + item_rect.height / 2;
      this._task_drag_pointer = {
        x: start_x,
        y: start_y,
        offset_y: start_y - item_rect.top,
        card_height: item_rect.height,
      };

      ["pointermove", "mousemove", "touchmove"].forEach((name) =>
        document.addEventListener(name, this.track_task_drag_pointer, {
          capture: true,
          passive: true,
        })
      );
    },
    track_task_drag_pointer(evt) {
      const point = evt.touches?.[0] || evt;
      if (point.clientX == null || !this._task_drag_pointer) return;

      this._task_drag_pointer.x = point.clientX;
      this._task_drag_pointer.y = point.clientY;
      if (this._task_drag_pointer_frame) return;
      this._task_drag_pointer_frame = requestAnimationFrame(this.update_task_drag_preview);
    },
    stop_tracking_task_drag() {
      ["pointermove", "mousemove", "touchmove"].forEach((name) =>
        document.removeEventListener(name, this.track_task_drag_pointer, true)
      );
      if (this._task_drag_pointer_frame) cancelAnimationFrame(this._task_drag_pointer_frame);
      this._task_drag_pointer_frame = 0;
      this._task_drag_pointer = null;
    },
    update_task_drag_preview() {
      this._task_drag_pointer_frame = 0;
      const pointer = this._task_drag_pointer;
      const board = this.$el.closest(".kanban-board");
      const columns_area = board?.querySelector(".kanban-columns-container");
      if (!pointer || !columns_area || this.is_mobile) return;

      const area_bottom = columns_area.getBoundingClientRect().bottom;
      const target_column = [...board.querySelectorAll(".kanban-column")].find((column) => {
        if (column === this.$el || column.classList.contains("task-drop-disabled")) return false;
        const rect = column.getBoundingClientRect();
        return (
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= area_bottom
        );
      });
      const target_list = target_column?.querySelector(".task-list");

      if (!target_list) {
        this.restore_task_drag_preview();
        return;
      }

      let preview = this._task_drag_preview;
      if (preview?.column !== target_column) {
        this.restore_task_drag_preview();
        this.cancel_task_drag_preview_cleanup(target_column);

        const base_height = this.measure_natural_column_height(target_column);
        const parent_height = target_column.parentElement?.clientHeight || 0;
        const css_max_height = getComputedStyle(target_column).maxHeight;
        const css_max_height_px = css_max_height.endsWith("px")
          ? Number.parseFloat(css_max_height)
          : 0;
        preview = {
          column: target_column,
          list: target_list,
          base_height,
          max_height: Math.max(base_height, css_max_height_px || parent_height),
          initialized: false,
        };
        this._task_drag_preview = preview;
        target_column.classList.add("task-drop-target");
      }

      const floating_card = document.querySelector(".task-fallback");
      const floating_bottom = floating_card?.getBoundingClientRect().bottom ??
        pointer.y - pointer.offset_y + pointer.card_height;
      const placeholder = preview.list.querySelector(".task-ghost");
      const card_bottom = Math.max(
        floating_bottom,
        placeholder?.getBoundingClientRect().bottom || floating_bottom
      );
      const column_rect = preview.column.getBoundingClientRect();
      const bottom_space =
        Number.parseFloat(getComputedStyle(preview.list).paddingBottom) +
        Number.parseFloat(getComputedStyle(preview.column).borderBottomWidth);
      const next_height = Math.min(
        preview.max_height,
        Math.max(preview.base_height, Math.ceil(card_bottom - column_rect.top + bottom_space))
      );

      if (!preview.initialized && preview.base_height < preview.max_height - 1) {
        preview.column.style.height = `${preview.base_height}px`;
        void preview.column.offsetHeight;
        preview.initialized = true;
      }
      if (preview.initialized) preview.column.style.height = `${next_height}px`;
    },
    on_task_drag_end(evt) {
      this.stop_tracking_task_drag();
      const preview = this._task_drag_preview;
      this._task_drag_preview = null;

      if (preview) {
        const dropped_in_preview_column = evt?.to === preview.list;
        requestAnimationFrame(() => {
          requestAnimationFrame(() =>
            this.finish_task_drag_preview(preview, dropped_in_preview_column)
          );
        });
      }

      this.endGlobalDrag();
    },
    measure_natural_column_height(column) {
      const previous_height = column.style.height;
      const previous_transition = column.style.transition;

      column.style.transition = "none";
      column.style.removeProperty("height");
      const natural_height = column.getBoundingClientRect().height;
      if (previous_height) column.style.height = previous_height;
      void column.offsetHeight;
      column.style.transition = previous_transition;

      return natural_height;
    },
    finish_task_drag_preview(preview, dropped) {
      const { column } = preview;
      if (!column.isConnected) return;
      column.classList.remove("task-drop-target");
      if (!preview.initialized) return;

      this.cancel_task_drag_preview_cleanup(column);
      const current_height = column.getBoundingClientRect().height;
      const target_height = dropped
        ? this.measure_natural_column_height(column)
        : preview.base_height;

      column.style.height = `${current_height}px`;
      void column.offsetHeight;
      column.style.height = `${target_height}px`;
      this.schedule_task_drag_preview_cleanup(column);
    },
    restore_task_drag_preview() {
      const preview = this._task_drag_preview;
      if (!preview) return;

      this._task_drag_preview = null;
      this.finish_task_drag_preview(preview, false);
    },
    cancel_task_drag_preview_cleanup(column) {
      const cleanup = this._task_drag_preview_cleanups.get(column);
      if (!cleanup) return;

      clearTimeout(cleanup.timer);
      column.removeEventListener("transitionend", cleanup.on_transition_end);
      this._task_drag_preview_cleanups.delete(column);
    },
    schedule_task_drag_preview_cleanup(column) {
      this.cancel_task_drag_preview_cleanup(column);

      const cleanup = () => {
        this.cancel_task_drag_preview_cleanup(column);
        if (column.isConnected) column.style.removeProperty("height");
      };
      const on_transition_end = (event) => {
        if (event.target === column && event.propertyName === "height") cleanup();
      };
      const timer = setTimeout(cleanup, 400);

      column.addEventListener("transitionend", on_transition_end);
      this._task_drag_preview_cleanups.set(column, { timer, on_transition_end });
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
.column-type-label {
  /*display: inline-flex;*/
  display: none;
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-3) var(--space-2);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color var(--transition-fast), opacity var(--transition-fast);
  border-radius: var(--radius-sm);
  width: fit-content;
}

.column-type-label:hover {
  color: var(--text-primary);
}

.column-type-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.column-type-name {
  font-weight: 500;
}

/* Modal de Configuração de Tipo da Coluna */
.column-type-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--blue);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.title-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title-meta .title-text {
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.25;
}

.title-meta .title-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.column-type-modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 2px;
}

.column-context-card {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-pill-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.context-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted);
}

.context-icon {
  font-size: 0.75rem;
  opacity: 0.8;
}

.context-column-name {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--surface-3);
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--glass-border);
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-explanation {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.type-selection-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selection-count {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.type-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  user-select: none;
  position: relative;
}

.type-card:hover:not(.is-disabled) {
  background: var(--surface-2);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.type-card:focus-visible {
  box-shadow: 0 0 0 2px var(--type-accent, var(--blue));
}

.type-card.is-selected {
  border-color: var(--type-accent, var(--blue));
  background: rgba(53, 90, 253, 0.08);
  background: color-mix(in srgb, var(--type-accent, #355afd) 10%, var(--surface-1));
  box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--type-accent, var(--blue));
  transform: translateY(-1px);
}

[data-theme='dark'] .type-card.is-selected {
  background: rgba(53, 90, 253, 0.15);
  background: color-mix(in srgb, var(--type-accent, #355afd) 14%, var(--surface-1));
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--type-accent, var(--blue));
}

.type-card.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.type-card-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  border: 1px solid transparent;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.type-card:hover:not(.is-disabled) .type-card-icon {
  transform: scale(1.08);
}

.type-card-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.25;
}

.type-current-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background: var(--surface-3);
  color: var(--text-muted);
}

.type-card-desc {
  margin: 0;
  font-size: 0.77rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.type-card-radio {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  border: 2px solid var(--gray-400);
  background: transparent;
  display: grid;
  place-items: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.type-card-radio.is-checked {
  border-color: var(--type-accent, var(--blue));
  background-color: var(--type-accent, var(--blue));
  color: #ffffff;
}

.type-card-radio .check-icon {
  font-size: 0.65rem;
}

.column-type-error-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(214, 74, 46, 0.12);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense);
  font-size: 0.82rem;
}

.error-alert-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.error-alert-text {
  line-height: 1.35;
}

.column-type-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border-top: 1px solid var(--glass-border);
  background: var(--surface-1);
}

.modal-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.modal-btn-cancel {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.modal-btn-cancel:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}

.modal-btn-save {
  background-image: var(--deep-blue-gradient);
  background-size: 200% auto;
  color: var(--white);
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.25);
}

[data-theme='dark'] .modal-btn-save {
  background-image: linear-gradient(135deg, #355afd, #243fb8);
  color: #ffffff;
  box-shadow: 0 3px 12px rgba(53, 90, 253, 0.35);
}

.modal-btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.modal-btn-save:active:not(:disabled) {
  transform: translateY(0);
}

.btn-spin,
.btn-check {
  font-size: 0.88rem;
}

@media (max-width: 640px) {
  .column-type-modal-footer {
    padding: 12px 16px;
    gap: 8px;
  }

  .modal-btn {
    flex: 1;
    padding: 0 12px;
  }

  .type-cards-grid {
    max-height: 260px;
  }
}

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
  min-width: 170px;
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
  white-space: nowrap;
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

.filter-panel-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  flex-shrink: 0;
}

.filter-panel-content {
  min-height: 0;
  overflow: hidden;
}

.filter-expand-enter-active,
.filter-expand-leave-active {
  transition: grid-template-rows 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease, transform 0.26s ease;
}

.filter-expand-enter-from,
.filter-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-6px);
}

.filter-expand-leave-active {
  pointer-events: none;
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

.kanban-column.task-drop-target .task-list {
  flex-grow: 1;
}

.empty-column-message {
  position: absolute;
  inset: 0;
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.kanban-column.task-drop-target .empty-column-message {
  opacity: 0;
  transform: translateY(-6px);
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

.task-list>.task-filter-leaving {
  position: absolute;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {

  .filter-expand-enter-active,
  .filter-expand-leave-active {
    transition-duration: 0.01ms;
  }
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
