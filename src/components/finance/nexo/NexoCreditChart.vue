<template>
  <NexoAllocationDonut
    title="Crédito por categoria"
    :show-total="true"
    :totals="{ income: 0, expense: summary.expense || 0 }"
    :macro-distribution="summary.categories || []"
    :format-money="formatMoney"
  />
</template>
<script>
import NexoAllocationDonut from "./NexoAllocationDonut.vue";
export default {
  components: { NexoAllocationDonut },
  props: { summary: { type: Object, required: true }, formatMoney: { type: Function, required: true } },
};
</script>
