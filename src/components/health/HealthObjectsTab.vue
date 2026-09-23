<template>
  <div class="health-objects-tab">
    <div class="objects-header">
      <div class="heading-copy">
        <span class="eyebrow">CONFIGURAÇÃO & ESTRUTURA</span>
        <h3>Objetos de Saúde & Relações</h3>
      </div>

      <div class="header-actions">
        <!-- Filtros -->
        <div class="filter-pills" v-if="objects.length">
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'ALL' }"
            type="button"
            @click="currentFilter = 'ALL'"
          >
            Todos ({{ objects.length }})
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'SCHEDULE' }"
            type="button"
            @click="currentFilter = 'SCHEDULE'"
          >
            <font-awesome-icon icon="calendar" />
            <span>Rotinas ({{ schedules.length }})</span>
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'SUPPLY' }"
            type="button"
            @click="currentFilter = 'SUPPLY'"
          >
            <font-awesome-icon icon="box-archive" />
            <span>Insumos ({{ supplies.length }})</span>
          </button>
          <button
            v-if="otherObjects.length"
            class="filter-pill"
            :class="{ active: currentFilter === 'OTHER' }"
            type="button"
            @click="currentFilter = 'OTHER'"
          >
            <font-awesome-icon icon="layer-group" />
            <span>Outros ({{ otherObjects.length }})</span>
          </button>
        </div>

        <button class="primary-action compact-btn" type="button" @click="$emit('new-object')">
          <font-awesome-icon icon="plus" />
          <span>Novo Objeto</span>
        </button>
      </div>
    </div>

    <HealthEmptyState
      v-if="!objects.length"
      icon="layer-group"
      title="Comece criando seus objetos"
      text="Cadastre rotinas periódicas (aplicação, treino, exames) ou insumos/medicamentos para acompanhar o saldo dinâmico."
      action-label="Criar Primeiro Objeto"
      @action="$emit('new-object')"
    />

    <div v-else class="object-grid">
      <article
        v-for="object in filteredObjects"
        :key="object.local_key"
        class="object-card"
        :class="objectCardClass(object)"
      >
        <div class="card-top">
          <div class="type-badge" :class="objectBadgeClass(object)">
            <font-awesome-icon :icon="objectIcon(object)" />
            <span>{{ typeLabel(object.object_type) }}</span>
          </div>

          <!-- Status / Pin -->
          <div class="top-meta">
            <button
              class="pin-badge-btn"
              :class="{ 'is-pinned': isPinned(object) }"
              :title="isPinned(object) ? 'Fixado no Overview (clique para remover)' : 'Fixar no Overview'"
              type="button"
              @click="togglePin(object)"
            >
              <font-awesome-icon :icon="isPinned(object) ? 'star' : 'star'" />
              <span>{{ isPinned(object) ? 'No Overview' : 'Fixar' }}</span>
            </button>
          </div>
        </div>

        <h4 class="object-title" :title="object.name">{{ object.name }}</h4>

        <div class="card-body">
          <!-- Detalhes de SCHEDULE -->
          <template v-if="object.object_type === 'SCHEDULE'">
            <div class="info-row">
              <span class="info-label">Recorrência</span>
              <strong>{{ frequencyLabel(object) }}</strong>
            </div>

            <div class="info-row">
              <span class="info-label">Próxima prevista</span>
              <span class="due-tag" :class="scheduleDueClass(object)">
                {{ formatDate(nextDueAt(object)) }} ({{ dueLabel(nextDueAt(object)) }})
              </span>
            </div>

            <div class="info-block">
              <span class="info-label">Insumos consumidos por rotina:</span>
              <div v-if="getConsumptionRelations(object).length" class="relations-chips">
                <span
                  v-for="rel in getConsumptionRelations(object)"
                  :key="rel.local_key"
                  class="rel-chip"
                >
                  <font-awesome-icon icon="link" />
                  {{ getSupplyName(rel.target_key) }}: <strong>{{ rel.quantity }} {{ getSupplyUnit(rel.target_key) }}</strong>
                </span>
              </div>
              <span v-else class="no-rel-caption">Nenhum consumo vinculado</span>
            </div>
          </template>

          <!-- Detalhes de SUPPLY -->
          <template v-else-if="object.object_type === 'SUPPLY'">
            <div class="balance-metric">
              <div class="balance-number-wrap">
                <strong class="balance-val">{{ formatNumber(supplyBalance(object.local_key)) }}</strong>
                <span class="balance-unit">{{ object.unit }}</span>
              </div>
              <span class="status-pill" :class="isLowStock(object) ? 'status-warning' : 'status-healthy'">
                <font-awesome-icon :icon="isLowStock(object) ? 'triangle-exclamation' : 'circle-check'" />
                {{ isLowStock(object) ? "Abaixo do mínimo" : "Estoque normal" }}
              </span>
            </div>

            <div class="gauge-container">
              <div class="gauge-track">
                <div
                  class="gauge-fill"
                  :class="{ 'is-low': isLowStock(object) }"
                  :style="{ width: stockPercentage(object) + '%' }"
                ></div>
              </div>
              <div class="gauge-caption">
                <span>Mínimo: {{ formatNumber(object.minimum_quantity || 0) }} {{ object.unit }}</span>
                <span>{{ isLowStock(object) ? "Repor estoque" : "OK" }}</span>
              </div>
            </div>
          </template>

          <!-- Outros tipos -->
          <template v-else>
            <p v-if="object.notes" class="object-notes">{{ object.notes }}</p>
            <p v-else class="no-notes-caption">Sem anotações complementares.</p>
          </template>
        </div>

        <div class="card-footer">
          <template v-if="object.object_type === 'SCHEDULE'">
            <button
              v-if="supplies.length"
              class="footer-btn subtle"
              type="button"
              title="Vincular insumo a esta agenda"
              @click="$emit('link-supply', object.local_key)"
            >
              <font-awesome-icon icon="link" />
              <span>Vincular Insumo</span>
            </button>
            <button
              class="footer-btn primary"
              type="button"
              @click="$emit('complete-schedule', object.local_key)"
            >
              <font-awesome-icon icon="check" />
              <span>Concluir</span>
            </button>
          </template>

          <template v-else-if="object.object_type === 'SUPPLY'">
            <button
              class="footer-btn subtle"
              type="button"
              @click="$emit('quick-consume', object.local_key)"
            >
              <font-awesome-icon icon="arrow-down" />
              <span>Baixa</span>
            </button>
            <button
              class="footer-btn accent"
              type="button"
              @click="$emit('quick-receive', object.local_key)"
            >
              <font-awesome-icon icon="plus" />
              <span>Repor</span>
            </button>
          </template>

          <template v-else>
            <button
              class="footer-btn subtle"
              type="button"
              @click="$emit('record-event', object.local_key)"
            >
              <font-awesome-icon icon="clipboard" />
              <span>Registrar Evento</span>
            </button>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import HealthEmptyState from "./HealthEmptyState.vue";

