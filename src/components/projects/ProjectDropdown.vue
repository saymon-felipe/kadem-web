<template>
  <div class="project-dropdown-wrapper" v-click-outside="closeDropdown">
    <div class="project-trigger" @click="toggleDropdown">
      <div class="trigger-left">
        <div class="refresh-icon">
          <font-awesome-icon icon="sync-alt" />
        </div>
        <div class="current-project-img">
          <img :src="currentProject?.image || defaultProjectImage" alt="Projeto Atual" />
        </div>
        <span class="current-project-name">
          {{ currentProject?.name || "Selecione um Projeto" }}
        </span>
      </div>

      <div class="trigger-right">
        <div class="members-stack-trigger">
          <div
            v-for="(member, index) in (currentProject?.members || []).slice(0, 3)"
            :key="index"
            :title="member.name"
            class="trigger-avatar"
          >
            <img :src="member.avatar || defaultAccountImage" />
          </div>
          <div
            v-if="(currentProject?.members || []).length > 3"
            class="trigger-avatar counter"
          >
            +{{ currentProject.members.length - 3 }}
          </div>
        </div>
      </div>
    </div>

    <transition name="dropdown-fade">
      <div v-if="isOpen" class="dropdown-content shadow-lg">
        <div class="dropdown-header">
          <h3>Meus projetos</h3>
          <div class="search-wrapper">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Procurar"
              class="search-input"
            />
            <font-awesome-icon icon="search" class="search-icon" />
          </div>
        </div>

        <div class="dropdown-list custom-scrollbar">
          <div
            v-for="project in filteredProjects"
            :key="project.localId"
            class="project-row"
            :class="{ active: project.localId === modelValue }"
            @click="handleSelectProject(project)"
          >
            <div class="row-left">
              <span
                class="status-dot"
                :class="getCurrentStatusClass(project.status)"
              ></span>

              <div class="list-project-img">
                <img :src="project.image || defaultProjectImage" />
              </div>
              <div class="project-informations">
                <span class="list-project-name">{{ project.name }}</span>
                <span class="list-project-description">{{ project.description }}</span>
              </div>
            </div>

            <div class="row-right">
              <div class="list-members-stack">
                <div
                  v-for="(member, index) in (project.members || []).slice(0, 2)"
                  :key="index"
                  :title="member.name"
                  class="list-avatar"
                >
                  <img :src="member.avatar || defaultAccountImage" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";

export default {
  name: "ProjectDropdown",
  props: {
    projects: { type: Array, default: () => [] },
    modelValue: { type: Number, default: null },
  },
  emits: ["update:modelValue", "switch-project"],

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
      isOpen: false,
      searchQuery: "",
      defaultProjectImage,
      defaultAccountImage,
      available_statuses: {
        em_andamento: { label: "Em Andamento", color_class: "bg-green" },
        em_risco: { label: "Em Risco", color_class: "bg-red" },
        em_espera: { label: "Em Espera", color_class: "bg-yellow" },
        cancelado: { label: "Cancelado", color_class: "bg-gray" },
      },
    };
  },

  computed: {
    currentProject() {
      const id = this.modelValue;
      return this.projects.find((p) => p.localId === id) || this.projects[0];
    },

    filteredProjects() {
      if (!this.searchQuery) return this.projects;
      return this.projects.filter((p) =>
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },

  methods: {
    getCurrentStatusClass(status) {
      return this.available_statuses[status].color_class;
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen;
    },
    closeDropdown() {
      this.isOpen = false;
    },
    handleSelectProject(project) {
      this.$emit("switch-project", project.localId);
      this.closeDropdown();
    },
  },
};
</script>

<style scoped>
.project-dropdown-wrapper {
  position: relative;
  width: 100%;
  max-width: 350px;
  font-family: "Roboto", sans-serif;
  user-select: none;
  min-width: 300px;
}

.project-trigger {
  background-color: var(--proj-trigger-bg);
  border: var(--proj-trigger-border);
  height: 52px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  cursor: pointer;
  color: var(--proj-trigger-color);
  transition: background-color 0.2s;
  box-shadow: var(--shadow-card);
  width: 100%;
}

.project-trigger:hover {
  background-color: var(--proj-trigger-hover);
}

.trigger-left {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  min-width: 0;
  margin-right: var(--space-5);
}

.trigger-right {
  flex-shrink: 0;
}

.refresh-icon {
  font-size: 1.5rem;
  color: var(--proj-trigger-color);
  flex-shrink: 0;
}

.current-project-img {
  flex-shrink: 0;

  & img {
    width: 35px;
    height: 35px;
    border-radius: 10px;
    object-fit: cover;
  }
}

.current-project-name {
  font-size: 1.2rem;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.members-stack-trigger {
  display: flex;
  flex-direction: row;
}

.trigger-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: var(--proj-trigger-avatar-border);
  overflow: hidden;
  margin-left: -20px;
}

.trigger-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.trigger-avatar.counter {
  background-color: var(--proj-trigger-counter-bg);
  color: var(--proj-trigger-counter-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  z-index: 5;
}

.dropdown-content {
  position: absolute;
  top: 110%;
  left: 0;
  width: 100%;
  background-color: var(--proj-dropdown-bg);
  border-radius: 12px;
  z-index: 100;
  padding: 20px;
  border: var(--proj-dropdown-border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(10px);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.search-wrapper {
  position: relative;
  width: 200px;
}

.search-input {
  width: 100%;
  padding: 8px 30px 8px 10px;
  font-size: 0.9rem;
  height: 42px;
  background-color: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  outline: none;
}

.search-input:focus {
  border-color: var(--color-info);
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.project-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 4px;
}

.project-row:hover {
  background-color: var(--proj-row-hover-bg);
}

/* Item Ativo (Selecionado) */
.project-row.active {
  background-color: var(--proj-row-active-bg);
  border: var(--proj-row-active-border);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.row-right {
  flex-shrink: 0;
  margin-left: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bg-green {
  background-color: #9fef99;
}

.bg-gray {
  background-color: #ccc;
}

.list-project-img {
  flex-shrink: 0;
}

.list-project-img img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
}

.project-informations {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.list-project-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-project-description {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-members-stack {
  display: flex;
}

.list-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  margin-left: -14px;
  border: var(--proj-trigger-avatar-border);
  flex-shrink: 0;
}

.list-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.new-project {
  color: #666;
  font-weight: 500;
}

.new-project:hover {
  color: var(--deep-blue);
}

.icon-dashed {
  width: 32px;
  height: 32px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

/* Animação do Dropdown */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@container (max-width: 564px) {
  .project-dropdown-wrapper {
    max-width: 100%;
    min-width: initial !important;
  }
}
</style>
