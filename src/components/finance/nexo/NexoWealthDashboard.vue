<template>
  <section class="wealth-dashboard" aria-label="Distribuição patrimonial">
    <!-- Avisos e alertas em formato Nexo Banner -->
    <div v-if="error" class="nexo-banner error" role="alert">
      <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
      <span>{{ error }}</span>
    </div>

    <template v-if="state?.summary">
      <div v-if="offline" class="nexo-banner warning" role="status">
        <font-awesome-icon icon="wifi" class="banner-icon" />
        <span>Consulta salva no dispositivo. Os saldos podem estar desatualizados em relação ao servidor.</span>
      </div>

      <div v-if="state.quotes_unavailable" class="nexo-banner subtle accent-warning" role="status">
        <font-awesome-icon icon="circle-info" class="banner-icon" />
        <span>Cotações de metais indisponíveis no momento. As últimas referências salvas foram preservadas.</span>
      </div>

      <!-- Grid de Indicadores Principais (KPI Cards) -->
      <div class="metrics-grid">
        <article class="metric-card">
          <div class="metric-icon primary">
            <font-awesome-icon icon="building-columns" />
          </div>
          <div class="metric-info">
            <span class="metric-label">Contas financeiras</span>
            <strong class="metric-value">{{ money(state.summary.digital_accounts) }}</strong>
            <small class="metric-sub">Bancos conectados no Nexo</small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon info">
            <font-awesome-icon icon="chart-line" />
          </div>
          <div class="metric-info">
            <span class="metric-label">Investimentos digitais</span>
            <strong class="metric-value">{{ money(state.summary.digital_investments) }}</strong>
            <small class="metric-sub">Saldo acompanhado</small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon success">
            <font-awesome-icon icon="wallet" />
          </div>
          <div class="metric-info">
            <span class="metric-label">Dinheiro em espécie</span>
            <strong class="metric-value positive">{{ money(state.summary.cash) }}</strong>
            <small class="metric-sub">Em mãos e cofres físicos</small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon gold">
            <font-awesome-icon icon="coins" />
          </div>
          <div class="metric-info">
            <span class="metric-label">Metais preciosos</span>
            <strong class="metric-value gold-text">
              {{ money(state.summary.missing_quotes ? null : state.summary.metals) }}
            </strong>
            <small class="metric-sub">Ouro e prata de reserva</small>
          </div>
        </article>

        <article class="metric-card highlight-card">
          <div class="metric-icon highlight">
            <font-awesome-icon icon="vault" />
          </div>
          <div class="metric-info">
            <span class="metric-label">Patrimônio consolidado</span>
            <strong class="metric-value consolidated-value">{{ money(state.summary.consolidated_total) }}</strong>
            <small class="metric-sub">Digital + Físico estimado</small>
          </div>
        </article>
      </div>

      <p class="helper-note">
        O patrimônio consolidado soma saldos em contas bancárias, investimentos digitais e reservas físicas em dinheiro e
        metais.
      </p>

      <!-- Painéis de Composição e Evolução -->
      <div class="dashboard-panels-grid">
        <!-- 1. Composição Patrimonial -->
        <article class="panel">
          <div class="panel-header-simple">
            <div class="panel-title-group">
              <h4>Composição patrimonial</h4>
              <p class="panel-subtitle">Distribuição entre reservas digitais e físicas.</p>
            </div>
            <span class="count-pill neutral">{{ composition.length }} ativos</span>
          </div>

          <div class="composition-list">
            <div v-for="item in composition" :key="item.name" class="composition-item">
              <div class="composition-head">
                <div class="item-name-group">
                  <span class="item-dot" :class="item.classKey" />
                  <strong>{{ item.name }}</strong>
                </div>
                <div class="item-numbers">
                  <span class="item-percent">{{ calcPercent(item.value) }}</span>
                  <strong class="item-val">{{ money(item.value) }}</strong>
                </div>
              </div>

              <div class="composition-track">
                <div
                  class="composition-fill"
                  :class="item.classKey"
                  :style="{ width: `${calcPercentNum(item.value)}%` }"
                />
              </div>
            </div>
          </div>
        </article>

        <!-- 2. Evolução Mensal do Patrimônio Físico -->
        <article class="panel">
          <div class="panel-header-simple">
            <div class="panel-title-group">
              <h4>Evolução do patrimônio físico</h4>
              <p class="panel-subtitle">Histórico mensal consolidado de dinheiro e metais (BRL).</p>
            </div>
            <span v-if="history.length" class="count-pill info">{{ history.length }} meses</span>
          </div>

          <div v-if="history.length" class="chart-wrapper">
            <div class="history-chart" role="img" aria-label="Evolução mensal do patrimônio físico em reais">
              <div
                v-for="point in history"
                :key="point.month"
                class="chart-col-box"
                :title="`${point.month}: ${money(point.physical_total)}`"
              >
                <span class="col-value-tag">{{ formatShortMoney(point.physical_total) }}</span>
                <div class="col-bar-slot">
                  <div
                    class="col-bar-fill"
                    :style="{ height: `${barHeight(point)}px` }"
                    :class="{ missing: point.physical_total === null }"
                  />
                </div>
                <small class="col-month-tag">{{ point.month.slice(5) }}/{{ point.month.slice(2, 4) }}</small>
              </div>
            </div>
          </div>

          <div v-else class="empty-state-card compact">
            <div class="empty-icon-circle">
              <font-awesome-icon icon="chart-line" />
            </div>
            <h4>Sem histórico anterior</h4>
            <p>O histórico de evolução será gerado conforme você registrar movimentos e conciliações mensais.</p>
          </div>

          <p class="helper-note">
            Cotações de mercado são estimativas baseadas no preço fino de referência na data correspondente.
          </p>
        </article>
      </div>

      <!-- Fluxo de espécie do mês: entradas e saídas em gráficos independentes, cada um com suas categorias -->
      <section class="flow-section" aria-label="Fluxo de espécie por categoria">
        <div class="panel-title-group">
          <h4>Fluxo de espécie por categoria</h4>
          <p class="panel-subtitle">
            Entradas e saídas do dinheiro físico em <strong>{{ flowMonthLabel }}</strong>, o mês escolhido no filtro
            do Nexo, agrupadas pelas categorias.
          </p>
        </div>

        <div class="flow-donuts-grid">
          <NexoAllocationDonut
            title="Entradas do mês"
            empty-label="Sem entradas em espécie no mês."
            show-total
            :macro-distribution="incomeFlow"
            :totals="emptyTotals"
            :format-money="money"
          />
          <NexoAllocationDonut
            title="Saídas do mês"
            empty-label="Sem saídas em espécie no mês."
            show-total
            :macro-distribution="expenseFlow"
            :totals="emptyTotals"
            :format-money="money"
          />
        </div>

        <p class="helper-note">
          Saques do dinheiro digital entram como "Saque" nas entradas; depósitos no banco aparecem nas saídas.
          Movimentos sem categoria ficam em "Sem categoria". Investimentos e metais não entram nestes gráficos.
        </p>
      </section>
    </template>
  </section>
