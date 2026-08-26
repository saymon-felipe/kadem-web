<template>
  <div class="project-list-container">
    <div class="list-background"></div>

    <!-- Seção Projetos Recentes -->
    <section class="project-section" v-if="recentProjects.length > 0">
      <div class="section-header">
        <h2>Projetos recentes</h2>
        <div
          class="expandable-search"
          :class="{ 'is-open': isSectionOpen('recent') }"
          @mouseenter="handleMouseEnter('recent')"
          @mouseleave="handleMouseLeave('recent')"
        >
          <button
            class="search-icon-btn"
            @click="handleSearchClick('recent')"
            title="Pesquisar projetos"
            type="button"
          >
            <font-awesome-icon icon="magnifying-glass" />
          </button>
          <input
            ref="searchInput_recent"
            type="text"
            v-model="searchQuery"
            placeholder="Pesquisar projetos..."
            class="expandable-search-input"
            @focus="handleFocus('recent')"
            @blur="handleBlur('recent')"
            @keydown.esc="clearSearch"
          />
          <button
            v-if="searchQuery"
            class="clear-search-btn"
            @click="clearSearch"
            title="Limpar busca"
            type="button"
          >
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
      </div>

      <div class="project-grid">
        <template v-if="filteredRecentProjects.length > 0">
          <div
            v-for="project in filteredRecentProjects"
            :key="project.localId"
            class="project-card"
            @click="handleProjectSelect(project.localId)"
          >
            <img :src="project.image || defaultProjectImage" :alt="project.name" />
            <div class="card-overlay">
              <span>{{ project.name }}</span>
              <small>{{ getTimeAgo(project.last_accessed_at) }}</small>
            </div>
          </div>
        </template>
        <div class="project-card empty-card" v-else-if="searchQuery">
          <font-awesome-icon icon="magnifying-glass" />
          <span>Nenhum recente</span>
        </div>
      </div>
    </section>

    <!-- Seção Todos os Projetos -->
    <section class="project-section">
      <div class="section-header">
        <h2>Todos os projetos</h2>
        <div
          class="expandable-search"
          :class="{ 'is-open': isSectionOpen('all') }"
          @mouseenter="handleMouseEnter('all')"
          @mouseleave="handleMouseLeave('all')"
        >
          <button
            class="search-icon-btn"
            @click="handleSearchClick('all')"
            title="Pesquisar projetos"
            type="button"
          >
            <font-awesome-icon icon="magnifying-glass" />
          </button>
          <input
            ref="searchInput_all"
            type="text"
            v-model="searchQuery"
            placeholder="Pesquisar projetos..."
            class="expandable-search-input"
            @focus="handleFocus('all')"
            @blur="handleBlur('all')"
            @keydown.esc="clearSearch"
          />
          <button
            v-if="searchQuery"
            class="clear-search-btn"
            @click="clearSearch"
            title="Limpar busca"
            type="button"
          >
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
      </div>

      <div class="project-grid">
        <template v-if="filteredAllProjects.length > 0">
          <div
            v-for="project in filteredAllProjects"
            :key="project.localId"
            class="project-card"
            @click="handleProjectSelect(project.localId)"
          >
            <img :src="project.image || defaultProjectImage" :alt="project.name" />
            <div class="card-overlay">
              <span>{{ project.name }}</span>
              <small>{{ getTimeAgo(project.last_accessed_at) }}</small>
            </div>
          </div>
        </template>
        <div class="project-card empty-card" v-else-if="searchQuery">
          <font-awesome-icon icon="magnifying-glass" />
          <span>Nenhum projeto</span>
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
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/projects";
import { mapActions } from "pinia";

