<template>
  <BaseModal
    :model-value="visible"
    :title="modalTitle"
    size="md"
    @update:model-value="(value) => { if (!value) handleModalClose(); }"
    @close="handleModalClose"
  >
    <!-- Slot de Título com Botão "Voltar" quando navegado a partir da lista do dia -->
    <template #title>
      <div class="agenda-modal-title-row">
        <button
          v-if="currentScreen === 'event' && fromDay"
          type="button"
          class="modal-back-btn"
          title="Voltar para a lista do dia"
          aria-label="Voltar para a lista do dia"
          @click="goBackToDay"
        >
          <font-awesome-icon icon="chevron-left" />
          <span>Voltar</span>
        </button>
        <h3 class="title-text">{{ modalTitle }}</h3>
      </div>
    </template>

    <!-- TELA 1: LISTAGEM DE COMPROMISSOS DO DIA -->
    <div v-if="currentScreen === 'day'" class="day-modal-container">
      <div class="day-modal-toolbar">
        <span class="day-count-badge" :class="dayItems.length ? 'info' : 'neutral'">
          {{ dayItems.length }} {{ dayItems.length === 1 ? "compromisso" : "compromissos" }}
        </span>
        <button type="button" class="day-modal-add-btn" @click="switchToCreate">
          <font-awesome-icon icon="plus" />
          <span>Novo compromisso</span>
        </button>
      </div>

      <ul v-if="dayItems.length" class="day-modal-list">
        <li v-for="item in dayItems" :key="item.key">
          <button
            type="button"
            class="day-card"
            :class="`state-${item.state || 'none'}`"
            :style="{ '--src': sourceColor(item.source) }"
            @click="switchToItem(item)"
          >
            <div class="day-card-time" :class="{ 'is-allday': item.span?.allDay }">
              {{ item.span?.allDay ? "Dia todo" : time(item.span?.start) }}
            </div>
            <div class="day-card-body">
              <div class="day-card-header">
                <strong class="day-card-title">{{ item.title }}</strong>
                <span v-if="item.source === 'health'" class="source-tag" :style="{ '--src': sourceColor(item.source) }">
                  <span class="source-dot" aria-hidden="true"></span>
                  <span>{{ sourceLabel(item.source) }}</span>
                </span>
              </div>
              <div v-if="item.location" class="day-card-meta">
                <font-awesome-icon icon="location-dot" class="meta-icon" />
                <span>{{ item.location }}</span>
              </div>
            </div>
            <font-awesome-icon icon="chevron-right" class="day-card-arrow" />
          </button>
        </li>
      </ul>

      <div v-else class="day-empty-box">
        <div class="empty-icon-circle">
          <font-awesome-icon icon="calendar-days" />
        </div>
        <h4>Nenhum compromisso neste dia</h4>
        <p>Você não possui nenhum evento agendado para esta data.</p>
        <button type="button" class="empty-add-btn" @click="switchToCreate">
          <font-awesome-icon icon="plus" />
          <span>Criar compromisso</span>
        </button>
      </div>
    </div>

    <!-- TELA 2A: AGENDAMENTO DO HEALTH (concluir aqui; reagendar e editar no Health) -->
    <div v-else-if="isHealth" class="nexo-modal-form">
      <div class="agenda-badges">
        <span class="agenda-badge" :style="{ '--src': sourceColor('health') }">Health</span>
        <span class="agenda-badge agenda-badge--state" :class="`is-${effectiveItem.state}`">{{ healthStateLabel }}</span>
        <span class="agenda-badge agenda-badge--muted">{{ effectiveItem.typeLabel }}</span>
      </div>

      <div class="when-card">
        <font-awesome-icon icon="clock" class="when-icon" />
        <span class="when-text">{{ whenLabel }}</span>
      </div>

      <div v-if="effectiveItem.description" class="notes-card">
        <span class="notes-label">Anotações:</span>
        <p class="notes-text"><template v-for="(part, index) in noteSegments" :key="index"><a v-if="part.href" :href="part.href" target="_blank" rel="noopener noreferrer">{{ part.text }}</a><template v-else>{{ part.text }}</template></template></p>
      </div>

      <div class="hint-callout">
        <font-awesome-icon icon="circle-info" class="hint-icon" />
        <span>{{ healthHint }}</span>
      </div>

      <div v-if="error" class="nexo-banner error" role="alert">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
        <span>{{ error }}</span>
      </div>

      <footer class="modal-actions-bar">
        <button type="button" class="secondary-btn" @click="handleCancel">
          {{ fromDay ? "Voltar" : "Fechar" }}
        </button>
        <span class="actions-spacer"></span>
        <button type="button" class="secondary-btn health-open-btn" :disabled="saving" @click="$emit('open-health')">
          <font-awesome-icon icon="heart-pulse" />
          <span>Abrir no Health</span>
        </button>
        <button v-if="canComplete" type="button" class="complete-btn" :disabled="saving" @click="$emit('complete-health', effectiveItem)">
          <font-awesome-icon :icon="saving ? 'circle-notch' : 'check'" :spin="saving" />
          <span>{{ saving ? "Concluindo…" : "Concluir" }}</span>
        </button>
      </footer>
    </div>

    <!-- TELA 2B: FORMULÁRIO DE COMPROMISSO (NOVO OU EDIÇÃO) -->
    <form v-else class="nexo-modal-form" @submit.prevent="submit">
      <p v-if="effectiveEvent" class="origin-note">
        <font-awesome-icon icon="circle-info" class="origin-icon" />
        <span>Origem: <strong>{{ sourceLabel(effectiveEvent.source) }}</strong></span>
      </p>

      <div class="form-field">
        <label for="agenda-title">Título do compromisso</label>
        <input
          id="agenda-title"
          ref="titleInput"
          v-model="form.title"
          class="nexo-control"
          maxlength="200"
          placeholder="Ex.: Consulta médica, Reunião com equipe…"
          autocomplete="off"
          required
        />
      </div>

      <div class="switch-row-card">
        <div class="switch-row-info">
          <strong>Dia inteiro</strong>
          <small>Sem horário específico de início ou fim.</small>
        </div>
        <FormSwitch :model-value="form.all_day" @update:model-value="toggleAllDay" />
      </div>

      <div v-if="form.all_day" class="form-grid">
        <div class="form-field">
          <label for="agenda-start-day">Data inicial</label>
          <input id="agenda-start-day" v-model="form.start_day" type="date" class="nexo-control" required />
        </div>
        <div class="form-field">
          <label for="agenda-end-day">Data final</label>
          <input id="agenda-end-day" v-model="form.end_day" type="date" class="nexo-control" :min="form.start_day" required />
        </div>
      </div>
      <div v-else class="form-grid">
        <div class="form-field">
          <label for="agenda-start">Início</label>
          <input id="agenda-start" v-model="form.start_at" type="datetime-local" class="nexo-control" required @change="keepEndAfterStart" />
        </div>
        <div class="form-field">
          <label for="agenda-end">Fim</label>
          <input id="agenda-end" v-model="form.end_at" type="datetime-local" class="nexo-control" :min="form.start_at" required />
        </div>
      </div>

      <div class="form-field">
        <label for="agenda-location">Local (opcional)</label>
        <div class="input-with-icon">
          <font-awesome-icon icon="location-dot" class="field-icon" />
          <input id="agenda-location" v-model="form.location" class="nexo-control with-left-icon" maxlength="255" placeholder="Endereço, CEP, sala ou link da reunião" autocomplete="off" />
        </div>
        <AgendaLinkChip v-if="locationBadge" :chip="locationBadge" class="field-chip" />
      </div>

      <div class="form-field">
        <label for="agenda-description">Detalhes e anotações (opcional)</label>
        <textarea id="agenda-description" v-model="form.description" class="nexo-control textarea" rows="3" maxlength="4000" placeholder="Pauta, observações ou links adicionais"></textarea>
        <div v-if="descriptionChips.length" class="chip-row">
          <AgendaLinkChip v-for="chip in descriptionChips" :key="chip.href" :chip="chip" />
        </div>
      </div>

      <div v-if="localError || error" class="nexo-banner error" role="alert">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
        <span>{{ localError || error }}</span>
      </div>

      <footer class="modal-actions-bar">
        <button
          v-if="effectiveEvent"
          type="button"
          class="danger-btn"
          :class="{ 'confirm-active': confirmingDelete }"
          :disabled="saving"
          @click="askDelete"
        >
          <font-awesome-icon icon="trash" />
          <span>{{ confirmingDelete ? "Confirmar exclusão" : "Excluir" }}</span>
        </button>
        <span class="actions-spacer"></span>
        <button type="button" class="secondary-btn" @click="handleCancel">
          {{ fromDay ? "Voltar" : "Cancelar" }}
        </button>
        <button type="submit" class="primary-action-btn" :disabled="saving">
          <font-awesome-icon v-if="saving" icon="circle-notch" spin />
          <span>{{ saving ? "Salvando…" : effectiveEvent ? "Salvar alterações" : "Criar compromisso" }}</span>
        </button>
      </footer>
    </form>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import FormSwitch from "@/components/FormSwitch.vue";
