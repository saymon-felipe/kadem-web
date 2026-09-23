<template>
  <div class="health-shell custom-scrollbar">
    <!-- Cabeçalho idêntico ao padrão Nexo (título, recarregar, novo objeto, lançamento) -->
    <HealthHeader
      :loading="isLoading"
      @reload="loadRecords"
      @new-object="openNewObjectModal('SCHEDULE')"
      @new-action="openNewActionModal('SCHEDULE')"
    />

    <!-- Abas com navegação suave e badges dinâmicos -->
    <HealthTabs
      :tabs="computedTabs"
      :active-tab="activeTab"
      @update:activeTab="activeTab = $event"
    />

    <!-- Estado de Erro -->
    <div v-if="error" class="health-error">
      <font-awesome-icon icon="triangle-exclamation" />
      <span>{{ error }}</span>
      <button type="button" class="retry-btn" @click="loadRecords">Tentar novamente</button>
    </div>

    <!-- Estado de Carregamento Inicial -->
    <div v-else-if="isLoading && !objects.length && !events.length" class="health-loading">
      <font-awesome-icon icon="circle-notch" spin />
      <span>Carregando Kadem Health…</span>
    </div>

    <!-- Viewport das Abas com transição deslizante idêntica ao Nexo -->
    <div v-else class="tab-viewport">
      <div class="tabs-track" :style="trackStyle">
        <!-- Aba 0: Visão Geral (Dashboard 2-colunas) -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthOverviewTab
            :schedules="schedules"
            :supplies="supplies"
            :events="events"
            :next-due-schedule="nextDueSchedule"
            :next-due-at="nextDueAt"
            :due-label="dueLabel"
            :due-days="dueDays"
            :due-class="nextDueClass"
            :due-icon="nextDueIcon"
            :schedule-due-class="scheduleDueClass"
            :schedule-due-icon="scheduleDueIcon"
            :frequency-label="frequencyLabel"
            :linked-supply-text="linkedSupplyText"
            :supply-balance="supplyBalance"
            :is-low-stock="isLowStock"
            :stock-percentage="stockPercentage"
            :low-stock-count="lowStockCount"
            :format-number="formatNumber"
            :format-date="formatDate"
            @complete-schedule="handleDirectCompleteSchedule"
            @quick-consume="handleQuickConsume"
            @quick-receive="handleQuickReceive"
            @view-schedules="activeTab = 'schedules'"
            @view-supplies="activeTab = 'supplies'"
            @view-timeline="activeTab = 'timeline'"
            @new-schedule="openNewObjectModal('SCHEDULE')"
            @new-supply="openNewObjectModal('SUPPLY')"
            @new-event="openNewActionModal('OBSERVATION')"
          />
        </section>

        <!-- Aba 1: Rotinas & Agendas -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthObjectsTab
            :objects="schedules"
            :schedules="schedules"
            :supplies="supplies"
            :relations="relations"
            :widgets="widgets"
            :next-due-at="nextDueAt"
            :due-label="dueLabel"
            :schedule-due-class="scheduleDueClass"
            :frequency-label="frequencyLabel"
            :supply-balance="supplyBalance"
            :is-low-stock="isLowStock"
            :stock-percentage="stockPercentage"
            :format-number="formatNumber"
            :format-date="formatDate"
            @new-object="openNewObjectModal('SCHEDULE')"
            @link-supply="openRelationModal"
            @complete-schedule="handleDirectCompleteSchedule"
            @add-widget="addWidget"
            @remove-widget="removeWidget"
          />
        </section>

        <!-- Aba 2: Insumos & Estoque -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthObjectsTab
            :objects="supplies"
            :schedules="schedules"
            :supplies="supplies"
            :relations="relations"
            :widgets="widgets"
            :next-due-at="nextDueAt"
            :due-label="dueLabel"
            :schedule-due-class="scheduleDueClass"
            :frequency-label="frequencyLabel"
            :supply-balance="supplyBalance"
            :is-low-stock="isLowStock"
            :stock-percentage="stockPercentage"
            :format-number="formatNumber"
            :format-date="formatDate"
            @new-object="openNewObjectModal('SUPPLY')"
            @quick-consume="handleQuickConsume"
            @quick-receive="handleQuickReceive"
            @add-widget="addWidget"
            @remove-widget="removeWidget"
          />
        </section>

        <!-- Aba 3: Linha do Tempo (Ledger Completo) -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthActivityTab
            :events="events"
            :format-date="formatDate"
            :format-number="formatNumber"
            @new-event="openNewActionModal('OBSERVATION')"
            @delete-event="requestDeleteEvent"
          />
        </section>
      </div>
    </div>

    <!-- Modal de Lançamento Rápido -->
    <HealthActionModal
      :visible="showActionModal"
      :initial-type="actionModalType"
      :initial-object-key="actionModalKey"
      :schedules="schedules"
      :supplies="supplies"
      :objects="objects"
      :relations="relations"
      :supply-balance="supplyBalance"
      :loading="isSubmittingAction"
      :error="actionError"
      @close="showActionModal = false"
      @submit="submitAction"
    />

    <!-- Modal de Criação de Objeto -->
    <HealthObjectModal
      :visible="showObjectModal"
      :initial-type="objectModalType"
      :loading="isSubmittingObject"
      :error="objectError"
      @close="showObjectModal = false"
      @submit="submitObject"
    />

    <!-- Modal de Relação (Vínculo de Insumo com Agenda) -->
    <HealthRelationModal
      :visible="showRelationModal"
      :initial-schedule-key="relationScheduleKey"
      :schedules="schedules"
      :supplies="supplies"
      :supply-balance="supplyBalance"
      :loading="isSubmittingRelation"
      :error="relationError"
      @close="showRelationModal = false"
      @submit="submitRelation"
    />

    <ConfirmationModal
      :model-value="showDeleteEventConfirmation"
      message="Excluir esta movimentação?"
      description="Ela será removida agora desta linha do tempo."
      confirm-text="Excluir"
      @cancelled="cancelDeleteEvent"
      @confirmed="confirmDeleteEvent"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useHealthStore } from "@/stores/health";

