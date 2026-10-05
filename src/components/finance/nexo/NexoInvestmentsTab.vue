<template>
  <section class="investments-tab">
    <div class="summary-grid">
      <article class="metric-card invested">
        <span class="metric-icon"><font-awesome-icon icon="arrow-up" /></span>
        <div class="metric-body">
          <small>Investido no mês</small>
          <strong>{{ formatMoney(summary.month_invested || 0) }}</strong>
        </div>
      </article>
      <article class="metric-card principal">
        <span class="metric-icon"><font-awesome-icon icon="layer-group" /></span>
        <div class="metric-body">
          <small>Total aportado</small>
          <strong>{{ formatMoney(summary.total_invested || 0) }}</strong>
        </div>
      </article>
      <article class="metric-card yield">
        <span class="metric-icon"><font-awesome-icon icon="chart-simple" /></span>
        <div class="metric-body">
          <small>Juros acumulados</small>
          <strong class="positive">{{ formatMoney(summary.total_yield || 0) }}</strong>
        </div>
      </article>
      <article class="metric-card balance">
        <span class="metric-icon"><font-awesome-icon icon="scale-balanced" /></span>
        <div class="metric-body">
          <small>Saldo estimado</small>
          <strong>{{ formatMoney(summary.estimated_balance || 0) }}</strong>
        </div>
      </article>
    </div>

    <KademTabs
      :tabs="investmentTabs"
      :active-tab="activeInvestmentTab"
      variant="pills"
      aria-label="Investimentos"
      class="investment-subtabs"
      @update:activeTab="activeInvestmentTab = $event"
    />

    <div v-show="activeInvestmentTab === 'summary'" class="tab-content">
      <section class="panel momentum-panel">
        <div class="panel-title">
          <div class="panel-title-left">
            <h3>Ritmo</h3>
          </div>
          <span class="panel-badge" :class="{ active: investingStreak > 0 }">
            <font-awesome-icon icon="chart-simple" />
            {{ streakLabel }}
          </span>
        </div>
        <div class="momentum-grid">
          <div class="momentum-stat">
            <small>Sequência</small>
            <strong>{{ investingStreak }} {{ investingStreak === 1 ? 'mês' : 'meses' }}</strong>
          </div>
          <div class="momentum-stat">
            <small>Meta mais próxima</small>
            <strong>{{ nearestGoalLabel }}</strong>
          </div>
          <div class="momentum-stat">
            <small>Mês em foco</small>
            <strong>{{ formatMonthDisplay(selectedMonth) }}</strong>
          </div>
        </div>
        <div class="progress-hero">
          <div class="progress-copy">
            <strong>{{ heroProgressTitle }}</strong>
            <span>{{ heroProgressText }}</span>
          </div>
          <div class="progress-track">
            <i :style="{ width: `${heroProgressPercent}%` }"></i>
          </div>
        </div>
      </section>

      <div class="visual-grid">
        <section class="panel category-panel">
          <div class="panel-title">
            <div class="panel-title-left">
              <h3>Categorias</h3>
            </div>
            <span class="panel-badge">
              {{ categoryDistribution.length }} {{ categoryDistribution.length === 1 ? 'categoria' : 'categorias' }}
            </span>
          </div>
          <div class="donut-layout">
            <div class="donut-shell">
              <svg v-if="donutSegments.length > 0" viewBox="0 0 100 100" class="donut-svg">
                <circle
                  v-for="segment in donutSegments"
                  :key="segment.key"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  :stroke="segment.color"
                  :stroke-dasharray="segment.dashArray"
                  :stroke-dashoffset="segment.dashOffset"
                  stroke-width="15"
                />
              </svg>
              <svg v-else viewBox="0 0 100 100" class="donut-svg">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--surface-2)"
                  stroke-width="15"
                />
              </svg>
              <div class="donut-hole">
                <strong>{{ formatMoney(summary.estimated_balance || 0) }}</strong>
                <small>saldo</small>
              </div>
            </div>
            <div class="legend-list">
              <div v-for="segment in donutSegments" :key="segment.key" class="legend-row">
                <span class="swatch" :style="{ background: segment.color || '#999999' }"></span>
                <span class="legend-label">{{ segment.category_name }}</span>
                <strong>{{ formatMoney(segment.estimated_balance) }}</strong>
              </div>
              <p v-if="donutSegments.length === 0" class="empty-line">
                Sem aportes de investimento ainda.
              </p>
            </div>
          </div>
        </section>

        <section class="panel bar-chart-panel">
          <div class="panel-title">
            <div class="panel-title-left">
              <h3>Aporte x juros</h3>
            </div>
            <div class="bar-legend">
              <span class="legend-item"><i class="swatch-invest"></i> Aporte</span>
              <span class="legend-item"><i class="swatch-yield"></i> Juros</span>
            </div>
          </div>
          <div class="bar-chart">
            <div v-for="item in barHistory" :key="item.month" class="bar-row">
              <div class="bar-meta">
                <strong>{{ formatMonthDisplay(item.month) }}</strong>
                <div class="bar-values">
                  <span class="val-invest">{{ formatMoney(item.invested) }}</span>
                  <span class="val-sep" v-if="Number(item.yield) > 0">/</span>
                  <span class="val-yield" v-if="Number(item.yield) > 0">+{{ formatMoney(item.yield) }}</span>
                </div>
              </div>
              <div class="bar-track">
                <div class="bar-stack">
                  <i class="invest-bar" :style="{ width: `${item.investedPercent}%` }" :title="`Aporte: ${formatMoney(item.invested)}`"></i>
                  <i class="yield-bar" :style="{ width: `${item.yieldPercent}%` }" :title="`Juros: ${formatMoney(item.yield)}`"></i>
                </div>
              </div>
            </div>
            <p v-if="barHistory.length === 0" class="empty-line">
              O histórico mensal vai aparecer aqui.
            </p>
          </div>
        </section>
      </div>

      <section class="panel projection-panel">
        <div class="panel-title">
          <div class="panel-title-left">
            <h3>Previsão no tempo</h3>
          </div>
          <span class="projection-tag">
            <font-awesome-icon icon="money-bill" />
            {{ calculator.ratePercent }}% a.a.
          </span>
        </div>
        <div class="projection-wrap">
          <div ref="chartContainer" class="chart-container">
            <svg
              v-if="projectionPoints.length > 1"
              :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
              class="projection-svg"
            >
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
                  <stop offset="70%" stop-color="#10b981" stop-opacity="0.05" />
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Reference Gridlines -->
              <line
                :x1="16"
                :y1="svgHeight * 0.28"
                :x2="svgWidth - 16"
                :y2="svgHeight * 0.28"
                stroke="rgba(255, 255, 255, 0.05)"
                stroke-dasharray="4,6"
                stroke-width="1"
              />
              <line
                :x1="16"
                :y1="svgHeight * 0.58"
                :x2="svgWidth - 16"
                :y2="svgHeight * 0.58"
                stroke="rgba(255, 255, 255, 0.05)"
                stroke-dasharray="4,6"
                stroke-width="1"
              />

              <!-- Area Fill -->
              <path
                :d="projectionAreaPath"
                fill="url(#projGrad)"
              />

              <!-- Smooth Curve Line -->
              <path
                :d="projectionCurvePath"
                fill="none"
                stroke="#10b981"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Milestone Markers (Halo + Inner Dot) -->
              <g v-for="pt in keyProjectionPoints" :key="pt.label">
                <!-- Outer soft glow halo -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  r="7.5"
                  fill="rgba(16, 185, 129, 0.25)"
                />
                <!-- Inner solid dot with white border -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  stroke-width="2"
                />
              </g>
            </svg>
          </div>
          <div class="projection-grid">
            <article v-for="point in projectionPreview" :key="point.label" class="projection-card">
              <small>{{ point.displayLabel || point.label }}</small>
              <strong>{{ formatMoney(point.value) }}</strong>
              <span class="projection-growth" v-if="point.growthPercent > 0">
                +{{ point.growthPercent }}%
              </span>
            </article>
          </div>
        </div>
      </section>

      <section class="panel history-panel">
        <div class="panel-title">
          <div class="panel-title-left">
            <h3>Histórico</h3>
          </div>
          <span class="panel-badge">
            {{ monthlyHistory.length }} {{ monthlyHistory.length === 1 ? 'registro' : 'registros' }}
          </span>
        </div>

        <!-- Desktop Table View -->
        <div class="history-table history-table-desktop">
          <div class="history-head">
            <span>Mês</span>
            <span>Aporte</span>
            <span>Juro</span>
            <span>Resgate</span>
            <span>Saldo</span>
          </div>
          <div v-for="item in historyRows" :key="item.month" class="history-row">
            <span class="history-month-tag">{{ formatMonthDisplay(item.month) }}</span>
            <strong>{{ formatMoney(item.invested) }}</strong>
            <strong class="positive">{{ formatMoney(item.yield) }}</strong>
            <strong :class="{ negative: Number(item.withdrawn) > 0 }">{{ formatMoney(item.withdrawn) }}</strong>
            <strong class="history-balance-val">{{ formatMoney(item.estimated_balance) }}</strong>
          </div>
          <p v-if="historyRows.length === 0" class="empty-line">
            Nenhum mês com investimento ainda.
          </p>
        </div>

        <!-- Mobile Cards View -->
        <div class="history-cards-mobile">
          <article v-for="item in historyRows" :key="item.month" class="history-card-mobile">
            <div class="card-mobile-top">
              <span class="history-month-tag">{{ formatMonthDisplay(item.month) }}</span>
              <div class="card-mobile-balance">
                <small>Saldo final</small>
                <strong>{{ formatMoney(item.estimated_balance) }}</strong>
              </div>
            </div>
            <div class="card-mobile-metrics">
              <div class="card-mobile-metric">
                <small>Aporte</small>
                <span>{{ formatMoney(item.invested) }}</span>
              </div>
              <div class="card-mobile-metric">
                <small>Juro</small>
                <span class="positive">{{ formatMoney(item.yield) }}</span>
              </div>
              <div class="card-mobile-metric">
                <small>Resgate</small>
                <span :class="{ negative: Number(item.withdrawn) > 0 }">{{ formatMoney(item.withdrawn) }}</span>
              </div>
            </div>
          </article>
          <p v-if="historyRows.length === 0" class="empty-line">
            Nenhum mês com investimento ainda.
          </p>
        </div>
      </section>
    </div>

    <section v-show="activeInvestmentTab === 'goals'" class="panel tab-content">
      <div class="panel-title">
        <div class="panel-title-left">
          <h3>Metas</h3>
        </div>
        <button class="action-pill-btn" @click="resetGoalForm">
          <font-awesome-icon icon="plus" /> Nova meta
        </button>
      </div>
      <form class="stack-form" @submit.prevent="submitGoal">
        <label class="floating-field">
          <input v-model="goalForm.name" type="text" placeholder=" " required />
          <span>Nome da meta</span>
        </label>
        <div class="inline-grid">
          <label class="floating-field select-field">
            <select v-model="goalForm.horizon" required>
              <option value="SHORT">Curto prazo</option>
              <option value="MEDIUM">Médio prazo</option>
              <option value="LONG">Longo prazo</option>
            </select>
            <span>Prazo</span>
          </label>
          <label class="floating-field">
            <input
              v-model="goalForm.target_amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder=" "
              required
            />
            <span>Valor alvo</span>
          </label>
        </div>
        <div class="initial-amount-field">
          <label class="floating-field">
            <input
              v-model="goalForm.current_amount"
              type="number"
              min="0"
              :max="goalInitialAmountMax"
              step="0.01"
              placeholder=" "
              :aria-invalid="goalInitialAmountExceeded"
            />
            <span>Saldo inicial</span>
          </label>
          <small class="field-hint" :class="{ negative: goalInitialAmountExceeded }">
            {{ goalInitialAmountHint }}
          </small>
        </div>
        <div class="inline-grid">
          <label class="floating-field date-field">
            <input v-model="goalForm.target_date" type="date" placeholder=" " />
            <span>Data alvo</span>
          </label>
          <label class="floating-field color-field">
            <input v-model="goalForm.color" type="color" />
            <span>Cor da meta</span>
          </label>
        </div>
        <button type="submit" class="primary-action" :disabled="goalInitialAmountExceeded">
          {{ goalForm.id ? 'Salvar meta' : 'Criar meta' }}
        </button>
      </form>

      <div class="goal-list">
        <article v-for="goal in goals" :key="goal.id || goal.local_id" class="goal-card">
          <div class="goal-head">
            <div class="goal-title-wrap">
              <strong>{{ goal.name }}</strong>
              <span class="goal-horizon-badge">{{ horizonLabel(goal.horizon) }}</span>
            </div>
            <div class="goal-actions">
              <button class="icon-btn small" @click="editGoal(goal)" title="Editar meta">
                <font-awesome-icon icon="pen" />
              </button>
              <button
                class="icon-btn small danger"
                @click="$emit('delete-goal', goal)"
                title="Arquivar meta"
              >
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </div>
          <div class="goal-values">
            <span>{{ formatMoney(goalCurrentAmount(goal)) }}</span>
            <strong>{{ formatMoney(goal.target_amount) }}</strong>
          </div>
          <div class="progress-track compact">
            <i :style="{ width: `${goalProgress(goal)}%`, background: goal.color || '#355AFD' }"></i>
          </div>
        </article>
        <p v-if="goals.length === 0" class="empty-line">
          Crie a primeira meta para acompanhar o progresso.
        </p>
      </div>
    </section>

    <section v-show="activeInvestmentTab === 'calculator'" class="panel tab-content">
      <div class="panel-title">
        <div class="panel-title-left">
          <h3>Calculadora</h3>
        </div>
        <button class="action-pill-btn" @click="$emit('refresh-rates')">
          <font-awesome-icon icon="arrows-rotate" /> Taxas
        </button>
      </div>
      <form class="stack-form" @submit.prevent>
        <div class="inline-grid">
          <label class="floating-field">
            <input
              v-model.number="calculator.principal"
              type="number"
              min="0"
              step="0.01"
              placeholder=" "
            />
            <span>Valor inicial</span>
          </label>
          <label class="floating-field">
            <input
              v-model.number="calculator.monthlyContribution"
              type="number"
              min="0"
              step="0.01"
              placeholder=" "
            />
            <span>Aporte mensal</span>
          </label>
        </div>
        <div class="inline-grid">
          <label class="floating-field">
            <input
              v-model.number="calculator.ratePercent"
              type="number"
              step="0.0001"
              placeholder=" "
            />
            <span>Taxa (%)</span>
          </label>
          <label class="floating-field select-field">
            <select v-model="calculator.rateMode">
              <option value="annual">Taxa anual</option>
              <option value="monthly">Taxa mensal</option>
            </select>
            <span>Periodicidade</span>
          </label>
        </div>
        <div class="inline-grid">
          <label class="floating-field">
            <input
              v-model.number="calculator.months"
              type="number"
              min="1"
              step="1"
              placeholder=" "
            />
            <span>Prazo em meses</span>
          </label>
          <label class="floating-field select-field">
            <select v-model="calculator.taxProfile">
              <option value="taxed">Tributado</option>
              <option value="tax_free">Isento</option>
            </select>
            <span>Tributação</span>
          </label>
        </div>
      </form>
      <div class="rate-pills">
        <button
          v-for="rate in applicableRates"
          :key="`${rate.kind}-${rate.label}`"
          type="button"
          class="rate-pill"
          :disabled="!rate.value"
          @click="applyRate(rate)"
        >
          <span>{{ rate.label }}</span>
          <strong>{{ rate.value ? rateDisplay(rate) : 'manual' }}</strong>
        </button>
        <p v-if="applicableRates.length === 0 && !ratesLoading" class="empty-line">
          Sem taxa automática disponível no momento.
        </p>
      </div>
      <!-- Indicadores Encapsulados (3 KPIs) -->
      <div class="calc-kpi-grid">
        <article class="calc-kpi-card principal">
          <span class="calc-kpi-icon"><font-awesome-icon icon="layer-group" /></span>
          <div class="calc-kpi-body">
            <div class="calc-kpi-header">
              <small>Total investido</small>
              <span class="calc-kpi-tag blue">{{ calcInvestedPercent }}%</span>
            </div>
            <strong>{{ formatMoney(calculatorResult.totalContributed) }}</strong>
          </div>
        </article>
        <article class="calc-kpi-card yield">
          <span class="calc-kpi-icon"><font-awesome-icon icon="chart-simple" /></span>
          <div class="calc-kpi-body">
            <div class="calc-kpi-header">
              <small>Juros acumulados</small>
              <span class="calc-kpi-tag green">+{{ calcYieldPercent }}%</span>
            </div>
            <strong class="positive">+{{ formatMoney(calculatorResult.estimatedInterestNet) }}</strong>
          </div>
        </article>
        <article class="calc-kpi-card total">
          <span class="calc-kpi-icon"><font-awesome-icon icon="scale-balanced" /></span>
          <div class="calc-kpi-body">
            <div class="calc-kpi-header">
              <small>Valor futuro líquido</small>
              <span class="calc-kpi-tag purple">{{ calculator.months }}m</span>
            </div>
            <strong class="highlight-val">{{ formatMoney(calculatorResult.futureValueNet) }}</strong>
          </div>
        </article>
      </div>

      <!-- Gráfico Comparativo Mês a Mês -->
      <div class="calc-chart-card">
        <div class="calc-chart-head">
          <div class="calc-chart-title">
            <strong>Evolução mês a mês</strong>
            <span>Comparativo dos 3 valores ao longo de {{ calculator.months }} meses</span>
          </div>
          <div class="calc-chart-legend">
            <span class="legend-chip total"><i class="dot-purple"></i> Valor futuro</span>
            <span class="legend-chip invested"><i class="dot-blue"></i> Aportado</span>
            <span class="legend-chip yield"><i class="dot-green"></i> Juros</span>
          </div>
        </div>

        <!-- Barra de hover interativo com os 3 valores (sempre visível para evitar bounce no layout) -->
        <div class="calc-hover-bar" :class="{ 'is-empty': !hoveredCalcPoint }">
          <span class="hover-month">{{ hoveredCalcPoint ? `${hoveredCalcPoint.label}:` : 'Mês: --' }}</span>
          <span class="hover-item total">Total: <strong>{{ hoveredCalcPoint ? formatMoney(hoveredCalcPoint.totalValue) : '--' }}</strong></span>
          <span class="hover-item invested">Aportado: <strong>{{ hoveredCalcPoint ? formatMoney(hoveredCalcPoint.totalInvested) : '--' }}</strong></span>
          <span class="hover-item yield">Juros: <strong>{{ hoveredCalcPoint ? formatMoney(hoveredCalcPoint.interest) : '--' }}</strong></span>
        </div>

        <div
          ref="calcChartContainer"
          class="calc-chart-container"
          @mousemove="onCalcChartMouseMove"
          @mouseleave="onCalcChartMouseLeave"
          @touchmove="onCalcChartMouseMove"
          @touchend="onCalcChartMouseLeave"
        >
          <svg
            v-if="calcChartCoords.length > 1"
            :viewBox="`0 0 ${calcSvgWidth} ${calcSvgHeight}`"
            class="calc-svg"
          >
            <defs>
              <linearGradient id="calcTotalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.22" />
                <stop offset="70%" stop-color="#8b5cf6" stop-opacity="0.04" />
                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0" />
              </linearGradient>
              <linearGradient id="calcInvestGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#355afd" stop-opacity="0.16" />
                <stop offset="100%" stop-color="#355afd" stop-opacity="0.02" />
              </linearGradient>
            </defs>

            <!-- Linhas de grade de referência -->
            <line
              :x1="16"
              :y1="calcSvgHeight * 0.25"
              :x2="calcSvgWidth - 16"
              :y2="calcSvgHeight * 0.25"
              stroke="rgba(255, 255, 255, 0.05)"
              stroke-dasharray="4,6"
              stroke-width="1"
            />
            <line
              :x1="16"
              :y1="calcSvgHeight * 0.5"
              :x2="calcSvgWidth - 16"
              :y2="calcSvgHeight * 0.5"
              stroke="rgba(255, 255, 255, 0.05)"
              stroke-dasharray="4,6"
              stroke-width="1"
            />
            <line
              :x1="16"
              :y1="calcSvgHeight * 0.75"
              :x2="calcSvgWidth - 16"
              :y2="calcSvgHeight * 0.75"
              stroke="rgba(255, 255, 255, 0.05)"
              stroke-dasharray="4,6"
              stroke-width="1"
            />

            <!-- Áreas sob as curvas -->
            <path :d="calcAreaTotal" fill="url(#calcTotalGrad)" />
            <path :d="calcAreaInvested" fill="url(#calcInvestGrad)" />

            <!-- Curvas suaves dos 3 valores -->
            <path
              :d="calcCurveTotal"
              fill="none"
              stroke="#8b5cf6"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              :d="calcCurveInvested"
              fill="none"
              stroke="#355afd"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              :d="calcCurveInterest"
              fill="none"
              stroke="#10b981"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Marcadores de marco (Início, Meio, Fim) -->
            <g v-for="pt in calcKeyMilestones" :key="pt.label">
              <circle :cx="pt.x" :cy="pt.yTotal" r="4.5" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.8" />
              <circle :cx="pt.x" :cy="pt.yInvested" r="3.5" fill="#355afd" stroke="#ffffff" stroke-width="1.5" />
              <circle :cx="pt.x" :cy="pt.yInterest" r="3.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />
            </g>

            <!-- Cursor vertical e pontos em hover -->
            <g v-if="hoveredCalcPoint">
              <line
                :x1="hoveredCalcPoint.x"
                :y1="14"
                :x2="hoveredCalcPoint.x"
                :y2="calcSvgHeight - 16"
                stroke="rgba(255, 255, 255, 0.25)"
                stroke-dasharray="3,3"
                stroke-width="1.2"
              />
              <circle :cx="hoveredCalcPoint.x" :cy="hoveredCalcPoint.yTotal" r="6" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />
              <circle :cx="hoveredCalcPoint.x" :cy="hoveredCalcPoint.yInvested" r="5" fill="#355afd" stroke="#ffffff" stroke-width="1.8" />
              <circle :cx="hoveredCalcPoint.x" :cy="hoveredCalcPoint.yInterest" r="5" fill="#10b981" stroke="#ffffff" stroke-width="1.8" />
            </g>
          </svg>
        </div>

        <!-- Eixo X com marcos de meses -->
        <div class="calc-axis-row">
          <span>Início (M+0)</span>
          <span>Mês {{ Math.round(calculator.months / 2) }}</span>
          <span>Fim (M+{{ calculator.months }})</span>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
