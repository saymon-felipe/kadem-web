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
      :is-paid-plan="isPaidPlan"
      @update:activeTab="activeTab = $event"
    />

    <!-- Estado de Erro -->
    <div v-if="error" class="health-error">
      <font-awesome-icon icon="triangle-exclamation" />
      <span>{{ error }}</span>
      <button type="button" class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact" @click="loadRecords">Tentar novamente</button>
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
            :trackers="trackers"
            :widgets="widgets"
            :checkins="checkins"
            :groups="trackerGroups"
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
            @view-tracking="activeTab = 'tracking'"
            @new-checkin="openCheckinModal()"
          />
        </section>

        <!-- Aba 1: Rotinas & Agendas -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthObjectsTab
            view-mode="schedules"
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
            view-mode="supplies"
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

        <!-- Aba 3: Acompanhamento pessoal -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthTrackingTab
            :trackers="trackers"
            :groups="trackerGroups"
            :checkins="checkins"
            :widgets="widgets"
            :format-date="formatDate"
            :loading-template="isAddingTemplate"
            :error="trackingError"
            @new-tracker="openTrackerModal()"
            @edit-tracker="openTrackerModal"
            @archive-tracker="requestArchiveTracker"
            @new-checkin="openCheckinModal()"
            @correct-checkin="openCheckinModal"
            @new-group="openTrackerGroupModal()"
            @edit-group="openTrackerGroupModal"
            @delete-group="requestDeleteTrackerGroup"
            @add-template="addTemplate"
          />
        </section>

        <!-- Aba 4: Linha do Tempo (Ledger Completo) -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthActivityTab
            :events="events"
            :trackers="trackers"
            :format-date="formatDate"
            :format-number="formatNumber"
            @new-event="openNewActionModal('OBSERVATION')"
            @delete-event="requestDeleteEvent"
            @correct-checkin="openCheckinModal"
          />
        </section>

        <!-- Aba 5: IA de Saúde & Créditos -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthAiTab
            :can-use-ai="canUseAi"
            :usage="centralizedAiUsage"
            :month-label="currentMonthLabel"
            :loading="isLoadingAiUsage"
            @upgrade="showPlanModal = true"
            @refresh="loadAiUsage"
            @navigate="activeTab = $event"
          />
        </section>

        <!-- Aba 6: Cartão público de saúde -->
        <section class="tab-pane custom-scrollbar" :style="paneStyle">
          <HealthPublicCardTab />
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

    <HealthTrackerModal
      :visible="showTrackerModal"
      :tracker="trackerBeingEdited"
      :groups="trackerGroups"
      :loading="isSubmittingTracker"
      :error="trackerError"
      @close="showTrackerModal = false"
      @submit="submitTracker"
      @new-group="openTrackerGroupModal()"
    />
    <HealthTrackerGroupModal
      :visible="showTrackerGroupModal"
      :group="groupBeingEdited"
      :loading="isSubmittingTrackerGroup"
      :error="trackerGroupError"
      @close="showTrackerGroupModal = false"
      @submit="submitTrackerGroup"
    />
    <HealthCheckinModal :visible="showCheckinModal" :trackers="checkinTrackers" :event="checkinBeingCorrected" :loading="isSubmittingCheckin" :error="checkinError" @close="showCheckinModal = false" @submit="submitCheckin" />

    <ConfirmationModal :model-value="showArchiveTrackerConfirmation" message="Arquivar este rastreador?" description="Ele sairá dos próximos check-ins. Seus registros anteriores continuarão no histórico e nas análises." confirm-text="Confirmar" @cancelled="cancelArchiveTracker" @confirmed="confirmArchiveTracker" />
    <ConfirmationModal
      :model-value="showDeleteTrackerGroupConfirmation"
      message="Excluir este grupo de rastreadores?"
      :description="deleteGroupDescription"
      confirm-text="Excluir Grupo"
      @cancelled="cancelDeleteTrackerGroup"
      @confirmed="confirmDeleteTrackerGroup"
    />

    <ConfirmationModal
      :model-value="showDeleteEventConfirmation"
      message="Excluir esta movimentação?"
      description="Ela será removida agora desta linha do tempo."
      confirm-text="Excluir"
      @cancelled="cancelDeleteEvent"
      @confirmed="confirmDeleteEvent"
    />

    <SubscriptionModal
      v-model="showPlanModal"
      @close="showPlanModal = false"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useHealthStore } from "@/stores/health";
import { useAuthStore } from "@/stores/auth";
import { getPlanLimits } from "@/services/subscription_plans";
import { healthAiService } from "@/services/healthAiService";