export default {
  name: "HealthObjectsTab",
  components: {
    HealthEmptyState,
  },
  props: {
    objects: {
      type: Array,
      default: () => [],
    },
    schedules: {
      type: Array,
      default: () => [],
    },
    supplies: {
      type: Array,
      default: () => [],
    },
    relations: {
      type: Array,
      default: () => [],
    },
    widgets: {
      type: Array,
      default: () => [],
    },
    nextDueAt: {
      type: Function,
      required: true,
    },
    dueLabel: {
      type: Function,
      required: true,
    },
    scheduleDueClass: {
      type: Function,
      required: true,
    },
    frequencyLabel: {
      type: Function,
      required: true,
    },
    supplyBalance: {
      type: Function,
      required: true,
    },
    isLowStock: {
      type: Function,
      required: true,
    },
    stockPercentage: {
      type: Function,
      required: true,
    },
    formatNumber: {
      type: Function,
      required: true,
    },
    formatDate: {
      type: Function,
      required: true,
    },
  },
  emits: [
    "new-object",
    "link-supply",
    "complete-schedule",
    "quick-consume",
    "quick-receive",
    "record-event",
    "add-widget",
    "remove-widget",
  ],
  data() {
    return {
      currentFilter: "ALL",
    };
  },
  computed: {
    otherObjects() {
      return this.objects.filter((o) => !["SCHEDULE", "SUPPLY"].includes(o.object_type));
    },
    filteredObjects() {
      if (this.currentFilter === "SCHEDULE") return this.schedules;
      if (this.currentFilter === "SUPPLY") return this.supplies;
      if (this.currentFilter === "OTHER") return this.otherObjects;
      return this.objects;
    },
  },
  methods: {
    typeLabel(type) {
      const map = {
        SCHEDULE: "Agenda / Rotina",
        SUPPLY: "Insumo / Estoque",
        MEDICATION: "Medicação",
        TREATMENT: "Tratamento",
        SYMPTOM: "Sintoma",
        EXAM: "Exame",
        APPOINTMENT: "Consulta",
        DEVICE: "Dispositivo",
        CUSTOM: "Objeto Livre",
      };
      return map[type] || type;
    },
    objectIcon(object) {
      const map = {
        SCHEDULE: "calendar-check",
        SUPPLY: "box-archive",
        MEDICATION: "pills",
        TREATMENT: "stethoscope",
        SYMPTOM: "notes-medical",
        EXAM: "file-waveform",
        APPOINTMENT: "user-doctor",
        DEVICE: "laptop-medical",
        CUSTOM: "cubes",
      };
      return map[object.object_type] || "heart-pulse";
    },
    objectCardClass(object) {
      if (object.object_type === "SCHEDULE") return "card-schedule";
      if (object.object_type === "SUPPLY") return "card-supply";
      return "card-generic";
    },
    objectBadgeClass(object) {
      if (object.object_type === "SCHEDULE") return "badge-schedule";
      if (object.object_type === "SUPPLY") return "badge-supply";
      return "badge-generic";
    },
    isPinned(object) {
      return this.widgets.some((w) => w.object_key === object.local_key);
    },
    togglePin(object) {
      const widget = this.widgets.find((w) => w.object_key === object.local_key);
      if (widget) {
        this.$emit("remove-widget", widget);
      } else {
        this.$emit("add-widget", object.local_key);
      }
    },
    getConsumptionRelations(schedule) {
      return this.relations.filter(
        (r) => r.source_key === schedule.local_key && r.relation_type === "CONSUMES",
      );
    },
    getSupplyName(supplyKey) {
      const supply = this.supplies.find((s) => s.local_key === supplyKey);
      return supply ? supply.name : "Insumo";
    },
    getSupplyUnit(supplyKey) {
      const supply = this.supplies.find((s) => s.local_key === supplyKey);
      return supply ? supply.unit : "";
    },
  },
};
</script>

