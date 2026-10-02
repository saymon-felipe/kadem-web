<template>
  <KademSkeletonGroup class="sk-dashboard" :label="label">
    <!-- Faixa de metricas (cards de resumo do Nexo e do Health) -->
    <div v-if="variant === 'overview'" class="sk-metrics">
      <div v-for="n in metrics" :key="n" class="sk-card sk-metric" :style="{ '--sk-delay': `${n * 90}ms` }">
        <KademSkeleton :width="`${n % 2 ? 46 : 58}%`" :height="11" />
        <KademSkeleton :width="`${n % 2 ? 72 : 60}%`" :height="24" />
      </div>
    </div>

    <!-- Barra de ferramentas das abas de lista -->
    <div v-else class="sk-toolbar">
      <KademSkeleton shape="pill" :width="260" :height="38" />
      <span class="sk-spacer"></span>
      <KademSkeleton shape="pill" :width="130" :height="38" style="--sk-delay: 120ms" />
    </div>

    <div v-if="variant === 'overview'" class="sk-panels">
      <section class="sk-card sk-panel">
        <KademSkeleton :width="150" :height="16" />
        <div class="sk-chart">
          <KademSkeleton shape="circle" :width="150" style="--sk-delay: 200ms" />
          <div class="sk-legend">
            <div v-for="n in 4" :key="n" class="sk-legend-row">
              <KademSkeleton shape="circle" :width="12" />
              <KademSkeleton :width="`${90 - n * 12}%`" :height="11" />
            </div>
          </div>
        </div>
      </section>

      <section class="sk-card sk-panel" style="--sk-delay: 160ms">
        <KademSkeleton :width="190" :height="16" />
        <div class="sk-rows">
          <div v-for="n in 5" :key="n" class="sk-row" :style="{ '--sk-delay': `${160 + n * 80}ms` }">
            <KademSkeleton shape="circle" :width="34" />
            <div class="sk-row-text">
              <KademSkeleton :width="`${n % 2 ? 62 : 48}%`" :height="12" />
              <KademSkeleton :width="`${n % 2 ? 36 : 44}%`" :height="9" />
            </div>
            <KademSkeleton :width="64" :height="14" />
          </div>
        </div>
      </section>
    </div>

    <section v-else class="sk-card sk-panel">
      <div class="sk-rows">
        <div v-for="n in 7" :key="n" class="sk-row" :style="{ '--sk-delay': `${n * 80}ms` }">
          <KademSkeleton shape="circle" :width="34" />
          <div class="sk-row-text">
            <KademSkeleton :width="`${n % 3 === 0 ? 38 : n % 2 ? 58 : 46}%`" :height="12" />
            <KademSkeleton :width="`${n % 2 ? 30 : 40}%`" :height="9" />
          </div>
          <KademSkeleton :width="72" :height="14" />
        </div>
      </div>
    </section>
  </KademSkeletonGroup>
</template>

<script>
import KademSkeleton from "@/components/ui/KademSkeleton.vue";
import KademSkeletonGroup from "@/components/ui/KademSkeletonGroup.vue";

export default {
  name: "DashboardSkeleton",
  components: { KademSkeleton, KademSkeletonGroup },
  props: {
    // overview: metricas + dois paineis; list: barra de ferramentas + uma lista.
    variant: {
      type: String,
      default: "overview",
      validator: (value) => ["overview", "list"].includes(value),
    },
    metrics: { type: Number, default: 4 },
    label: { type: String, default: "Carregando dados…" },
  },
};
</script>

<style scoped>
.sk-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  overflow: hidden;
}

/* Mesma casca de .metric/.panel do Nexo e do Health. */
.sk-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
}

.sk-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-4);
}

.sk-metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

/* Proporcao do .overview-grid do Nexo; o Health sobrescreve --sk-panels-cols (1.15fr / 0.85fr). */
.sk-panels {
  display: grid;
  grid-template-columns: var(--sk-panels-cols, minmax(0, 0.9fr) minmax(0, 1.1fr));
  gap: var(--space-4);
}

@container (max-width: 960px) {
  .sk-panels {
    grid-template-columns: 1fr;
  }
}

.sk-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
  min-width: 0;
}

.sk-chart {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.sk-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.sk-legend-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.sk-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.sk-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.sk-row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.sk-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.sk-spacer {
  flex: 1;
}
</style>
