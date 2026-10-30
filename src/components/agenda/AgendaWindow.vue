<template>
  <div class="agenda">
    <header class="agenda-header">
      <!-- Lado Esquerdo: Identificação e Navegação Temporal (Google Calendar style) -->
      <div class="header-left">
        <div class="title-block">
          <div class="title-avatar">
            <font-awesome-icon icon="calendar-days" />
          </div>
          <h2 class="agenda-title">Agenda</h2>
        </div>

        <div v-if="view !== 'list'" class="nav-cluster" role="group" aria-label="Navegação da agenda">
          <button
            type="button"
            class="nav-btn today-btn"
            :class="{ 'is-today-active': isCurrentAnchorToday }"
            aria-label="Ir para hoje"
            @click="goToday"
          >
            <span class="today-dot" aria-hidden="true"></span>
            <span>Hoje</span>
          </button>
          <div class="nav-arrows">
            <button type="button" class="nav-btn icon-only" aria-label="Período anterior" @click="move(-1)">
              <font-awesome-icon icon="chevron-left" />
            </button>
            <button type="button" class="nav-btn icon-only" aria-label="Próximo período" @click="move(1)">
              <font-awesome-icon icon="chevron-right" />
            </button>
          </div>
          <span class="current-period-title">{{ rangeLabel }}</span>
        </div>
        <span v-else class="current-period-title list-title">{{ rangeLabel }}</span>
      </div>

      <!-- Lado Direito: Filtros, Seletor de Visão e Ações Primárias -->
      <div class="header-right">
        <!-- Filtros de Origem -->
        <div class="legend-bar" role="group" aria-label="Filtros de origem">
          <span class="legend-title">Filtros:</span>
          <div class="legend-chips">
            <button
              v-for="filter in FILTERS"
              :key="filter.id"
              type="button"
              class="legend-pill"
              :class="{ off: isFilterHidden(filter) }"
              :style="{ '--src': filter.color }"
              :aria-pressed="!isFilterHidden(filter)"
              @click="toggleFilter(filter)"
            >
              <span class="pill-dot" aria-hidden="true"></span>
              <span class="pill-label">{{ filter.label }}</span>
            </button>
          </div>
        </div>

        <!-- Segmented Switch de Visão -->
        <div ref="viewSwitchRef" class="agenda-view-switch" role="tablist" aria-label="Visualização">
          <div v-if="gliderReady" class="view-glider" :style="gliderStyle" aria-hidden="true"></div>
          <button
            v-for="option in VIEW_OPTIONS"
            :key="option.value"
            :ref="(el) => setSubnavBtnRef(el, option.value)"
            type="button"
            role="tab"
            :aria-selected="view === option.value"
            class="switch-tab-btn"
            :class="{ active: view === option.value }"
            @click="setView(option.value)"
          >
            <font-awesome-icon :icon="option.icon" class="tab-icon" />
            <span>{{ option.label }}</span>
          </button>
        </div>

        <!-- Ações Primárias -->
        <div class="header-actions">
          <button
            type="button"
            class="action-icon-btn"
            title="Atualizar agenda"
            aria-label="Atualizar agenda"
            :disabled="agenda.isLoading || refreshing"
            @click="reload"
          >
            <font-awesome-icon icon="arrows-rotate" :spin="refreshing" />
          </button>
          <button
            type="button"
            class="action-icon-btn has-indicator"
            :class="{ 'is-connected': googleConnected }"
            title="Integrações da agenda"
            aria-label="Integrações"
            @click="openIntegrations"
          >
            <font-awesome-icon icon="link" />
            <i v-if="googleConnected" class="pulse-dot" aria-hidden="true"></i>
          </button>
          <button type="button" class="primary-action-btn" aria-label="Novo compromisso" @click="openCreate()">
            <font-awesome-icon icon="plus" />
            <span>Compromisso</span>
          </button>
        </div>
      </div>
    </header>

    <div v-if="notice" class="nexo-banner" :class="notice.kind === 'error' ? 'error' : 'success'" role="status">
      <font-awesome-icon :icon="notice.kind === 'error' ? 'triangle-exclamation' : 'circle-check'" class="banner-icon" />
      <span class="banner-text">{{ notice.text }}</span>
      <button type="button" class="banner-close" aria-label="Fechar aviso" @click="notice = null">
        <font-awesome-icon icon="xmark" />
      </button>
    </div>
    <div v-if="agenda.error" class="nexo-banner error" role="alert">
      <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
      <span class="banner-text">{{ agenda.error }}</span>
    </div>

    <div class="content-wrapper">
      <KademLoader v-if="showLoader" title="Carregando compromissos…" />
      <Transition v-else :name="viewTransitionName" mode="out-in">
        <AgendaMonthView
          v-if="view === 'month'"
          key="view-month"
          :anchor="anchor"
          :items="visibleItems"
          :selected-day="selectedDay"
          :today="today"
          @select-day="selectDay"
          @open-day="openDayModal"
          @open-item="(item) => openItem(item, { fromDay: true })"
          @create-day="(date) => openCreateOnDay(date, { fromDay: true })"
        />
        <AgendaWeekView
          v-else-if="view === 'week'"
          key="view-week"
          :anchor="anchor"
          :items="visibleItems"
          :today="today"
          @open-item="openItem"
          @create-slot="(start) => openCreate({ start })"
          @create-day="(date) => openCreate({ start: date, allDay: true })"
        />
        <AgendaListView
          v-else
          key="view-list"
          :items="visibleItems"
          :today="today"
          :days="listDays"
          @open-item="openItem"
          @load-more="listDays += 60"
          @create="openCreate()"
        />
      </Transition>
    </div>

    <AgendaEventModal
      ref="eventModalRef"
      :visible="modal.open"
      :screen="modal.screen"
      :day-date="modal.dayDate"
      :day-items="modalDayItems"
      :from-day="modal.fromDay"
      :event="modal.event"
      :item="modal.item"
      :initial="modal.initial"
      :saving="saving"
      :error="modalError"
      @close="closeModal"
      @submit="saveEvent"
      @delete="removeEvent"
      @open-health="openHealth"
      @complete-health="completeHealth"
      @select-item="(item) => openItem(item, { fromDay: true })"
      @create-on-day="(date) => openCreateOnDay(date, { fromDay: true })"
      @nav-screen="(screen) => { modal.screen = screen; if (screen === 'day') { modal.event = null; modal.item = null; } }"
    />

    <AgendaIntegrationsModal
      :visible="showIntegrations"
      :status="agenda.googleStatus"
      :busy="agenda.googleBusy"
      :online="online"
      :message="integrationMessage"
      @close="showIntegrations = false"
      @connect="connectGoogle"
      @sync="syncGoogle"
      @disconnect="disconnectGoogle"
    />
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useAgendaStore } from "@/stores/agenda";
import { useHealthStore } from "@/stores/health";
import { usePlayerStore } from "@/stores/player";
import { useUtilsStore } from "@/stores/utils";
import KademLoader from "@/components/ui/KademLoader.vue";
import AgendaMonthView from "./AgendaMonthView.vue";
import AgendaWeekView from "./AgendaWeekView.vue";
import AgendaListView from "./AgendaListView.vue";
import AgendaEventModal from "./AgendaEventModal.vue";
import AgendaIntegrationsModal from "./AgendaIntegrationsModal.vue";
import {
  SOURCE_COLORS,
  addDays,
  addMonths,
  capitalizeFirst,
  healthItems,
  isSameDay,
  itemsForDay,
  startOfDay,
  startOfMonth,
  weekDays,
} from "@/utils/agendaCalendar";

