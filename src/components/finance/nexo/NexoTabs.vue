<template>
  <KademTabs
    :tabs="tabs"
    :active-tab="activeTab"
    :is-paid-plan="isPaidPlan"
    variant="nexo"
    aria-label="Kadem Nexo"
    @update:activeTab="$emit('update:activeTab', $event)"
  />
</template>

<script>
import KademTabs from '@/components/ui/KademTabs.vue';

export default {
  name: 'NexoTabs',
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
  emits: ['update:activeTab'],
};
</script>
