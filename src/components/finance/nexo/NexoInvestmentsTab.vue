<template>
  <section class="investments-tab">
    <div class="summary-grid">
      <article class="metric-card invested">
        <small>Investido no mês</small>
        <strong>{{ formatMoney(summary.month_invested || 0) }}</strong>
      </article>
      <article class="metric-card principal">
        <small>Total aportado</small>
        <strong>{{ formatMoney(summary.total_invested || 0) }}</strong>
      </article>
      <article class="metric-card yield">
        <small>Juros acumulados</small>
        <strong>{{ formatMoney(summary.total_yield || 0) }}</strong>
      </article>
      <article class="metric-card balance">
        <small>Saldo estimado</small>
        <strong>{{ formatMoney(summary.estimated_balance || 0) }}</strong>
      </article>
    </div>

    <nav class="investment-subtabs" aria-label="Investimentos">
      <button
        v-for="item in investmentTabs"
        :key="item.id"
        type="button"
        :class="{ active: activeInvestmentTab === item.id }"
        @click="activeInvestmentTab = item.id"
      >
        <font-awesome-icon :icon="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div v-show="activeInvestmentTab === 'summary'" class="tab-content">
      <section class="panel momentum-panel">
        <div class="panel-title">
          <h3>Ritmo</h3>
          <span>{{ streakLabel }}</span>
        </div>
        <div class="momentum-grid">
          <div class="momentum-stat">
            <small>Sequência</small>
            <strong>{{ investingStreak }} meses</strong>
          </div>
          <div class="momentum-stat">
            <small>Meta mais próxima</small>
            <strong>{{ nearestGoalLabel }}</strong>
          </div>
          <div class="momentum-stat">
            <small>Mês em foco</small>
            <strong>{{ selectedMonth }}</strong>
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
        <section class="panel">
          <div class="panel-title">
            <h3>Categorias</h3>
            <span>{{ categoryDistribution.length }} categorias</span>
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
                  stroke-width="16"
                />
              </svg>
              <svg v-else viewBox="0 0 100 100" class="donut-svg">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--glass-border)"
                  stroke-width="16"
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
                <span>{{ segment.category_name }}</span>
                <strong>{{ formatMoney(segment.estimated_balance) }}</strong>
              </div>
              <p v-if="donutSegments.length === 0" class="empty-line">
                Sem aportes de investimento ainda.
              </p>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">
            <h3>Aporte x juros</h3>
            <span>{{ monthlyHistory.length }} meses</span>
          </div>
          <div class="bar-chart">
            <div v-for="item in barHistory" :key="item.month" class="bar-row">
              <div class="bar-meta">
                <strong>{{ item.month }}</strong>
                <span>{{ formatMoney(item.invested) }} / {{ formatMoney(item.yield) }}</span>
              </div>
              <div class="bar-stack">
                <i class="invest-bar" :style="{ width: `${item.investedPercent}%` }"></i>
                <i class="yield-bar" :style="{ width: `${item.yieldPercent}%` }"></i>
              </div>
            </div>
            <p v-if="barHistory.length === 0" class="empty-line">
              O histórico mensal vai aparecer aqui.
            </p>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-title">
          <h3>Previsão no tempo</h3>
          <span>{{ projectionMonths }} meses</span>
        </div>
        <div class="projection-wrap">
          <svg
            v-if="projectionPoints.length > 1"
            viewBox="0 0 100 40"
            class="projection-svg"
            preserveAspectRatio="none"
          >
            <polyline
              :points="projectionPolyline"
              fill="none"
              stroke="#1f6f5f"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="projection-grid">
            <article v-for="point in projectionPreview" :key="point.label" class="projection-card">
              <small>{{ point.label }}</small>
              <strong>{{ formatMoney(point.value) }}</strong>
            </article>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h3>Histórico</h3>
          <span>{{ monthlyHistory.length }} linhas</span>
        </div>
        <div class="history-table">
          <div class="history-head">
            <span>Mês</span>
            <span>Aporte</span>
            <span>Juro</span>
            <span>Resgate</span>
            <span>Saldo</span>
          </div>
          <div v-for="item in historyRows" :key="item.month" class="history-row">
            <span>{{ item.month }}</span>
            <strong>{{ formatMoney(item.invested) }}</strong>
            <strong class="positive">{{ formatMoney(item.yield) }}</strong>
            <strong class="negative">{{ formatMoney(item.withdrawn) }}</strong>
            <strong>{{ formatMoney(item.estimated_balance) }}</strong>
          </div>
          <p v-if="historyRows.length === 0" class="empty-line">
            Nenhum mês com investimento ainda.
          </p>
        </div>
      </section>
    </div>

    <section v-show="activeInvestmentTab === 'goals'" class="panel tab-content">
      <div class="panel-title">
        <h3>Metas</h3>
        <button class="text-btn" @click="resetGoalForm">Nova meta</button>
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
        <button type="submit" class="primary-action">
          {{ goalForm.id ? 'Salvar meta' : 'Criar meta' }}
        </button>
      </form>

      <div class="goal-list">
        <article v-for="goal in goals" :key="goal.id || goal.local_id" class="goal-card">
          <div class="goal-head">
            <div>
              <strong>{{ goal.name }}</strong>
              <span>{{ horizonLabel(goal.horizon) }}</span>
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
        <h3>Calculadora de juros compostos</h3>
        <button class="text-btn" @click="$emit('refresh-rates')">Atualizar taxas</button>
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
      <div class="calculator-results">
        <article>
          <small>Total investido</small>
          <strong>{{ formatMoney(calculatorResult.totalContributed) }}</strong>
        </article>
        <article>
          <small>Juros estimados</small>
          <strong class="positive">{{ formatMoney(calculatorResult.estimatedInterestNet) }}</strong>
        </article>
        <article>
          <small>Valor futuro</small>
          <strong>{{ formatMoney(calculatorResult.futureValueNet) }}</strong>
        </article>
      </div>
    </section>
  </section>
