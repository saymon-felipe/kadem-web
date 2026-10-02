<template>
  <KademSkeletonGroup class="sk-projects" label="Carregando projetos…">
    <section v-for="(section, section_index) in sections" :key="section_index" class="sk-section">
      <div class="sk-section-header">
        <KademSkeleton :width="section.title" :height="24" />
        <KademSkeleton shape="circle" :width="34" />
      </div>

      <div class="sk-grid">
        <div
          v-for="n in section.cards"
          :key="n"
          class="sk-project-card"
          :style="{ '--sk-delay': `${(section_index * 4 + n) * 80}ms` }"
        >
          <KademSkeleton shape="block" height="100%" class="sk-project-cover" />
          <div class="sk-project-caption">
            <KademSkeleton :width="`${n % 2 ? 62 : 48}%`" :height="12" />
            <KademSkeleton :width="`${n % 2 ? 34 : 40}%`" :height="9" />
          </div>
        </div>
      </div>
    </section>
  </KademSkeletonGroup>
</template>

<script>
import KademSkeleton from "@/components/ui/KademSkeleton.vue";
import KademSkeletonGroup from "@/components/ui/KademSkeletonGroup.vue";

export default {
  name: "ProjectListSkeleton",
  components: { KademSkeleton, KademSkeletonGroup },
  data() {
    return {
      // title: largura do cabecalho da secao; cards: quantos cartoes de projeto simular.
      sections: [
        { title: 180, cards: 4 },
        { title: 200, cards: 8 },
      ],
    };
  },
};
</script>

<style scoped>
.sk-projects {
  height: 100%;
  padding: var(--space-4);
  overflow: hidden;
}

.sk-section {
  margin-bottom: var(--space-8);
}

.sk-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

/* Mesma grade da .project-grid real. */
.sk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-5);
}

.sk-project-card {
  position: relative;
  height: 120px;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
}

.sk-project-card .sk-project-cover {
  --sk-radius: 0;
}

.sk-project-caption {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}
</style>
