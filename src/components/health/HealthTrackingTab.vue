<template>
  <div class="health-tracking-tab">
    <!-- Cabeçalho padronizado idêntico a Rotinas & Agendas / Nexo -->
    <div class="tracking-header">
      <div class="heading-copy">
        <span class="eyebrow">DIÁRIO PESSOAL</span>
        <h3>Acompanhamento & Diário de Saúde</h3>
        <p>Registre como você se sente, sintomas, hábitos e ocorrências ao longo do dia.</p>
      </div>

      <div class="header-actions">
        <!-- Filtros rápidos por grupo -->
        <div v-if="activeTrackers.length" class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: selectedGroupFilter === 'ALL' }"
            type="button"
            @click="selectedGroupFilter = 'ALL'"
          >
            Todos ({{ activeTrackers.length }})
          </button>

          <button
            v-for="grp in groupFilterList"
            :key="grp.name"
            class="filter-pill"
            :class="{ active: selectedGroupFilter === grp.name }"
            type="button"
            @click="selectedGroupFilter = grp.name"
          >
            <font-awesome-icon :icon="grp.icon || 'folder'" />
            <span>{{ grp.name }} ({{ grp.count }})</span>
          </button>
        </div>

        <div class="action-buttons-group">
          <button
            class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
            type="button"
            @click="$emit('new-group')"
          >
            <font-awesome-icon icon="folder-plus" />
            <span>Novo Grupo</span>
          </button>

          <button
            class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
            type="button"
            @click="$emit('new-tracker')"
          >
            <font-awesome-icon icon="sliders" />
            <span>Novo Rastreador</span>
          </button>

          <button
            class="kadem-health-button kadem-health-button--primary kadem-health-button--compact"
            type="button"
            @click="$emit('new-checkin')"
          >
            <font-awesome-icon icon="plus" />
            <span>Check-in</span>
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="tracking-error">
      <font-awesome-icon icon="triangle-exclamation" />
      <span>{{ error }}</span>
    </p>

    <!-- Estado Vazio Geral de Rastreadores -->
    <HealthEmptyState
      v-if="!trackers.length"
      icon="heart-pulse"
      title="Monte seu diário de saúde"
      text="Crie escalas, medições, hábitos e sintomas organizados por grupos. O que você registrar aqui alimentará suas análises e check-ins."
      action-label="Criar Primeiro Rastreador"
      @action="$emit('new-tracker')"
    >
      <template #extra>
        <div class="empty-extra-actions">
          <button
            class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
            type="button"
            :disabled="loadingTemplate"
            @click="$emit('add-template')"
          >
            <font-awesome-icon v-if="loadingTemplate" icon="spinner" spin />
            <span>{{ loadingTemplate ? 'Adicionando…' : 'Usar modelo Digestão & Bem-estar' }}</span>
          </button>
          <small class="template-note">O modelo é opcional e todos os campos podem ser editados ou arquivados.</small>
        </div>
      </template>
    </HealthEmptyState>

    <template v-else>
      <!-- Seção 1: Rastreadores Ativos -->
      <section class="tab-section">
        <div class="section-title-bar">
          <div>
            <h4>Seus Rastreadores</h4>
            <span class="section-sub">{{ filteredTrackers.length }} exibido(s) de {{ activeTrackers.length }} ativo(s)</span>
          </div>

          <div class="section-actions">
            <button
              v-if="!activeTrackers.length"
              type="button"
              class="kadem-health-button kadem-health-button--primary kadem-health-button--compact"
              @click="$emit('new-tracker')"
            >
              <font-awesome-icon icon="plus" />
              <span>Novo Rastreador</span>
            </button>
          </div>
        </div>

        <div v-if="!filteredTrackers.length" class="empty-filter-notice">
          <p>Nenhum rastreador encontrado no grupo “{{ selectedGroupFilter }}”.</p>
          <button type="button" class="text-link-btn" @click="selectedGroupFilter = 'ALL'">
            Ver todos os rastreadores
          </button>
        </div>

        <div v-else class="object-grid">
          <article
            v-for="tracker in filteredTrackers"
            :key="tracker.local_key"
            class="object-card tracker-card"
            :style="{ borderTopColor: groupColor(tracker.group) }"
          >
            <div class="card-top">
              <div class="type-badge badge-tracker">
                <font-awesome-icon :icon="typeIcon(tracker.value_type)" />
                <span>{{ typeLabel(tracker) }}</span>
              </div>

              <div class="group-pill" :style="{ borderColor: groupColor(tracker.group), color: groupColor(tracker.group) }">
                <span class="group-dot" :style="{ backgroundColor: groupColor(tracker.group) }"></span>
                <span>{{ tracker.group || 'Geral' }}</span>
              </div>
            </div>

            <h4 class="object-title" :title="tracker.name">{{ tracker.name }}</h4>

            <div class="card-body">
              <div v-if="tracker.notes" class="tracker-notes">
                <font-awesome-icon icon="circle-info" />
                <span>{{ tracker.notes }}</span>
              </div>

              <div class="tracker-status-row">
                <span class="status-label">Último registro</span>
                <strong class="status-val">{{ latestValueDisplay(tracker) }}</strong>
              </div>

              <div class="tracker-activity-row">
                <span class="activity-text">
                  <font-awesome-icon icon="clock-rotate-left" />
                  {{ recentCount(tracker) }} registro(s) nos últimos 7 dias
                </span>
              </div>
            </div>

            <div class="card-actions">
              <button
                class="action-btn"
                type="button"
                title="Editar rastreador"
                @click="$emit('edit-tracker', tracker)"
              >
                <font-awesome-icon icon="pen" />
                <span>Editar</span>
              </button>

              <button
                class="action-btn danger-hover"
                type="button"
                title="Arquivar rastreador"
                @click="$emit('archive-tracker', tracker)"
              >
                <font-awesome-icon icon="box-archive" />
                <span>Arquivar</span>
              </button>
            </div>
          </article>
        </div>

        <div class="template-helper-row">
          <button
            type="button"
            class="text-link-btn"
            :disabled="loadingTemplate"
            @click="$emit('add-template')"
          >
            <font-awesome-icon icon="wand-magic-sparkles" />
            <span>{{ loadingTemplate ? 'Adicionando…' : 'Adicionar campos do modelo Digestão & Bem-estar' }}</span>
          </button>
          <span v-if="archivedCount" class="archived-notice">
            {{ archivedCount }} rastreador(es) arquivado(s), preservados no histórico.
          </span>
        </div>
      </section>

      <!-- Seção 2: Nova Seção - Grupos de Rastreadores (Gerenciamento) -->
      <section class="tab-section groups-management-section">
        <div class="section-title-bar">
          <div>
            <h4>Grupos de Rastreadores</h4>
            <span class="section-sub">Categorize seus sintomas, hábitos, medições e rotinas diárias.</span>
          </div>

          <div class="section-actions">
            <button
              class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
              type="button"
              @click="$emit('new-group')"
            >
              <font-awesome-icon icon="plus" />
              <span>Novo Grupo</span>
            </button>
          </div>
        </div>

        <div class="groups-grid">
          <article
            v-for="grp in displayGroups"
            :key="grp.local_key || grp.name"
            class="group-card"
          >
            <div class="group-card-header">
              <div class="group-identity">
                <div class="group-icon-avatar" :style="{ backgroundColor: grp.color || '#8d5fd3' }">
                  <font-awesome-icon :icon="grp.icon || 'folder'" />
                </div>
                <div>
                  <h5 class="group-name">{{ grp.name }}</h5>
                  <span class="group-badge-count">
                    {{ countTrackersInGroup(grp.name) }} rastreador{{ countTrackersInGroup(grp.name) === 1 ? '' : 'es' }}
                  </span>
                </div>
              </div>

              <div class="group-card-actions">
                <button
                  type="button"
                  class="group-icon-btn"
                  title="Editar grupo"
                  @click="$emit('edit-group', grp)"
                >
                  <font-awesome-icon icon="pen" />
                </button>
                <button
                  type="button"
                  class="group-icon-btn danger-btn"
                  title="Excluir grupo"
                  @click="$emit('delete-group', grp)"
                >
                  <font-awesome-icon icon="trash-can" />
                </button>
              </div>
            </div>

            <p class="group-desc">
              {{ grp.description || 'Sem descrição cadastrada.' }}
            </p>
          </article>
        </div>
      </section>

      <!-- Seção 3: Análises & Insights -->
      <HealthTrackingInsights :trackers="trackers" :checkins="checkins" />

      <!-- Seção 4: Check-ins Recentes -->
      <section class="tab-section recent-checkins-section">
        <div class="section-title-bar">
          <div>
            <h4>Check-ins Recentes</h4>
            <span class="section-sub">{{ checkins.length }} registro(s) realizados</span>
          </div>
          <button
            class="kadem-health-button kadem-health-button--primary kadem-health-button--compact"
            type="button"
            @click="$emit('new-checkin')"
          >
            <font-awesome-icon icon="plus" />
            <span>Fazer Check-in</span>
          </button>
        </div>

        <div v-if="!checkins.length" class="empty-filter-notice">
          <p>Nenhum check-in registrado ainda. Faça seu primeiro registro para ver seu histórico aqui.</p>
        </div>

        <div v-else class="checkins-card-list">
          <article
            v-for="event in checkins.slice(0, 8)"
            :key="event.local_key"
            class="checkin-row-card"
          >
            <div class="checkin-time-box">
              <font-awesome-icon icon="calendar-check" />
              <time>{{ formatDate(event.occurred_at) }}</time>
            </div>

            <div class="checkin-content-box">
              <div v-if="checkinItems(event).length" class="checkin-chips-cloud">
                <span
                  v-for="item in checkinItems(event)"
                  :key="item.key"
                  class="checkin-item-chip"
                >
                  <span class="chip-item-label">{{ item.label }}:</span>
                  <strong class="chip-item-val">{{ item.value }}</strong>
                </span>
                <span v-if="checkinRemainingCount(event) > 0" class="chip-item-more">
                  +{{ checkinRemainingCount(event) }}
                </span>
              </div>
              <p v-else class="checkin-values-preview">Check-in sem medições registradas</p>

              <small v-if="event.notes" class="checkin-notes-text">
                <font-awesome-icon icon="notes-medical" /> {{ event.notes }}
              </small>
            </div>

            <div class="checkin-action-box">
              <button
                type="button"
                class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
                @click="$emit('correct-checkin', event)"
              >
                <font-awesome-icon icon="pen" />
                <span>Corrigir</span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import HealthTrackingInsights from "./HealthTrackingInsights.vue";
