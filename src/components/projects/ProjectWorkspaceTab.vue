<template>
  <div ref="panel" class="project-workspace-tab">
    <template v-if="overlay_scope.target">
      <transition name="fade-kanban" mode="out-in">
        <ProjectList
          v-if="!project_exists"
          :projects="projects"
          @project-selected="$emit('project-selected', $event)"
        />
        <ProjectKanban
          v-else
          :key="project_local_id"
          :project_local_id="project_local_id"
          @back-to-list="$emit('project-selected', null)"
          @switch-project="$emit('project-selected', $event)"
        />
      </transition>
    </template>
  </div>
</template>

<script>
import { markRaw, reactive } from "vue";
import { overlayScopeKey } from "@/utils/overlayScope";
import ProjectList from "./ProjectList.vue";
import ProjectKanban from "./ProjectKanban.vue";

export default {
  name: "ProjectWorkspaceTab",
  components: { ProjectList, ProjectKanban },
  props: {
    projects: { type: Array, required: true },
    project_local_id: { type: [String, Number], default: null },
    active: { type: Boolean, default: false },
    interactive: { type: Boolean, default: true },
  },
  emits: ["project-selected", "focus-window"],
  data() {
    return {
      overlay_scope: reactive({
        target: null,
        active: this.active,
        interactive: this.interactive,
        focus: () => this.$emit("focus-window"),
        width: 0,
        height: 0,
      }),
    };
  },
  provide() {
    return { [overlayScopeKey]: this.overlay_scope };
  },
  computed: {
    project_exists() {
      return this.projects.some((project) => String(project.localId) === String(this.project_local_id));
    },
  },
  watch: {
    active(value) {
      this.overlay_scope.active = value;
    },
    interactive(value) {
      this.overlay_scope.interactive = value;
    },
  },
  mounted() {
    this.overlay_scope.target = markRaw(this.$refs.panel);
    this.resize_observer = new ResizeObserver(([entry]) => {
      if (!entry.contentRect.width || !entry.contentRect.height) return;
      this.overlay_scope.width = entry.contentRect.width;
      this.overlay_scope.height = entry.contentRect.height;
    });
    this.resize_observer.observe(this.$refs.panel);
  },
  beforeUnmount() {
    this.resize_observer?.disconnect();
  },
};
</script>

<style scoped>
.project-workspace-tab {
  position: absolute;
  inset: 0;
  overflow: hidden;
  contain: layout;
  isolation: isolate;
}
.fade-kanban-enter-active,
.fade-kanban-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-kanban-enter-from,
.fade-kanban-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
