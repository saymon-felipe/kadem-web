<template>
  <section v-if="pinnedTrackers.length" class="tracking-overview">
    <div class="section-heading"><div><span class="eyebrow">SEU ACOMPANHAMENTO</span><h3>Rastreadores no Overview</h3></div><button type="button" @click="$emit('view-tracking')">Abrir acompanhamento</button></div>
    <div class="widget-grid"><article v-for="tracker in pinnedTrackers" :key="tracker.local_key" class="widget"><span>{{ tracker.group || 'Bem-estar' }}</span><h4>{{ tracker.name }}</h4><strong>{{ latest(tracker) }}</strong><small>{{ count(tracker) }} registro(s) nos últimos 7 dias</small></article></div>
  </section>
</template>

<script>
import { trackerSummary } from "@/services/healthInsights";

export default {
  name: "HealthTrackingOverview",
  props: { trackers: { type: Array, default: () => [] }, widgets: { type: Array, default: () => [] }, checkins: { type: Array, default: () => [] } },
  emits: ["view-tracking"],
  computed: { pinnedTrackers() { return this.trackers.filter((tracker) => !tracker.archived && this.widgets.some((widget) => widget.object_key === tracker.local_key)); } },
  methods: {
    count(tracker) { return trackerSummary(this.checkins, tracker, 7).count; },
    latest(tracker) { const value = trackerSummary(this.checkins, tracker, 7).latest; return value === null ? '—' : `${Array.isArray(value) ? value.join(', ') : value}${tracker.unit ? ` ${tracker.unit}` : ''}`; },
  },
};
</script>

<style scoped>
.tracking-overview { display: grid; gap: var(--space-3); }.section-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap; }.section-heading h3 { margin: 0; color: var(--text-primary); font-size: 1rem; }.eyebrow { color: #e25373; font-size: .68rem; letter-spacing: .07em; font-weight: 800; }.section-heading button { border: 0; background: transparent; color: #a871de; font-weight: 700; cursor: pointer; }.widget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--space-3); }.widget { display: grid; gap: 4px; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-0); padding: var(--space-3); box-shadow: var(--shadow-xs); }.widget span { color: #e25373; font-size: .7rem; font-weight: 800; text-transform: uppercase; }.widget h4 { color: var(--text-primary); margin: 0; font-size: .84rem; }.widget strong { color: var(--text-primary); font-size: 1.25rem; overflow-wrap: anywhere; }.widget small { color: var(--text-muted); }
</style>