import KademTabs from '@/components/ui/KademTabs.vue';
import { usePlayerStore } from '@/stores/player';

const INVESTMENT_TAB_STORAGE_KEY = 'kadem_nexo.investments'
const INVESTMENT_TAB_IDS = ['summary', 'goals', 'calculator']

export default {
  name: 'NexoInvestmentsTab',
  components: {
    KademTabs,
  },
  emits: ['save-goal', 'delete-goal', 'save-event', 'delete-event', 'refresh-rates'],
  props: {
    summary: {
      type: Object,
      required: true,
    },
    monthlyHistory: {
      type: Array,
      required: true,
    },
    categoryDistribution: {
      type: Array,
      required: true,
    },
    goals: {
      type: Array,
      required: true,
    },
    events: {
      type: Array,
      required: true,
    },
    categories: {
      type: Array,
      required: true,
    },
    rates: {
      type: Array,
      default: () => [],
    },
    ratesLoading: {
      type: Boolean,
      default: false,
    },
    selectedMonth: {
      type: String,
      required: true,
    },
    formatMoney: {
      type: Function,
      required: true,
    },
    formatSignedMoney: {
      type: Function,
      required: true,
    },
    formatShortDate: {
      type: Function,
      required: true,
    },
  },
  data() {
    const savedTab = usePlayerStore().active_app_tabs?.[INVESTMENT_TAB_STORAGE_KEY]
    return {
      activeInvestmentTab: INVESTMENT_TAB_IDS.includes(savedTab) ? savedTab : 'summary',
      goalForm: this.createGoalForm(),
      calculator: {
        principal: 0,
        monthlyContribution: 0,
        ratePercent: 12,
        rateMode: 'annual',
        months: 24,
        taxProfile: 'taxed',
      },
      projectionMonths: 24,
      svgWidth: 800,
      svgHeight: 160,
      calcSvgWidth: 800,
      calcSvgHeight: 190,
      hoveredCalcIndex: null,
    }
  },
  watch: {
    activeInvestmentTab(tab) {
      if (tab === 'summary' || tab === 'calculator') {
        this.$nextTick(() => {
          this.updateChartDimensions()
        })
      }
    },
  },
  computed: {
    investmentTabs() {
      return [
        { id: 'summary', label: 'Resumo', icon: 'chart-simple' },
        { id: 'goals', label: 'Metas', icon: 'clipboard' },
        { id: 'calculator', label: 'Calculadora', icon: 'money-bill' },
      ]
    },
    historyRows() {
      return [...this.monthlyHistory].sort((left, right) => right.month.localeCompare(left.month))
    },
    categoryTotal() {
      return this.categoryDistribution.reduce(
        (sum, item) => sum + Number(item.estimated_balance || 0),
        0,
      )
    },
    donutSegments() {
      if (!this.categoryTotal) return []
      const circumference = 2 * Math.PI * 40
      let offset = 0
      return this.categoryDistribution.map((item, index) => {
        const value = Number(item.estimated_balance || 0)
        const percentage = value / this.categoryTotal
        const segment = {
          ...item,
          key: item.category_id || `segment-${index}`,
          dashArray: `${percentage * circumference} ${circumference}`,
          dashOffset: -offset,
        }
        offset += percentage * circumference
        return segment
      })
    },
    barHistory() {
      const maxValue = this.monthlyHistory.reduce(
        (max, item) => Math.max(max, Number(item.invested || 0), Number(item.yield || 0)),
        0,
      )
      if (!maxValue) return this.monthlyHistory
      return this.monthlyHistory.map((item) => ({
        ...item,
        investedPercent: Math.max(6, (Number(item.invested || 0) / maxValue) * 100),
        yieldPercent:
          Number(item.yield || 0) > 0
            ? Math.max(4, (Number(item.yield || 0) / maxValue) * 100)
            : 0,
      }))
    },
    investingStreak() {
      let streak = 0
      const sorted = [...this.monthlyHistory].sort((left, right) => right.month.localeCompare(left.month))
      for (const item of sorted) {
        if (Number(item.invested || 0) > 0) streak += 1
        else break
      }
      return streak
    },
    streakLabel() {
      if (this.investingStreak <= 0) return 'Comece neste mês'
      return this.investingStreak === 1 ? '1 mês ativo' : `${this.investingStreak} meses ativos`
    },
    nearestGoal() {
      if (this.goals.length === 0) return null
      return [...this.goals].sort((left, right) => {
        const leftGap = left.target_amount - this.goalCurrentAmount(left)
        const rightGap = right.target_amount - this.goalCurrentAmount(right)
        return leftGap - rightGap
      })[0]
    },
    nearestGoalLabel() {
      return this.nearestGoal ? this.nearestGoal.name : 'Sem meta ativa'
    },
    heroProgressPercent() {
      return this.nearestGoal ? this.goalProgress(this.nearestGoal) : 0
    },
    heroProgressTitle() {
      return this.nearestGoal ? this.nearestGoal.name : 'Sem meta definida'
    },
    heroProgressText() {
      if (!this.nearestGoal) return 'Crie uma meta para acompanhar progresso e previsão.'
      return `${this.formatMoney(this.goalCurrentAmount(this.nearestGoal))} de ${this.formatMoney(this.nearestGoal.target_amount)}`
    },
    // Valor investido que ainda não está em nenhuma meta: saldo estimado menos o saldo inicial e os
    // aportes vinculados de cada meta. Na edição, o saldo inicial da própria meta volta para o livre.
    // O backend aplica a mesma regra (ensure_goal_initial_amount_available).
    goalInitialAmountLimit() {
      const editingKey = this.goalForm.id ? String(this.goalForm.id) : null
      const committed = this.goals.reduce((sum, goal) => {
        const isEditing = editingKey && String(goal.id || goal.local_id) === editingKey
        return sum + Number(goal.linked_amount ?? 0) + (isEditing ? 0 : Number(goal.current_amount ?? 0))
      }, 0)
      return Math.max(0, Number((Number(this.summary.estimated_balance || 0) - committed).toFixed(2)))
    },
    // Manter ou reduzir o saldo que a meta já tem nunca é bloqueado (resgates podem ter deixado as
    // metas acima da carteira).
    goalInitialAmountMax() {
      if (!this.goalForm.id) return this.goalInitialAmountLimit
      const goal = this.goals.find((item) => String(item.id || item.local_id) === String(this.goalForm.id))
      return Math.max(this.goalInitialAmountLimit, Number(goal?.current_amount ?? 0))
    },
    goalInitialAmountExceeded() {
      const value = this.goalForm.current_amount
      if (value === '' || value === null || value === undefined) return false
      return Math.round(Number(value) * 100) > Math.round(this.goalInitialAmountMax * 100)
    },
    goalInitialAmountHint() {
      if (this.goalInitialAmountExceeded) {
        return `Máximo de ${this.formatMoney(this.goalInitialAmountMax)}: o restante do valor investido já está em outras metas.`
      }
      if (this.goalInitialAmountMax <= 0) return 'Todo o valor investido já está em metas.'
      return `Valor já investido que passa a contar para a meta. Disponível: ${this.formatMoney(this.goalInitialAmountMax)}.`
    },
    applicableRates() {
      return this.rates.filter((rate) => ['CDI', 'SELIC', 'SELIC_TARGET', 'IPCA'].includes(rate.kind))
    },
    calculatorRateMonthly() {
      const percent = Number(this.calculator.ratePercent || 0) / 100
      if (this.calculator.rateMode === 'monthly') return percent
      return percent > 0 ? Math.pow(1 + percent, 1 / 12) - 1 : 0
    },
    calculatorResult() {
      const principal = Number(this.calculator.principal || 0)
      const contribution = Number(this.calculator.monthlyContribution || 0)
      const months = Math.max(1, Number(this.calculator.months || 0))
      const monthlyRate = this.calculatorRateMonthly
      const totalContributed = principal + contribution * months
      let futureValue = totalContributed
      if (monthlyRate !== 0) {
        futureValue =
          principal * Math.pow(1 + monthlyRate, months) +
          contribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      }
      const estimatedInterest = Math.max(0, futureValue - totalContributed)
      const taxFactor = this.calculator.taxProfile === 'tax_free' ? 1 : 0.85
      return {
        totalContributed,
        estimatedInterest,
        estimatedInterestNet: estimatedInterest * taxFactor,
        futureValue,
        futureValueNet: totalContributed + estimatedInterest * taxFactor,
      }
    },
    calcInvestedPercent() {
      const total = this.calculatorResult.futureValueNet || 1
      return Math.round((this.calculatorResult.totalContributed / total) * 100)
    },
    calcYieldPercent() {
      const invested = this.calculatorResult.totalContributed || 1
      return Math.round((this.calculatorResult.estimatedInterestNet / invested) * 100)
    },
    calculatorMonthlySeries() {
      const principal = Number(this.calculator.principal || 0)
      const contribution = Number(this.calculator.monthlyContribution || 0)
      const months = Math.max(1, Math.min(360, Number(this.calculator.months || 1)))
      const monthlyRate = this.calculatorRateMonthly
      const taxFactor = this.calculator.taxProfile === 'tax_free' ? 1 : 0.85

      const series = []
      const step = months <= 36 ? 1 : Math.ceil(months / 36)

      for (let m = 0; m <= months; m += step) {
        const totalInvested = principal + contribution * m
        let grossFuture = totalInvested
        if (monthlyRate !== 0) {
          grossFuture =
            principal * Math.pow(1 + monthlyRate, m) +
            contribution * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate)
        }
        const grossInterest = Math.max(0, grossFuture - totalInvested)
        const netInterest = grossInterest * taxFactor
        const totalValue = totalInvested + netInterest

        series.push({
          month: m,
          label: m === 0 ? 'Início' : `Mês ${m}`,
          totalInvested,
          interest: netInterest,
          totalValue,
        })
      }

      if (series[series.length - 1].month !== months) {
        const m = months
        const totalInvested = principal + contribution * m
        let grossFuture = totalInvested
        if (monthlyRate !== 0) {
          grossFuture =
            principal * Math.pow(1 + monthlyRate, m) +
            contribution * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate)
        }
        const grossInterest = Math.max(0, grossFuture - totalInvested)
        const netInterest = grossInterest * taxFactor
        const totalValue = totalInvested + netInterest

        series.push({
          month: m,
          label: `Mês ${m}`,
          totalInvested,
          interest: netInterest,
          totalValue,
        })
      }

      return series
    },
    calcChartCoords() {
      const series = this.calculatorMonthlySeries
      if (series.length < 2) return []
      const maxVal = Math.max(...series.map((s) => s.totalValue), 1)

      const paddingX = 28
      const paddingTop = 24
      const paddingBottom = 22
      const usableWidth = Math.max(50, this.calcSvgWidth - paddingX * 2)
      const usableHeight = Math.max(40, this.calcSvgHeight - paddingTop - paddingBottom)

      return series.map((item, index) => {
        const x = paddingX + (index / (series.length - 1)) * usableWidth
        const yTotal = paddingTop + (1 - item.totalValue / maxVal) * usableHeight
        const yInvested = paddingTop + (1 - item.totalInvested / maxVal) * usableHeight
        const yInterest = paddingTop + (1 - item.interest / maxVal) * usableHeight
        return {
          ...item,
          x,
          yTotal,
          yInvested,
          yInterest,
        }
      })
    },
    calcKeyMilestones() {
      if (this.calcChartCoords.length < 2) return []
      const mid = Math.floor(this.calcChartCoords.length / 2)
      return [
        this.calcChartCoords[0],
        this.calcChartCoords[mid],
        this.calcChartCoords[this.calcChartCoords.length - 1],
      ].filter(Boolean)
    },
    hoveredCalcPoint() {
      if (this.hoveredCalcIndex === null || !this.calcChartCoords[this.hoveredCalcIndex]) return null
      return this.calcChartCoords[this.hoveredCalcIndex]
    },
    calcCurveTotal() {
      return this.buildSvgCurvePath(this.calcChartCoords, 'yTotal')
    },
    calcCurveInvested() {
      return this.buildSvgCurvePath(this.calcChartCoords, 'yInvested')
    },
    calcCurveInterest() {
      return this.buildSvgCurvePath(this.calcChartCoords, 'yInterest')
    },
    calcAreaTotal() {
      const pts = this.calcChartCoords
      if (pts.length < 2) return ''
      const bottom = this.calcSvgHeight - 6
      return `${this.calcCurveTotal} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`
    },
    calcAreaInvested() {
      const pts = this.calcChartCoords
      if (pts.length < 2) return ''
      const bottom = this.calcSvgHeight - 6
      return `${this.calcCurveInvested} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`
    },
    projectionPoints() {
      const basePrincipal = Math.max(
        Number(this.summary.estimated_balance || 0),
        Number(this.calculator.principal || 0),
      )
      const contribution = Number(this.calculator.monthlyContribution || this.summary.month_invested || 0)
      const monthlyRate = this.calculatorRateMonthly
      const points = []
      for (let monthIndex = 0; monthIndex <= this.projectionMonths; monthIndex += 3) {
        let value = basePrincipal + contribution * monthIndex
        if (monthlyRate !== 0) {
          value =
            basePrincipal * Math.pow(1 + monthlyRate, monthIndex) +
            contribution * ((Math.pow(1 + monthlyRate, monthIndex) - 1) / monthlyRate)
        }
        points.push({
          label: `M+${monthIndex}`,
          monthIndex,
          value,
        })
      }
      return points
    },
    projectionCoords() {
      if (this.projectionPoints.length < 2) return []
      const values = this.projectionPoints.map((p) => p.value)
      const valMin = Math.min(...values)
      const valMax = Math.max(...values)
      const delta = valMax - valMin

      // Provide generous breathing room above and below so the line has a smooth,
      // natural upward trajectory without clipping or looking flat
      const baseline = Math.max(0, valMin - (delta > 0 ? delta * 0.45 : valMin * 0.25))
      const ceiling = valMax + (delta > 0 ? delta * 0.25 : valMax * 0.25)
      const range = ceiling - baseline || 1

      const paddingX = 28
      const paddingTop = 26
      const paddingBottom = 22
      const usableWidth = Math.max(50, this.svgWidth - paddingX * 2)
      const usableHeight = Math.max(40, this.svgHeight - paddingTop - paddingBottom)

      return this.projectionPoints.map((point, index) => {
        const x = paddingX + (index / (this.projectionPoints.length - 1)) * usableWidth
        const ratio = Math.min(1, Math.max(0, (point.value - baseline) / range))
        const y = paddingTop + (1 - ratio) * usableHeight
        return { ...point, x, y }
      })
    },
    keyProjectionPoints() {
      if (this.projectionCoords.length < 2) return []
      const mid = Math.floor(this.projectionCoords.length / 2)
      return [
        this.projectionCoords[0],
        this.projectionCoords[mid],
        this.projectionCoords[this.projectionCoords.length - 1],
      ].filter(Boolean)
    },
    projectionCurvePath() {
      return this.buildSvgCurvePath(this.projectionCoords, 'y')
    },
    projectionAreaPath() {
      const pts = this.projectionCoords
      if (pts.length < 2) return ''
      const bottom = this.svgHeight - 6
      return `${this.projectionCurvePath} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`
    },
    projectionPreview() {
      if (this.projectionPoints.length === 0) return []
      const baseValue = this.projectionPoints[0]?.value || 0
      const mid = Math.floor(this.projectionPoints.length / 2)
      const list = [
        this.projectionPoints[0],
        this.projectionPoints[mid],
        this.projectionPoints[this.projectionPoints.length - 1],
      ].filter(Boolean)

      return list.map((pt) => {
        let displayLabel = pt.label
        if (pt.monthIndex === 0) displayLabel = 'Hoje (M+0)'
        else if (pt.monthIndex === 12) displayLabel = '1 ano (M+12)'
        else if (pt.monthIndex === 24) displayLabel = '2 anos (M+24)'
        else displayLabel = `${pt.monthIndex}m (${pt.label})`

        const growthPercent =
          baseValue > 0 && pt.value > baseValue
            ? Math.round(((pt.value - baseValue) / baseValue) * 100)
            : 0

        return {
          ...pt,
          displayLabel,
          growthPercent,
        }
      })
    },
  },
  watch: {
    activeInvestmentTab(tabId) {
      usePlayerStore().setActiveAppTab(INVESTMENT_TAB_STORAGE_KEY, tabId)
    },
  },
  methods: {
    createGoalForm() {
      return {
        id: null,
        name: '',
        horizon: 'SHORT',
        target_amount: '',
        target_date: '',
        current_amount: '',
        color: '#355AFD',
      }
    },
    resetGoalForm() {
      this.goalForm = this.createGoalForm()
    },
    editGoal(goal) {
      this.goalForm = {
        id: goal.id || goal.local_id,
        name: goal.name,
        horizon: goal.horizon,
        target_amount: goal.target_amount,
        target_date: goal.target_date ? String(goal.target_date).slice(0, 10) : '',
        current_amount: goal.current_amount ?? '',
        color: goal.color || '#355AFD',
      }
    },
    submitGoal() {
      if (this.goalInitialAmountExceeded) return
      const currentAmount = this.goalForm.current_amount
      const payload = {
        id: this.goalForm.id,
        name: this.goalForm.name,
        horizon: this.goalForm.horizon,
        target_amount: Number(this.goalForm.target_amount || 0),
        target_date: this.goalForm.target_date || null,
        current_amount: currentAmount === '' || currentAmount === null ? null : Number(currentAmount),
        color: this.goalForm.color,
      }
      this.$emit('save-goal', payload)
      this.resetGoalForm()
    },
    // Saldo inicial manual (current_amount) + aportes vinculados - resgates vinculados (linked_amount).
    // Antes toda meta mostrava o saldo total dos investimentos, independente do aporte.
    goalCurrentAmount(goal) {
      return Number(goal.current_amount ?? 0) + Number(goal.linked_amount ?? 0)
    },
    goalProgress(goal) {
      const target = Number(goal.target_amount || 0)
      if (!target) return 0
      return Math.max(0, Math.min(100, (this.goalCurrentAmount(goal) / target) * 100))
    },
    horizonLabel(horizon) {
      if (horizon === 'SHORT') return 'Curto prazo'
      if (horizon === 'MEDIUM') return 'Médio prazo'
      return 'Longo prazo'
    },
    rateDisplay(rate) {
      return `${Number(rate.value || 0).toFixed(2)}%`
    },
    applyRate(rate) {
      if (!rate.value) return
      let annualPercent = Number(rate.value || 0)
      if (rate.unit === 'percent_daily') {
        annualPercent = (Math.pow(1 + annualPercent / 100, 252) - 1) * 100
      } else if (rate.unit === 'percent_monthly') {
        annualPercent = (Math.pow(1 + annualPercent / 100, 12) - 1) * 100
      }
      this.calculator.ratePercent = Number(annualPercent.toFixed(4))
      this.calculator.rateMode = 'annual'
    },
    formatMonthDisplay(month) {
      if (!month) return ''
      const parts = String(month).split('-')
      if (parts.length === 2) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const mIdx = Number.parseInt(parts[1], 10) - 1
        if (mIdx >= 0 && mIdx < 12) {
          return `${months[mIdx]}/${parts[0]}`
        }
      }
      return month
    },
    buildSvgCurvePath(pts, yKey = 'y') {
      if (!pts || pts.length < 2) return ''
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0][yKey].toFixed(1)}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = i < pts.length - 2 ? pts[i + 2] : p2

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1[yKey] + (p2[yKey] - p0[yKey]) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2[yKey] - (p3[yKey] - p1[yKey]) / 6

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2[yKey].toFixed(1)}`
      }
      return d
    },
    onCalcChartMouseMove(event) {
      if (!this.$refs.calcChartContainer || this.calcChartCoords.length === 0) return
      const rect = this.$refs.calcChartContainer.getBoundingClientRect()
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : null)
      if (clientX === null) return
      const relX = clientX - rect.left - 28
      const usableW = Math.max(50, this.calcSvgWidth - 56)
      const pct = Math.max(0, Math.min(1, relX / usableW))
      const index = Math.round(pct * (this.calcChartCoords.length - 1))
      this.hoveredCalcIndex = Math.max(0, Math.min(this.calcChartCoords.length - 1, index))
    },
    onCalcChartMouseLeave() {
      this.hoveredCalcIndex = null
    },
    updateChartDimensions() {
      if (this.$refs.chartContainer) {
        const rect = this.$refs.chartContainer.getBoundingClientRect()
        if (rect.width > 0) this.svgWidth = Math.round(rect.width)
        if (rect.height > 0) this.svgHeight = Math.round(rect.height)
      }
      if (this.$refs.calcChartContainer) {
        const rect = this.$refs.calcChartContainer.getBoundingClientRect()
        if (rect.width > 0) this.calcSvgWidth = Math.round(rect.width)
        if (rect.height > 0) this.calcSvgHeight = Math.round(rect.height)
      }
    },
  },
  mounted() {
    this.updateChartDimensions()
    if (typeof ResizeObserver !== 'undefined') {
      this.chartResizeObserver = new ResizeObserver(() => {
        this.updateChartDimensions()
      })
      if (this.$refs.chartContainer) {
        this.chartResizeObserver.observe(this.$refs.chartContainer)
      }
      if (this.$refs.calcChartContainer) {
        this.chartResizeObserver.observe(this.$refs.calcChartContainer)
      }
    }
  },
  beforeUnmount() {
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect()
      this.chartResizeObserver = null
    }
  },
}
</script>

<style scoped>
.investments-tab {
  container-type: inline-size;
  container-name: investments-tab;
  display: grid;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.tab-content {
  display: grid;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.summary-grid,
.visual-grid {
  display: grid;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.visual-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.investment-subtabs {
  margin-bottom: var(--space-2);
}

.panel,
.metric-card,
.projection-card,
.goal-card,
.history-card-mobile {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-fast);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.panel {
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
}

/* Metric Cards (Top Summary) */
.metric-card {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  overflow: hidden;
}

.metric-card:hover {
  background: var(--surface-1);
}

.metric-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.metric-card.invested .metric-icon {
  color: #2e9b62;
  background: rgba(46, 155, 98, 0.13);
}

.metric-card.principal .metric-icon {
  color: #355afd;
  background: rgba(53, 90, 253, 0.13);
}

.metric-card.yield .metric-icon {
  color: #0d8f6f;
  background: rgba(13, 143, 111, 0.13);
}

.metric-card.balance .metric-icon {
  color: #008fa3;
  background: rgba(0, 143, 163, 0.13);
}

.metric-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.metric-card small,
.momentum-stat small,
.projection-card small,
.card-mobile-metric small,
.card-mobile-balance small,
.goal-card span,
.empty-line,
.panel-subtitle {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card small {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-card strong,
.momentum-stat strong,
.projection-card strong,
.card-mobile-balance strong {
  font-size: var(--fontsize-sm);
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.positive {
  color: #0d8f6f;
}

.negative {
  color: var(--red);
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  min-height: 32px;
}

.panel-title-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.panel-title h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.panel-subtitle {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  display: inline-block;
  color: var(--text-secondary);
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px var(--space-3);
  border-radius: var(--radius-pill, 999px);
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info, #355afd);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.panel-badge.active {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.action-pill-btn {
  height: 32px;
  min-height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill, 999px);
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info, #355afd);
  font-weight: 600;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid rgba(53, 90, 253, 0.2);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.action-pill-btn:hover {
  background: rgba(53, 90, 253, 0.18);
  border-color: rgba(53, 90, 253, 0.35);
}

.goal-title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex: 1;
}

.goal-title-wrap strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
}

.goal-horizon-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-2);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.momentum-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  width: 100%;
  min-width: 0;
}

.momentum-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  min-width: 0;
  text-align: center;
}

.momentum-stat small {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.momentum-stat strong {
  font-size: var(--fontsize-xs);
}

.progress-hero,
.progress-copy,
.legend-list,
.bar-chart,
.goal-list,
.stack-form {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.progress-copy {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.progress-copy strong {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.progress-copy span {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.progress-track {
  width: 100%;
  height: 10px;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-2);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.progress-track.compact {
  height: 8px;
}

.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0d8f6f, #34d399);
  transition: width 0.45s ease;
}

/* Donut Chart */
.donut-layout {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: var(--space-4);
  align-items: center;
  width: 100%;
  min-width: 0;
}

.donut-shell {
  width: 170px;
  height: 170px;
  display: grid;
  place-items: center;
  position: relative;
  flex-shrink: 0;
}

.donut-svg {
  width: 170px;
  height: 170px;
  transform: rotate(-90deg);
}

.donut-hole {
  position: absolute;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
  display: grid;
  place-items: center;
  text-align: center;
  padding: var(--space-2);
  box-sizing: border-box;
}

.donut-hole strong {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut-hole small {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 700;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  font-size: var(--fontsize-xs);
}

.legend-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.legend-row strong {
  margin-left: auto;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 10px;
}

/* Bar Chart (Aporte x Juros) */
.bar-legend {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.72rem;
  font-weight: 600;
}

.swatch-invest {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, #1f274c, #355afd);
  display: inline-block;
}

.swatch-yield {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, #0d8f6f, #34d399);
  display: inline-block;
}

.bar-row {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.bar-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
  font-size: var(--fontsize-xs);
}

.bar-meta strong {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.bar-values {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-variant-numeric: tabular-nums;
  font-size: var(--fontsize-xs);
  font-weight: 600;
}

.val-invest {
  color: #355afd;
}

.val-yield {
  color: #0d8f6f;
}

.val-sep {
  color: var(--text-muted);
}

.bar-track {
  width: 100%;
  height: 12px;
  background: var(--surface-2);
  border-radius: var(--radius-pill, 999px);
  overflow: hidden;
  padding: 2px;
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.bar-stack {
  display: flex;
  height: 100%;
  gap: 2px;
  width: 100%;
}

.invest-bar {
  height: 100%;
  border-radius: var(--radius-pill, 999px);
  background: linear-gradient(90deg, #1f274c, #355afd);
  transition: width 0.4s ease;
}

.yield-bar {
  height: 100%;
  border-radius: var(--radius-pill, 999px);
  background: linear-gradient(90deg, #0d8f6f, #34d399);
  transition: width 0.4s ease;
}

/* Projection Chart */
.projection-wrap {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
}

.projection-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 3px var(--space-3);
  border-radius: var(--radius-pill, 999px);
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: 0.72rem;
  font-weight: 700;
}

.chart-container {
  width: 100%;
  height: 160px;
  position: relative;
  border-radius: var(--radius-sm);
  background:
    linear-gradient(180deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.01)),
    var(--surface-1);
  border: 1px solid var(--glass-border);
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}

.projection-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.projection-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.projection-card {
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  box-sizing: border-box;
  text-align: center;
}

.projection-card small {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.projection-card strong {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.projection-growth {
  font-size: 0.65rem;
  font-weight: 700;
  color: #10b981;
}

/* Calculator Indicators (KPI Grid) */
.calc-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
}

.calc-kpi-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  min-width: 0;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.calc-kpi-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.calc-kpi-card.principal {
  border-left: 3px solid #355afd;
}

.calc-kpi-card.yield {
  border-left: 3px solid #10b981;
}

.calc-kpi-card.total {
  border-left: 3px solid #8b5cf6;
}

.calc-kpi-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 1rem;
}

.calc-kpi-card.principal .calc-kpi-icon {
  background: rgba(53, 90, 253, 0.12);
  color: #355afd;
}

.calc-kpi-card.yield .calc-kpi-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.calc-kpi-card.total .calc-kpi-icon {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.calc-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.calc-kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.calc-kpi-header small {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calc-kpi-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-pill, 999px);
  white-space: nowrap;
  flex-shrink: 0;
}

.calc-kpi-tag.blue {
  background: rgba(53, 90, 253, 0.12);
  color: #355afd;
}

.calc-kpi-tag.green {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.calc-kpi-tag.purple {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.calc-kpi-body strong {
  font-size: var(--fontsize-sm);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlight-val {
  color: #a78bfa;
}

/* Calculator Month-by-Month Chart Card */
.calc-chart-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.calc-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.calc-chart-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calc-chart-title strong {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.calc-chart-title span {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.calc-chart-legend {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  white-space: nowrap;
}

.dot-purple {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  display: inline-block;
}

.dot-blue {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #355afd;
  display: inline-block;
}

.dot-green {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  display: inline-block;
}

.calc-hover-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 6px var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  font-size: var(--fontsize-xs);
  flex-wrap: wrap;
  min-height: 36px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.calc-hover-bar.is-empty {
  border-color: rgba(255, 255, 255, 0.04);
}

.hover-month {
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.hover-item {
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.hover-item.total strong {
  color: #a78bfa;
}

.hover-item.invested strong {
  color: #355afd;
}

.hover-item.yield strong {
  color: #10b981;
}

.calc-hover-bar.is-empty .hover-month,
.calc-hover-bar.is-empty .hover-item strong {
  color: var(--text-muted);
}

.calc-chart-container {
  width: 100%;
  height: 190px;
  position: relative;
  border-radius: var(--radius-sm);
  background:
    linear-gradient(180deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.01)),
    var(--surface-1);
  border: 1px solid var(--glass-border);
  overflow: hidden;
  box-sizing: border-box;
  cursor: crosshair;
}

.calc-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.calc-axis-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-3);
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* History */
.history-table-desktop {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  box-sizing: border-box;
}

.history-head,
.history-row {
  display: grid;
  grid-template-columns: 110px repeat(4, 1fr);
  gap: var(--space-3);
  align-items: center;
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  font-size: var(--fontsize-xs);
}

.history-head {
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: var(--space-2);
}

.history-head span:not(:first-child),
.history-row strong {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.history-row {
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base), border-color var(--transition-fast);
}

.history-row:hover {
  border-color: rgba(53, 90, 253, 0.25);
}

.history-month-tag {
  font-weight: 600;
  color: var(--text-primary);
}

.history-balance-val {
  font-weight: 700;
  color: var(--text-primary);
}

/* History Mobile Cards (<= 640px) */
.history-cards-mobile {
  display: none;
}

.history-card-mobile {
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.card-mobile-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-mobile-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.card-mobile-balance small {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.card-mobile-balance strong {
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
}

.card-mobile-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  background: var(--surface-1);
  padding: var(--space-2);
  border-radius: var(--radius-xs, 4px);
  border: 1px solid var(--glass-border);
}

.card-mobile-metric {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: center;
}

.card-mobile-metric small {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.card-mobile-metric span {
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

/* Forms & Inputs */
.inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
}

.floating-field {
  position: relative;
  display: block;
  min-width: 0;
}

.floating-field input,
.floating-field select {
  width: 100%;
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 14px var(--space-3) 2px;
  outline: none;
  font-size: var(--fontsize-xs);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-base);
}

.floating-field input[type='color'] {
  padding: 14px var(--space-3) 4px;
}

.floating-field input:focus,
.floating-field select:focus {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14);
}

.floating-field span {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  pointer-events: none;
  transition:
    top var(--transition-fast),
    transform var(--transition-fast),
    font-size var(--transition-fast),
    color var(--transition-fast);
}

.floating-field input:focus + span,
.floating-field input:not(:placeholder-shown) + span,
.floating-field.select-field span,
.floating-field.date-field span,
.floating-field.color-field span {
  top: 5px;
  transform: none;
  font-size: 0.62rem;
  color: var(--text-muted);
}

.initial-amount-field {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.field-hint {
  color: var(--text-muted);
  font-size: 0.68rem;
  line-height: 1.35;
}

.field-hint.negative {
  color: var(--red);
}

.primary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Goals */
.goal-card {
  padding: var(--space-3);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.goal-head,
.goal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.goal-head > div:first-child {
  min-width: 0;
}

.goal-head strong,
.goal-head span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.goal-values {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  margin: var(--space-3) 0;
  min-width: 0;
}

.goal-values span,
.goal-values strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.rate-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
}

.rate-pill,
.text-btn,
.icon-btn,
.primary-action {
  border: none;
  cursor: pointer;
}

.rate-pill {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  font-size: var(--fontsize-xs);
  transition: background var(--transition-fast);
}

.rate-pill:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--deep-blue);
}

.rate-pill span,
.rate-pill strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-action {
  height: 42px;
  min-height: 42px;
  border-radius: var(--radius-sm);
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
  font-weight: 700;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.text-btn {
  height: 42px;
  min-height: 42px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-info, #355afd);
  padding: 0 var(--space-2);
  font-weight: 600;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
}

.icon-btn {
  width: 38px;
  height: 38px;
  min-height: 38px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.danger {
  color: var(--red);
}

/* Responsive Container & Media Queries */
@container (max-width: 960px) {
  .visual-grid {
    grid-template-columns: 1fr;
  }
}

@container (max-width: 640px) {
  .panel {
    padding: var(--space-3);
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .metric-card {
    min-height: 56px;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-2);
  }

  .metric-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.85rem;
  }

  .metric-card small {
    font-size: 0.65rem;
  }

  .metric-card strong {
    font-size: var(--fontsize-xs);
  }

  /* Donut and legend stay side by side */
  .donut-layout {
    grid-template-columns: 130px 1fr;
    gap: var(--space-3);
    align-items: center;
  }

  .donut-shell,
  .donut-svg {
    width: 130px;
    height: 130px;
  }

  .donut-hole {
    width: 82px;
    height: 82px;
  }

  .donut-hole strong {
    font-size: 0.78rem;
  }

  .donut-hole small {
    font-size: 0.6rem;
  }

  .calc-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .calc-kpi-card {
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .calc-kpi-icon {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 0.8rem;
  }

  .calc-kpi-body strong {
    font-size: var(--fontsize-xs);
  }

  .calc-chart-container {
    height: 160px;
  }

  .calc-hover-bar {
    gap: var(--space-2);
    padding: 4px var(--space-2);
    font-size: 0.72rem;
    min-height: 32px;
  }

  .history-table-desktop {
    display: none;
  }

  .history-cards-mobile {
    display: grid;
    gap: var(--space-2);
    width: 100%;
  }
}

@container (max-width: 480px) {
  .primary-action {
    width: 100%;
    justify-content: center;
  }

  .calc-chart-container {
    height: 140px;
  }

  .calc-hover-bar {
    gap: 6px;
    padding: 3px var(--space-2);
    font-size: 0.68rem;
    min-height: 28px;
  }

  .calc-kpi-header small {
    font-size: 0.58rem;
  }

  .calc-kpi-tag {
    font-size: 0.58rem;
    padding: 1px 4px;
  }

  .legend-chip {
    font-size: 0.65rem;
    padding: 2px 6px;
  }

  .donut-layout {
    grid-template-columns: 104px 1fr;
    gap: var(--space-2);
  }

  .donut-shell,
  .donut-svg {
    width: 104px;
    height: 104px;
  }

  .donut-hole {
    width: 66px;
    height: 66px;
  }

  .donut-hole strong {
    font-size: 0.7rem;
  }

  .donut-hole small {
    font-size: 0.55rem;
  }

  .legend-row {
    padding: 3px var(--space-2);
    gap: var(--space-2);
  }

  .chart-container {
    height: 130px;
  }

  .momentum-stat {
    padding: var(--space-1) var(--space-2);
  }

  .momentum-stat small {
    font-size: 0.58rem;
  }

  .momentum-stat strong {
    font-size: 0.72rem;
  }

  .panel-title h3 {
    font-size: 0.95rem;
  }

  .panel-badge {
    padding: 3px var(--space-2);
    font-size: 0.68rem;
  }

  .action-pill-btn {
    height: 28px;
    min-height: 28px;
    padding: 0 var(--space-2);
    font-size: 0.7rem;
  }
}

@container (max-width: 360px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .metric-card {
    padding: var(--space-1) var(--space-2);
    gap: var(--space-1);
  }

  .metric-icon {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 0.75rem;
  }

  .metric-card small {
    font-size: 0.6rem;
  }

  .metric-card strong {
    font-size: 0.7rem;
  }
}

@media (max-width: 960px) {
  .visual-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: var(--space-3);
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .metric-card {
    min-height: 56px;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-2);
  }

  .metric-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.85rem;
  }

  .metric-card small {
    font-size: 0.65rem;
  }

  .metric-card strong {
    font-size: var(--fontsize-xs);
  }

  /* Donut and legend stay side by side */
  .donut-layout {
    grid-template-columns: 130px 1fr;
    gap: var(--space-3);
    align-items: center;
  }

  .donut-shell,
  .donut-svg {
    width: 130px;
    height: 130px;
  }

  .donut-hole {
    width: 82px;
    height: 82px;
  }

  .donut-hole strong {
    font-size: 0.78rem;
  }

  .donut-hole small {
    font-size: 0.6rem;
  }

  .calc-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .calc-kpi-card {
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .calc-kpi-icon {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 0.8rem;
  }

  .calc-kpi-body strong {
    font-size: var(--fontsize-xs);
  }

  .calc-chart-container {
    height: 160px;
  }

  .history-table-desktop {
    display: none;
  }

  .history-cards-mobile {
    display: grid;
    gap: var(--space-2);
    width: 100%;
  }
}

@media (max-width: 480px) {
  .primary-action {
    width: 100%;
    justify-content: center;
  }

  .calc-chart-container {
    height: 140px;
  }

  .calc-kpi-header small {
    font-size: 0.58rem;
  }

  .calc-kpi-tag {
    font-size: 0.58rem;
    padding: 1px 4px;
  }

  .legend-chip {
    font-size: 0.65rem;
    padding: 2px 6px;
  }

  .donut-layout {
    grid-template-columns: 104px 1fr;
    gap: var(--space-2);
  }

  .donut-shell,
  .donut-svg {
    width: 104px;
    height: 104px;
  }

  .donut-hole {
    width: 66px;
    height: 66px;
  }

  .donut-hole strong {
    font-size: 0.7rem;
  }

  .donut-hole small {
    font-size: 0.55rem;
  }

  .legend-row {
    padding: 3px var(--space-2);
    gap: var(--space-2);
  }

  .chart-container {
    height: 130px;
  }

  .momentum-stat {
    padding: var(--space-1) var(--space-2);
  }

  .momentum-stat small {
    font-size: 0.58rem;
  }

  .momentum-stat strong {
    font-size: 0.72rem;
  }

  .panel-title h3 {
    font-size: 0.95rem;
  }

  .panel-badge {
    padding: 3px var(--space-2);
    font-size: 0.68rem;
  }

  .action-pill-btn {
    height: 28px;
    min-height: 28px;
    padding: 0 var(--space-2);
    font-size: 0.7rem;
  }
}

@media (max-width: 360px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .metric-card {
    padding: var(--space-1) var(--space-2);
    gap: var(--space-1);
  }

  .metric-icon {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 0.75rem;
  }

  .metric-card small {
    font-size: 0.6rem;
  }

  .metric-card strong {
    font-size: 0.7rem;
  }
}
</style>