</template>

<script>
import NexoAllocationDonut from "./NexoAllocationDonut.vue";

const money = (value) =>
  value === null || value === undefined
    ? "Sem estimativa"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyTotals = { income: 0, expense: 0 };

export default {
  name: "NexoWealthDashboard",
  components: { NexoAllocationDonut },
  props: {
    state: { type: Object, default: null },
    history: { type: Array, default: () => [] },
    // Linhas de GET /finance/physical/flows: { direction, name, color, total } por categoria no mês do filtro do Nexo.
    flows: { type: Array, default: () => [] },
    flowMonth: { type: String, default: "" },
    offline: Boolean,
    error: { type: String, default: "" },
  },
  data: () => ({ emptyTotals }),
  computed: {
    incomeFlow() {
      return this.flowSlices("INCOME");
    },
    expenseFlow() {
      return this.flowSlices("EXPENSE");
    },
    flowMonthLabel() {
      const [year, month] = String(this.flowMonth).split("-").map(Number);
      if (!year || !month) return "";
      const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return label.charAt(0).toUpperCase() + label.slice(1);
    },
    composition() {
      if (!this.state?.summary) return [];
      return [
        {
          name: "Contas financeiras",
          value: Number(this.state.summary.digital_accounts || 0),
          classKey: "banking",
        },
        {
          name: "Investimentos digitais",
          value: Number(this.state.summary.digital_investments || 0),
          classKey: "invest",
        },
        {
          name: "Dinheiro em espécie",
          value: Number(this.state.summary.cash || 0),
          classKey: "cash",
        },
        ...["XAU", "XAG"].map((metal) => {
          const positions = (this.state.holdings || []).filter((h) => h.metal === metal);
          return {
            name: metal === "XAU" ? "Ouro (estimado)" : "Prata (estimada)",
            value: positions.some((h) => Number(h.quantity) > 0 && h.estimated_value === null)
              ? null
              : positions.reduce((s, h) => s + Number(h.estimated_value || 0), 0),
            classKey: metal === "XAU" ? "gold" : "silver",
          };
        }),
      ];
    },
    compositionTotal() {
      return this.composition.reduce((sum, item) => sum + Math.max(0, Number(item.value || 0)), 0);
    },
  },
  methods: {
    money,
    // O donut do Nexo agrupa por `macro_category`; aqui cada fatia é uma categoria do fluxo.
    flowSlices(direction) {
      return this.flows
        .filter((row) => row.direction === direction && Number(row.total) > 0)
        .map((row) => ({ macro_category: row.name, color: row.color, total: Number(row.total) }));
    },
    calcPercentNum(val) {
      if (!val || !this.compositionTotal) return 0;
      return Math.min(100, Math.max(0, (Number(val) / this.compositionTotal) * 100));
    },
    calcPercent(val) {
      if (val === null || val === undefined) return "—";
      const pct = this.calcPercentNum(val);
      return `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    },
    barHeight(point) {
      const max = Math.max(...this.history.map((p) => Math.abs(Number(p.physical_total || 0))), 1);
      return point.physical_total === null ? 4 : Math.max(4, (Math.abs(Number(point.physical_total)) / max) * 115);
    },
    formatShortMoney(value) {
      if (value === null || value === undefined) return "—";
      const num = Number(value);
      if (Math.abs(num) >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
      if (Math.abs(num) >= 1000) return `R$ ${(num / 1000).toFixed(0)}k`;
      return `R$ ${num.toFixed(0)}`;
    },
  },
};
</script>

<style scoped>
.wealth-dashboard {
  display: grid;
  gap: var(--space-4);
  color: var(--text-primary);
  min-width: 0;
}

/* ==========================================================================
   METRICS GRID (KPI Cards Padrão Nexo)
   ========================================================================== */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--space-4);
}

.metric-card {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-base),
    box-shadow var(--transition-fast);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.metric-card.highlight-card {
  background: linear-gradient(145deg, rgba(181, 152, 75, 0.08), var(--surface-0));
  border-color: rgba(181, 152, 75, 0.3);
}

[data-theme="dark"] .metric-card.highlight-card {
  background: linear-gradient(145deg, rgba(216, 183, 94, 0.12), var(--surface-1));
  border-color: rgba(216, 183, 94, 0.35);
}

.metric-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  border: 1px solid transparent;
}

.metric-icon.primary {
  background: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
  color: #4f46e5;
}

[data-theme="dark"] .metric-icon.primary {
  background: rgba(129, 140, 248, 0.16);
  border-color: rgba(129, 140, 248, 0.28);
  color: #a5b4fc;
}

.metric-icon.info {
  background: rgba(53, 90, 253, 0.1);
  border-color: rgba(53, 90, 253, 0.2);
  color: var(--color-info);
}

[data-theme="dark"] .metric-icon.info {
  background: rgba(95, 124, 255, 0.16);
  border-color: rgba(95, 124, 255, 0.28);
  color: #93c5fd;
}

.metric-icon.success {
  background: rgba(46, 204, 113, 0.12);
  border-color: rgba(46, 204, 113, 0.24);
  color: #16a34a;
}

[data-theme="dark"] .metric-icon.success {
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.3);
  color: #4ade80;
}

.metric-icon.gold {
  background: rgba(181, 152, 75, 0.14);
  border-color: rgba(181, 152, 75, 0.3);
  color: #9f8037;
}

[data-theme="dark"] .metric-icon.gold {
  background: rgba(216, 183, 94, 0.16);
  border-color: rgba(216, 183, 94, 0.34);
  color: #e4c46f;
}

.metric-icon.highlight {
  background: rgba(181, 152, 75, 0.2);
  border-color: rgba(181, 152, 75, 0.4);
  color: #8c6f2a;
}

[data-theme="dark"] .metric-icon.highlight {
  background: rgba(216, 183, 94, 0.22);
  border-color: rgba(216, 183, 94, 0.45);
  color: #f3d482;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-value.positive {
  color: var(--color-income, #2e9b62);
}

.metric-value.gold-text {
  color: #9f8037;
}

[data-theme="dark"] .metric-value.gold-text {
  color: #e4c46f;
}

.consolidated-value {
  font-size: 1.35rem;
  color: #8c6f2a;
}

[data-theme="dark"] .consolidated-value {
  color: #f3d482;
}

.metric-sub {
  font-size: 0.74rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==========================================================================
   PANELS & COMPOSITION / EVOLUTION CHARTS
   ========================================================================== */
.dashboard-panels-grid {
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(360px, 1.4fr);
  gap: var(--space-4);
  /* Composição e Evolução têm a mesma altura; o conteúdo do painel mais curto fica no topo. */
  align-items: stretch;
}

.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
  display: grid;
  align-content: start;
  gap: var(--space-4);
  min-width: 0;
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel-header-simple {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.panel-title-group h4 {
  margin: 0 0 2px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.panel-subtitle,
.helper-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 600;
}

.count-pill.neutral {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.count-pill.info {
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info);
  border: 1px solid rgba(53, 90, 253, 0.22);
}

/* Composição */
.composition-list {
  display: grid;
  gap: var(--space-3);
}

.composition-item {
  display: grid;
  gap: 6px;
}

.composition-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: 0.84rem;
}

.item-name-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-name-group strong {
  font-size: 0.86rem;
  color: var(--text-primary);
  font-weight: 600;
}

.item-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-dot.banking {
  background: #4f46e5;
}

.item-dot.invest {
  background: var(--color-info, #355afd);
}

.item-dot.cash {
  background: var(--color-income, #2e9b62);
}

.item-dot.gold {
  background: #b5984b;
}

.item-dot.silver {
  background: #94a3b8;
}

.item-numbers {
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.item-percent {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
}

.item-val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.composition-track {
  width: 100%;
  height: 8px;
  background: var(--surface-2);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.composition-fill {
  height: 100%;
  border-radius: var(--radius-md);
  transition: width 0.3s ease;
}

.composition-fill.banking {
  background: linear-gradient(90deg, #4f46e5, #6366f1);
}

.composition-fill.invest {
  background: linear-gradient(90deg, #355afd, #60a5fa);
}

.composition-fill.cash {
  background: linear-gradient(90deg, #2e9b62, #4ade80);
}

.composition-fill.gold {
  background: linear-gradient(90deg, #9f8037, #d8b75e);
}

.composition-fill.silver {
  background: linear-gradient(90deg, #64748b, #94a3b8);
}

/* Gráfico de Evolução */
.chart-wrapper {
  overflow-x: auto;
  padding-bottom: var(--space-2);
}

.history-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  min-height: 165px;
  padding: var(--space-2) var(--space-1);
}

.chart-col-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 58px;
  flex: 1;
}

.col-value-tag {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.col-bar-slot {
  height: 120px;
  display: flex;
  align-items: flex-end;
  width: 100%;
  justify-content: center;
}

.col-bar-fill {
  width: 70%;
  max-width: 36px;
  background: linear-gradient(180deg, #d8b75e, #9f8037);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 2px 6px rgba(159, 128, 55, 0.25);
  transition:
    height 0.3s ease,
    transform var(--transition-fast);
}

.chart-col-box:hover .col-bar-fill {
  transform: scaleY(1.04);
  filter: brightness(1.1);
}

.col-bar-fill.missing {
  background: var(--surface-3);
  box-shadow: none;
}

.col-month-tag {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* Empty State compacto */
.empty-state-card.compact {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
}

.empty-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  color: var(--text-muted);
}

.empty-state-card.compact h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.empty-state-card.compact p {
  margin: 0;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  max-width: 340px;
}

/* ==========================================================================
   BANNERS (Padrão Nexo)
   ========================================================================== */
.nexo-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  line-height: 1.45;
}

.nexo-banner .banner-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nexo-banner.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #b45309;
}

[data-theme="dark"] .nexo-banner.warning {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.32);
  color: #fde68a;
}

.nexo-banner.error {
  background: rgba(214, 74, 46, 0.1);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .nexo-banner.error {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
  color: #fca5a5;
}

.nexo-banner.subtle.accent-warning {
  background: rgba(181, 152, 75, 0.08);
  border: 1px solid rgba(181, 152, 75, 0.24);
  color: var(--text-secondary);
}

/* ==========================================================================
   FLUXO DE ESPÉCIE POR CATEGORIA (donuts independentes de entradas e saídas)
   ========================================================================== */
.flow-section {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.flow-donuts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  /* Entradas e Saídas têm listas de tamanhos diferentes, mas os dois cartões mantêm a mesma altura. */
  align-items: stretch;
}

/* A janela do Nexo pode ser estreita num viewport largo: o container da aba decide o layout, não o viewport. */
@container physical-tab (max-width: 900px) {
  .dashboard-panels-grid,
  .flow-donuts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .dashboard-panels-grid,
  .flow-donuts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