import AgendaLinkChip from "./AgendaLinkChip.vue";
import { linkChips, linkSegments, locationChip } from "@/utils/agendaLinks";
import {
  SOURCE_COLORS,
  SOURCE_LABELS,
  capitalizeFirst,
  addDays,
  dayKey,
  eventSpan,
  formatItemWhen,
  formatTime,
  toDateTimeLocal,
} from "@/utils/agendaCalendar";
import { registerNavigation } from "@/utils/modalHistory";

const HEALTH_STATE_LABELS = { done: "Concluído", overdue: "Atrasado", pending: "Previsto", projected: "Próxima repetição" };
const HEALTH_HINTS = {
  overdue: "Concluir registra a realização agora e já calcula a próxima data. Para reagendar ou editar, abra no Health.",
  pending: "Concluir registra a realização agora e já calcula a próxima data. Para reagendar ou editar, abra no Health.",
  projected: "Esta é uma repetição prevista: ela passa a valer quando a ocorrência atual for concluída.",
  done: "Este agendamento já foi concluído. Para reabri-lo com uma nova data, edite-o no Health.",
};

export default {
  name: "AgendaEventModal",
  components: { BaseModal, FormSwitch, AgendaLinkChip },
  props: {
    visible: { type: Boolean, default: false },
    screen: { type: String, default: "event" }, // "day" | "event"
    dayDate: { type: Date, default: null },
    dayItems: { type: Array, default: () => [] },
    fromDay: { type: Boolean, default: false },
    event: { type: Object, default: null },
    item: { type: Object, default: null },
    initial: { type: Object, default: null },
    saving: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "submit", "delete", "open-health", "complete-health", "select-item", "create-on-day"],
  data() {
    return {
      currentScreen: this.screen || "event",
      activeEvent: this.event,
      activeItem: this.item,
      activeInitial: this.initial,
      form: this.blankForm(),
      localError: "",
      confirmingDelete: false,
      deleteTimer: null,
      navRegistration: null,
    };
  },
  computed: {
    effectiveItem() {
      return this.activeItem || this.item;
    },
    effectiveEvent() {
      return this.activeEvent || this.event;
    },
    isHealth() {
      return this.effectiveItem?.kind === "health";
    },
    modalTitle() {
      if (this.currentScreen === "day") {
        if (!this.dayDate) return "Compromissos do dia";
        const d = this.dayDate instanceof Date ? this.dayDate : new Date(this.dayDate);
        if (Number.isNaN(d.getTime())) return "Compromissos do dia";
        return capitalizeFirst(
          new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(d)
        );
      }
      if (this.isHealth) return this.effectiveItem?.title || "Compromisso";
      return this.effectiveEvent ? "Editar compromisso" : "Novo compromisso";
    },
    healthStateLabel() {
      return HEALTH_STATE_LABELS[this.effectiveItem?.state] || "";
    },
    healthHint() {
      return HEALTH_HINTS[this.effectiveItem?.state] || HEALTH_HINTS.done;
    },
    // Só a ocorrência vigente se conclui; repetições previstas e concluídas não.
    canComplete() {
      return ["overdue", "pending"].includes(this.effectiveItem?.state);
    },
    noteSegments() {
      return linkSegments(this.effectiveItem?.description);
    },
    locationBadge() {
      return locationChip(this.form.location);
    },
    descriptionChips() {
      return linkChips(this.form.description);
    },
    whenLabel() {
      return this.effectiveItem ? formatItemWhen(this.effectiveItem) : "";
    },
  },
  watch: {
    visible: {
      immediate: true,
      handler(open) {
        if (!open) {
          this.cleanupHistory();
          this.resetDeleteConfirmation();
          return;
        }
        this.currentScreen = this.screen || "event";
        this.activeEvent = this.event;
        this.activeItem = this.item;
        this.activeInitial = this.initial;
        this.syncForm();
        this.syncNavigation();
      },
    },
    screen(newScreen) {
      this.currentScreen = newScreen;
      this.syncNavigation();
    },
    event(newEvent) {
      this.activeEvent = newEvent;
      if (this.currentScreen === "event") this.syncForm();
    },
    item(newItem) {
      this.activeItem = newItem;
    },
    initial(newInitial) {
      this.activeInitial = newInitial;
      if (this.currentScreen === "event" && !this.activeEvent) this.syncForm();
    },
  },
  beforeUnmount() {
    this.cleanupHistory();
    this.resetDeleteConfirmation();
  },
  methods: {
    sourceColor: (source) => SOURCE_COLORS[source] || SOURCE_COLORS.manual,
    sourceLabel: (source) => SOURCE_LABELS[source] || SOURCE_LABELS.manual,
    time(date) {
      if (!date) return "";
      return formatTime(date instanceof Date ? date : new Date(date));
    },

    syncForm() {
      this.localError = "";
      if (this.effectiveEvent) {
        this.form = this.formFromEvent(this.effectiveEvent);
      } else {
        this.form = this.formFromInitial(this.activeInitial || this.initial);
      }
      this.$nextTick(() => {
        if (this.currentScreen === "event" && !this.effectiveEvent && !this.isHealth) {
          this.$refs.titleInput?.focus?.();
        }
      });
    },

    syncNavigation() {
      if (this.currentScreen === "event" && this.fromDay) {
        if (!this.navRegistration) {
          this.navRegistration = registerNavigation(() => {
            this.goBackToDay();
          }, { priority: 110 });
        }
      } else {
        this.cleanupHistory();
      }
    },

    cleanupHistory() {
      if (this.navRegistration) {
        this.navRegistration.unregister();
        this.navRegistration = null;
      }
    },

    switchToItem(item) {
      this.activeItem = item.kind === "health" ? item : null;
      this.activeEvent = item.kind === "health" ? null : item.event;
      this.activeInitial = null;
      this.currentScreen = "event";
      this.syncForm();
      this.syncNavigation();
      this.$emit("select-item", item);
    },

    switchToCreate() {
      this.activeEvent = null;
      this.activeItem = null;
      const start = this.dayDate
        ? new Date(this.dayDate.getFullYear(), this.dayDate.getMonth(), this.dayDate.getDate(), 9, 0)
        : new Date();
      this.activeInitial = { start };
      this.currentScreen = "event";
      this.syncForm();
      this.syncNavigation();
      this.$emit("create-on-day", this.dayDate);
    },

    goBackToDay() {
      this.cleanupHistory();
      this.currentScreen = "day";
      this.activeEvent = null;
      this.activeItem = null;
      this.localError = "";
      this.resetDeleteConfirmation();
      this.$emit("nav-screen", "day");
    },

    handleCancel() {
      if (this.fromDay && this.currentScreen === "event") {
        this.goBackToDay();
      } else {
        this.$emit("close");
      }
    },

    handleModalClose() {
      this.cleanupHistory();
      this.$emit("close");
    },

    blankForm() {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
      return this.buildForm(start, new Date(start.getTime() + 60 * 60 * 1000), false);
    },

    buildForm(start, end, allDay, extra = {}) {
      return {
        title: "",
        description: "",
        location: "",
        all_day: allDay,
        start_at: toDateTimeLocal(start),
        end_at: toDateTimeLocal(end),
        start_day: dayKey(start),
        end_day: dayKey(allDay ? addDays(end, -1) : end),
        ...extra,
      };
    },

    formFromInitial(initial) {
      const start = initial?.start ? new Date(initial.start) : new Date();
      if (!initial?.start) {
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + 1);
      }
      const allDay = Boolean(initial?.allDay);
      const end = allDay ? addDays(start, 1) : new Date(start.getTime() + 60 * 60 * 1000);
      return this.buildForm(start, end, allDay);
    },

    formFromEvent(event) {
      const span = eventSpan(event);
      return this.buildForm(span.start, span.end, span.allDay, {
        title: event.title,
        description: event.description || "",
        location: event.location || "",
      });
    },

    toggleAllDay(value) {
      if (value) {
        this.form.start_day = this.form.start_at.slice(0, 10);
        this.form.end_day = (this.form.end_at || this.form.start_at).slice(0, 10);
        if (this.form.end_day < this.form.start_day) this.form.end_day = this.form.start_day;
      } else {
        this.form.start_at = `${this.form.start_day}T09:00`;
        this.form.end_at = `${this.form.end_day === this.form.start_day ? this.form.start_day : this.form.end_day}T10:00`;
      }
      this.form.all_day = value;
    },

    keepEndAfterStart() {
      const start = new Date(this.form.start_at);
      const end = new Date(this.form.end_at);
      if (Number.isNaN(start.getTime())) return;
      if (Number.isNaN(end.getTime()) || end < start) {
        this.form.end_at = toDateTimeLocal(new Date(start.getTime() + 60 * 60 * 1000));
      }
    },

    submit() {
      this.localError = "";
      const title = this.form.title.trim();
      if (!title) {
        this.localError = "Informe o título do compromisso.";
        return;
      }
      if (this.form.all_day) {
        if (!this.form.start_day || this.form.end_day < this.form.start_day) {
          this.localError = "O último dia deve ser igual ou posterior ao primeiro.";
          return;
        }
      } else if (new Date(this.form.end_at) < new Date(this.form.start_at)) {
        this.localError = "O fim deve ser depois do início.";
        return;
      }
      this.$emit("submit", { ...this.form, title });
    },

    askDelete() {
      if (!this.confirmingDelete) {
        this.confirmingDelete = true;
        this.deleteTimer = setTimeout(() => { this.confirmingDelete = false; }, 4000);
        return;
      }
      this.resetDeleteConfirmation();
      this.$emit("delete");
    },

    resetDeleteConfirmation() {
      clearTimeout(this.deleteTimer);
      this.deleteTimer = null;
      this.confirmingDelete = false;
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   TÍTULO COM BOTÃO VOLTAR
   ========================================================================== */
.agenda-modal-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.modal-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.modal-back-btn:hover {
  background: var(--surface-3);
  color: var(--color-info);
  border-color: var(--color-info);
  transform: translateX(-1px);
}

/* ==========================================================================
   TELA 1: LISTAGEM DE COMPROMISSOS DO DIA
   ========================================================================== */
.day-modal-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-1) 0;
}

