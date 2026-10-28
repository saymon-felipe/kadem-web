<template>
  <SearchableDropdown
    class="review-origin-dropdown"
    :model-value="selectedValue"
    :options="options"
    :disabled="saving"
    :trigger-title="transaction.payment_review_reason"
    @change="selectOrigin"
  >
    <template #trigger>
      <font-awesome-icon :icon="saving ? 'circle-notch' : 'triangle-exclamation'" :spin="saving" />
      <span>{{ saving ? 'Salvando...' : 'Revisar' }}</span>
    </template>
  </SearchableDropdown>
</template>

<script>
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";
import { paymentMethodChoices, cardLabel } from "@/utils/financeCredit";

export default {
  name: "NexoPaymentOriginDropdown",
  components: { SearchableDropdown },
  props: {
    transaction: { type: Object, required: true },
    creditCards: { type: Array, default: () => [] },
    saving: { type: Boolean, default: false },
  },
  emits: ["select"],
  computed: {
    selectedValue() {
      return this.transaction.payment_method === "CREDIT_CARD" && this.transaction.credit_card_id
        ? `card:${this.transaction.credit_card_id}`
        : this.transaction.payment_method || "UNKNOWN";
    },
    options() {
      return paymentMethodChoices(this.transaction.payment_method).flatMap((method) => {
        const option = {
          ...method,
          origin: { payment_method: method.value, credit_card_id: null },
        };
        if (method.value !== "CREDIT_CARD" || this.transaction.type !== "EXPENSE") return [option];
        return [option, ...this.creditCards
          .filter((card) => !Number(card.is_archived) || String(card.id) === String(this.transaction.credit_card_id))
          .map((card) => ({
            value: `card:${card.id}`,
            label: `Crédito · ${cardLabel(card)}${Number(card.is_archived) ? ' (arquivado)' : ''}`,
            origin: { payment_method: "CREDIT_CARD", credit_card_id: card.id },
          }))];
      });
    },
  },
  methods: {
    selectOrigin(value) {
      const option = this.options.find((item) => item.value === value);
      if (option && !this.saving) this.$emit("select", option.origin);
    },
  },
};
</script>

<style scoped>
.review-origin-dropdown {
  width: auto;
  display: inline-flex;
}

.review-origin-dropdown :deep(.dropdown-trigger) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: auto;
  height: auto;
  min-height: 0;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.review-origin-dropdown :deep(.dropdown-trigger:hover),
.review-origin-dropdown :deep(.dropdown-trigger.is-open) {
  background: rgba(245, 158, 11, 0.22);
}

.review-origin-dropdown :deep(.dropdown-trigger:hover:not(:disabled)) {
  transform: translateY(-1px);
}

.review-origin-dropdown :deep(.dropdown-trigger:focus-visible) {
  outline: 2px solid var(--color-info) !important;
  outline-offset: 2px;
}

.review-origin-dropdown :deep(.dropdown-trigger:disabled) {
  opacity: 0.65;
  cursor: wait;
}

[data-theme="dark"] .review-origin-dropdown :deep(.dropdown-trigger) {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.14);
}

[data-theme="dark"] .review-origin-dropdown :deep(.dropdown-trigger:hover),
[data-theme="dark"] .review-origin-dropdown :deep(.dropdown-trigger.is-open) {
  background: rgba(251, 191, 36, 0.24);
}
</style>
