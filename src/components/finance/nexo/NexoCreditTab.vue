<template>
  <div class="credit-tab">
    <div class="credit-metrics">
      <article class="credit-metric-card credit-total">
        <span>Compras no crédito</span>
        <strong>{{ formatMoney(summary.expense || 0) }}</strong>
        <small>Acumulado pelo mês da compra</small>
      </article>
      <article class="credit-metric-card" :class="{ 'has-warning': Number(summary.unassigned) > 0 }">
        <span>Crédito sem cartão definido</span>
        <strong>{{ formatMoney(summary.unassigned || 0) }}</strong>
        <small>{{ Number(summary.unassigned) > 0 ? "Vincule o cartão nas compras pendentes" : "Todas as compras têm cartão vinculado" }}</small>
      </article>
      <article class="credit-metric-card" :class="{ 'has-warning': Number(summary.review_count) > 0 }">
        <span>Pagamentos para revisar</span>
        <strong>{{ summary.review_count || 0 }}</strong>
        <small>{{ Number(summary.review_count) > 0 ? "Modalidade ou cartão aguardando confirmação" : "Nenhuma pendência neste mês" }}</small>
      </article>
    </div>

    <div class="credit-charts">
      <NexoCreditChart :summary="selectedSummary" :format-money="formatMoney" />
      <section class="credit-panel">
        <div class="panel-title">
          <div>
            <h3>Gastos por cartão</h3>
            <p class="panel-subtitle">Compare a participação de cada cartão nas compras do mês.</p>
          </div>
        </div>
        <label class="credit-field filter-select-field">
          <span>Filtrar categorias por cartão</span>
          <select v-model="selectedCard">
            <option value="">Todos os cartões</option>
            <option
              v-for="row in summary.by_card || []"
              :key="row.credit_card_id || 'none'"
              :value="String(row.credit_card_id || 'none')"
            >
              {{ labelFor(row.credit_card_id) }}
            </option>
          </select>
        </label>
        <div v-if="summary.by_card?.length" class="card-spending-list">
          <div v-for="row in summary.by_card || []" :key="row.credit_card_id || 'none'" class="card-spending">
            <div class="card-spending-head">
              <span class="card-spending-name">{{ labelFor(row.credit_card_id) }}</span>
              <strong>{{ formatMoney(row.total) }}</strong>
            </div>
            <div class="spending-track">
              <span :style="{ width: `${summary.expense ? Math.min(100, (100 * row.total) / summary.expense) : 0}%` }" />
            </div>
            <div class="card-spending-foot">
              <small>{{ row.count }} {{ row.count === 1 ? "compra" : "compras" }}</small>
              <small v-if="summary.expense">{{ Math.round((100 * row.total) / summary.expense) }}% do crédito</small>
            </div>
          </div>
        </div>
        <p v-else class="empty-line">Sem compras no crédito neste mês.</p>
      </section>
    </div>

    <section class="credit-panel">
      <div class="credit-heading">
        <div>
          <h3>Seus cartões</h3>
          <p class="panel-subtitle">Gastos pelo mês da compra. O limite cadastrado é uma referência, sem controle de fatura.</p>
        </div>
        <button type="button" class="primary-action" @click="openCard()">
          <font-awesome-icon icon="plus" />
          <span>Cadastrar cartão</span>
        </button>
      </div>

      <div v-if="cards.length" class="registered-cards">
        <article
          v-for="card in cards"
          :key="card.local_key || card.id"
          class="registered-card"
          :class="{ archived: Number(card.is_archived) }"
        >
          <div class="registered-card-top">
            <div class="card-identity">
              <span class="card-badge-icon">
                <font-awesome-icon icon="credit-card" />
              </span>
              <div class="card-titles">
                <strong>{{ card.name }}</strong>
                <span>{{ card.bank }} · {{ card.brand }} •• {{ card.last_four }}</span>
              </div>
            </div>
            <span v-if="Number(card.is_archived)" class="status-pill archived-pill">Arquivado</span>
          </div>

          <div class="card-limit-block">
            <div class="limit-row">
              <span>No mês: <strong>{{ formatMoney(cardSpent(card.id)) }}</strong></span>
              <span>Limite: <strong>{{ formatMoney(card.credit_limit) }}</strong></span>
            </div>
            <div v-if="Number(card.credit_limit) > 0" class="spending-track compact">
              <span :style="{ width: `${Math.min(100, (100 * cardSpent(card.id)) / Number(card.credit_limit))}%` }" />
            </div>
          </div>

          <div class="card-actions">
            <button type="button" class="secondary-btn" @click="openCard(card)">
              <font-awesome-icon icon="pencil" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              class="secondary-btn"
              :class="{ 'danger-hover': !Number(card.is_archived) }"
              :disabled="savingCard"
              @click="archiveCard(card)"
            >
              <font-awesome-icon :icon="Number(card.is_archived) ? 'arrows-rotate' : 'box-archive'" />
              <span>{{ Number(card.is_archived) ? "Reativar" : "Arquivar" }}</span>
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty-line">Cadastre banco, bandeira, final e limite para identificar suas próximas compras.</p>
      <p v-if="error && !showCard" role="alert" class="credit-error">{{ error }}</p>
    </section>

    <section class="credit-panel">
      <div class="credit-heading">
        <div>
          <h3>Revisar pagamentos</h3>
          <p class="panel-subtitle">Confirme o meio de pagamento ou o cartão. Dados insuficientes ficam aqui para você revisar.</p>
        </div>
        <button
          type="button"
          class="ai-action-btn"
          :disabled="reviewing || !canUseAi || !reviewItems.length"
          :title="!canUseAi ? 'Disponível no plano PRO' : 'Tentar identificar meio ou cartão com IA'"
          @click="reviewWithAi"
        >
          <font-awesome-icon :icon="reviewing ? 'circle-notch' : 'wand-magic-sparkles'" :spin="reviewing" class="ai-btn-icon" />
          <span>{{ reviewing ? "Analisando…" : "Tentar identificar com IA" }}</span>
        </button>
      </div>

      <div v-if="reviewItems.length" class="review-list">
        <div v-for="tx in reviewItems" :key="tx.id || tx.local_key" class="review-row">
          <div class="review-main">
            <div class="review-title-line">
              <strong>{{ tx.description }}</strong>
              <span v-if="formatShortDate && tx.transaction_date" class="review-date-pill">
                {{ formatShortDate(tx.transaction_date) }}
              </span>
            </div>
            <div class="review-meta-line">
              <span class="method-pill">{{ paymentMethodLabel(tx.payment_method) }}</span>
              <span class="reason-pill">
                <font-awesome-icon icon="triangle-exclamation" />
                {{ tx.payment_review_reason }}
              </span>
            </div>
          </div>
          <div class="review-right">
            <strong class="review-amount">{{ formatMoney(tx.amount) }}</strong>
            <button type="button" class="secondary-btn" @click="$emit('edit-transaction', tx)">
              <font-awesome-icon icon="pencil" />
              <span>Revisar</span>
            </button>
          </div>
        </div>
      </div>
      <p v-else class="empty-line">Nenhum pagamento aguardando revisão neste mês.</p>
      <small v-if="summary.review_count > reviewItems.length" class="review-more-note">
        Mostrando {{ reviewItems.length }} de {{ summary.review_count }}. Revise estes para carregar os próximos.
      </small>
    </section>

    <BaseModal
      :model-value="showCard"
      :title="cardForm.id ? 'Editar cartão' : 'Cadastrar cartão'"
      size="md"
      @close="showCard = false"
    >
      <form class="card-form" @submit.prevent="saveCard">
        <p class="modal-helper">Informe somente os quatro últimos dígitos do cartão.</p>
        <label class="credit-field">
          <span>Nome</span>
          <input v-model.trim="cardForm.name" maxlength="80" required placeholder="Meu cartão principal" />
        </label>
        <label class="credit-field">
          <span>Banco</span>
          <input v-model.trim="cardForm.bank" maxlength="80" required placeholder="Ex.: PicPay" />
        </label>
        <div class="card-form-grid">
          <label class="credit-field">
            <span>Final do cartão</span>
            <input
              v-model="cardForm.last_four"
              inputmode="numeric"
              pattern="[0-9]{4}"
              maxlength="4"
              required
              placeholder="1234"
            />
          </label>
          <label class="credit-field">
            <span>Bandeira</span>
            <select v-model="cardForm.brand" required>
              <option disabled value="">Selecione</option>
              <option v-for="brand in brands" :key="brand">{{ brand }}</option>
            </select>
          </label>
        </div>
        <label class="credit-field">
          <span>Limite cadastrado (R$)</span>
          <input
            v-model="cardForm.credit_limit"
            type="number"
            min="0"
            max="999999999999.99"
            step="0.01"
            required
          />
        </label>
        <p v-if="error" role="alert" class="credit-error">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" class="text-btn" @click="showCard = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="savingCard">
            <font-awesome-icon v-if="savingCard" icon="circle-notch" spin />
            <span>{{ savingCard ? "Salvando…" : "Salvar cartão" }}</span>
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
<script>
import BaseModal from "@/components/BaseModal.vue";
import { financeService } from "@/services/financeService";
import { cardLabel, paymentMethodLabel } from "@/utils/financeCredit";
import NexoCreditChart from "./NexoCreditChart.vue";
export default {
  components: { BaseModal, NexoCreditChart },
  emits: ["changed", "edit-transaction"],
  props: {
    cards: { type: Array, default: () => [] },
    summary: { type: Object, required: true },
    reviewItems: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    formatMoney: { type: Function, required: true },
    formatShortDate: { type: Function, default: null },
    canUseAi: Boolean,
  },
  data: () => ({
    showCard: false,
    cardForm: {},
    savingCard: false,
    reviewing: false,
    error: "",
    selectedCard: "",
    brands: ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outra"],
  }),
  computed: {
    selectedSummary() {
      return this.selectedCard
        ? (this.summary.by_card || []).find((r) => String(r.credit_card_id || "none") === this.selectedCard) || {
            expense: 0,
            categories: [],
          }
        : this.summary;
    },
  },
  methods: {
    paymentMethodLabel,
    labelFor(id) {
      return cardLabel(this.cards.find((c) => String(c.id) === String(id)));
    },
    cardSpent(cardId) {
      const match = (this.summary.by_card || []).find((r) => String(r.credit_card_id) === String(cardId));
      return Number(match?.total || 0);
    },
    openCard(card) {
      this.error = "";
      this.cardForm = card
        ? {
            id: card.id,
            name: card.name,
            bank: card.bank,
            last_four: card.last_four,
            brand: card.brand,
            credit_limit: Number(card.credit_limit),
          }
        : { id: null, name: "", bank: "", last_four: "", brand: "", credit_limit: 0 };
      this.showCard = true;
    },
    async saveCard() {
      if (this.savingCard) return;
      this.savingCard = true;
      this.error = "";
      try {
        const { id, ...data } = this.cardForm;
        const result = await financeService.saveCreditCard(id, { ...data, credit_limit: Number(data.credit_limit) });
        this.showCard = false;
        this.$emit("changed");
        await result.synced;
        this.$emit("changed");
      } catch (e) {
        this.error = e.response?.data?.message || e.message || "Não foi possível salvar o cartão.";
      } finally {
        this.savingCard = false;
      }
    },
    async archiveCard(card) {
      this.savingCard = true;
      this.error = "";
      try {
        const result = await financeService.saveCreditCard(card.id, { is_archived: !Number(card.is_archived) });
        this.$emit("changed");
        await result.synced;
        this.$emit("changed");
      } catch (e) {
        this.error = e.message;
      } finally {
        this.savingCard = false;
      }
    },
    async reviewWithAi() {
      this.reviewing = true;
      this.error = "";
      try {
        const ids = this.reviewItems
          .filter((t) => !Number(t.payment_source_locked) && Number.isFinite(Number(t.id)))
          .slice(0, 25)
          .map((t) => Number(t.id));
        if (!ids.length) {
          this.error = "As escolhas manuais são preservadas. Use Revisar para alterá-las.";
          return;
        }
        await financeService.reviewPaymentOrigins(ids);
        this.$emit("changed");
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
      } finally {
        this.reviewing = false;
      }
    },
  },
};
</script>
<style scoped>
.credit-tab {
  display: grid;
  gap: var(--space-4);
}