import HealthHeader from "@/components/health/HealthHeader.vue";
import HealthTabs from "@/components/health/HealthTabs.vue";
import HealthOverviewTab from "@/components/health/HealthOverviewTab.vue";
import HealthObjectsTab from "@/components/health/HealthObjectsTab.vue";
import HealthActivityTab from "@/components/health/HealthActivityTab.vue";
import HealthActionModal from "@/components/health/HealthActionModal.vue";
import HealthObjectModal from "@/components/health/HealthObjectModal.vue";
import HealthRelationModal from "@/components/health/HealthRelationModal.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";

export default {
  name: "HealthWindow",
  components: {
    HealthHeader,
    HealthTabs,
    HealthOverviewTab,
    HealthObjectsTab,
    HealthActivityTab,
    HealthActionModal,
    HealthObjectModal,
    HealthRelationModal,
    ConfirmationModal,
  },
  data() {
    return {
      activeTab: "overview",
      // Modais
      showActionModal: false,
      actionModalType: "SCHEDULE",
      actionModalKey: "",
      isSubmittingAction: false,
      actionError: "",

      showObjectModal: false,
      objectModalType: "SCHEDULE",
      isSubmittingObject: false,
      objectError: "",

      showRelationModal: false,
      relationScheduleKey: "",
      isSubmittingRelation: false,
      relationError: "",

      showDeleteEventConfirmation: false,
      eventPendingDeletion: null,
    };
  },
  computed: {
    ...mapState(useHealthStore, [
      "objects",
      "relations",
      "events",
      "widgets",
      "schedules",
      "supplies",
      "isLoading",
      "error",
    ]),
    computedTabs() {
      return [
        { id: "overview", label: "Visão Geral", icon: "gauge-high" },
        {
          id: "schedules",
          label: "Rotinas & Agendas",
          icon: "calendar-check",
          badge: this.schedules.length || undefined,
        },
        {
          id: "supplies",
          label: "Insumos & Estoque",
          icon: "boxes-stacked",
          badge: this.supplies.length || undefined,
        },
        {
          id: "timeline",
          label: "Linha do Tempo",
          icon: "clock-rotate-left",
          badge: this.events.length || undefined,
        },
      ];
    },
    activeTabIndex() {
      const idx = this.computedTabs.findIndex((tab) => tab.id === this.activeTab);
      return idx >= 0 ? idx : 0;
    },
    trackStyle() {
      const step = 100 / this.computedTabs.length;
      return {
        width: `${this.computedTabs.length * 100}%`,
        transform: `translateX(-${this.activeTabIndex * step}%)`,
      };
    },
    paneStyle() {
      const size = `${100 / this.computedTabs.length}%`;
      return { width: size, flexBasis: size };
    },
    nextDueSchedule() {
      if (!this.schedules.length) return null;
      const sorted = [...this.schedules].sort((a, b) => {
        return new Date(this.nextDueAt(a)) - new Date(this.nextDueAt(b));
      });
      return sorted[0] || null;
    },
    nextDueClass() {
      if (!this.nextDueSchedule) return "status-healthy";
      return this.scheduleDueClass(this.nextDueSchedule);
    },
    nextDueIcon() {
      if (!this.nextDueSchedule) return "circle-check";
      return this.scheduleDueIcon(this.nextDueSchedule);
    },
    lowStockCount() {
      return this.supplies.filter((s) => this.isLowStock(s)).length;
    },
  },
  async mounted() {
    try {
      await this.loadRecords();
    } catch {
      // tratado no store
    }
  },
  methods: {
    ...mapActions(useHealthStore, [
      "loadRecords",
      "findObject",
      "objectRelations",
      "supplyBalance",
      "nextDueAt",
      "createObject",
      "linkConsumption",
      "addWidget",
      "removeWidget",
      "deleteEvent",
      "createEvent",
      "recordSupplyMovement",
      "completeSchedule",
    ]),
    dueDays(schedule) {
      if (!schedule) return null;
      const due = new Date(this.nextDueAt(schedule));
      const now = new Date();
      return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    },
    dueLabel(dateStr) {
      if (!dateStr) return "Sem previsão";
      const due = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return `Atrasado há ${Math.abs(diffDays)}d`;
      if (diffDays === 0) return "Hoje";
      if (diffDays === 1) return "Amanhã";
      return `Em ${diffDays} dias`;
    },
    scheduleDueClass(schedule) {
      const days = this.dueDays(schedule);
      if (days === null) return "status-healthy";
      if (days < 0) return "status-urgent";
      if (days === 0) return "status-today";
      if (days <= 3) return "status-soon";
      return "status-healthy";
    },
    scheduleDueIcon(schedule) {
      const days = this.dueDays(schedule);
      if (days === null) return "circle-check";
      if (days < 0) return "triangle-exclamation";
      if (days === 0) return "clock";
      if (days <= 3) return "bell";
      return "circle-check";
    },
    isLowStock(supply) {
      if (!supply) return false;
      const balance = this.supplyBalance(supply.local_key);
      return balance <= (supply.minimum_quantity || 0);
    },
    stockPercentage(supply) {
      if (!supply) return 0;
      const balance = this.supplyBalance(supply.local_key);
      const min = supply.minimum_quantity || 1;
      const target = Math.max(min * 2.5, 10);
      return Math.min(100, Math.max(0, Math.round((balance / target) * 100)));
    },
    frequencyLabel(schedule) {
      if (!schedule) return "";
      const val = schedule.frequency_value || 1;
      const unitMap = {
        days: val === 1 ? "dia" : "dias",
        weeks: val === 1 ? "semana" : "semanas",
        months: val === 1 ? "mês" : "meses",
      };
      const label = unitMap[schedule.frequency_unit] || schedule.frequency_unit;
      return `A cada ${val} ${label}`;
    },
    linkedSupplyText(schedule) {
      if (!schedule) return "";
      const relations = this.objectRelations(schedule.local_key, "CONSUMES");
      if (!relations.length) return "";
      const rel = relations[0];
      const supply = this.findObject(rel.target_key);
      if (!supply) return "";
      const extra = relations.length > 1 ? ` (+${relations.length - 1})` : "";
      return `${supply.name} (${rel.quantity} ${supply.unit})${extra}`;
    },
    formatNumber(val) {
      const num = Number(val || 0);
      return new Intl.NumberFormat("pt-BR").format(num);
    },
    formatDate(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    },

    // Ações Rápidas
    async handleDirectCompleteSchedule(scheduleKey) {
      try {
        await this.completeSchedule({ object_key: scheduleKey });
      } catch (err) {
        this.actionError = err.message || "Erro ao concluir rotina.";
        this.actionModalType = "SCHEDULE";
        this.actionModalKey = scheduleKey;
        this.showActionModal = true;
      }
    },
    handleQuickConsume(supplyKey) {
      this.actionModalType = "USAGE";
      this.actionModalKey = supplyKey;
      this.showActionModal = true;
    },
    handleQuickReceive(supplyKey) {
      this.actionModalType = "ENTRY";
      this.actionModalKey = supplyKey;
      this.showActionModal = true;
    },
    openRelationModal(scheduleKey) {
      this.relationScheduleKey = scheduleKey || "";
      this.relationError = "";
      this.showRelationModal = true;
    },
    openNewObjectModal(type = "SCHEDULE") {
      this.objectModalType = type;
      this.objectError = "";
      this.showObjectModal = true;
    },
    openNewActionModal(type = "SCHEDULE") {
      this.actionModalType = type;
      this.actionModalKey = "";
      this.actionError = "";
      this.showActionModal = true;
    },
    requestDeleteEvent(event) {
      this.eventPendingDeletion = event;
      this.showDeleteEventConfirmation = true;
    },
    cancelDeleteEvent() {
      this.showDeleteEventConfirmation = false;
      this.eventPendingDeletion = null;
    },
    async confirmDeleteEvent() {
      const event = this.eventPendingDeletion;
      this.cancelDeleteEvent();
      if (!event) return;
      try {
        await this.deleteEvent(event);
      } catch (err) {
        this.actionError = err.message || "Não foi possível excluir a movimentação.";
        this.actionModalType = "OBSERVATION";
        this.showActionModal = true;
      }
    },

    // Submissões de Modais
    async submitAction({ type, payload }) {
      this.isSubmittingAction = true;
      this.actionError = "";
      try {
        if (type === "SCHEDULE") {
          await this.completeSchedule({
            object_key: payload.object_key,
            occurred_at: payload.occurred_at,
            notes: payload.notes,
          });
        } else if (type === "ENTRY" || type === "USAGE") {
          await this.recordSupplyMovement({
            object_key: payload.object_key,
            movement_type: payload.movement_type,
            quantity: payload.quantity,
            occurred_at: payload.occurred_at,
            notes: payload.notes,
          });
        } else {
          await this.createEvent({
            object_key: payload.object_key,
            event_type: "OBSERVATION",
            title: payload.title,
            occurred_at: payload.occurred_at,
            notes: payload.notes,
          });
        }
        this.showActionModal = false;
      } catch (err) {
        this.actionError = err.message || "Não foi possível registrar a atividade.";
      } finally {
        this.isSubmittingAction = false;
      }
    },
    async submitObject(formData) {
      this.isSubmittingObject = true;
      this.objectError = "";
      try {
        const created = await this.createObject(formData);
        if (
          ["SUPPLY", "MEDICATION"].includes(formData.object_type) &&
          Number(formData.initial_stock) > 0 &&
          created?.local_key
        ) {
          await this.recordSupplyMovement({
            object_key: created.local_key,
            movement_type: "ENTRY",
            quantity: Number(formData.initial_stock),
            notes: "Estoque inicial cadastrado",
          });
        }
        this.showObjectModal = false;
      } catch (err) {
        this.objectError = err.message || "Não foi possível criar o objeto.";
      } finally {
        this.isSubmittingObject = false;
      }
    },
    async submitRelation(relationData) {
      this.isSubmittingRelation = true;
      this.relationError = "";
      try {
        await this.linkConsumption(relationData);
        this.showRelationModal = false;
      } catch (err) {
        this.relationError = err.message || "Não foi possível vincular o insumo.";
      } finally {
        this.isSubmittingRelation = false;
      }
    },
  },
};
</script>

<style scoped>
.health-shell {
  height: 100%;
  min-height: 0;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow: hidden;
  background: transparent;
}

.tab-viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.tabs-track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.25, 1);
}

.tab-pane {
  height: 100%;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-1) var(--space-2) var(--space-5) 0;
  box-sizing: border-box;
}

.health-loading,
.health-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}

.health-loading {
  font-size: 1.1rem;
}

.health-error {
  color: var(--red);
  background: var(--red-high);
  border-radius: var(--radius-md);
  margin: var(--space-4);
}

.retry-btn {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
  transition: background var(--transition-fast);
}

.retry-btn:hover {
  background: var(--surface-2);
}
</style>