<style scoped>
.health-objects-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.objects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.heading-copy h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.eyebrow {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e25373;
  margin-bottom: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--surface-1);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.filter-pill.active {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
}

.primary-action.compact-btn {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 10px rgba(226, 83, 115, 0.2);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.primary-action.compact-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
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

.object-card.card-schedule {
  border-top: 3px solid #3b82f6;
}

.object-card.card-supply {
  border-top: 3px solid #e25373;
}

.object-card.card-generic {
  border-top: 3px solid #8d5fd3;
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

.badge-schedule {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.badge-supply {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
}

.badge-generic {
  background: rgba(141, 95, 211, 0.12);
  color: #8d5fd3;
}

.pin-badge-btn {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pin-badge-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.pin-badge-btn.is-pinned {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #d97706;
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

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.78rem;
}

.info-label {
  color: var(--text-secondary);
}

.due-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
}

.due-tag.status-urgent {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.due-tag.status-today {
  background: rgba(245, 158, 11, 0.18);
  color: #d97706;
}

.due-tag.status-soon {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.due-tag.status-healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.relations-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rel-chip {
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.no-rel-caption,
.no-notes-caption {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
}

.balance-metric {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.balance-number-wrap {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.balance-val {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}

.balance-unit {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
}

.status-warning {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.gauge-track {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  overflow: hidden;
}

.gauge-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.35s ease;
}

.gauge-fill.is-low {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.gauge-caption {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.object-notes {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.card-footer {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.footer-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: var(--radius-xs);
  font-size: 0.78rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.footer-btn.primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
}

.footer-btn.accent {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
}

.footer-btn.subtle {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.footer-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}
</style>
