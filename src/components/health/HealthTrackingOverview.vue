<template>
  <section class="tracking-overview-card">
    <div class="overview-header">
      <div class="heading-copy">
        <span class="eyebrow">DIÁRIO PESSOAL</span>
        <h3 class="overview-title">
          <font-awesome-icon icon="heart-pulse" class="title-icon" />
          <span>Resumo do Acompanhamento</span>
        </h3>
      </div>

      <div class="header-actions">
        <button
          v-if="activeTrackers.length"
          type="button"
          class="kadem-health-button kadem-health-button--primary kadem-health-button--compact"
          @click="$emit('new-checkin')"
        >
          <font-awesome-icon icon="plus" />
          <span>Fazer Check-in</span>
        </button>

        <button
          type="button"
          class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
          @click="$emit('view-tracking')"
        >
          <font-awesome-icon icon="arrow-up-right-from-square" />
          <span>Ver Acompanhamento</span>
        </button>
      </div>
    </div>

    <!-- Onboarding / Sem rastreadores -->
    <div v-if="!activeTrackers.length" class="empty-banner">
      <div class="banner-icon">
        <font-awesome-icon icon="heart-pulse" />
      </div>
      <div class="banner-content">
        <h4>Comece a acompanhar seu bem-estar</h4>
        <p>Cadastre sintomas, sono, disposição, hábitos e alimentação para monitorar sua saúde dia a dia.</p>
      </div>
      <button type="button" class="kadem-health-button kadem-health-button--primary kadem-health-button--compact" @click="$emit('view-tracking')">
        Configurar Rastreadores
      </button>
    </div>

    <template v-else>
      <!-- Faixa de Destaques / KPIs do Acompanhamento -->
      <div class="highlights-row">
        <div class="highlight-pill" :class="{ 'is-recent': isCheckinToday }">
          <font-awesome-icon :icon="isCheckinToday ? 'circle-check' : 'clock'" />
          <span>Último check-in: <strong>{{ lastCheckinLabel }}</strong></span>
        </div>

        <div class="highlight-pill">
          <font-awesome-icon icon="sliders" />
          <span><strong>{{ activeTrackers.length }}</strong> rastreadores ativos</span>
        </div>

        <div class="highlight-pill">
          <font-awesome-icon icon="calendar-check" />
          <span><strong>{{ checkinsInLast7Days }}</strong> registros nos últimos 7 dias</span>
        </div>
      </div>

      <!-- Grade de Rastreadores Ativos -->
      <div class="trackers-summary-grid">
        <article
          v-for="tracker in activeTrackers"
          :key="tracker.local_key"
          class="summary-tracker-card"
        >
          <div class="card-head">
            <span
              class="group-tag"
              :style="{ borderColor: groupColor(tracker.group), color: groupColor(tracker.group) }"
            >
              <span class="group-dot" :style="{ backgroundColor: groupColor(tracker.group) }"></span>
              {{ tracker.group || 'Geral' }}
            </span>
            <small class="count-tag">{{ trackerSummaryData(tracker).count }} reg. (7d)</small>
          </div>

          <h5 class="tracker-name" :title="tracker.name">{{ tracker.name }}</h5>

          <div class="tracker-metric">
            <span class="metric-val">{{ latestValue(tracker) }}</span>
            <span v-if="tracker.unit && hasRecordedValue(tracker)" class="metric-unit">
              {{ tracker.unit }}
            </span>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script>
import { trackerSummary } from "@/services/healthInsights";

export default {
  name: "HealthTrackingOverview",
  props: {
    trackers: { type: Array, default: () => [] },
    checkins: { type: Array, default: () => [] },
    groups: { type: Array, default: () => [] },
  },
  emits: ["view-tracking", "new-checkin"],
  computed: {
    activeTrackers() {
      return this.trackers.filter((tracker) => !tracker.archived);
    },
    latestCheckin() {
      if (!this.checkins.length) return null;
      const sorted = [...this.checkins].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );
      return sorted[0];
    },
    isCheckinToday() {
      if (!this.latestCheckin) return false;
      const today = new Date().toDateString();
      const checkinDate = new Date(this.latestCheckin.occurred_at).toDateString();
      return today === checkinDate;
    },
    lastCheckinLabel() {
      if (!this.latestCheckin) return "Nenhum ainda";
      const d = new Date(this.latestCheckin.occurred_at);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const timeStr = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);

      if (diffDays === 0) return `Hoje às ${timeStr}`;
      if (diffDays === 1) return `Ontem às ${timeStr}`;
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    },
    checkinsInLast7Days() {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return this.checkins.filter((c) => new Date(c.occurred_at) >= cutoff).length;
    },
  },
  methods: {
    trackerSummaryData(tracker) {
      return trackerSummary(this.checkins, tracker, 7);
    },
    hasRecordedValue(tracker) {
      const summary = this.trackerSummaryData(tracker);
      return summary.latest !== null && summary.latest !== undefined;
    },
    latestValue(tracker) {
      const summary = this.trackerSummaryData(tracker);
      if (summary.latest === null || summary.latest === undefined) return "—";
      if (Array.isArray(summary.latest)) {
        return summary.latest.length ? summary.latest.join(", ") : "—";
      }
      if (typeof summary.latest === "boolean") {
        return summary.latest ? "Sim" : "Não";
      }
      return String(summary.latest);
    },
    groupColor(groupName) {
      if (!groupName) return "#e25373";
      const found = (this.groups || []).find(
        (g) => (g.name || "").toLowerCase() === groupName.toLowerCase(),
      );
      return found?.color || "#8d5fd3";
    },
  },
};
</script>

<style scoped>
.tracking-overview-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  box-shadow: var(--shadow-card);
  border-left: 4px solid #e25373;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.heading-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eyebrow {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e25373;
}

.overview-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #e25373;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.compact-btn {
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.primary-action.compact-btn {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 10px rgba(226, 83, 115, 0.2);
}

.primary-action.compact-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.secondary-btn.compact-btn {
  background: var(--surface-1);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.secondary-btn.compact-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.highlights-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}

.highlight-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  background: var(--surface-1);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
}

.highlight-pill strong {
  color: var(--text-primary);
}

.highlight-pill.is-recent {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.highlight-pill.is-recent strong {
  color: #10b981;
}

.trackers-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-top: 2px;
}

.summary-tracker-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.summary-tracker-card:hover {
  transform: translateY(-1px);
  border-color: rgba(226, 83, 115, 0.4);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.group-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: var(--surface-0);
}

.group-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.count-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.tracker-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tracker-metric {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-unit {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--glass-border);
}

.banner-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.banner-content {
  flex: 1;
}

.banner-content h4 {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.banner-content p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .empty-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