</template>

<script>
export default {
  name: 'NexoInvestmentsTab',
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
    return {
      activeInvestmentTab: 'summary',
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
    }
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
      return this.investingStreak > 0 ? `${this.investingStreak} meses ativos` : 'Comece neste mês'
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
    projectionPolyline() {
      if (this.projectionPoints.length < 2) return ''
      const maxValue = Math.max(...this.projectionPoints.map((point) => point.value), 1)
      return this.projectionPoints
        .map((point, index) => {
          const x = (index / (this.projectionPoints.length - 1)) * 100
          const y = 36 - (point.value / maxValue) * 30
          return `${x},${Math.max(4, y)}`
        })
        .join(' ')
    },
    projectionPreview() {
      return [
        this.projectionPoints[0],
        this.projectionPoints[Math.floor(this.projectionPoints.length / 2)],
        this.projectionPoints[this.projectionPoints.length - 1],
      ].filter(Boolean)
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
        color: goal.color || '#355AFD',
      }
    },
    submitGoal() {
      const payload = {
        id: this.goalForm.id,
        name: this.goalForm.name,
        horizon: this.goalForm.horizon,
        target_amount: Number(this.goalForm.target_amount || 0),
        target_date: this.goalForm.target_date || null,
        color: this.goalForm.color,
      }
      this.$emit('save-goal', payload)
      this.resetGoalForm()
    },
    goalCurrentAmount(goal) {
      return Number(goal.current_amount ?? this.summary.estimated_balance ?? 0)
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
  },
}
</script>

<style scoped>
.investments-tab,
.tab-content {
  display: grid;
  gap: var(--space-4);
}

.summary-grid,
.visual-grid {
  display: grid;
  gap: var(--space-4);
}

.summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.visual-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.investment-subtabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.investment-subtabs::-webkit-scrollbar {
  display: none;
}

.investment-subtabs button {
  min-height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-secondary);
  padding: 0 var(--space-3);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.investment-subtabs button.active,
.investment-subtabs button:hover {
  color: var(--text-primary);
  background: var(--surface-1);
  border-color: var(--deep-blue);
}

.panel,
.metric-card,
.projection-card,
.goal-card {
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
}

