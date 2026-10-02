<template>
  <KademSkeletonGroup class="sk-board" label="Carregando quadro de tarefas…">
    <div v-if="with_header" class="sk-header">
      <KademSkeleton shape="circle" :width="30" />
      <div class="sk-header-controls">
        <KademSkeleton shape="pill" :width="210" :height="38" />
        <span class="sk-divider"></span>
        <KademSkeleton shape="pill" :width="116" :height="30" />
      </div>
    </div>

    <div class="sk-columns">
      <div
        v-for="(column, column_index) in columns"
        :key="column_index"
        class="sk-column"
        :style="{ '--sk-delay': `${column_index * 160}ms` }"
      >
        <header class="sk-column-header">
          <KademSkeleton :width="18" :height="14" />
          <KademSkeleton :width="`${column.title}%`" :height="13" />
          <KademSkeleton shape="pill" :width="26" :height="18" />
          <span class="sk-spacer"></span>
          <KademSkeleton shape="circle" :width="22" />
          <KademSkeleton shape="circle" :width="22" />
        </header>

        <div class="sk-cards">
          <article
            v-for="(lines, card_index) in column.cards"
            :key="card_index"
            class="sk-card"
            :style="{ '--sk-delay': `${column_index * 160 + card_index * 90}ms` }"
          >
            <div class="sk-card-top">
              <KademSkeleton :width="34" :height="11" />
              <KademSkeleton shape="pill" :width="58" :height="18" />
            </div>
            <div class="sk-card-text">
              <KademSkeleton v-for="line in lines" :key="line" :width="line === lines ? '62%' : '100%'" :height="11" />
            </div>
            <div class="sk-card-footer">
              <KademSkeleton shape="circle" :width="22" />
              <KademSkeleton :width="84" :height="10" />
            </div>
          </article>
        </div>
      </div>
    </div>
  </KademSkeletonGroup>
</template>

<script>
import KademSkeleton from "@/components/ui/KademSkeleton.vue";
import KademSkeletonGroup from "@/components/ui/KademSkeletonGroup.vue";

export default {
  name: "KanbanBoardSkeleton",
  components: { KademSkeleton, KademSkeletonGroup },
  props: {
    // Mostra tambem a barra do topo (voltar, projeto, status) quando o quadro inteiro ainda nao existe.
    with_header: { type: Boolean, default: false },
  },
  data() {
    return {
      // title: largura do titulo em %; cards: linhas de descricao de cada card.
      columns: [
        { title: 52, cards: [3, 2, 3] },
        { title: 66, cards: [2, 3] },
        { title: 44, cards: [3, 2] },
        { title: 58, cards: [2] },
      ],
    };
  },
};
</script>

<style scoped>
.sk-board {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.sk-header {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-5) 0 var(--space-5);
  flex-shrink: 0;
}

.sk-header-controls {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.sk-divider {
  width: 1px;
  height: 24px;
  background: var(--glass-border);
}

.sk-columns {
  display: flex;
  align-items: flex-start;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-6) var(--space-4) var(--space-6);
  overflow: hidden;
}

/* Mesma casca da .kanban-column real, para a troca nao "pular". */
.sk-column {
  display: flex;
  flex-direction: column;
  flex: 0 0 320px;
  min-width: 320px;
  max-width: 320px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: rgba(206, 179, 134, 0.15);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
}

[data-theme="dark"] .sk-column {
  background: rgba(30, 34, 55, 0.4);
}

.sk-column-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.sk-spacer {
  flex: 1;
}

.sk-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}

.sk-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.sk-card-top,
.sk-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.sk-card-footer {
  justify-content: flex-start;
}

.sk-card-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@container (max-width: 1100px) {
  .sk-header {
    padding: var(--space-4) 0;
  }

  .sk-columns {
    flex-direction: column;
    padding: 0;
  }

  .sk-column {
    flex-basis: auto;
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }

  .sk-cards {
    flex-direction: row;
    overflow: hidden;
  }

  .sk-card {
    flex: 0 0 220px;
  }
}
</style>
