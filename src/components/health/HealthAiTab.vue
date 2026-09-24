<template>
  <ProGate
    v-if="!canUseAi"
    title="IA em Saúde"
    description="Os recursos de inteligência artificial do Health utilizam a franquia unificada de créditos IA a partir do plano Pro."
    action-label="Ver planos"
    @upgrade="$emit('upgrade')"
  />
  <div v-else class="panel ai-panel">
    <div class="panel-title">
      <div>
        <div class="title-with-badge">
          <h3>IA em Saúde</h3>
          <span class="pro-tag">
            <font-awesome-icon icon="crown" />
            PRO
          </span>
        </div>
        <p class="panel-subtitle">Acompanhe seu saldo de créditos, análises de correlação e inteligência preventiva.</p>
      </div>
      <button class="text-btn" type="button" :disabled="loading" @click="$emit('refresh')">
        <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
        <span>Atualizar</span>
      </button>
    </div>

    <div class="ai-grid">
      <!-- Card de Créditos -->
      <section class="usage-card">
        <div class="card-header-row">
          <span>Créditos disponíveis</span>
          <span class="shared-chip">
            <font-awesome-icon icon="link" />
            Pool Nexo + Health
          </span>
        </div>
        <strong class="credits-count">{{ remainingCredits }}</strong>
        <small class="credits-detail">
          {{ usedCredits }} usados de {{ totalCredits }}
        </small>
        <div class="usage-track" :aria-label="`${usagePercent}% de créditos utilizados`">
          <i :style="{ width: usagePercent + '%' }"></i>
        </div>
      </section>

      <!-- Card de Vigência -->
      <section class="ai-summary">
        <span>Mês em vigência</span>
        <strong class="month-title">{{ monthLabel }}</strong>
        <small>Franquia unificada renovada a cada ciclo da assinatura.</small>
      </section>

      <!-- Card de Custo -->
      <section class="cost-card">
        <span>Custo por consulta</span>
        <strong class="cost-title">5 créditos</strong>
        <small>Cada leitura gerada por IA na aba de Acompanhamento debita 5 créditos do seu saldo.</small>
      </section>
    </div>

    <!-- Recursos de IA Disponíveis -->
    <div class="features-section">
      <h4 class="section-title">
        <font-awesome-icon icon="wand-magic-sparkles" />
        Recursos Disponíveis no Health
      </h4>

      <div class="features-grid">
        <article class="feature-item">
          <div class="feature-icon-box">
            <font-awesome-icon icon="chart-simple" />
          </div>
          <div>
            <strong>Interpretação de Correlações</strong>
            <p>
              Analisa se a presença ou ausência de certos hábitos, alimentos ou remédios altera a chance de surgirem sintomas e oscilações de bem-estar.
            </p>
          </div>
        </article>

        <article class="feature-item">
          <div class="feature-icon-box">
            <font-awesome-icon icon="heart-pulse" />
          </div>
          <div>
            <strong>Cuidado Clínico e Não Causal</strong>
            <p>
              A IA indica cautela quando os dados ainda forem escassos e formula perguntas direcionadas para você levar a médicos e especialistas.
            </p>
          </div>
        </article>

        <article class="feature-item">
          <div class="feature-icon-box">
            <font-awesome-icon icon="scale-balanced" />
          </div>
          <div>
            <strong>Cota 100% Unificada</strong>
            <p>
              O mesmo saldo de 300 créditos (Pro) ou 1.500 créditos (Enterprise) é compartilhado em tempo real com o Nexo (Finanças).
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- Banner CTA para o Acompanhamento -->
    <div class="tracking-cta-card">
      <div class="cta-text">
        <strong>Explorar Correlações & Interpretar com IA</strong>
        <p>Acesse o Acompanhamento para visualizar os padrões detectados nos seus check-ins e acionar a inteligência artificial.</p>
      </div>
      <button class="primary-action compact-btn" type="button" @click="$emit('navigate', 'tracking')">
        <font-awesome-icon icon="heart-pulse" />
        <span>Ir para Acompanhamento</span>
      </button>
    </div>
  </div>
</template>

<script>
import ProGate from "@/components/finance/nexo/ProGate.vue";

export default {
  name: "HealthAiTab",
  components: {
    ProGate,
  },
  props: {
    canUseAi: {
      type: Boolean,
      default: false,
    },
    usage: {
      type: Object,
      default: () => ({}),
    },
    monthLabel: {
      type: String,
      default: "",
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["upgrade", "refresh", "navigate"],
  computed: {
    totalCredits() {
      return Number(this.usage.total_credits || this.usage.monthly_limit || 0);
    },
    usedCredits() {
      return Number(this.usage.used_credits || 0);
    },
    remainingCredits() {
      if (this.usage.remaining_credits !== undefined) {
        return Number(this.usage.remaining_credits);
      }
      return Math.max(0, this.totalCredits - this.usedCredits);
    },
    usagePercent() {
      if (!this.totalCredits) return 0;
      return Math.min(100, Math.round((this.usedCredits / this.totalCredits) * 100));
    },
  },
};
</script>

<style scoped>
.panel,
.usage-card,
.ai-summary,
.cost-card,
.feature-item,
.tracking-cta-card {
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-with-badge h3 {
  margin: 0;
  font-size: var(--fontsize-lg);
  color: var(--text-primary);
}

.pro-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 999px;
  padding: 2px 8px;
}

.panel-subtitle {
  margin: var(--space-1) 0 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.usage-card,
.ai-summary,
.cost-card {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.shared-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 999px;
  padding: 1px 6px;
}

.usage-card span,
.ai-summary span,
.cost-card span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.credits-count {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.month-title,
.cost-title {
  font-size: var(--fontsize-md);
  font-weight: 700;
  color: var(--text-primary);
}

.credits-detail,
.ai-summary small,
.cost-card small {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.35;
}

.usage-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
  margin-top: 4px;
}

.usage-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981, #06b6d4);
  transition: width var(--transition-base);
}

.features-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.section-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
  font-weight: 600;
}

.section-title svg {
  color: #10b981;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.feature-item {
  padding: var(--space-4);
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.feature-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.feature-item strong {
  display: block;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.feature-item p {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.tracking-cta-card {
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05));
  border-color: rgba(16, 185, 129, 0.2);
}

.cta-text strong {
  display: block;
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.cta-text p {
  margin: 0;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
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
  min-height: 36px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--fontsize-xs);
  padding: 0 var(--space-3);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.text-btn:hover {
  background: var(--surface-2);
}

.primary-action {
  background: var(--blue-color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}

.compact-btn {
  padding: 8px 16px;
  font-size: var(--fontsize-xs);
}

.primary-action:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .ai-grid,
  .features-grid {
    grid-template-columns: 1fr;
  }

  .tracking-cta-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }
}
</style>
