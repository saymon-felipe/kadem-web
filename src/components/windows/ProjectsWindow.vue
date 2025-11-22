<template>
    <div class="projects-window-content">
        <transition name="fade-kanban" mode="out-in">
            <ProjectList v-if="view_mode === 'list'" :projects="projects" @project-selected="openKanban" />

            <ProjectKanban v-else-if="view_mode === 'kanban'" :project_local_id="selected_project_local_id"
                @back-to-list="view_mode = 'list'" @switch-project="openKanban" />
        </transition>
    </div>
</template>

<script>
import { mapState } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import { defineAsyncComponent } from 'vue';

export default {
    name: 'ProjectsWindow',
    components: {
        ProjectList: defineAsyncComponent(() => import('../projects/ProjectList.vue')),
        ProjectKanban: defineAsyncComponent(() => import('../projects/ProjectKanban.vue'))
    },
    data() {
        return {
            view_mode: 'list',
            selected_project_local_id: null
        };
    },
    computed: {
        ...mapState(useProjectStore, ['projects'])
    },
    methods: {
        openKanban(projectLocalId) {
            this.selected_project_local_id = projectLocalId;
            this.view_mode = 'kanban';
        }
    }
}
</script>

<style scoped>
.projects-window-content {
    color: var(--deep-blue);
    height: 100%;
    overflow: hidden;
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