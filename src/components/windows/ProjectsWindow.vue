<template>
    <div class="projects-window-content">
        <transition name="fade-kanban" mode="out-in">
            <ProjectList v-if="!active_project_id" :projects="projects" @project-selected="handleOpenProject" />

            <ProjectKanban v-else :project_local_id="active_project_id" @back-to-list="handleBackToList"
                @switch-project="handleOpenProject" />
        </transition>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import { defineAsyncComponent } from 'vue';

export default {
    name: 'ProjectsWindow',
    components: {
        ProjectList: defineAsyncComponent(() => import('../projects/ProjectList.vue')),
        ProjectKanban: defineAsyncComponent(() => import('../projects/ProjectKanban.vue'))
    },
    computed: {
        ...mapState(useProjectStore, ['projects', 'active_project_id'])
    },
    methods: {
        ...mapActions(useProjectStore, ['selectProject']),

        handleOpenProject(projectLocalId) {
            this.selectProject(projectLocalId);
        },

        handleBackToList() {
            this.selectProject(null);
        }
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

.fade-kanban-enter-active,
.fade-kanban-leave-active {
    transition: opacity 0.2s ease;
}

.fade-kanban-enter-from,
.fade-kanban-leave-to {
    opacity: 0;
}
</style>