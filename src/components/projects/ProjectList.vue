<template>
    <div class="project-list-container">
        <div class="list-background"></div>

        <section class="project-section">
            <h2>Projetos recentes</h2>
            <div class="project-grid">
                <div v-for="project in recentProjects" :key="project.localId" class="project-card"
                    @click="handleProjectSelect(project.localId)">
                    <img :src="project.image || defaultProjectImage" :alt="project.name">
                    <div class="card-overlay">
                        <span>{{ project.name }}</span>
                        <small>{{ getTimeAgo(project.last_accessed_at) }}</small>
                    </div>
                </div>
            </div>
        </section>

        <section class="project-section">
            <h2>Todos os projetos</h2>
            <div class="project-grid">
                <div v-for="project in projects" :key="project.localId" class="project-card"
                    @click="handleProjectSelect(project.localId)">
                    <img :src="project.image || defaultProjectImage" :alt="project.name">
                    <div class="card-overlay">
                        <span>{{ project.name }}</span>
                        <small>{{ getTimeAgo(project.last_accessed_at) }}</small>
                    </div>
                </div>
                <div class="project-card new-project-card" @click="createNewProject">
                    <font-awesome-icon icon="plus" />
                    <span>Novo Projeto</span>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import { useAppStore } from '@/stores/app';
import { useProjectStore } from '@/stores/projects'; // Importando a store
import { mapActions } from 'pinia';

export default {
    name: 'ProjectList',
    props: {
        projects: {
            type: Array,
            required: true
        }
    },
    emits: ['project-selected'],
    data() {
        return {
            defaultProjectImage: defaultProjectImage
        };
    },
    computed: {
        recentProjects() {
            return [...this.projects]
                .sort((a, b) => new Date(b.last_accessed_at || 0) - new Date(a.last_accessed_at || 0))
                .slice(0, 4);
        }
    },
    methods: {
        ...mapActions(useAppStore, ['toggleStartMenu']),
        ...mapActions(useProjectStore, ['markProjectAsAccessed']),

        createNewProject() {
            this.toggleStartMenu();
        },

        async handleProjectSelect(localId) {
            this.$emit('project-selected', localId);
            await this.markProjectAsAccessed(localId);
        },

        getTimeAgo(dateString) {
            if (!dateString) return 'Nunca acessado';

            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            if (diffInSeconds < 60) return 'Acessado agora';

            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return `Acessado há ${diffInMinutes} min`;

            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `Acessado há ${diffInHours}h`;

            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays === 1) return 'Acessado ontem';
            if (diffInDays < 30) return `Acessado há ${diffInDays} dias`;

            return 'Acessado há muito tempo';
        }
    }
}
</script>

<style scoped>
.project-list-container {
    padding: var(--space-4);
    height: 100%;
    overflow-y: auto;
    position: relative;
}

.list-background {
    background-image: url('@/assets/images/system-background.webp');
    background-position: center;
    background-size: cover;
    opacity: 0.1;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
}

.project-section {
    margin-bottom: var(--space-8);
    position: relative;
    z-index: 2;
}

.project-section h2 {
    font-size: var(--fontsize-md);
    margin-bottom: var(--space-5);
    color: var(--deep-blue);
}

.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-5);
}

.project-card {
    height: 120px;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.project-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-4);
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%);
    color: var(--white);
    display: flex;
    flex-direction: column;
}

.card-overlay span {
    font-weight: 600;
    font-size: var(--fontsize-sm);
}

.card-overlay small {
    font-size: var(--fontsize-xs);
    opacity: 0.8;
}

.new-project-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    background-color: rgba(255, 255, 255, 0.5);
    border: 2px dashed var(--gray-300);
    color: var(--gray-100);
}

.new-project-card:hover {
    background-color: rgba(255, 255, 255, 0.8);
    color: var(--deep-blue);
}

.new-project-card svg {
    font-size: var(--fontsize-lg);
}
</style>