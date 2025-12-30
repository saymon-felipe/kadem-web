<template>
  <div class="kanban-board">
    <div class="kanban-header">
      <button class="btn-icon" @click="$emit('back-to-list')">
        <font-awesome-icon icon="chevron-left" />
      </button>

      <div class="header-controls">
        <ProjectDropdown
          :projects="projects"
          v-model="project_local_id_getter"
          @switch-project="handleSwitchProject"
        />

        <div class="divider-vertical"></div>

        <ProjectStatusDropdown
          v-model="project.status"
          :is_admin="is_project_admin"
          @change="handle_status_change"
        />
      </div>
    </div>

    <div class="kanban-columns-container">
      <draggable
        v-model="columns"
        @start="on_column_drag_start"
        @end="on_column_drag_end"
        item-key="local_id"
        class="kanban-container scroll-custom"
        handle=".column-drag-handle"
        animation="300"
        force-fallback="true"
        :fallback-on-body="true"
        fallback-class="column-fallback"
        ghost-class="column-ghost"
        drag-class="column-drag"
        group="columns"
        :direction="is_mobile ? 'vertical' : 'horizontal'"
      >
        <template #item="{ element }">
          <KanbanColumn
            ref="column_refs"
            :column="element"
            :members="project_members"
            @task-selected="open_task_modal"
            @delete-column="ask_delete_column"
          />
        </template>
      </draggable>

      <button class="create-column glass" @click="start_add_column">
        <font-awesome-icon icon="plus" /> Nova Coluna
      </button>
    </div>

    <SideModal v-model="is_modal_open" @close="is_modal_open = false">
      <TaskDetailForm
        v-if="selected_task"
        :key="selected_task.local_id"
        :task="selected_task"
        :project-name="project.name"
        :members="project_members"
        @close="is_modal_open = false"
        @delete="ask_delete_task"
        @delete-comment="ask_delete_comment"
        ref="taskDetailForm"
      />
    </SideModal>

    <ConfirmationModal
      v-model="show_confirmation"
      :message="confirmation_message"
      confirmText="Excluir"
      @confirmed="handle_confirm_delete"
      @cancelled="close_confirmation"
    />
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { mapActions, mapState } from "pinia";
import { useProjectStore } from "@/stores/projects";
import { useKanbanStore } from "@/stores/kanban";
import { useWindowStore } from "@/stores/windows";
import { useAuthStore } from "@/stores/auth";

import KanbanColumn from "./KanbanColumn.vue";
import SideModal from "@/components/SideModal.vue";
import TaskDetailForm from "./TaskDetailForm.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import ProjectDropdown from "./ProjectDropdown.vue";
import ProjectStatusDropdown from "./ProjectStatusDropdown.vue";

