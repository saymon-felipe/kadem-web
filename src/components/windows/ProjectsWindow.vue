<template>
    <div class="projects-window-content">
        <div v-if="loading" class="loading-state">
            <loadingSpinner />
            <span>Carregando workspace...</span>
        </div>

        <transition name="fade-kanban" mode="out-in" v-else>
            <ProjectList v-if="should_show_list" :projects="projects" @project-selected="handle_open_project" />

            <ProjectKanban v-else :project_local_id="active_project_id" @back-to-list="handle_back_to_list"
                @switch-project="handle_open_project" />
        </transition>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import { defineAsyncComponent } from 'vue';
import loadingSpinner from '@/components/loadingSpinner.vue';

export default {
    name: 'ProjectsWindow',
    components: {
        ProjectList: defineAsyncComponent(() => import('../projects/ProjectList.vue')),
        ProjectKanban: defineAsyncComponent(() => import('../projects/ProjectKanban.vue')),
        loadingSpinner
    },
    data() {
        return {
            loading: true
        };
    },
    computed: {
        ...mapState(useProjectStore, ['projects', 'active_project_id']),

        project_exists() {
            if (!this.active_project_id) return false;
            if (this.projects.length === 0) return false;

            return this.projects.some(p => String(p.localId) === String(this.active_project_id));
        },

        should_show_list() {
            return !this.active_project_id || !this.project_exists;
        }
    },
    methods: {
        ...mapActions(useProjectStore, ['selectProject', '_loadProjectsFromDB']),

        handle_open_project(project_local_id) {
            this.selectProject(project_local_id);
        },

        handle_back_to_list() {
            this.selectProject(null);
        }
    },
    async mounted() {
        if (this.projects.length === 0) {
            await this._loadProjectsFromDB();
        }

        this.$nextTick(() => {
            this.loading = false;
        });
    }
}
</script>

<style scoped>
.projects-window-content {
    color: var(--deep-blue);
    height: 100%;
    overflow: hidden;
    position: relative;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--gray-500);
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