import HealthEmptyState from "./HealthEmptyState.vue";
import { trackerSummary } from "@/services/healthInsights";

export default {
  name: "HealthTrackingTab",
  components: {
    HealthTrackingInsights,
    HealthEmptyState,
  },
  props: {
    trackers: { type: Array, default: () => [] },
    groups: { type: Array, default: () => [] },
    checkins: { type: Array, default: () => [] },
    widgets: { type: Array, default: () => [] },
    formatDate: { type: Function, required: true },
    loadingTemplate: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: [
    "new-tracker",
    "edit-tracker",
    "archive-tracker",
    "new-checkin",
    "correct-checkin",
    "add-template",
    "new-group",
    "edit-group",
    "delete-group",
  ],
  data() {
    return {
      selectedGroupFilter: "ALL",
    };
  },
  computed: {
    activeTrackers() {
      return this.trackers.filter((tracker) => !tracker.archived);
    },
    archivedCount() {
      return this.trackers.length - this.activeTrackers.length;
    },
    displayGroups() {
      if (this.groups.length) return this.groups;
      const seen = new Set();
      const list = [];
      for (const t of this.trackers) {
        const name = (t.group || "Geral").trim();
        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({
            name,
            description: `Grupo de ${name}`,
            icon: "folder",
            color: "#8d5fd3",
          });
        }
      }
      return list;
    },
    groupFilterList() {
      const counts = {};
      for (const t of this.activeTrackers) {
        const g = (t.group || "Geral").trim();
        counts[g] = (counts[g] || 0) + 1;
      }
      return Object.entries(counts).map(([name, count]) => {
        const found = this.displayGroups.find(
          (grp) => (grp.name || "").toLowerCase() === name.toLowerCase(),
        );
        return {
          name,
          count,
          icon: found?.icon || "folder",
        };
      });
    },
    filteredTrackers() {
      if (this.selectedGroupFilter === "ALL") return this.activeTrackers;
      return this.activeTrackers.filter(
        (t) => (t.group || "Geral").toLowerCase().trim() === this.selectedGroupFilter.toLowerCase().trim(),
      );
    },
  },
  methods: {
    countTrackersInGroup(groupName) {
      return this.activeTrackers.filter(
        (t) => (t.group || "").toLowerCase().trim() === (groupName || "").toLowerCase().trim(),
      ).length;
    },
    groupColor(groupName) {
      if (!groupName) return "#e25373";
      const found = this.displayGroups.find(
        (g) => (g.name || "").toLowerCase() === groupName.toLowerCase(),
      );
      return found?.color || "#8d5fd3";
    },
    typeIcon(valueType) {
      const map = {
        SCALE: "sliders",
        NUMBER: "hashtag",
        SINGLE: "circle-dot",
        MULTI: "square-check",
        TAGS: "tags",
        TEXT: "align-left",
        BOOLEAN: "toggle-on",
      };
      return map[valueType] || "circle";
    },
    typeLabel(tracker) {
      const map = {
        SCALE: `Escala ${tracker.min_value}–${tracker.max_value}`,
        NUMBER: `Número${tracker.unit ? ` · ${tracker.unit}` : ''}`,
        SINGLE: "Uma opção",
        MULTI: "Várias opções",
        TAGS: "Tags livres",
        TEXT: "Texto livre",
        BOOLEAN: "Sim ou não",
      };
      return map[tracker.value_type] || "Registro";
    },
    latestValueDisplay(tracker) {
      const summary = trackerSummary(this.checkins, tracker, 7);
      if (summary.latest === null || summary.latest === undefined) return "Nenhum ainda";
      if (Array.isArray(summary.latest)) {
        return summary.latest.length ? summary.latest.join(", ") : "—";
      }
      if (typeof summary.latest === "boolean") {
        return summary.latest ? "Sim" : "Não";
      }
      return `${summary.latest}${tracker.unit ? ` ${tracker.unit}` : ''}`;
    },
    recentCount(tracker) {
      return trackerSummary(this.checkins, tracker, 7).count;
    },
    preview(event) {
      const entries = Object.entries(event.values || {}).slice(0, 4);
      if (!entries.length) return "Check-in sem medições registradas";
      return entries
        .map(([key, value]) => {
          const tracker = this.trackers.find((item) => item.local_key === key);
          const label = tracker?.name || "Campo";
          const valStr = Array.isArray(value) ? value.join(", ") : typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value;
          return `${label}: ${valStr}`;
        })
        .join(" · ");
    },
    checkinItems(event) {
      const entries = Object.entries(event.values || {}).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      );
      return entries.slice(0, 5).map(([key, value]) => {
        const tracker = this.trackers.find((item) => item.local_key === key);
        const label = tracker?.name || "Campo";
        const valStr = Array.isArray(value)
          ? value.length
            ? value.join(", ")
            : "—"
          : typeof value === "boolean"
            ? value
              ? "Sim"
              : "Não"
            : `${value}${tracker?.unit ? ` ${tracker.unit}` : ""}`;
        return { key, label, value: valStr };
      });
    },
    checkinRemainingCount(event) {
      const entries = Object.entries(event.values || {}).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      );
      return Math.max(0, entries.length - 5);
    },
  },
};
</script>