const VIEW_OPTIONS = [
  { value: "month", label: "Mês", icon: "calendar" },
  { value: "week", label: "Semana", icon: "calendar-days" },
  { value: "list", label: "Lista", icon: "list-ul" },
];
// Compromissos do Kadem e do Google têm a mesma cor, então formam um filtro só; o Health é o outro.
const FILTERS = [
  { id: "events", label: "Compromissos", sources: ["manual", "google"], color: SOURCE_COLORS.manual },
  { id: "health", label: "Health", sources: ["health"], color: SOURCE_COLORS.health },
];
const STORAGE_KEY = "kadem_agenda_prefs";
const NOTICE_MS = 6000;
const REFRESH_INTERVAL_MS = 60 * 1000;

const GOOGLE_RETURN_MESSAGES = {
  denied: "A conexão com o Google foi cancelada.",
  scope: "Para sincronizar, permita o acesso aos eventos da agenda na tela do Google.",
  refresh_token: "O Google não autorizou o acesso contínuo. Tente conectar novamente.",
  exchange: "Não foi possível concluir a conexão com o Google. Tente novamente.",
  state: "O pedido de conexão expirou. Tente conectar novamente.",
  not_configured: "A integração com o Google ainda não foi configurada neste ambiente.",
  invalid: "Não foi possível concluir a conexão com o Google.",
};

function readPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return prefs && typeof prefs === "object" && !Array.isArray(prefs) ? prefs : {};
  } catch {
    return {};
  }
}

// Preferências antigas guardavam a origem (manual/google/health): um filtro oculto esconde todas as origens dele.
function hiddenFromPrefs(prefs) {
  const stored = Array.isArray(prefs.hidden) ? prefs.hidden : [];
  return FILTERS.flatMap((filter) => (filter.sources.some((source) => stored.includes(source)) ? filter.sources : []));
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Preferência de exibição: perder o valor não prejudica nada.
  }
}

export default {
  name: "AgendaWindow",
  components: { KademLoader, AgendaMonthView, AgendaWeekView, AgendaListView, AgendaEventModal, AgendaIntegrationsModal },
  data() {
    const prefs = readPrefs();
    const narrow = typeof window !== "undefined" && window.matchMedia?.("(max-width: 768px)")?.matches;
    const today = startOfDay(new Date());
    return {
      VIEW_OPTIONS,
      FILTERS,
      view: VIEW_OPTIONS.some((option) => option.value === prefs.view) ? prefs.view : narrow ? "list" : "month",
      hiddenSources: hiddenFromPrefs(prefs),
      today,
      anchor: today,
      selectedDay: today,
      listDays: 60,
      modal: { open: false, screen: "event", dayDate: null, event: null, item: null, initial: null, fromDay: false },
      modalError: "",
      saving: false,
      refreshing: false,
      showIntegrations: false,
      returnedFromGoogle: false,
      integrationMessage: "",
      notice: null,
      noticeTimer: null,
      clockTimer: null,
      refreshTimer: null,
      firstLoadDone: false,
      gliderReady: false,
      gliderStyle: {},
      subnavBtnRefs: {},
      subnavObserver: null,
      viewTransitionName: "agenda-stage-next",
    };
  },
  computed: {
    agenda() {
      return useAgendaStore();
    },
    health() {
      return useHealthStore();
    },
    ...mapState(useUtilsStore, { online: (store) => store.connection.connected }),
    googleConnected() {
      return this.agenda.googleStatus?.connected && this.agenda.googleStatus.status === "active";
    },
    isCurrentAnchorToday() {
      if (this.view === "month") {
        return this.sameMonthAsToday(this.anchor);
      }
      return isSameDay(this.anchor, this.today);
    },
    showLoader() {
      return !this.firstLoadDone && this.agenda.isLoading && !this.agenda.events.length;
    },
    allItems() {
      const health = this.health;
      return [
        ...this.agenda.items,
        ...healthItems({
          schedules: health.schedules,
          events: health.events,
          nextDueAt: health.nextDueAt,
          now: new Date(),
        }),
      ];
    },
    visibleItems() {
      return this.allItems.filter((item) => !this.hiddenSources.includes(item.source));
    },
    modalDayItems() {
      if (!this.modal.dayDate) return [];
      return itemsForDay(this.visibleItems, this.modal.dayDate);
    },
    rangeLabel() {
      if (this.view === "list") return "Próximos compromissos";
      if (this.view === "month") {
        return capitalizeFirst(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(this.anchor));
      }
      const days = weekDays(this.anchor);
      const short = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
      return `${short.format(days[0])} – ${short.format(days[6])} de ${days[6].getFullYear()}`;
    },
  },
  watch: {
    view() {
      this.$nextTick(() => this.updateGlider());
    },
  },
  async mounted() {
    this.clockTimer = setInterval(() => { this.today = startOfDay(new Date()); }, 5 * 60 * 1000);
    this.refreshTimer = setInterval(this.autoRefresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", this.autoRefresh);
    document.addEventListener("visibilitychange", this.autoRefresh);
    window.addEventListener("resize", this.updateGlider);

    this.handleGoogleReturn();
    await this.loadAll();
    // Mostra primeiro o que já está salvo; depois convida a vincular o Google (se ainda não estiver) e busca as novidades.
    this.agenda.loadGoogleStatus().then(() => {
      this.promptGoogleLink();
      return this.refreshFromGoogle();
    });

    this.$nextTick(() => {
      this.updateGlider();
      if (typeof ResizeObserver !== "undefined" && this.$refs.viewSwitchRef) {
        this.subnavObserver = new ResizeObserver(() => this.updateGlider());
        this.subnavObserver.observe(this.$refs.viewSwitchRef);
      }
    });
  },
  beforeUnmount() {
    clearInterval(this.clockTimer);
    clearInterval(this.refreshTimer);
    clearTimeout(this.noticeTimer);
    window.removeEventListener("focus", this.autoRefresh);
    document.removeEventListener("visibilitychange", this.autoRefresh);
    window.removeEventListener("resize", this.updateGlider);
    if (this.subnavObserver) {
      this.subnavObserver.disconnect();
      this.subnavObserver = null;
    }
  },
  methods: {
    persistPrefs() {
      writePrefs({ view: this.view, hidden: this.hiddenSources });
    },

    setSubnavBtnRef(el, id) {
      if (el) this.subnavBtnRefs[id] = el;
    },

    updateGlider() {
      const btn = this.subnavBtnRefs?.[this.view];
      if (!btn || !btn.offsetWidth) return;
      this.gliderStyle = {
        width: `${btn.offsetWidth}px`,
        height: `${btn.offsetHeight}px`,
        transform: `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`,
      };
      this.gliderReady = true;
    },

    async loadAll({ silent = false } = {}) {
      try {
        await this.agenda.loadEvents({ silent });
      } catch {
        // O erro fica em agenda.error; os dados locais continuam visíveis.
      }
      // O delta do Health roda junto com a fila de sync; aqui só relemos o Dexie, sem criar nem enviar nada.
      await this.health.loadLocalRecords().catch(() => {});
      this.firstLoadDone = true;
      this.$nextTick(() => this.updateGlider());
    },

    // Ao entrar na Agenda sem o Google vinculado (ou com o acesso revogado), abre o painel de integrações para conectar.
    // Fica de fora: integração não configurada no ambiente, estado ainda desconhecido (sem rede), volta do consentimento
    // do Google (o resultado já está no aviso) e quando o usuário já abriu um compromisso.
    promptGoogleLink() {
      const status = this.agenda.googleStatus;
      if (!status?.configured || this.returnedFromGoogle || this.modal.open || this.showIntegrations) return;
      if (status.connected && status.status === "active") return;
      this.integrationMessage = "";
      this.showIntegrations = true;
    },

    // Com o Google conectado, cada atualização também puxa as mudanças de lá (ex.: o que a Alexa adicionou).
    async refreshFromGoogle() {
      if (!this.googleConnected) return false;
      try {
        await this.agenda.syncGoogle({ full: false, silent: true });
        await this.health.loadLocalRecords().catch(() => {});
        return true;
      } catch {
        return false; // sem rede ou Google indisponível: a leitura local abaixo segue valendo
      }
    },

    async autoRefresh() {
      if (document.hidden || !this.online || this.agenda.isLoading || this.refreshing) return;
      if (await this.refreshFromGoogle()) return;
      await this.loadAll({ silent: true });
    },

    async reload() {
      this.refreshing = true;
      try {
        if (!(await this.refreshFromGoogle())) await this.loadAll({ silent: true });
        this.agenda.loadGoogleStatus();
      } finally {
        this.refreshing = false;
      }
    },

    setView(view) {
      if (this.view !== view) {
        const prevIdx = this.VIEW_OPTIONS.findIndex((opt) => opt.value === this.view);
        const nextIdx = this.VIEW_OPTIONS.findIndex((opt) => opt.value === view);
        this.viewTransitionName = nextIdx >= prevIdx ? "agenda-stage-next" : "agenda-stage-prev";
        this.view = view;
        if (view !== "list") this.anchor = this.selectedDay;
        this.persistPrefs();
        this.$nextTick(() => this.updateGlider());
      }
    },

    isFilterHidden(filter) {
      return filter.sources.every((source) => this.hiddenSources.includes(source));
    },

    toggleFilter(filter) {
      this.hiddenSources = this.isFilterHidden(filter)
        ? this.hiddenSources.filter((source) => !filter.sources.includes(source))
        : [...new Set([...this.hiddenSources, ...filter.sources])];
      this.persistPrefs();
    },

    move(direction) {
      if (this.view === "month") {
        this.anchor = startOfMonth(addMonths(this.anchor, direction));
        this.selectedDay = this.sameMonthAsToday(this.anchor) ? this.today : this.anchor;
      } else {
        this.anchor = addDays(this.anchor, direction * 7);
        this.selectedDay = this.anchor;
      }
    },

    sameMonthAsToday(date) {
      return date.getFullYear() === this.today.getFullYear() && date.getMonth() === this.today.getMonth();
    },

    goToday() {
      this.today = startOfDay(new Date());
      this.anchor = this.today;
      this.selectedDay = this.today;
    },

    selectDay(date) {
      this.selectedDay = date;
      if (date.getMonth() !== this.anchor.getMonth()) this.anchor = date;
    },

    // --- Compromissos e Modal ---

    openDayModal(date) {
      this.modalError = "";
      this.selectedDay = date;
      this.modal = {
        open: true,
        screen: "day",
        dayDate: date,
        event: null,
        item: null,
        initial: null,
        fromDay: true,
      };
    },

    openItem(item, { fromDay = false } = {}) {
      this.modalError = "";
      const dayDate = item.span?.start ? startOfDay(item.span.start) : this.selectedDay;
      this.modal = {
        open: true,
        screen: "event",
        dayDate,
        event: item.kind === "health" ? null : item.event,
        item: item.kind === "health" ? item : null,
        initial: null,
        fromDay,
      };
    },

    openCreate(initial = null, { fromDay = false } = {}) {
      this.modalError = "";
      const dayDate = initial?.start ? startOfDay(initial.start) : this.selectedDay;
      this.modal = {
        open: true,
        screen: "event",
        dayDate,
        event: null,
        item: null,
        initial,
        fromDay,
      };
    },

    openCreateOnDay(date, { fromDay = true } = {}) {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
      this.openCreate({ start }, { fromDay });
    },

    closeModal() {
      this.modal = { ...this.modal, open: false };
    },

    async saveEvent(data) {
      this.saving = true;
      this.modalError = "";
      try {
        if (this.modal.event) await this.agenda.updateEvent(this.modal.event, data);
        else await this.agenda.createEvent(data);
        if (this.modal.fromDay) {
          this.$refs.eventModalRef?.goBackToDay?.();
        } else {
          this.closeModal();
        }
      } catch (error) {
        this.modalError = error.message || "Não foi possível salvar o compromisso.";
      } finally {
        this.saving = false;
      }
    },

    async removeEvent() {
      this.saving = true;
      this.modalError = "";
      try {
        await this.agenda.deleteEvent(this.modal.event);
        if (this.modal.fromDay) {
          this.$refs.eventModalRef?.goBackToDay?.();
        } else {
          this.closeModal();
        }
      } catch (error) {
        this.modalError = error.message || "Não foi possível excluir o compromisso.";
      } finally {
        this.saving = false;
      }
    },

    openHealth() {
      this.closeModal();
      usePlayerStore().setActiveApp("kadem_health");
    },

    // Mesma ação do botão "Concluir" do Health: registra a conclusão (e baixa os insumos vinculados) e a próxima
    // data é recalculada; a Agenda e o Google acompanham.
    async completeHealth(item) {
      const key = item?.schedule?.local_key;
      if (!key) return;
      this.saving = true;
      this.modalError = "";
      try {
        await this.health.completeSchedule({ object_key: key });
        const next = this.health.nextDueAt(item.schedule);
        const when = next
          ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(next))
          : "";
        this.showNotice(`“${item.title}” concluído.${when ? ` Próxima data: ${when}.` : ""}`);
        if (this.modal.fromDay) this.$refs.eventModalRef?.goBackToDay?.();
        else this.closeModal();
      } catch (error) {
        this.modalError = error.message || "Não foi possível concluir o agendamento.";
      } finally {
        this.saving = false;
      }
    },

    // Aviso de sucesso some sozinho; erro fica até ser fechado.
    showNotice(text, kind = "success") {
      clearTimeout(this.noticeTimer);
      this.notice = { kind, text };
      if (kind === "success") this.noticeTimer = setTimeout(() => { this.notice = null; }, NOTICE_MS);
    },

    // --- Integrações ---

    async openIntegrations() {
      this.integrationMessage = "";
      this.showIntegrations = true;
      await this.agenda.loadGoogleStatus();
    },

    async runGoogleAction(action, success) {
      this.integrationMessage = "";
      try {
        await action();
        this.integrationMessage = success;
      } catch (error) {
        this.showNotice(error.response?.data?.message || error.message || "Não foi possível falar com o Google agora.", "error");
      }
    },

    connectGoogle() {
      return this.runGoogleAction(() => this.agenda.connectGoogle(), "");
    },

    syncGoogle() {
      return this.runGoogleAction(() => this.agenda.syncGoogle({ full: true }), "Agenda sincronizada com o Google.");
    },

    disconnectGoogle() {
      return this.runGoogleAction(() => this.agenda.disconnectGoogle(), "Google Agenda desconectado.");
    },

    // O Google devolve o navegador para o app com o resultado na URL.
    handleGoogleReturn() {
      let params;
      try {
        params = new URLSearchParams(window.location.search);
      } catch {
        return;
      }
      const result = params.get("agenda_google");
      if (!result) return;
      this.returnedFromGoogle = true;

      if (result === "connected") {
        this.showNotice("Google Agenda conectado. Estamos sincronizando seus compromissos.");
      } else {
        this.showNotice(GOOGLE_RETURN_MESSAGES[params.get("agenda_google_reason")] || GOOGLE_RETURN_MESSAGES.invalid, "error");
      }
      params.delete("agenda_google");
      params.delete("agenda_google_reason");
      const query = params.toString();
      try {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      } catch {
        // A URL só fica com o parâmetro até a próxima navegação.
      }
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   CONTAINER & LAYOUT PRINCIPAL DA AGENDA
   ========================================================================== */
.agenda {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  min-height: 0;
  color: var(--text-primary);
}

/* ==========================================================================
   HEADER DA AGENDA
   ========================================================================== */
.agenda-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3) var(--space-4);
  flex: 0 0 auto;
  padding-bottom: 2px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.title-block {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.title-avatar {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(59, 130, 246, 0.22));
  border: 1px solid rgba(20, 184, 166, 0.35);
  color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

[data-theme="dark"] .title-avatar {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(59, 130, 246, 0.28));
  border-color: rgba(20, 184, 166, 0.45);
  color: #2dd4bf;
}

.agenda-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Navegação de período (Hoje / Anterior / Próximo + Título do Mês/Semana) */
.nav-cluster {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-arrows {
  display: inline-flex;
  align-items: center;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 1px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: none;
  border-radius: calc(var(--radius-sm) - 4px);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nav-btn.icon-only {
  width: 32px;
  height: 30px;
}

.nav-btn.today-btn {
  padding: 0 var(--space-3);
  font-weight: 700;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.today-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-info);
  opacity: 0.4;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.nav-btn.today-btn.is-today-active .today-dot {
  opacity: 1;
  transform: scale(1.2);
  box-shadow: 0 0 6px var(--color-info);
}

.nav-btn:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nav-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

.current-period-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  margin-left: var(--space-1);
}

.current-period-title.list-title {
  font-size: 1.05rem;
  color: var(--text-secondary);
  margin-left: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.today-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-info);
  opacity: 0.4;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.nav-btn.today-btn.is-today-active .today-dot {
  opacity: 1;
  transform: scale(1.2);
  box-shadow: 0 0 6px var(--color-info);
}

.nav-btn:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nav-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

/* ==========================================================================
   SEGMENTED VIEW SWITCH COM GLIDER ANIMADO
   ========================================================================== */
.agenda-view-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 3px;
  gap: 2px;
  box-sizing: border-box;
}

.view-glider {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-sm) - 4px);
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 1;
}

