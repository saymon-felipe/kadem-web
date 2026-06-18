<template>
  <ProGate v-if="!canUseAi" @upgrade="$emit('upgrade')" />
  <div v-else class="panel ai-panel">
    <div class="panel-title">
      <div>
        <h3>IA Financeira</h3>
        <span>Automação, leitura mensal e apoio ao orçamento.</span>
      </div>
      <button class="text-btn" :disabled="loadingAi" @click="$emit('generate-insights')">
        <font-awesome-icon :icon="loadingAi ? 'circle-notch' : 'chart-simple'" :spin="loadingAi" />
        Gerar insights
      </button>
    </div>

    <div class="ai-grid">
      <section class="usage-card">
        <span>Créditos disponíveis</span>
        <strong>{{ usage.remaining_credits || 0 }}</strong>
        <small>
          {{ usage.used_credits || 0 }} usados de
          {{ usage.total_credits || usage.monthly_limit || 0 }}
        </small>
        <div class="usage-track">
          <i :style="{ width: usagePercent + '%' }"></i>
        </div>
      </section>

      <section class="ai-summary">
        <span>Mês em análise</span>
        <strong>{{ monthLabel }}</strong>
        <small>Os insights usam os lançamentos e categorias visíveis neste período.</small>
      </section>
    </div>

    <div class="insight-list">
      <article v-for="(insight, index) in displayInsights" :key="index" class="insight-row">
        <strong>{{ insight.title }}</strong>
        <span v-if="insight.description">{{ insight.description }}</span>
      </article>
      <div v-if="displayInsights.length === 0" class="empty-state">
        <strong>Nenhum insight gerado</strong>
        <span
          >Gere uma análise para este mês quando houver movimentos ou orçamento para comparar.</span
        >
      </div>
    </div>
  </div>
</template>

<script>
import ProGate from './ProGate.vue'

export default {
  name: 'NexoAiTab',
  components: {
    ProGate,
  },
  emits: ['generate-insights', 'upgrade'],
  props: {
    canUseAi: {
      type: Boolean,
      default: false,
    },
    usage: {
      type: Object,
      required: true,
    },
    monthLabel: {
      type: String,
      required: true,
    },
    displayInsights: {
      type: Array,
      required: true,
    },
    loadingAi: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    usagePercent() {
      const total = Number(this.usage.total_credits || this.usage.monthly_limit || 0)
      if (!total) return 0
      return Math.min(100, Math.round((Number(this.usage.used_credits || 0) / total) * 100))
    },
  },
}
</script>

<style scoped>
.panel,
.usage-card,
.ai-summary,
.insight-row {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel {
  padding: var(--space-5);
  min-height: 0;
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.panel-title > div,
.usage-card,
.ai-summary {
  display: grid;
  gap: var(--space-2);
}

.panel-title h3 {
  margin: 0;
}

.panel-title span,
.usage-card span,
.usage-card small,
.ai-summary span,
.ai-summary small,
.insight-row span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.ai-grid {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(260px, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.usage-card,
.ai-summary,
.insight-row {
  padding: var(--space-4);
}

.usage-card strong,
.ai-summary strong {
  font-size: var(--fontsize-md);
}

.usage-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.usage-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--deep-blue-gradient-right);
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.insight-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.insight-row {
  align-items: flex-start;
  flex-direction: column;
}

.empty-state {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-5);
  border: 1.5px dashed var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.empty-state span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.text-btn {
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  padding: 0 var(--space-3);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.text-btn:hover {
  background: var(--dark-yellow-2);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
