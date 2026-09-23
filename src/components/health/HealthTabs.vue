<template>
  <KademTabs
    :tabs="tabs"
    :active-tab="activeTab"
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
  },
  emits: ["update:activeTab"],
};
</script>