.metric-card {
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.metric-card small,
.momentum-stat small,
.projection-card small,
.goal-card span,
.empty-line,
.panel-title span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.metric-card strong,
.momentum-stat strong {
  font-size: var(--fontsize-sm);
}

.metric-card.yield strong,
.positive {
  color: #0d8f6f;
}

.negative {
  color: var(--red);
}

.panel-title,
.goal-head,
.goal-actions,
.bar-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel-title {
  margin-bottom: var(--space-4);
}

.panel-title h3 {
  margin: 0;
}

.momentum-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.momentum-stat {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.progress-hero,
.progress-copy,
.legend-list,
.bar-chart,
.goal-list,
.stack-form {
  display: grid;
  gap: var(--space-3);
}

.progress-copy strong {
  font-size: var(--fontsize-sm);
}

.progress-copy span {
  color: var(--text-secondary);
}

.progress-track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.progress-track.compact {
  height: 10px;
}

.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0d8f6f, #78c7a8);
  transition: width 0.45s ease;
}

.donut-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-4);
  align-items: center;
}

.donut-shell {
  width: 180px;
  height: 180px;
  display: grid;
  place-items: center;
  position: relative;
}

.donut-svg {
  width: 180px;
  height: 180px;
  transform: rotate(-90deg);
}

.donut-hole {
  position: absolute;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: var(--surface-0);
  display: grid;
  place-items: center;
  text-align: center;
  padding: var(--space-2);
}

.donut-hole strong {
  font-size: var(--fontsize-xs);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.legend-row strong {
  margin-left: auto;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
}

.bar-row {
  display: grid;
  gap: var(--space-2);
}

.bar-stack {
  display: flex;
  gap: var(--space-1);
  width: 100%;
  height: 14px;
}

.bar-stack i {
  border-radius: 999px;
  transition: width 0.4s ease;
}

.invest-bar {
  background: linear-gradient(90deg, #1f274c, #355afd);
}

.yield-bar {
  background: linear-gradient(90deg, #0d8f6f, #78c7a8);
}

.projection-wrap {
  display: grid;
  gap: var(--space-4);
}

.projection-svg {
  width: 100%;
  height: 180px;
  border-radius: var(--radius-sm);
  background:
    linear-gradient(180deg, rgba(13, 143, 111, 0.1), rgba(13, 143, 111, 0.01)),
    var(--surface-1);
  border: 1px solid var(--glass-border);
}

.projection-grid,
.calculator-results {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.projection-card,
.calculator-results article {
  padding: var(--space-3);
  display: grid;
  gap: var(--space-1);
}

.calculator-results article {
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.history-table {
  display: grid;
  gap: var(--space-2);
}

.history-head,
.history-row {
  display: grid;
  grid-template-columns: 120px repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: center;
}

.history-head {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.history-row {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.floating-field {
  position: relative;
  display: block;
  min-width: 0;
}

.floating-field input,
.floating-field select {
  width: 100%;
  height: 52px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 18px var(--space-3) 4px;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-base);
}

.floating-field input[type='color'] {
  padding: 20px var(--space-3) 6px;
}

.floating-field input:focus,
.floating-field select:focus {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(31, 39, 76, 0.08);
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
  top: 7px;
  transform: none;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.goal-card {
  padding: var(--space-3);
}

.goal-values {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-3) 0;
}

.rate-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.rate-pill,
.text-btn,
.icon-btn,
.primary-action {
  border: none;
  cursor: pointer;
}

.rate-pill {
  padding: var(--space-2) var(--space-3);
  border-radius: 999px;
  background: var(--surface-1);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.primary-action {
  min-height: 42px;
  border-radius: var(--radius-sm);
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
  font-weight: 700;
}

.text-btn {
  min-height: 42px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  padding: 0 var(--space-2);
  font-weight: 600;
}

.icon-btn {
  width: 34px;
  min-height: 42px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-btn.danger {
  color: var(--red);
}

@media (max-width: 1000px) {
  .visual-grid,
  .donut-layout,
  .momentum-grid,
  .projection-grid,
  .calculator-results {
    grid-template-columns: 1fr;
  }

  .donut-layout {
    justify-items: center;
  }
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }

  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-head,
  .history-row,
  .inline-grid {
    grid-template-columns: 1fr;
  }
}
</style>