.day-modal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.day-count-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 700;
}

.day-count-badge.info {
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info);
  border: 1px solid rgba(53, 90, 253, 0.22);
}

.day-count-badge.neutral {
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--glass-border);
}

.day-modal-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.day-modal-add-btn:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

.day-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 420px;
  overflow-y: auto;
}

.day-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--glass-border);
  border-left: 4px solid var(--src);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

[data-theme="dark"] .day-card {
  background: var(--surface-1);
}

.day-card:hover {
  transform: translateY(-1px);
  background: var(--surface-2);
  border-color: rgba(53, 90, 253, 0.35);
  box-shadow: var(--shadow-sm);
}

.day-card-time {
  flex: 0 0 74px;
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  padding: 3px 6px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  text-align: center;
}

.day-card-time.is-allday {
  font-size: 0.7rem;
  color: var(--color-info);
  background: rgba(53, 90, 253, 0.08);
}

.day-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}

.day-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex-wrap: wrap;
}

.day-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font-size: 0.68rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--src) 12%, transparent);
  color: var(--text-secondary);
  border: 1px solid color-mix(in srgb, var(--src) 25%, transparent);
}

.source-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--src);
}

.day-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.meta-icon {
  font-size: 0.72rem;
}

.day-card-arrow {
  color: var(--text-muted);
  font-size: 0.8rem;
  opacity: 0.6;
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.day-card:hover .day-card-arrow {
  transform: translateX(2px);
  opacity: 1;
  color: var(--color-info);
}

.day-card.state-done .day-card-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.day-card.state-projected {
  opacity: 0.75;
  border-left-style: dashed;
}

/* Estado Vazio do Modal */
.day-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
  text-align: center;
  gap: var(--space-2);
}