<style scoped>
.health-tracking-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-bottom: var(--space-6);
}

.tracking-header {
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

.heading-copy h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
}

.heading-copy p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.filter-pill.active {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(226, 83, 115, 0.25);
}

.compact-btn {
  padding: 7px 14px;
  font-size: 0.82rem;
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
  box-shadow: 0 4px 10px rgba(226, 83, 115, 0.25);
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
  transform: translateY(-1px);
}

.tracking-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-expense, #ef4444);
  background: rgba(239, 68, 68, 0.1);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin: 0;
}

.empty-extra-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: var(--space-3);
}

.template-note {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.tab-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.section-title-bar h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.empty-filter-notice {
  padding: var(--space-6);
  text-align: center;
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--glass-border);
  color: var(--text-secondary);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-filter-notice p {
  margin: 0;
}

.text-link-btn {
  background: transparent;
  border: none;
  color: #e25373;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.text-link-btn:hover {
  background: rgba(226, 83, 115, 0.1);
  color: #8d5fd3;
}

.object-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.object-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.object-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.tracker-card {
  border-top: 3px solid #e25373;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
}

.badge-tracker {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
}

.group-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--surface-1);
}

.group-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.object-title {
  margin: 0 0 var(--space-3);
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.tracker-notes {
  font-size: 0.78rem;
  color: var(--text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}

.tracker-status-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid var(--glass-border);
}

.status-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.status-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
}

