<template>
  <section class="insights-panel">
    <div class="section-heading">
      <div><span class="eyebrow">EVOLUÇÃO & PADRÕES</span><h3>Entenda seus registros</h3></div>
      <select v-model.number="periodDays" aria-label="Período da análise"><option :value="7">7 dias</option><option :value="30">30 dias</option><option :value="90">90 dias</option></select>
    </div>

    <div class="insight-grid">
      <div class="insight-card">
        <label class="card-label">Evolução de um rastreador</label>
        <select v-model="selectedTrackerKey" aria-label="Rastreador para gráfico"><option v-for="tracker in trackers" :key="tracker.local_key" :value="tracker.local_key">{{ tracker.name }}</option></select>
        <template v-if="selectedSummary?.count">
          <div class="metric-value">{{ displayValue(selectedSummary.latest) }} <small v-if="selectedTracker?.unit">{{ selectedTracker.unit }}</small></div>
          <p class="detail">Último registro · {{ selectedSummary.count }} registro(s) no período<span v-if="selectedSummary.average !== null"> · média {{ selectedSummary.average.toFixed(1) }}</span></p>
          <svg v-if="numericPoints.length > 1" class="trend-chart" viewBox="0 0 320 90" role="img" :aria-label="`Evolução de ${selectedTracker.name}`">
            <polyline :points="chartPoints" fill="none" stroke="#e25373" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="(point, index) in numericPoints" :key="index" :cx="point.x" :cy="point.y" r="3" fill="#e25373" />
          </svg>
          <div v-else class="recent-values"><span v-for="(entry, index) in selectedSummary.series.slice(-7)" :key="index">{{ displayValue(entry.value) }}</span></div>
        </template>
        <p v-else class="empty-copy">Ainda não há dados deste rastreador no período.</p>
      </div>

      <div class="insight-card">
        <label class="card-label">Compare dois sinais</label>
        <div class="compare-grid">
          <label>Quando registro<select v-model="predictorKey"><option value="">Selecione</option><option v-for="tracker in predictors" :key="tracker.local_key" :value="tracker.local_key">{{ tracker.name }}</option></select></label>
          <label>Valor ou tag<input v-model.trim="exposure" placeholder="Ex.: carne" /></label>
          <label>O resultado é<select v-model="outcomeKey"><option value="">Selecione</option><option v-for="tracker in outcomes" :key="tracker.local_key" :value="tracker.local_key">{{ tracker.name }}</option></select></label>
          <label>Valor observado<input v-model.trim="outcomeValue" placeholder="Ex.: Líquida ou >=6" /></label>
          <label>Janela<select v-model.number="windowHours"><option :value="0">Mesmo dia</option><option :value="24">Até 24h</option><option :value="48">Até 48h</option></select></label>
        </div>
        <button class="secondary" type="button" :disabled="!canCompare" @click="runComparison">Comparar registros</button>
      </div>
    </div>

    <div v-if="comparison" class="result-card">
      <span class="eyebrow">ASSOCIAÇÃO OBSERVADA</span>
      <h4>{{ comparison.exposure }} × {{ comparison.outcome_value }}</h4>
      <p>Com “{{ comparison.exposure }}”: <strong>{{ rate(comparison.exposed_rate) }}</strong> ({{ comparison.exposed_matches }}/{{ comparison.exposed_count }}). Sem: <strong>{{ rate(comparison.unexposed_rate) }}</strong> ({{ comparison.unexposed_matches }}/{{ comparison.unexposed_count }}).</p>
      <p class="caution">{{ comparison.enough_data ? 'Associação observacional: outros fatores podem explicar a diferença.' : 'Amostra pequena: registre mais dias antes de interpretar a diferença.' }}</p>
      <button class="ai-button" type="button" :disabled="aiLoading || !comparison.enough_data" @click="explainWithAi">{{ aiLoading ? 'Analisando…' : 'Explicar com IA' }}</button>
      <p class="privacy-note">A IA recebe apenas nomes e contagens agregadas deste comparativo. Anotações e eventos brutos não são enviados.</p>
      <p v-if="aiError" class="error-copy">{{ aiError }}</p>
      <div v-if="aiResponse" class="ai-result"><strong>Leitura da IA</strong><p>{{ aiResponse.summary }}</p><p>{{ aiResponse.limitations }}</p><ul v-if="aiResponse.questions?.length"><li v-for="question in aiResponse.questions" :key="question">{{ question }}</li></ul></div>
    </div>

    <div class="patterns-block">
      <h4>Padrões encontrados</h4>
      <p class="detail">Cruzamentos com pelo menos três registros em cada grupo e diferença de 15 pontos percentuais ou mais.</p>
      <p v-if="!patterns.length" class="empty-copy">Ainda não há registros suficientes para destacar padrões neste período.</p>
      <div v-else class="pattern-list">
        <button v-for="(pattern, index) in patterns" :key="index" class="pattern-card" type="button" @click="selectPattern(pattern)">
          <strong>{{ pattern.predictor }}: {{ pattern.exposure }}</strong><span>→ {{ pattern.outcome }}: {{ pattern.outcome_value }}</span>
          <small>{{ rate(pattern.exposed_rate) }} com · {{ rate(pattern.unexposed_rate) }} sem · {{ pattern.window_hours ? `${pattern.window_hours}h` : 'mesmo dia' }}</small>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { comparePattern, findPatterns, trackerSummary } from "@/services/healthInsights";