.empty-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.day-empty-box h4 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.day-empty-box p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  max-width: 320px;
}

.empty-add-btn {
  margin-top: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: #ffffff;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.empty-add-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

/* ==========================================================================
   FORMULÁRIO DO MODAL DE COMPROMISSO
   ========================================================================== */
.nexo-modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  color: var(--text-primary);
}

.agenda-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.agenda-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--src, var(--text-primary));
  background: color-mix(in srgb, var(--src, var(--text-primary)) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--src, var(--text-primary)) 28%, transparent);
}

.agenda-badge--muted {
  --src: var(--text-secondary);
}

.agenda-badge--state.is-done {
  --src: #16a34a;
}

[data-theme="dark"] .agenda-badge--state.is-done {
  --src: #4ade80;
}

.agenda-badge--state.is-overdue {
  --src: var(--color-expense, #d64a2e);
}

.agenda-badge--state.is-pending {
  --src: #3b82f6;
}

.agenda-badge--state.is-projected {
  --src: #8b5cf6;
}

.when-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.when-icon {
  font-size: 1.1rem;
  color: var(--color-info);
}

.when-text {
  font-weight: 600;
  font-size: 0.92rem;
}

.notes-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.notes-label {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.notes-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.notes-text a {
  color: var(--color-info);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
}

.origin-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.origin-note strong {
  font-weight: 700;
  color: var(--text-secondary);
}

.origin-icon {
  font-size: 0.78rem;
}

.field-chip {
  align-self: flex-start;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.hint-callout {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.22);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}

.hint-icon {
  font-size: 0.95rem;
  color: var(--color-info);
  margin-top: 2px;
  flex-shrink: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

@media (max-width: 520px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .field-icon {
  position: absolute;
  left: 12px;
  font-size: 0.85rem;
  color: var(--text-muted);
  pointer-events: none;
}

.nexo-control.with-left-icon {
  padding-left: 36px;
}

.nexo-control {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.nexo-control:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.15);
}

.nexo-control.textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
}

.switch-row-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

.switch-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-row-info strong {
  font-size: 0.85rem;
  font-weight: 700;
}

.switch-row-info small {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.modal-actions-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.actions-spacer {
  flex: 1 1 auto;
}

.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.secondary-btn:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
}

.primary-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: #ffffff;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.primary-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.health-open-btn {
  gap: var(--space-2);
}

.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.complete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.complete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.complete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font: inherit;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.danger-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.16);
  border-color: #ef4444;
}

.danger-btn.confirm-active {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
  font-weight: 700;
}
</style>
