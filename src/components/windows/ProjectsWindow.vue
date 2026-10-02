<template>
  <div class="projects-window-content">
    <ProjectsWindowSkeleton v-if="loading" />

    <transition name="fade-kanban" mode="out-in" v-else>
      <ProjectList
        v-if="should_show_list"
        :projects="projects"
        @project-selected="handle_open_project"
      />

      <ProjectKanban
        v-else
        :project_local_id="active_project_id"
        @back-to-list="handle_back_to_list"
        @switch-project="handle_open_project"
      />
    </transition>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useProjectStore } from "@/stores/projects";
import ProjectList from "../projects/ProjectList.vue";
import ProjectKanban from "../projects/ProjectKanban.vue";
import ProjectsWindowSkeleton from "../projects/ProjectsWindowSkeleton.vue";

export default {
  name: "ProjectsWindow",
  components: {
    ProjectList,
    ProjectKanban,
    ProjectsWindowSkeleton,
  },
  data() {
    return {
      loading: true,
    };
  },
  computed: {
    ...mapState(useProjectStore, ["projects", "active_project_id"]),

    project_exists() {
      if (!this.active_project_id) return false;
      if (this.projects.length === 0) return false;

      return this.projects.some(
        (p) => String(p.localId) === String(this.active_project_id)
      );
    },

    should_show_list() {
      return !this.active_project_id || !this.project_exists;
    },
  },
  methods: {
    ...mapActions(useProjectStore, ["selectProject", "_loadProjectsFromDB"]),

    handle_open_project(project_local_id) {
      this.selectProject(project_local_id);
    },

    handle_back_to_list() {
      this.selectProject(null);
    },
  },
  async mounted() {
    if (this.projects.length === 0) {
      await this._loadProjectsFromDB();
    }

    this.$nextTick(() => {
      this.loading = false;
    });
  },
};
</script>

<style scoped>
.projects-window-content {
  color: var(--deep-blue);
  height: 100%;
  overflow: hidden;
  position: relative;
}

.fade-kanban-enter-active,
.fade-kanban-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-kanban-enter-from,
.fade-kanban-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
