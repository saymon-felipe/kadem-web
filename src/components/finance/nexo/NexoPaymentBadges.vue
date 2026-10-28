<template>
  <div v-if="visible" class="payment-badges" aria-label="Meio de pagamento e cartão">
    <span class="payment-pill payment-method-pill">{{ paymentMethodLabel(transaction.payment_method) }}</span>
    <span v-if="transaction.payment_method === 'CREDIT_CARD' && transaction.credit_card_id" class="payment-pill payment-card-pill">{{ cardName }}</span>
  </div>
</template>

<script>
import { paymentMethodLabel, cardLabel } from '@/utils/financeCredit'
import { isGenosNotification } from '@/utils/financeNotificationDisplay'

export default {
  name: 'NexoPaymentBadges',
  props: {
    transaction: { type: Object, required: true },
    creditCards: { type: Array, default: () => [] },
  },
  computed: {
    visible() {
      return isGenosNotification(this.transaction) || Boolean(this.transaction.payment_review_reason || (this.transaction.payment_method && this.transaction.payment_method !== 'UNKNOWN'))
    },
    cardName() {
      return cardLabel(this.creditCards.find(card => String(card.id) === String(this.transaction.credit_card_id)))
    },
  },
  methods: { paymentMethodLabel },
}
</script>

<style scoped>
.payment-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
}
.payment-pill {
  display: inline-flex;
  max-width: 100%;
  padding: 3px 9px;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.payment-method-pill {
  background: color-mix(in srgb, var(--color-info) 10%, var(--surface-1));
  border-color: color-mix(in srgb, var(--color-info) 22%, var(--glass-border));
  color: var(--text-primary);
}
</style>