import { healthAiService } from "@/services/healthAiService";

export default {
  name: "HealthTrackingInsights",
  props: { trackers: { type: Array, default: () => [] }, checkins: { type: Array, default: () => [] } },
  data() { return { periodDays: 30, selectedTrackerKey: "", predictorKey: "", exposure: "", outcomeKey: "", outcomeValue: "", windowHours: 0, comparison: null, aiLoading: false, aiError: "", aiResponse: null }; },
  computed: {
    selectedTracker() { return this.trackers.find((item) => item.local_key === this.selectedTrackerKey) || this.trackers[0] || null; },
    selectedSummary() { return this.selectedTracker ? trackerSummary(this.checkins, this.selectedTracker, this.periodDays) : null; },
    predictors() { return this.trackers.filter((item) => ["TAGS", "MULTI", "SINGLE", "BOOLEAN"].includes(item.value_type)); },
    outcomes() { return this.trackers.filter((item) => ["SCALE", "NUMBER", "SINGLE", "MULTI", "BOOLEAN"].includes(item.value_type)); },
    canCompare() { return this.predictorKey && this.exposure && this.outcomeKey && this.outcomeValue && this.predictorKey !== this.outcomeKey; },
    patterns() { return findPatterns(this.checkins, this.trackers, this.periodDays); },
    numericPoints() {
      const values = (this.selectedSummary?.series || []).filter((entry) => typeof entry.value === "number").slice(-20);
      if (!values.length) return [];
      const minimum = Math.min(...values.map((entry) => entry.value));
      const range = Math.max(1, Math.max(...values.map((entry) => entry.value)) - minimum);
      return values.map((entry, index) => ({ x: values.length === 1 ? 160 : 10 + index * 300 / (values.length - 1), y: 78 - (entry.value - minimum) * 65 / range }));
    },
    chartPoints() { return this.numericPoints.map((point) => `${point.x},${point.y}`).join(" "); },
  },
  watch: {
    periodDays() { this.comparison = null; this.aiResponse = null; },
    trackers: { immediate: true, handler(items) { if (!items.some((item) => item.local_key === this.selectedTrackerKey)) this.selectedTrackerKey = items[0]?.local_key || ""; } },
  },
  methods: {
    rate(value) { return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`; },
    displayValue(value) { return Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '—' : String(value); },
    runComparison() {
      if (!this.canCompare) return;
      const predictor = this.trackers.find((item) => item.local_key === this.predictorKey);
      const outcome = this.trackers.find((item) => item.local_key === this.outcomeKey);
      this.comparison = {
        predictor: predictor.name, exposure: this.exposure, outcome: outcome.name, outcome_value: this.outcomeValue,
        period_days: this.periodDays, window_hours: this.windowHours,
        ...comparePattern(this.checkins, { predictor_key: this.predictorKey, exposure: this.exposure, outcome_key: this.outcomeKey, outcome_value: this.outcomeValue, period_days: this.periodDays, window_hours: this.windowHours }),
      };
      this.aiResponse = null;
      this.aiError = "";
    },
    selectPattern(pattern) {
      const predictor = this.trackers.find((item) => item.local_key === pattern.predictor_key);
      const outcome = this.trackers.find((item) => item.local_key === pattern.outcome_key);
      if (predictor) this.predictorKey = predictor.local_key;
      if (outcome) this.outcomeKey = outcome.local_key;
      this.exposure = String(pattern.exposure);
      this.outcomeValue = String(pattern.outcome_value);
      this.windowHours = pattern.window_hours;
      this.comparison = pattern;
      this.aiResponse = null;
      this.aiError = "";
    },
    async explainWithAi() {
      if (!this.comparison?.enough_data) return;
      this.aiLoading = true;
      this.aiError = "";
      try { this.aiResponse = await healthAiService.explainInsight(this.comparison); }
      catch (error) { this.aiError = error.response?.data?.message || error.message || "Não foi possível gerar a explicação agora."; }
      finally { this.aiLoading = false; }
    },
  },
};
</script>

<style scoped>
.insights-panel { display: grid; gap: var(--space-4); }
.section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.section-heading h3 { margin: 0; color: var(--text-primary); font-size: 1.05rem; }
.eyebrow { color: #e25373; font-weight: 800; font-size: .68rem; letter-spacing: .07em; }
.insight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.insight-card, .result-card, .patterns-block { padding: var(--space-4); background: var(--surface-0); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); box-shadow: var(--shadow-xs); }
.insight-card { display: grid; align-content: start; gap: var(--space-2); }
.card-label { color: var(--text-secondary); font-size: .77rem; font-weight: 800; }
select, input { background: var(--surface-1); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-xs); padding: 8px 10px; min-width: 0; width: 100%; }
.section-heading select { width: auto; }
.metric-value { font-size: 1.7rem; font-weight: 800; color: var(--text-primary); }
.metric-value small { font-size: .8rem; }
.detail, .empty-copy, .privacy-note { color: var(--text-muted); font-size: .77rem; margin: 0; line-height: 1.45; }
.trend-chart { width: 100%; height: 90px; background: var(--surface-1); border-radius: var(--radius-xs); }
.recent-values { display: flex; flex-wrap: wrap; gap: 5px; }
.recent-values span { color: var(--text-primary); background: var(--surface-2); border-radius: var(--radius-xs); padding: 4px 7px; font-size: .75rem; }
.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.compare-grid label { display: grid; gap: 4px; color: var(--text-secondary); font-size: .72rem; font-weight: 700; }
button { cursor: pointer; border-radius: var(--radius-xs); font-weight: 700; }
.secondary { justify-self: start; padding: 8px 12px; border: 1px solid var(--glass-border); color: var(--text-primary); background: var(--surface-2); }
button:disabled { opacity: .5; cursor: not-allowed; }
.result-card h4, .patterns-block h4 { color: var(--text-primary); margin: 3px 0 7px; }
.result-card p { color: var(--text-secondary); font-size: .83rem; line-height: 1.45; }
.result-card .caution { color: var(--text-muted); }
.ai-button { padding: 8px 12px; background: linear-gradient(135deg, #e25373, #8d5fd3); color: white; border: 0; }
.privacy-note { margin-top: 7px !important; }
.error-copy { color: var(--color-expense) !important; }
.ai-result { border-top: 1px solid var(--glass-border); margin-top: var(--space-3); padding-top: var(--space-3); color: var(--text-primary); font-size: .82rem; }
.ai-result p { margin: 5px 0; }
.pattern-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-2); margin-top: var(--space-3); }
.pattern-card { display: grid; text-align: left; gap: 4px; padding: var(--space-3); background: var(--surface-1); border: 1px solid var(--glass-border); color: var(--text-primary); }
.pattern-card:hover { border-color: #e25373; }
.pattern-card span, .pattern-card small { color: var(--text-secondary); font-size: .74rem; }
@media (max-width: 760px) { .insight-grid, .compare-grid { grid-template-columns: 1fr; } }
</style>