[data-theme="dark"] .view-glider {
  background: var(--surface-2);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.switch-tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 34px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: calc(var(--radius-sm) - 4px);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast);
  z-index: 2;
}

.switch-tab-btn:hover {
  color: var(--text-primary);
}

.switch-tab-btn.active {
  color: var(--text-primary);
  font-weight: 700;
}

[data-theme="dark"] .switch-tab-btn.active {
  color: #ffffff;
}

.tab-icon {
  font-size: 0.85rem;
  opacity: 0.85;
}

.switch-tab-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 1px;
}

/* ==========================================================================
   AÇÕES DO CABEÇALHO
   ========================================================================== */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.action-icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.action-icon-btn:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--color-info);
  transform: translateY(-1px);
}

.action-icon-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.action-icon-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.action-icon-btn.has-indicator .pulse-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
  border: 2px solid var(--surface-1);
  box-sizing: content-box;
}

[data-theme="dark"] .action-icon-btn.has-indicator .pulse-dot {
  background: #4ade80;
  border-color: var(--surface-2);
}

.primary-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: #ffffff;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.28);
  transition:
    transform var(--transition-fast),
    filter var(--transition-fast),
    box-shadow var(--transition-fast);
}

.primary-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.36);
}

.primary-action-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none;
}

.primary-action-btn:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