h3,
p {
  margin: 0;
}

.panel-subtitle,
.modal-helper,
.empty-line,
small {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.panel-subtitle {
  margin-top: 4px;
}

.credit-heading,
.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.credit-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.credit-metric-card,
.credit-panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.credit-metric-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.credit-metric-card span {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.credit-metric-card strong {
  font-size: var(--fontsize-md);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.credit-metric-card.credit-total strong {
  color: #4f46e5;
}

[data-theme="dark"] .credit-metric-card.credit-total strong {
  color: #818cf8;
}

.credit-metric-card.has-warning strong {
  color: #d97706;
}

[data-theme="dark"] .credit-metric-card.has-warning strong {
  color: #fbbf24;
}

.credit-charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.filter-select-field {
  margin-top: var(--space-4);
}

.card-spending-list {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.card-spending {
  display: grid;
  gap: 6px;
}

.card-spending-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  font-size: 0.85rem;
}

.card-spending-name {
  color: var(--text-primary);
  font-weight: 600;
}

.card-spending-head strong {
  font-variant-numeric: tabular-nums;
}

.card-spending-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.spending-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

[data-theme="dark"] .spending-track {
  background: rgba(255, 255, 255, 0.08);
}

.spending-track.compact {
  height: 6px;
}

.spending-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #818cf8);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.registered-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.registered-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.registered-card:hover {
  border-color: rgba(79, 70, 229, 0.3);
}

.registered-card.archived {
  opacity: 0.68;
}

.registered-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.card-identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.card-badge-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.95rem;
}

[data-theme="dark"] .card-badge-icon {
  background: rgba(129, 140, 248, 0.14);
  color: #818cf8;
}

.card-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-titles strong {
  font-size: 0.92rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-titles span {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.status-pill {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.archived-pill {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.card-limit-block {
  display: grid;
  gap: 6px;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.limit-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.limit-row strong {
  color: var(--text-primary);
}

.card-actions {
  margin-top: auto;
  padding-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.review-list {
  display: grid;
  margin-top: var(--space-3);
}

.review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--glass-border);
}

.review-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.review-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}

.review-title-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.review-title-line strong {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.review-date-pill {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}

.review-meta-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.method-pill {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}

.reason-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}

[data-theme="dark"] .reason-pill {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.3);
}

.review-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.review-amount {
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.review-more-note {
  display: block;
  margin-top: var(--space-3);
}

/* Form & Buttons (compatible with teleported BaseModal) */
.card-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.credit-field {
  display: grid;
  gap: var(--space-1);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
}

.credit-field span {
  padding-left: var(--space-1);
}

.credit-field input,
.credit-field select {
  width: 100%;
  box-sizing: border-box;
  height: 42px !important;
  min-height: 42px !important;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: none !important;
  color: var(--text-primary);
  padding: 0 var(--space-3) !important;
  font-size: var(--fontsize-sx, 0.875rem);
  outline: none;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.credit-field input:focus,
.credit-field select:focus {
  border-color: var(--deep-blue);
  background: var(--surface-0);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14) !important;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-1);
}

.primary-action,
.secondary-btn,
.ai-action-btn,
.text-btn {
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.84rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.primary-action {
  height: 40px;
  padding: 0 var(--space-4);
  border: none;
  background: var(--deep-blue-gradient-right);
  color: var(--white);
}

.primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.secondary-btn {
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--deep-blue);
}

.secondary-btn.danger-hover:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.12);
  color: var(--color-expense, #e74c3c);
  border-color: rgba(231, 76, 60, 0.3);
}

.ai-action-btn {
  height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
}

.ai-btn-icon {
  color: var(--ai-accent, #7c3aed);
  font-size: 0.95rem;
}

.ai-action-btn:hover:not(:disabled) {
  border-color: var(--ai-accent, #7c3aed);
  background: rgba(124, 58, 237, 0.08);
  color: var(--ai-accent, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
}

.text-btn {
  height: 40px;
  padding: 0 var(--space-2);
  border: none;
  background: transparent;
  color: var(--text-primary);
}

.text-btn:hover:not(:disabled) {
  color: var(--deep-blue);
}

.primary-action:disabled,
.secondary-btn:disabled,
.ai-action-btn:disabled,
.text-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  filter: none;
}

.credit-error {
  color: var(--color-expense, #e74c3c);
  font-size: var(--fontsize-xs);
  margin-top: var(--space-2);
}

.empty-line {
  margin-top: var(--space-3);
}

@container (max-width: 860px) {
  .credit-charts {
    grid-template-columns: 1fr;
  }

  .credit-metrics {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
}

@container (max-width: 600px) {
  .credit-panel,
  .credit-metric-card {
    padding: var(--space-4);
  }

  .review-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .review-right {
    justify-content: space-between;
  }
}

@container (max-width: 380px) {
  .card-form-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column-reverse;
    width: 100%;
  }

  .modal-actions button {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .credit-charts,
  .credit-metrics {
    grid-template-columns: 1fr;
  }

  .review-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .review-right {
    justify-content: space-between;
  }
}
</style>