.tracker-activity-row {
  display: flex;
  align-items: center;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.activity-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.action-btn {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.action-btn.danger-hover:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.template-helper-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.archived-notice {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* Grupos de Rastreadores Grid */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.group-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.group-card:hover {
  transform: translateY(-1px);
  border-color: rgba(141, 95, 211, 0.4);
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.group-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-icon-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.group-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary);
}

.group-badge-count {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.group-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.group-icon-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
  border-color: var(--glass-border);
}

.group-icon-btn.danger-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.group-desc {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Check-ins Recentes Lista */
.checkins-card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkin-row-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast);
}

.checkin-row-card:hover {
  transform: translateY(-1px);
}

.checkin-time-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #e25373;
  min-width: 140px;
}

.checkin-content-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.checkin-chips-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.checkin-item-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.76rem;
  line-height: 1.3;
}

.chip-item-label {
  color: var(--text-muted);
  font-weight: 500;
}

.chip-item-val {
  color: var(--text-primary);
  font-weight: 700;
}

.chip-item-more {
  font-size: 0.72rem;
  font-weight: 700;
  color: #e25373;
  background: rgba(226, 83, 115, 0.1);
  padding: 2px 7px;
  border-radius: 10px;
}

.checkin-values-preview {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

.checkin-notes-text {
  color: var(--text-secondary);
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

@media (max-width: 720px) {
  .checkin-row-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .checkin-action-box {
    align-self: flex-end;
  }
}
</style>