/* ==========================================================================
   BARRA DE LEGENDAS / FILTROS DE ORIGEM
   ========================================================================== */
.legend-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.legend-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.legend-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast),
    opacity var(--transition-fast);
}

.legend-pill:hover {
  background: var(--surface-2);
  border-color: var(--src);
  transform: translateY(-1px);
}

.legend-pill .pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--src);
  box-shadow: 0 0 6px color-mix(in srgb, var(--src) 60%, transparent);
  transition: all var(--transition-fast);
}

.legend-pill.off {
  color: var(--text-muted);
  opacity: 0.55;
  background: var(--surface-0);
  border-style: dashed;
}

.legend-pill.off .pill-dot {
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--text-muted);
}

.legend-pill:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

/* ==========================================================================
   BANNERS & AVISOS (Padrão Nexo)
   ========================================================================== */
.nexo-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
  flex: 0 0 auto;
}

.nexo-banner .banner-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nexo-banner .banner-text {
  flex: 1 1 auto;
}

.nexo-banner.success {
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.28);
  color: #16a34a;
}

[data-theme="dark"] .nexo-banner.success {
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.32);
  color: #4ade80;
}

.nexo-banner.error {
  background: rgba(214, 74, 46, 0.1);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .nexo-banner.error {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
  color: #fca5a5;
}

.banner-close {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  transition: opacity var(--transition-fast);
}

.banner-close:hover {
  opacity: 1;
}

/* ==========================================================================
   ÁREA DE CONTEÚDO E TRANSIÇÕES DE VISÃO
   ========================================================================== */
.content-wrapper {
  flex: 1 1 0;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.agenda-stage-next-enter-active,
.agenda-stage-next-leave-active,
.agenda-stage-prev-enter-active,
.agenda-stage-prev-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.agenda-stage-next-enter-from {
  opacity: 0;
  transform: translate3d(14px, 0, 0);
}

.agenda-stage-next-leave-to {
  opacity: 0;
  transform: translate3d(-14px, 0, 0);
}

.agenda-stage-prev-enter-from {
  opacity: 0;
  transform: translate3d(-14px, 0, 0);
}

.agenda-stage-prev-leave-to {
  opacity: 0;
  transform: translate3d(14px, 0, 0);
}

/* ==========================================================================
   RESPONSIVIDADE
   ========================================================================== */
@media (max-width: 820px) {
  .agenda-header {
    gap: var(--space-3);
  }

  .title-block {
    flex: 1 1 auto;
  }

  .header-actions {
    margin-left: auto;
  }
}

@media (max-width: 600px) {
  .agenda-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .title-block {
    width: 100%;
  }

  .nav-cluster {
    width: 100%;
    justify-content: space-between;
  }

  .nav-btn.today-btn {
    flex: 1;
  }

  .agenda-view-switch {
    width: 100%;
  }

  .switch-tab-btn {
    flex: 1;
    padding: 0 var(--space-2);
    font-size: 0.78rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .primary-action-btn {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-btn,
  .action-icon-btn,
  .primary-action-btn,
  .legend-pill,
  .view-glider {
    transition: none !important;
  }

  .agenda-stage-next-enter-active,
  .agenda-stage-next-leave-active,
  .agenda-stage-prev-enter-active,
  .agenda-stage-prev-leave-active {
    transition: none !important;
    transform: none !important;
  }
}
</style>
