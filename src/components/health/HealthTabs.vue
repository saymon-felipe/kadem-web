<template>
  <KademTabs
    :tabs="tabs"
    :active-tab="activeTab"
    :is-paid-plan="isPaidPlan"
    variant="health"
    aria-label="Navegação Health"
    @update:activeTab="$emit('update:activeTab', $event)"
  />
</template>

<script>
import KademTabs from "@/components/ui/KademTabs.vue";

export default {
  name: "HealthTabs",
  components: {
    KademTabs,
  },
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    activeTab: {
      type: String,
      required: true,
    },
    isPaidPlan: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:activeTab"],
};
</script>