export default {
  name: "ProjectKanban",
  components: {
    draggable,
    KanbanColumn,
    SideModal,
    TaskDetailForm,
    ConfirmationModal,
    ProjectDropdown,
    ProjectStatusDropdown,
  },
  props: {
    project_local_id: {
      type: [String, Number],
      required: true,
    },
  },
  emits: ["back-to-list", "switch-project"],
  data() {
    return {
      selected_task: null,
      is_modal_open: false,
      drag_ctx: {
        is_dragging: false,
        start_mouse_x: 0,
        start_mouse_y: 0,
        current_mouse_x: 0,
        current_mouse_y: 0,
        initial_top: 0,
        initial_left: 0,
        initial_width: 0,
        initial_height: 0,
      },
      show_confirmation: false,
      item_to_delete: null,
      delete_type: null,
    };
  },
  computed: {
    ...mapState(useProjectStore, {
      project(state) {
        if (!this.project_local_id) return { name: "Carregando..." };
        return (
          state.projects.find((p) => p.localId == this.project_local_id) || {
            name: "Carregando...",
          }
        );
      },
      projects: "projects",
    }),

    ...mapState(useKanbanStore, ["getColumns"]),
    ...mapState(useWindowStore, ["_getOrCreateCurrentUserState"]),
    ...mapState(useAuthStore, ["user"]),

    is_project_admin() {
      if (!this.project || !this.user) return false;
      return this.project.current_user_role == "admin";
    },

    containerDimensions() {
      const userState = this._getOrCreateCurrentUserState();
      const win = userState?.openWindows["projects"];
      return win?.size || { width: 0, height: 0 };
    },

    is_mobile() {
      return this.containerDimensions.width <= 1100;
    },

    project_local_id_getter() {
      return JSON.parse(JSON.stringify(this.project_local_id));
    },
    project_members() {
      return this.project.members || [];
    },
    columns: {
      get() {
        return this.getColumns(this.project_local_id);
      },
      set(new_columns) {
        this.updateColumnsForProject({
          projectId: this.project_local_id,
          columns: new_columns,
        });
      },
    },
    confirmation_message() {
      if (this.delete_type === "column") {
        return "Tem certeza que deseja excluir esta coluna e todas as suas tarefas?";
      }
      if (this.delete_type === "task") {
        return "Tem certeza que deseja excluir esta tarefa permanentemente?";
      }
      if (this.delete_type == "comment") {
        return "Tem certeza que deseja excluir este comentário permanentemente?";
      }
      return "";
    },
  },
  watch: {
    project_local_id: {
      immediate: true,
      async handler(newId) {
        if (!newId) return;

        await this.loadBoardFromLocal(newId);

        if (this.project && this.project.id) {
          this.pullProjectKanban(this.project.id, newId).catch((err) => {
            console.warn("Falha ao atualizar kanban em segundo plano:", err);
          });
        }
      },
    },
  },
  methods: {
    ...mapActions(useKanbanStore, [
      "loadBoardFromLocal",
      "createColumn",
      "updateColumnsForProject",
      "deleteTask",
      "deleteColumn",
      "pullProjectKanban",
      "deleteTaskComment",
      "updateProjectStatus",
    ]),
    ...mapActions(useProjectStore, ["updateProjectStatus"]),

    async handle_status_change(new_status) {
      if (!this.project) return;

      console.log(`[ProjectKanban] Atualizando status para: ${new_status}`);

      console.log(this.project);
      try {
        await this.updateProjectStatus({
          project_id: this.project.id,
          local_id: this.project.localId,
          status: new_status,
        });
      } catch (error) {
        console.error("Falha ao atualizar status:", error);
      }
    },

    handleSwitchProject(newProjectId) {
      this.$emit("switch-project", newProjectId);
    },
    async start_add_column() {
      const new_column = await this.createColumn(this.project_local_id, "NOVA COLUNA");
      if (new_column) {
        await this.$nextTick();
        const refs = this.$refs.column_refs;
        if (Array.isArray(refs)) {
          const target_component = refs.find(
            (comp) => comp.column.local_id === new_column.local_id
          );
          if (target_component) {
            target_component.start_rename();
            target_component.$el.scrollIntoView({ behavior: "smooth", inline: "center" });
          }
        }
      }
    },
    ask_delete_comment(obj) {
      this.item_to_delete = obj;
      this.delete_type = "comment";
      this.show_confirmation = true;
    },
    ask_delete_task(task) {
      this.item_to_delete = task;
      this.delete_type = "task";
      this.show_confirmation = true;
    },
    ask_delete_column(column) {
      this.item_to_delete = column;
      this.delete_type = "column";
      this.show_confirmation = true;
    },
    async handle_confirm_delete() {
      if (!this.item_to_delete) return;
      if (this.delete_type === "task") {
        await this.deleteTask(this.item_to_delete);
        this.is_modal_open = false;
      } else if (this.delete_type === "column") {
        await this.deleteColumn(this.item_to_delete);
      } else if (this.delete_type == "comment") {
        await this.deleteTaskComment(
          this.item_to_delete.task,
          this.item_to_delete.comment
        );

        if (this.$refs.taskDetailForm && this.$refs.taskDetailForm.editable_task) {
          this.$refs.taskDetailForm.editable_task.comments = this.$refs.taskDetailForm.editable_task.comments.filter(
            (c) => c.local_id !== this.item_to_delete.comment.local_id
          );
        }
      }
      this.close_confirmation();
    },
    close_confirmation() {
      this.item_to_delete = null;
      this.delete_type = null;
      this.show_confirmation = false;
    },
    track_mouse(e) {
      this.drag_ctx.current_mouse_x = e.clientX || (e.touches && e.touches[0].clientX);
      this.drag_ctx.current_mouse_y = e.clientY || (e.touches && e.touches[0].clientY);
    },
    on_column_drag_start(evt) {
      this.drag_ctx.is_dragging = true;

      const client_x =
        evt.originalEvent.clientX ||
        (evt.originalEvent.touches && evt.originalEvent.touches[0].clientX);
      const client_y =
        evt.originalEvent.clientY ||
        (evt.originalEvent.touches && evt.originalEvent.touches[0].clientY);

      this.drag_ctx.start_mouse_x = client_x;
      this.drag_ctx.current_mouse_x = client_x;
      this.drag_ctx.start_mouse_y = client_y;
      this.drag_ctx.current_mouse_y = client_y;

      const rect = evt.item.getBoundingClientRect();

      this.drag_ctx.initial_top = rect.top;
      this.drag_ctx.initial_left = rect.left;
      this.drag_ctx.initial_width = rect.width;
      this.drag_ctx.initial_height = rect.height;

      window.addEventListener("mousemove", this.track_mouse);
      window.addEventListener("touchmove", this.track_mouse);

      const force_axis_loop = () => {
        if (!this.drag_ctx.is_dragging) return;
        const fallback_el = document.querySelector(".column-fallback");

        if (fallback_el) {
          fallback_el.style.setProperty(
            "width",
            `${this.drag_ctx.initial_width}px`,
            "important"
          );
          fallback_el.style.setProperty(
            "min-width",
            `${this.drag_ctx.initial_width}px`,
            "important"
          );
          fallback_el.style.setProperty(
            "max-width",
            `${this.drag_ctx.initial_width}px`,
            "important"
          );
          fallback_el.style.setProperty(
            "height",
            `${this.drag_ctx.initial_height}px`,
            "important"
          );

          fallback_el.style.setProperty("box-sizing", "border-box", "important");

          if (this.is_mobile) {
            const delta_y = this.drag_ctx.current_mouse_y - this.drag_ctx.start_mouse_y;

            fallback_el.style.setProperty(
              "left",
              `${this.drag_ctx.initial_left}px`,
              "important"
            );
            fallback_el.style.setProperty(
              "transform",
              `translate3d(0px, ${delta_y}px, 0px)`,
              "important"
            );

            const taskListEl = fallback_el.querySelector(".task-list");
            if (taskListEl) {
              taskListEl.style.setProperty("display", "flex", "important");
              taskListEl.style.setProperty("flex-direction", "row", "important");
              taskListEl.style.setProperty("overflow-y", "hidden", "important");
              taskListEl.style.setProperty("overflow-x", "auto", "important");
            }

            const taskEls = taskListEl.querySelectorAll(".kanban-task");
            if (taskEls) {
              taskEls.forEach((task) => {
                task.style.setProperty("width", "200px", "important");
                task.style.setProperty("min-width", "200px", "important");
                task.style.setProperty("max-width", "200px", "important");
                task.style.setProperty("height", "100%", "important");
              });
            }
          } else {
            const delta_x = this.drag_ctx.current_mouse_x - this.drag_ctx.start_mouse_x;

            fallback_el.style.setProperty(
              "top",
              `${this.drag_ctx.initial_top}px`,
              "important"
            );
            fallback_el.style.setProperty(
              "transform",
              `translate3d(${delta_x}px, 0px, 0px)`,
              "important"
            );
          }
        }
        requestAnimationFrame(force_axis_loop);
      };
      requestAnimationFrame(force_axis_loop);
    },
    on_column_drag_end() {
      this.drag_ctx.is_dragging = false;
      window.removeEventListener("mousemove", this.track_mouse);
      window.removeEventListener("touchmove", this.track_mouse);
    },
    open_task_modal(task) {
      if (!task || !task.local_id) return;
      this.selected_task = task;
      this.is_modal_open = true;
    },
  },
};
</script>