import HealthHeader from "@/components/health/HealthHeader.vue";
import HealthTabs from "@/components/health/HealthTabs.vue";
import HealthOverviewTab from "@/components/health/HealthOverviewTab.vue";
import HealthObjectsTab from "@/components/health/HealthObjectsTab.vue";
import HealthActivityTab from "@/components/health/HealthActivityTab.vue";
import HealthActionModal from "@/components/health/HealthActionModal.vue";
import HealthObjectModal from "@/components/health/HealthObjectModal.vue";
import HealthRelationModal from "@/components/health/HealthRelationModal.vue";
import HealthTrackerModal from "@/components/health/HealthTrackerModal.vue";
import HealthTrackerGroupModal from "@/components/health/HealthTrackerGroupModal.vue";
import HealthCheckinModal from "@/components/health/HealthCheckinModal.vue";
import HealthTrackingTab from "@/components/health/HealthTrackingTab.vue";
import HealthAiTab from "@/components/health/HealthAiTab.vue";
import HealthPublicCardTab from "@/components/health/HealthPublicCardTab.vue";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import { useAiCreditsStore } from "@/stores/aiCredits";

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
    HealthTrackerModal,
    HealthTrackerGroupModal,
    HealthCheckinModal,
    HealthTrackingTab,
    HealthAiTab,
    HealthPublicCardTab,
    SubscriptionModal,
    ConfirmationModal,
  },
  data() {
    return {
      activeTab: "overview",
      aiUsage: {},
      isLoadingAiUsage: false,
      showPlanModal: false,
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
      showTrackerModal: false,
      trackerBeingEdited: null,
      isSubmittingTracker: false,
      trackerError: "",
      showTrackerGroupModal: false,
      groupBeingEdited: null,
      isSubmittingTrackerGroup: false,
      trackerGroupError: "",
      showDeleteTrackerGroupConfirmation: false,
      groupPendingDeletion: null,
      showCheckinModal: false,
      checkinBeingCorrected: null,
      isSubmittingCheckin: false,
      checkinError: "",
      isAddingTemplate: false,
      trackingError: "",
      showArchiveTrackerConfirmation: false,
      trackerPendingArchive: null,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useAiCreditsStore, { centralizedAiUsage: "usage" }),
    ...mapState(useHealthStore, [
      "objects",
      "relations",
      "events",
      "widgets",
      "schedules",
      "supplies",
      "trackers",
      "activeTrackers",
      "trackerGroups",
      "checkins",
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
          id: "tracking",
          label: "Acompanhamento",
          icon: "heart-pulse",
          badge: this.checkins.length || undefined,
        },
        {
          id: "timeline",
          label: "Linha do Tempo",
          icon: "clock-rotate-left",
          badge: this.events.length || undefined,
        },
        {
          id: "ai",
          label: "IA",
          icon: "crown",
          pro: true,
        },
        { id: "public-card", label: "Cartão de Saúde", icon: "address-card" },
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
    checkinTrackers() {
      if (!this.checkinBeingCorrected) return this.activeTrackers;
      const recorded = new Set(Object.keys(this.checkinBeingCorrected.values || {}));
      return this.trackers.filter((tracker) => !tracker.archived || recorded.has(tracker.local_key));
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
    deleteGroupDescription() {
      if (!this.groupPendingDeletion) return "";
      const count = this.activeTrackers.filter(
        (t) => (t.group || "").toLowerCase().trim() === (this.groupPendingDeletion.name || "").toLowerCase().trim()
      ).length;
      if (count === 0) {
        return `O grupo "${this.groupPendingDeletion.name}" será excluído permanentemente.`;
      }
      return `O grupo "${this.groupPendingDeletion.name}" possui ${count} rastreador(es). Ao excluir, eles serão transferidos automaticamente para o grupo "Bem-estar".`;
    },
    limits() {
      return getPlanLimits(this.user?.plan_tier || "free");
    },
    isPaidPlan() {
      return Boolean(this.user?.plan_tier && this.user.plan_tier !== "free");
    },
    canUseAi() {
      return this.isPaidPlan && Number(this.limits?.ai_monthly_credits || this.limits?.finance_ai_monthly_credits || 0) > 0;
    },
    currentMonthLabel() {
      return new Date().toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    },
  },
  watch: {
    activeTab(tab) {
      if (tab === "ai") {
        this.loadAiUsage();
      }
    },
  },
  async mounted() {
    try {
      await this.loadRecords();
    } catch {
      // tratado no store
    }
    this.loadAiUsage();
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
      "createTracker",
      "updateTracker",
      "archiveTracker",
      "createTrackerGroup",
      "updateTrackerGroup",
      "deleteTrackerGroup",
      "createCheckin",
      "addDigestiveWellbeingTemplate",
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
    openTrackerModal(tracker = null) {
      this.trackerBeingEdited = tracker;
      this.trackerError = "";
      this.showTrackerModal = true;
    },
    openCheckinModal(event = null) {
      this.checkinBeingCorrected = event;
      this.checkinError = "";
      this.showCheckinModal = true;
    },
    async submitTracker(data) {
      this.isSubmittingTracker = true;
      this.trackerError = "";
      try {
        if (this.trackerBeingEdited) await this.updateTracker(this.trackerBeingEdited, data);
        else await this.createTracker(data);
        this.showTrackerModal = false;
      } catch (error) { this.trackerError = error.message || "Não foi possível salvar o rastreador."; }
      finally { this.isSubmittingTracker = false; }
    },
    openTrackerGroupModal(group = null) {
      this.groupBeingEdited = group;
      this.trackerGroupError = "";
      this.showTrackerGroupModal = true;
    },
    async submitTrackerGroup(data) {
      this.isSubmittingTrackerGroup = true;
      this.trackerGroupError = "";
      try {
        if (this.groupBeingEdited?.local_key && !String(this.groupBeingEdited.local_key).startsWith("default-group-")) {
          await this.updateTrackerGroup(this.groupBeingEdited, data);
        } else {
          await this.createTrackerGroup(data);
        }
        this.showTrackerGroupModal = false;
      } catch (error) {
        this.trackerGroupError = error.message || "Não foi possível salvar o grupo.";
      } finally {
        this.isSubmittingTrackerGroup = false;
      }
    },
    requestDeleteTrackerGroup(group) {
      this.groupPendingDeletion = group;
      this.showDeleteTrackerGroupConfirmation = true;
    },
    cancelDeleteTrackerGroup() {
      this.groupPendingDeletion = null;
      this.showDeleteTrackerGroupConfirmation = false;
    },
    async confirmDeleteTrackerGroup() {
      const group = this.groupPendingDeletion;
      this.cancelDeleteTrackerGroup();
      if (!group) return;
      this.trackingError = "";
      try {
        await this.deleteTrackerGroup(group, "Bem-estar");
      } catch (error) {
        this.trackingError = error.message || "Não foi possível excluir o grupo.";
      }
    },
    async submitCheckin(data) {
      this.isSubmittingCheckin = true;
      this.checkinError = "";
      try { await this.createCheckin(data); this.showCheckinModal = false; }
      catch (error) { this.checkinError = error.message || "Não foi possível salvar o check-in."; }
      finally { this.isSubmittingCheckin = false; }
    },
    async addTemplate() {
      this.isAddingTemplate = true;
      this.trackingError = "";
      try { await this.addDigestiveWellbeingTemplate(); }
      catch (error) { this.trackingError = error.message || "Não foi possível adicionar o modelo."; }
      finally { this.isAddingTemplate = false; }
    },
    async pinTracker(tracker) {
      this.trackingError = "";
      try { await this.addWidget(tracker.local_key); }
      catch (error) { this.trackingError = error.message || "Não foi possível fixar o rastreador."; }
    },
    async unpinTracker(tracker) {
      const widget = this.widgets.find((item) => item.object_key === tracker.local_key);
      if (!widget) return;
      this.trackingError = "";
      try { await this.removeWidget(widget); }
      catch (error) { this.trackingError = error.message || "Não foi possível desafixar o rastreador."; }
    },
    requestArchiveTracker(tracker) { this.trackerPendingArchive = tracker; this.showArchiveTrackerConfirmation = true; },
    cancelArchiveTracker() { this.trackerPendingArchive = null; this.showArchiveTrackerConfirmation = false; },
    async confirmArchiveTracker() {
      const tracker = this.trackerPendingArchive;
      this.cancelArchiveTracker();
      if (!tracker) return;
      this.trackingError = "";
      try { await this.archiveTracker(tracker); }
      catch (error) { this.trackingError = error.message || "Não foi possível arquivar o rastreador."; }
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
    async loadAiUsage() {
      if (!this.canUseAi) {
        return;
      }
      this.isLoadingAiUsage = true;
      try {
        await useAiCreditsStore().fetchUsage(true);
      } catch {
        // Silencioso se offline
      } finally {
        this.isLoadingAiUsage = false;
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