export default {
  name: "ProjectList",
  props: {
    projects: {
      type: Array,
      required: true,
    },
  },
  emits: ["project-selected"],
  data() {
    return {
      defaultProjectImage: defaultProjectImage,
      searchQuery: "",
      activeSection: null,
      currentSearchSection: null,
      hoveredSection: null,
    };
  },
  computed: {
    recentProjects() {
      return [...this.projects]
        .sort(
          (a, b) => new Date(b.last_accessed_at || 0) - new Date(a.last_accessed_at || 0)
        )
        .slice(0, 4);
    },
    filteredRecentProjects() {
      if (!this.searchQuery) return this.recentProjects;
      const q = this.searchQuery.toLowerCase().trim();
      return this.recentProjects.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    },
    filteredAllProjects() {
      if (!this.searchQuery) return this.projects;
      const q = this.searchQuery.toLowerCase().trim();
      return this.projects.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    },
  },
  methods: {
    ...mapActions(useAppStore, ["createGroup"]),
    ...mapActions(useProjectStore, ["markProjectAsAccessed"]),

    createNewProject() {
      this.createGroup();
    },

    async handleProjectSelect(localId) {
      this.$emit("project-selected", localId);
      await this.markProjectAsAccessed(localId);
    },

    isSectionOpen(section) {
      if (this.hoveredSection === section) return true;
      if (this.activeSection === section) return true;
      if (this.searchQuery) return this.currentSearchSection === section;
      return false;
    },

    handleSearchClick(section) {
      this.activeSection = section;
      this.currentSearchSection = section;
      this.$nextTick(() => {
        const el = this.$refs["searchInput_" + section];
        if (Array.isArray(el)) {
          el[0]?.focus();
        } else {
          el?.focus();
        }
      });
    },

    handleFocus(section) {
      this.activeSection = section;
      this.currentSearchSection = section;
    },

    handleBlur(section) {
      if (this.activeSection === section && !this.searchQuery && this.hoveredSection !== section) {
        this.activeSection = null;
      }
    },

    handleMouseEnter(section) {
      this.hoveredSection = section;
    },

    handleMouseLeave(section) {
      if (this.hoveredSection === section) {
        this.hoveredSection = null;
      }
      if (!this.searchQuery && this.activeSection === section) {
        this.activeSection = null;
      }
    },

    clearSearch() {
      this.searchQuery = "";
      this.activeSection = null;
      this.currentSearchSection = null;
      this.hoveredSection = null;
    },

    getTimeAgo(dateString) {
      if (!dateString) return "Nunca acessado";

      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return "Acessado agora";

      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `Acessado há ${diffInMinutes} min`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `Acessado há ${diffInHours}h`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return "Acessado ontem";
      if (diffInDays < 30) return `Acessado há ${diffInDays} dias`;

      return "Acessado há muito tempo";
    },
  },
};
</script>

<style scoped>
.project-list-container {
  padding: var(--space-4);
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.project-section {
  margin-bottom: var(--space-8);
  position: relative;
  z-index: 2;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.section-header h2 {
  font-size: var(--fontsize-md);
  margin-bottom: 0;
  color: var(--text-primary);
  white-space: nowrap;
}

.expandable-search {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 34px;
  width: 34px;
  border-radius: 17px;
  background-color: transparent;
  border: 1px solid transparent;
  overflow: hidden;
  box-shadow: none !important;
  outline: none !important;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
              background-color 0.25s ease,
              border-color 0.25s ease;
}

.expandable-search:hover,
.expandable-search.is-open,
.expandable-search:focus-within {
  width: 260px;
  background-color: var(--surface-1);
  border-color: var(--glass-border);
  box-shadow: none !important;
  outline: none !important;
}

.search-icon-btn {
  width: 34px;
  height: 34px;
  min-width: 34px;
  display: grid;
  place-items: center;
  background: transparent !important;
  border: none !important;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 50%;
  transition: color var(--transition-fast);
  padding: 0;
  font-size: var(--fontsize-xs);
  outline: none !important;
  box-shadow: none !important;
}

.search-icon-btn:hover {
  color: var(--text-primary);
}

.expandable-search.is-open .search-icon-btn,
.expandable-search:focus-within .search-icon-btn {
  color: var(--text-muted);
}

.expandable-search-input {
  flex: 1;
  height: 100%;
  border: none !important;
  background: transparent !important;
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  outline: none !important;
  box-shadow: none !important;
  padding: 0 6px 0 2px;
  min-width: 0;
  opacity: 0;
  transition: opacity 0.2s ease 0.1s;
}

.expandable-search-input:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

.expandable-search.is-open .expandable-search-input,
.expandable-search:hover .expandable-search-input,
.expandable-search:focus-within .expandable-search-input {
  opacity: 1;
}

.clear-search-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  margin-right: 3px;
  display: grid;
  place-items: center;
  background: transparent !important;
  border: none !important;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  font-size: 11px;
  padding: 0;
  outline: none !important;
  box-shadow: none !important;
  transition: color var(--transition-fast);
}

.clear-search-btn:hover {
  color: var(--text-primary);
}

.empty-card {
  height: 120px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background-color: var(--surface-1);
  border: 1px dashed var(--glass-border);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  text-align: center;
  padding: var(--space-3);
  cursor: default;
}

.empty-card svg {
  font-size: var(--fontsize-md);
  opacity: 0.5;
}

.list-background {
  background-image: url("@/assets/images/system-background.webp");
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
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
}

.project-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--surface-1);
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-4);
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%);
  color: #ffffff;
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
  background-color: var(--surface-2);
  border: 2px dashed var(--glass-border);
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.new-project-card:hover {
  background-color: var(--surface-3);
  color: var(--text-primary);
  border-color: var(--color-info);
}

.new-project-card svg {
  font-size: var(--fontsize-lg);
}

@container (max-width: 600px) {
  .expandable-search:hover,
  .expandable-search.is-open,
  .expandable-search:focus-within {
    width: 180px;
  }
}
</style>
