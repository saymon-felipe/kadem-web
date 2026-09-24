<template>
  <section class="insights-panel">
    <div class="section-heading">
      <div class="heading-copy">
        <span class="eyebrow">EVOLUÇÃO & PADRÕES</span>
        <h3>Inteligência & Análise de Registros</h3>
        <p class="heading-sub">Identifique correlações, tendências e impactos na sua saúde ao longo do tempo.</p>
      </div>

      <!-- Seletor de Período Segmentado -->
      <div class="period-segmented-control" role="group" aria-label="Período da análise">
        <button
          v-for="days in [7, 30, 90]"
          :key="days"
          type="button"
          class="period-btn"
          :class="{ 'is-active': periodDays === days }"
          @click="periodDays = days"
        >
          {{ days }} dias
        </button>
      </div>
    </div>

    <div class="insight-grid">
      <!-- CARD 1: EVOLUÇÃO DE UM RASTREADOR -->
      <div class="insight-card tracker-evolution-card">
        <div class="card-header-row">
          <div class="card-title-wrap">
            <font-awesome-icon icon="chart-simple" class="card-icon" />
            <label for="tracker-trend-select" class="card-label">Evolução de um rastreador</label>
          </div>
          <span class="period-badge">{{ periodDays }}d</span>
        </div>

        <div class="select-wrapper">
          <select
            id="tracker-trend-select"
            v-model="selectedTrackerKey"
            class="styled-select"
            aria-label="Rastreador para gráfico"
          >
            <option v-for="tracker in trackers" :key="tracker.local_key" :value="tracker.local_key">
              {{ tracker.name }} ({{ tracker.group || 'Geral' }})
            </option>
          </select>
        </div>

        <template v-if="selectedSummary?.count">
          <div class="metric-display-row">
            <div class="metric-main">
              <span class="metric-label-mini">Último registro</span>
              <div class="metric-value">
                {{ displayValue(selectedSummary.latest) }}
                <small v-if="selectedTracker?.unit" class="metric-unit-text">{{ selectedTracker.unit }}</small>
              </div>
            </div>

            <div class="metric-stats">
              <span class="stat-pill">
                <font-awesome-icon icon="clock-rotate-left" />
                <strong>{{ selectedSummary.count }}</strong> reg.
              </span>
              <span v-if="selectedSummary.average !== null" class="stat-pill">
                <font-awesome-icon icon="scale-balanced" />
                Média <strong>{{ selectedSummary.average.toFixed(1) }}</strong>
              </span>
            </div>
          </div>

          <!-- Gráfico SVG com Gradiente de Área Suave -->
          <div v-if="numericPoints.length > 1" class="chart-container">
            <svg
              class="trend-chart"
              viewBox="0 0 320 90"
              preserveAspectRatio="none"
              role="img"
              :aria-label="`Evolução de ${selectedTracker?.name}`"
            >
              <defs>
                <linearGradient :id="`grad-${selectedTrackerKey}`" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#e25373" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#e25373" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Linha de Base sutil -->
              <line x1="10" y1="80" x2="310" y2="80" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="3,3" />

              <!-- Área preenchida -->
              <polygon
                v-if="areaPolygonPoints"
                :points="areaPolygonPoints"
                :fill="`url(#grad-${selectedTrackerKey})`"
              />

              <!-- Linha de tendência -->
              <polyline
                :points="chartPoints"
                fill="none"
                stroke="#e25373"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Pontos de dados -->
              <circle
                v-for="(point, index) in numericPoints"
                :key="index"
                :cx="point.x"
                :cy="point.y"
                r="3.5"
                class="chart-data-point"
              />
            </svg>
          </div>

          <!-- Valores Recentes em Chips para tipos não-numéricos ou pontuais -->
          <div v-else class="recent-values-wrap">
            <span class="recent-values-title">Registros no período:</span>
            <div class="recent-values-cloud">
              <span
                v-for="(entry, index) in selectedSummary.series.slice(-8)"
                :key="index"
                class="recent-chip"
              >
                {{ displayValue(entry.value) }}
              </span>
            </div>
          </div>
        </template>

        <div v-else class="empty-tracker-notice">
          <font-awesome-icon icon="circle-info" />
          <span>Ainda não há dados deste rastreador nos últimos {{ periodDays }} dias.</span>
        </div>
      </div>

      <!-- CARD 2: COMPARE DOIS SINAIS -->
      <div class="insight-card compare-signals-card">
        <div class="card-header-row">
          <div class="card-title-wrap">
            <font-awesome-icon icon="scale-balanced" class="card-icon" />
            <label class="card-label">Comparador de Hipóteses</label>
          </div>
          <span class="card-step-badge">Cruzar dados</span>
        </div>

        <p class="compare-intro">
          Verifique se a presença de um hábito ou alimento tem associação com algum sintoma ou medição.
        </p>

        <div class="compare-steps-grid">
          <!-- Passo 1: Preditor -->
          <div class="compare-step-box">
            <span class="step-tag">1. Quando registro</span>
            <div class="step-inputs">
              <select v-model="predictorKey" class="styled-select" aria-label="Rastreador preditor">
                <option value="">Selecione o sinal de entrada...</option>
                <option v-for="tracker in predictors" :key="tracker.local_key" :value="tracker.local_key">
                  {{ tracker.name }}
                </option>
              </select>
              <input
                v-model.trim="exposure"
                class="styled-input"
                placeholder="Valor ou tag (ex.: café, glúten)"
              />
            </div>
          </div>

          <!-- Passo 2: Desfecho -->
          <div class="compare-step-box">
            <span class="step-tag">2. O resultado observado é</span>
            <div class="step-inputs">
              <select v-model="outcomeKey" class="styled-select" aria-label="Rastreador de desfecho">
                <option value="">Selecione o desfecho...</option>
                <option v-for="tracker in outcomes" :key="tracker.local_key" :value="tracker.local_key">
                  {{ tracker.name }}
                </option>
              </select>
              <input
                v-model.trim="outcomeValue"
                class="styled-input"
                placeholder="Valor ou limiar (ex.: dor, >=6)"
              />
            </div>
          </div>

          <!-- Passo 3: Janela -->
          <div class="compare-window-box">
            <span class="step-tag">3. Janela de tempo</span>
            <div class="window-segmented">
              <button
                type="button"
                class="window-btn"
                :class="{ 'is-active': windowHours === 0 }"
                @click="windowHours = 0"
              >
                Mesmo dia
              </button>
              <button
                type="button"
                class="window-btn"
                :class="{ 'is-active': windowHours === 24 }"
                @click="windowHours = 24"
              >
                Até 24h
              </button>
              <button
                type="button"
                class="window-btn"
                :class="{ 'is-active': windowHours === 48 }"
                @click="windowHours = 48"
              >
                Até 48h
              </button>
            </div>
          </div>
        </div>

        <button
          class="kadem-health-button kadem-health-button--primary compare-submit-btn"
          type="button"
          :disabled="!canCompare"
          @click="runComparison"
        >
          <font-awesome-icon icon="scale-balanced" />
          <span>Comparar registros</span>
        </button>
      </div>
    </div>

    <!-- RESULTADO DA COMPARAÇÃO (COM BARRAS VISUAIS DE TAXA) -->
    <div v-if="comparison" class="result-card">
      <div class="result-header">
        <div>
          <span class="eyebrow">ASSOCIAÇÃO OBSERVADA</span>
          <h4 class="result-title">
            <span>{{ comparison.exposure }}</span>
            <font-awesome-icon icon="arrow-right" class="comparison-arrow" />
            <span>{{ comparison.outcome_value }}</span>
          </h4>
        </div>

        <span
          class="data-quality-pill"
          :class="comparison.enough_data ? 'is-reliable' : 'is-sparse'"
        >
          <font-awesome-icon :icon="comparison.enough_data ? 'circle-check' : 'circle-info'" />
          <span>{{ comparison.enough_data ? 'Amostra consistente' : 'Amostra inicial' }}</span>
        </span>
      </div>

      <!-- Barras de Comparação Visual -->
      <div class="rates-comparison-bars">
        <div class="rate-bar-item">
          <div class="rate-bar-label-row">
            <span class="rate-label">
              Com <strong>“{{ comparison.exposure }}”</strong>
            </span>
            <span class="rate-number highlight-exposed">{{ rate(comparison.exposed_rate) }}</span>
          </div>
          <div class="rate-meter-track">
            <div
              class="rate-meter-fill fill-exposed"
              :style="{ width: `${Math.round((comparison.exposed_rate || 0) * 100)}%` }"
            ></div>
          </div>
          <small class="rate-fraction">
            {{ comparison.exposed_matches }} de {{ comparison.exposed_count }} dia{{ comparison.exposed_count === 1 ? '' : 's' }}
          </small>
        </div>

        <div class="rate-bar-item">
          <div class="rate-bar-label-row">
            <span class="rate-label">
              Sem <strong>“{{ comparison.exposure }}”</strong>
            </span>
            <span class="rate-number highlight-unexposed">{{ rate(comparison.unexposed_rate) }}</span>
          </div>
          <div class="rate-meter-track">
            <div
              class="rate-meter-fill fill-unexposed"
              :style="{ width: `${Math.round((comparison.unexposed_rate || 0) * 100)}%` }"
            ></div>
          </div>
          <small class="rate-fraction">
            {{ comparison.unexposed_matches }} de {{ comparison.unexposed_count }} dia{{ comparison.unexposed_count === 1 ? '' : 's' }}
          </small>
        </div>
      </div>

      <p class="caution-box">
        <font-awesome-icon icon="circle-info" />
        <span>{{ comparison.enough_data ? 'Associação observacional: outros fatores podem explicar a diferença. Não representa diagnóstico clínico.' : 'Amostra pequena: registre mais dias para tornar a correlação mais confiável.' }}</span>
      </p>

      <!-- Botão IA -->
      <div class="ai-trigger-row">
        <button
          class="kadem-health-button kadem-health-button--primary"
          type="button"
          :disabled="aiLoading || !comparison.enough_data"
          @click="explainWithAi"
        >
          <font-awesome-icon :icon="aiLoading ? 'spinner' : 'wand-magic-sparkles'" :spin="aiLoading" />
          <span>{{ aiLoading ? 'Analisando com IA…' : 'Explicar correlação com IA' }}</span>
        </button>
        <span class="privacy-note">
          <font-awesome-icon icon="lock" />
          A IA recebe apenas nomes e contagens agregadas.
        </span>
      </div>

      <p v-if="aiError" class="ai-error-banner">
        <font-awesome-icon icon="triangle-exclamation" />
        <span>{{ aiError }}</span>
      </p>

      <!-- Resposta da IA com formatação elegante -->
      <div v-if="aiResponse" class="ai-result-panel">
        <div class="ai-panel-header">
          <font-awesome-icon icon="wand-magic-sparkles" class="ai-spark-icon" />
          <h5>Análise Gerada pela IA</h5>
        </div>

        <div class="ai-panel-content">
          <p class="ai-summary">{{ aiResponse.summary }}</p>
          <div v-if="aiResponse.limitations" class="ai-limitations-box">
            <strong>Ressalvas & Limitações:</strong> {{ aiResponse.limitations }}
          </div>

          <div v-if="aiResponse.questions?.length" class="ai-questions-block">
            <strong>Perguntas para observar ou levar ao seu médico:</strong>
            <ul>
              <li v-for="question in aiResponse.questions" :key="question">
                {{ question }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- PADRÕES ENCONTRADOS -->
    <div class="patterns-block">
      <div class="patterns-header-row">
        <div>
          <h4>Padrões Automáticos Detectados</h4>
          <p class="detail">
            Cruzamentos com diferença de 15 pontos percentuais ou mais em pelo menos 3 registros por grupo.
          </p>
        </div>
        <span class="patterns-count-badge">{{ patterns.length }} encontrado{{ patterns.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="!patterns.length" class="empty-patterns-box">
        <font-awesome-icon icon="wand-magic-sparkles" class="empty-icon" />
        <p>Ainda não há dados suficientes para destacar correlações automáticas no período selecionado.</p>
        <small>Continue registrando seus check-ins diários para que os padrões apareçam automaticamente aqui.</small>
      </div>

      <div v-else class="pattern-list-grid">
        <button
          v-for="(pattern, index) in patterns"
          :key="index"
          class="pattern-card-btn"
          type="button"
          @click="selectPattern(pattern)"
        >
          <div class="pattern-top">
            <span class="pattern-tag predictor-tag">{{ pattern.predictor }}: {{ pattern.exposure }}</span>
            <font-awesome-icon icon="arrow-right" class="pattern-flow-icon" />
            <span class="pattern-tag outcome-tag">{{ pattern.outcome }}: {{ pattern.outcome_value }}</span>
          </div>

          <div class="pattern-stats-row">
            <div class="pattern-rates">
              <span><strong>{{ rate(pattern.exposed_rate) }}</strong> com</span>
              <span class="rate-separator">·</span>
              <span><strong>{{ rate(pattern.unexposed_rate) }}</strong> sem</span>
            </div>
            <span class="pattern-window-pill">
              <font-awesome-icon icon="clock" />
              {{ pattern.window_hours ? `${pattern.window_hours}h` : 'mesmo dia' }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { comparePattern, findPatterns, trackerSummary } from "@/services/healthInsights";
import { healthAiService } from "@/services/healthAiService";
import { useAiCreditsStore } from "@/stores/aiCredits";

export default {
  name: "HealthTrackingInsights",
  props: {
    trackers: { type: Array, default: () => [] },
    checkins: { type: Array, default: () => [] },
  },
  data() {
    return {
      periodDays: 30,
      selectedTrackerKey: "",
      predictorKey: "",
      exposure: "",
      outcomeKey: "",
      outcomeValue: "",
      windowHours: 0,
      comparison: null,
      aiLoading: false,
      aiError: "",
      aiResponse: null,
    };
  },
  computed: {
    selectedTracker() {
      return (
        this.trackers.find((item) => item.local_key === this.selectedTrackerKey) ||
        this.trackers[0] ||
        null
      );
    },
    selectedSummary() {
      return this.selectedTracker
        ? trackerSummary(this.checkins, this.selectedTracker, this.periodDays)
        : null;
    },
    predictors() {
      return this.trackers.filter((item) =>
        ["TAGS", "MULTI", "SINGLE", "BOOLEAN"].includes(item.value_type),
      );
    },
    outcomes() {
      return this.trackers.filter((item) =>
        ["SCALE", "NUMBER", "SINGLE", "MULTI", "BOOLEAN"].includes(item.value_type),
      );
    },
    canCompare() {
      return (
        this.predictorKey &&
        this.exposure &&
        this.outcomeKey &&
        this.outcomeValue &&
        this.predictorKey !== this.outcomeKey
      );
    },
    patterns() {
      return findPatterns(this.checkins, this.trackers, this.periodDays);
    },
    numericPoints() {
      const values = (this.selectedSummary?.series || [])
        .filter((entry) => typeof entry.value === "number")
        .slice(-20);
      if (!values.length) return [];
      const minimum = Math.min(...values.map((entry) => entry.value));
      const range = Math.max(1, Math.max(...values.map((entry) => entry.value)) - minimum);
      return values.map((entry, index) => ({
        x: values.length === 1 ? 160 : 10 + (index * 300) / (values.length - 1),
        y: 78 - ((entry.value - minimum) * 65) / range,
      }));
    },
    chartPoints() {
      return this.numericPoints.map((point) => `${point.x},${point.y}`).join(" ");
    },
    areaPolygonPoints() {
      if (this.numericPoints.length < 2) return "";
      const first = this.numericPoints[0];
      const last = this.numericPoints[this.numericPoints.length - 1];
      return `${first.x},80 ${this.chartPoints} ${last.x},80`;
    },
  },
  watch: {
    periodDays() {
      this.comparison = null;
      this.aiResponse = null;
    },
    trackers: {
      immediate: true,
      handler(items) {
        if (!items.some((item) => item.local_key === this.selectedTrackerKey)) {
          this.selectedTrackerKey = items[0]?.local_key || "";
        }
      },
    },
  },
  methods: {
    rate(value) {
      return value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;
    },
    displayValue(value) {
      return Array.isArray(value)
        ? value.join(", ")
        : value === null || value === undefined
          ? "—"
          : String(value);
    },
    runComparison() {
      if (!this.canCompare) return;
      const predictor = this.trackers.find((item) => item.local_key === this.predictorKey);
      const outcome = this.trackers.find((item) => item.local_key === this.outcomeKey);
      this.comparison = {
        predictor: predictor?.name || "Preditor",
        exposure: this.exposure,
        outcome: outcome?.name || "Desfecho",
        outcome_value: this.outcomeValue,
        period_days: this.periodDays,
        window_hours: this.windowHours,
        ...comparePattern(this.checkins, {
          predictor_key: this.predictorKey,
          exposure: this.exposure,
          outcome_key: this.outcomeKey,
          outcome_value: this.outcomeValue,
          period_days: this.periodDays,
          window_hours: this.windowHours,
        }),
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
      try {
        this.aiResponse = await healthAiService.explainInsight(this.comparison);
        useAiCreditsStore().fetchUsage(true);
      } catch (error) {
        this.aiError =
          error.response?.data?.message ||
          error.message ||
          "Não foi possível gerar a explicação agora.";
      } finally {
        this.aiLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.insights-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.heading-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eyebrow {
  color: #e25373;
  font-weight: 800;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-heading h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.15rem;
  font-weight: 800;
}

.heading-sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* Seletor Segmentado de Período */
.period-segmented-control {
  display: inline-flex;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 3px;
  gap: 3px;
}

.period-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 5px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.period-btn:hover {
  color: var(--text-primary);
}

.period-btn.is-active {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(226, 83, 115, 0.25);
}

/* Grade de Insights Principais */
.insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
}

.insight-card {
  padding: var(--space-4) var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: border-color var(--transition-fast);
}

.insight-card:hover {
  border-color: rgba(141, 95, 211, 0.25);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon {
  color: #e25373;
  font-size: 0.88rem;
}

.card-label {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--text-primary);
}

.period-badge,
.card-step-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.select-wrapper {
  width: 100%;
}

.styled-select,
.styled-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.styled-select:focus,
.styled-input:focus {
  border-color: #e25373;
  box-shadow: 0 0 0 2px rgba(226, 83, 115, 0.15);
}

/* Metric Display Row */
.metric-display-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--glass-border);
}

.metric-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label-mini {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.metric-unit-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.metric-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.stat-pill {
  font-size: 0.74rem;
  color: var(--text-secondary);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.stat-pill strong {
  color: var(--text-primary);
}

/* Gráfico */
.chart-container {
  width: 100%;
  height: 94px;
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  padding: 6px;
  box-sizing: border-box;
}

.trend-chart {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.chart-data-point {
  fill: #e25373;
  stroke: var(--surface-0);
  stroke-width: 1.5;
  transition: r 0.2s ease;
}

.chart-data-point:hover {
  r: 5;
}

/* Recent values cloud */
.recent-values-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-values-title {
  font-size: 0.74rem;
  color: var(--text-muted);
  font-weight: 600;
}

.recent-values-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.recent-chip {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.74rem;
  font-weight: 600;
}

.empty-tracker-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--space-4);
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.8rem;
}

/* ==========================================================
   COMPARADOR DE HIPÓTESES
   ========================================================== */
.compare-intro {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.compare-steps-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.compare-step-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.step-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.compare-window-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.window-segmented {
  display: flex;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  padding: 2px;
  gap: 2px;
}

.window-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  border-radius: calc(var(--radius-xs) - 1px);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.window-btn.is-active {
  background: var(--surface-2);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
}

.compare-submit-btn {
  align-self: flex-start;
}

/* ==========================================================
   RESULT CARD (ASSOCIAÇÃO OBSERVADA)
   ========================================================== */
.result-card {
  padding: var(--space-4) var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-left: 4px solid #e25373;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.result-title {
  margin: 3px 0 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.comparison-arrow {
  font-size: 0.85rem;
  color: #e25373;
}

.data-quality-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.data-quality-pill.is-reliable {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.data-quality-pill.is-sparse {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

/* Barras Visuais de Taxa */
.rates-comparison-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.rate-bar-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rate-bar-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.8rem;
}

.rate-number {
  font-size: 1.05rem;
  font-weight: 800;
}

.highlight-exposed {
  color: #e25373;
}

.highlight-unexposed {
  color: var(--text-secondary);
}

.rate-meter-track {
  width: 100%;
  height: 8px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}

.rate-meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fill-exposed {
  background: linear-gradient(90deg, #e25373, #8d5fd3);
}

.fill-unexposed {
  background: var(--surface-3);
}

.rate-fraction {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.caution-box {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--surface-1);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.ai-trigger-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.privacy-note {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.ai-error-banner {
  margin: 0;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-expense, #ef4444);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Painel de Resposta da IA */
.ai-result-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-1);
  border: 1px solid rgba(141, 95, 211, 0.3);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  animation: fadeInPanel 0.25s ease;
}

@keyframes fadeInPanel {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8d5fd3;
}

.ai-panel-header h5 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-primary);
}

.ai-spark-icon {
  color: #8d5fd3;
}

.ai-panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.ai-summary {
  margin: 0;
  color: var(--text-primary);
  font-weight: 500;
}

.ai-limitations-box {
  background: var(--surface-2);
  border-left: 3px solid #f59e0b;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  font-size: 0.76rem;
}

.ai-questions-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.78rem;
}

.ai-questions-block ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* ==========================================================
   PADRÕES ENCONTRADOS
   ========================================================== */
.patterns-block {
  padding: var(--space-4) var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.patterns-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
}

.patterns-header-row h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
}

.detail {
  margin: 2px 0 0;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.patterns-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  padding: 2px 8px;
  border-radius: 10px;
}

.empty-patterns-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: var(--space-5);
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--glass-border);
  color: var(--text-secondary);
}

.empty-patterns-box .empty-icon {
  font-size: 1.4rem;
  color: #e25373;
  margin-bottom: 2px;
}

.empty-patterns-box p {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-patterns-box small {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.pattern-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.pattern-card-btn {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--space-3) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.pattern-card-btn:hover {
  background: var(--surface-2);
  border-color: #e25373;
  transform: translateY(-1px);
  box-shadow: var(--shadow-xs);
}

.pattern-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.pattern-tag {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-xs);
}

.predictor-tag {
  background: rgba(141, 95, 211, 0.12);
  color: #8d5fd3;
}

.outcome-tag {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
}

.pattern-flow-icon {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.pattern-stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.pattern-rates {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rate-separator {
  color: var(--text-muted);
}

.pattern-window-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--surface-0);
  padding: 1px 6px;
  border-radius: 4px;
}

@media (max-width: 760px) {
  .insight-grid {
    grid-template-columns: 1fr;
  }
  .rates-comparison-bars {
    grid-template-columns: 1fr;
  }
  .step-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