<style scoped>
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-100);
  padding: 6px;
  border-radius: 5px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.kanban-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: transparent;
  position: relative;
}

.kanban-header {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-5) 0 var(--space-5);
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
}

.kanban-container {
  display: flex;
  gap: var(--space-6);
  height: 100%;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.divider-vertical {
  width: 1px;
  height: 24px;
  background-color: rgba(0, 0, 0, 0.1);
}

.kanban-columns-container {
  display: flex;
  gap: var(--space-6);
  flex-grow: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--space-6) var(--space-6) var(--space-4) var(--space-6);
  align-items: flex-start;
}

.column-ghost {
  opacity: 0.2;
  background: rgba(0, 0, 0, 0.1);
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
}

.create-column {
  min-width: 320px;
  max-width: 320px;
  background: rgba(206, 179, 134, 0.15);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  justify-content: center;
  min-height: 42px;
  overflow: hidden;
  position: relative;
  cursor: pointer;

  &:hover {
    background: rgba(206, 180, 134, 0.473);
  }
}

.column-fallback {
  transition: none !important;
  opacity: 1 !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
  cursor: grabbing !important;
  z-index: 10000 !important;
  pointer-events: none;
}

.column-drag {
  opacity: 0;
}

@container (max-width: 1100px) {
  .btn-icon {
    display: none;
  }

  .kanban-header {
    padding: var(--space-4) 0;
  }

  .kanban-columns-container {
    padding: 0;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .kanban-container {
    flex-direction: column;
    width: 100%;
    height: fit-content;
  }

  .create-column {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }

  .column-fallback {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
  }
}
</style>
