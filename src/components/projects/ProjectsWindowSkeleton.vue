<template>
  <!-- Ainda nao da para saber se o projeto existe; o que estava aberto define o esqueleto. -->
  <KanbanBoardSkeleton v-if="active_project_id" with_header />
  <ProjectListSkeleton v-else />
</template>

<script>
import { mapState } from "pinia";
import { useProjectStore } from "@/stores/projects";
import KanbanBoardSkeleton from "./KanbanBoardSkeleton.vue";
import ProjectListSkeleton from "./ProjectListSkeleton.vue";

// Usado enquanto a janela de Projetos baixa (loadingComponent do componentMap) e enquanto ela
// le os projetos do banco local, para os dois momentos terem exatamente a mesma cara.
export default {
  name: "ProjectsWindowSkeleton",
  components: { KanbanBoardSkeleton, ProjectListSkeleton },
  computed: {
    ...mapState(useProjectStore, ["active_project_id"]),
  },
};
</script>
