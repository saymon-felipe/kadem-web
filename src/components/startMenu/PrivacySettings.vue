<template>
  <div class="privacy-wrapper">
    <div v-if="!online" class="priv-inline-message info">
      <font-awesome-icon icon="circle-info" />
      <span>As configurações de privacidade e notificações exigem conexão com a internet para sincronizar.</span>
    </div>

    <!-- Mensagem de status / Feedback -->
    <transition name="fade">
      <div v-if="message" class="priv-inline-message" :class="messageType" role="status">
        <font-awesome-icon
          :icon="messageType === 'success' ? 'circle-check' : messageType === 'error' ? 'triangle-exclamation' : 'circle-info'"
        />
        <span class="priv-msg-text">{{ message }}</span>
        <button class="priv-msg-close" type="button" @click="message = ''" aria-label="Fechar">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>
    </transition>

    <!-- Estado de Carregamento Inicial -->
    <div v-if="loading && !settings" class="priv-loading">
      <font-awesome-icon icon="circle-notch" spin />
      <span>Carregando preferências de privacidade...</span>
    </div>

    <!-- Erro ao carregar -->
    <div v-else-if="loadError && !settings" class="priv-empty">
      <font-awesome-icon icon="triangle-exclamation" class="priv-empty-icon danger" />
      <p class="priv-empty-title">Não foi possível carregar as configurações</p>
      <p class="priv-empty-sub">{{ loadError }}</p>
      <button class="priv-btn primary" type="button" @click="load">
        <font-awesome-icon icon="arrows-rotate" />
        Tentar novamente
      </button>
    </div>

    <template v-else-if="settings">
      <!-- 1. Visão Geral e Privacidade de Dados -->
      <section class="priv-section">
        <h3>
          <span>Controle & Privacidade</span>
          <span class="priv-badge" :class="settings.enabled ? 'ok' : 'muted'">
            {{ settings.enabled ? "Lembretes ativos" : "Lembretes pausados" }}
          </span>
        </h3>
        <p>
          Gerencie o comportamento de alertas proativos e a visibilidade de informações confidenciais nos avisos do sistema.
        </p>

        <!-- Card Master -->
        <div class="priv-card highlight">
          <div class="priv-row">
            <div class="priv-icon" :class="{ ok: settings.enabled }">
              <font-awesome-icon :icon="settings.enabled ? 'bell' : 'bell-slash'" />
            </div>
            <div class="priv-body">
              <div class="priv-title">
                <span>Lembretes Pessoais</span>
                <span class="priv-badge" :class="settings.enabled ? 'ok' : 'muted'">
                  {{ settings.enabled ? "Ativo" : "Desativado" }}
                </span>
              </div>
              <div class="priv-meta">
                Habilita lembretes inteligentes, metas financeiras e alertas de saúde da sua conta.
              </div>
            </div>
            <label class="priv-switch" title="Ativar ou desativar lembretes pessoais">
              <input type="checkbox" v-model="settings.enabled" :disabled="!online || saving" />
              <span class="priv-slider"></span>
            </label>
          </div>
        </div>

        <!-- Card Modo Discreto -->
        <div class="priv-card">
          <div class="priv-row">
            <div class="priv-icon info">
              <font-awesome-icon icon="shield-halved" />
            </div>
            <div class="priv-body">
              <div class="priv-title">
                <span>Modo Discreto em Notificações</span>
                <span v-if="settings.discreet" class="priv-badge ok">Privacidade Alta</span>
              </div>
              <div class="priv-meta">
                Oculta saldos monetários e detalhes sensíveis de saúde nas prévias do sistema e na tela de bloqueio.
              </div>
            </div>
            <label class="priv-switch" title="Ocultar dados confidenciais nas notificações do sistema">
              <input type="checkbox" v-model="settings.discreet" :disabled="!online || saving" />
              <span class="priv-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- 2. Entrega Push no Dispositivo -->
      <section class="priv-section">
        <h3>
          <span>Entrega neste Dispositivo</span>
          <span class="priv-badge" :class="permissionBadgeClass">
            {{ permissionBadgeText }}
          </span>
        </h3>
        <p>
          As preferências são salvas na sua conta. Cada navegador ou app precisa de permissão individual para exibir alertas.
        </p>

        <div class="priv-card">
          <div class="priv-row">
            <div class="priv-icon" :class="permissionIconClass">
              <font-awesome-icon icon="desktop" />
            </div>
            <div class="priv-body">
              <div class="priv-title">
                <span>Navegador / App Atual</span>
                <span class="priv-badge" :class="permissionBadgeClass">{{ permissionBadgeText }}</span>
              </div>
              <div class="priv-meta">
                {{ permissionText }}
              </div>
              <div v-if="!publicKey" class="priv-subhint">
                <font-awesome-icon icon="circle-info" />
                O servidor precisa de chaves push configuradas para enviar notificações com o Kadem fechado.
              </div>
            </div>
          </div>

          <div class="priv-actions">
            <button
              v-if="permission !== 'granted'"
              class="priv-btn primary"
              type="button"
              :disabled="!online || saving || permission === 'unsupported'"
              @click="activate"
            >
              <font-awesome-icon icon="bell" />
              {{ saving ? "Ativando…" : "Permitir notificações neste navegador" }}
            </button>
            <button
              v-else
              class="priv-btn danger"
              type="button"
              :disabled="!online || saving"
              @click="deactivate"
            >
              <font-awesome-icon icon="bell-slash" />
              {{ saving ? "Processando…" : "Desativar neste dispositivo" }}
            </button>
          </div>
          <div class="priv-meta-hint">
            Dica: No iPhone ou iPad, adicione o Kadem à Tela de Início para habilitar notificações push em tempo real.
          </div>
        </div>
      </section>

      <!-- 3. Canais por Módulo (Nexo & Health) -->
      <section class="priv-section" :class="{ 'is-disabled': !settings.enabled }">
        <h3>
          <span>Canais de Notificação</span>
          <span v-if="!settings.enabled" class="priv-badge muted">Lembretes desativados</span>
        </h3>
        <p>
          Personalize quais categorias de alertas você deseja receber de cada módulo do Kadem.
        </p>

        <!-- Nexo (Finanças) -->
        <div class="priv-card module-card">
          <div class="module-header">
            <div class="module-title-group">
              <div class="priv-icon info"><font-awesome-icon icon="wallet" /></div>
              <div>
                <h4 class="module-heading">Finanças (Nexo)</h4>
                <span class="module-sub">Avisos orçamentários, pendências e resumos</span>
              </div>
            </div>
          </div>
          <div class="priv-items-list">
            <div v-for="key in nexo" :key="key" class="priv-item-row">
              <div class="priv-item-info">
                <span class="priv-item-title">{{ labels[key] }}</span>
                <span class="priv-item-desc">{{ itemDescriptions[key] }}</span>
              </div>
              <label class="priv-switch">
                <input type="checkbox" v-model="settings[key]" :disabled="!settings.enabled || !online || saving" />
                <span class="priv-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Health (Saúde) -->
        <div class="priv-card module-card">
          <div class="module-header">
            <div class="module-title-group">
              <div class="priv-icon ok"><font-awesome-icon icon="heart-pulse" /></div>
              <div>
                <h4 class="module-heading">Saúde & Bem-estar (Health)</h4>
                <span class="module-sub">Medicamentos, exames, check-ins e hábitos</span>
              </div>
            </div>
          </div>
          <div class="priv-items-list">
            <div v-for="key in health" :key="key" class="priv-item-row">
              <div class="priv-item-info">
                <span class="priv-item-title">{{ labels[key] }}</span>
                <span class="priv-item-desc">{{ itemDescriptions[key] }}</span>
              </div>
              <label class="priv-switch">
                <input type="checkbox" v-model="settings[key]" :disabled="!settings.enabled || !online || saving" />
                <span class="priv-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Agenda -->
        <div class="priv-card module-card">
          <div class="module-header">
            <div class="module-title-group">
              <div class="priv-icon info"><font-awesome-icon icon="calendar-days" /></div>
              <div>
                <h4 class="module-heading">Agenda</h4>
                <span class="module-sub">Compromissos do Kadem e do Google Agenda</span>
              </div>
            </div>
          </div>
          <div class="priv-items-list">
            <div v-for="key in agenda" :key="key" class="priv-item-row">
              <div class="priv-item-info">
                <span class="priv-item-title">{{ labels[key] }}</span>
                <span class="priv-item-desc">{{ itemDescriptions[key] }}</span>
              </div>
              <label class="priv-switch">
                <input type="checkbox" v-model="settings[key]" :disabled="!settings.enabled || !online || saving" />
                <span class="priv-slider"></span>
              </label>
            </div>
            <div class="priv-item-row">
              <div class="priv-item-info">
                <label class="priv-item-title" for="agenda-lead">Avisar</label>
                <span class="priv-item-desc">Compromissos de dia inteiro avisam às 8h do próprio dia.</span>
              </div>
              <select
                id="agenda-lead"
                class="priv-select agenda-lead-select"
                v-model.number="settings.agenda_lead"
                :disabled="!settings.enabled || !settings.agenda_events || !online || saving"
              >
                <option v-for="option in leadOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Programação & Horário Silencioso -->
      <section class="priv-section" :class="{ 'is-disabled': !settings.enabled }">
        <h3>
          <span>Programação & Não Perturbe</span>
        </h3>
        <p>
          Defina o momento ideal para receber seus lembretes e silencie avisos em horários de descanso.
        </p>

        <div class="priv-card">
          <div class="priv-form-grid">
            <div class="priv-field">
              <label class="priv-field-label" for="reminder-time">
                <font-awesome-icon icon="clock" />
                Horário dos resumos diários
              </label>
              <input
                id="reminder-time"
                type="time"
                class="priv-input"
                v-model="settings.reminder_time"
                :disabled="!online || saving || !settings.enabled"
                required
              />
              <span class="priv-field-hint">Horário padrão para check-ins e avisos</span>
            </div>

            <div class="priv-field">
              <label class="priv-field-label" for="weekly-day">
                <font-awesome-icon icon="calendar" />
                Dia da revisão semanal
              </label>
              <select
                id="weekly-day"
                class="priv-select"
                v-model.number="settings.weekly_day"
                :disabled="!online || saving || !settings.enabled"
              >
                <option v-for="(day, index) in days" :value="index" :key="day">{{ day }}</option>
              </select>
              <span class="priv-field-hint">Fechamento semanal do Nexo e Health</span>
            </div>

            <div class="priv-field">
              <label class="priv-field-label" for="quiet-start">
                <font-awesome-icon icon="moon" />
                Silenciar a partir de
              </label>
              <input
                id="quiet-start"
                type="time"
                class="priv-input"
                v-model="settings.quiet_start"
                :disabled="!online || saving || !settings.enabled"
                required
              />
              <span class="priv-field-hint">Início do modo Não Perturbe</span>
            </div>

            <div class="priv-field">
              <label class="priv-field-label" for="quiet-end">
                <font-awesome-icon icon="sun" />
                Voltar a avisar às
              </label>
              <input
                id="quiet-end"
                type="time"
                class="priv-input"
                v-model="settings.quiet_end"
                :disabled="!online || saving || !settings.enabled"
                required
              />
              <span class="priv-field-hint">Término do modo Não Perturbe</span>
            </div>

            <div class="priv-field full-width">
              <label class="priv-field-label" for="timezone">
                <font-awesome-icon icon="globe" />
                Fuso horário de referência
              </label>
              <input
                id="timezone"
                type="text"
                class="priv-input"
                v-model="settings.timezone"
                placeholder="America/Sao_Paulo"
                :disabled="!online || saving || !settings.enabled"
                required
              />
              <span class="priv-field-hint">Usado para calcular seus horários com precisão</span>
            </div>
          </div>

          <div class="priv-meta-hint">
            Horários silenciosos iguais desativam o modo Não Perturbe. Lembretes diários e semanais são entregues a partir do horário configurado.
          </div>
        </div>
      </section>

      <!-- Botão de Salvar Preferências -->
      <div class="priv-save-bar">
        <button
          type="button"
          class="priv-btn primary save-btn"
          :disabled="!online || saving"
          @click="save"
        >
          <font-awesome-icon :icon="saving ? 'circle-notch' : 'check'" :spin="saving" />
          <span>{{ saving ? "Salvando alterações…" : "Salvar preferências" }}</span>
        </button>
      </div>

      <!-- 5. Central de Notificações na Barra de Tarefas -->
      <section class="priv-section">
        <h3>
          <span>Bandeja de Notificações</span>
          <span class="priv-badge info">Barra de Tarefas</span>
        </h3>
        <p>
          O histórico e a central de alertas rápidos agora ficam integrados diretamente na bandeja do sistema.
        </p>

        <div class="priv-card">
          <div class="priv-row">
            <div class="priv-icon info">
              <font-awesome-icon icon="bell" />
            </div>
            <div class="priv-body">
              <div class="priv-title">Acesso Rápido na Barra de Tarefas</div>
              <div class="priv-meta">
                Para visualizar lembretes pendentes, marcar como lidos ou consultar o histórico, clique no ícone de sino no canto superior esquerdo da barra de tarefas.
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useUtilsStore } from "@/stores/utils";
import { useNotificationStore } from "@/stores/notifications";
import { notificationService, notificationLabels, agendaLeadOptions } from "@/services/notificationService";

export default {
  name: "PrivacySettings",
  props: {
    active: { type: Boolean, default: false },
  },
  data: () => ({
    settings: null,
    ownerId: null,
    publicKey: null,
    message: "",
    messageType: "info",
    messageTimeout: null,
    loadError: "",
    loading: false,
    saving: false,
    permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    labels: notificationLabels,
    leadOptions: agendaLeadOptions,
    itemDescriptions: {
      nexo_weekly: "Balanço resumido de receitas, gastos e saldo acumulado na semana.",
      nexo_budget: "Alertas preventivos ao atingir 80% e 100% dos limites de gastos.",
      nexo_review: "Avisos sobre transações sem categoria ou conta definida.",
      nexo_monthly: "Fechamento mensal consolidado e progresso de metas de economia.",
      health_schedule: "Lembretes de consultas agendadas, exames, rotinas e tratamentos.",
      health_stock: "Avisos de reposição para medicamentos e insumos com baixo estoque.",
      health_checkin: "Lembrete diário para acompanhamento de hábitos e sintomas.",
      health_weekly: "Panorama semanal de adesão ao tratamento e evolução clínica.",
      agenda_events: "Aviso antes de cada compromisso, inclusive os que chegam do Google Agenda (os agendamentos do Health seguem nos lembretes do Health).",
    },
    days: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
  }),
  computed: {
    ...mapState(useUtilsStore, ["connection"]),
    online() {
      return Boolean(this.connection.connected);
    },
    nexo() {
      return Object.keys(this.labels).filter((k) => k.startsWith("nexo"));
    },
    health() {
      return Object.keys(this.labels).filter((k) => k.startsWith("health"));
    },
    agenda() {
      return Object.keys(this.labels).filter((k) => k.startsWith("agenda"));
    },
    permissionBadgeClass() {
      switch (this.permission) {
        case "granted":
          return "ok";
        case "denied":
          return "danger";
        case "default":
          return "warn";
        default:
          return "muted";
      }
    },
    permissionBadgeText() {
      switch (this.permission) {
        case "granted":
          return "Permitido";
        case "denied":
          return "Bloqueado";
        case "default":
          return "Pendente";
        default:
          return "Indisponível";
      }
    },
    permissionIconClass() {
      return {
        granted: "ok",
        denied: "danger",
        default: "warn",
        unsupported: "muted",
      }[this.permission] || "muted";
    },
    permissionText() {
      return {
        granted: "Notificações push autorizadas e ativas neste navegador.",
        denied: "Notificações bloqueadas pelo navegador. Acesse as configurações de permissão do site para liberar.",
        default: "Notificações ainda não ativadas. Clique abaixo para receber alertas em tempo real.",
        unsupported: "Seu navegador atual não suporta envio de notificações push nativas.",
      }[this.permission] || "Status de notificação não identificado.";
    },
  },
  watch: {
    active: {
      immediate: true,
      handler(isActive) {
        if (isActive && this.online) this.load();
      },
    },
    online(isOnline) {
      if (isOnline && this.active) this.load();
    },
  },
  methods: {
    showMessage(text, type = "info") {
      this.message = text;
      this.messageType = type;
      if (this.messageTimeout) clearTimeout(this.messageTimeout);
      if (type === "success") {
        this.messageTimeout = setTimeout(() => {
          this.message = "";
        }, 4000);
      }
    },
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        const store = useNotificationStore();
        const state = await store.fetchState();
        if (state) {
          this.settings = JSON.parse(JSON.stringify(state.settings));
          this.ownerId = state.user_id;
          this.publicKey = state.public_key;
        } else if (store.settings) {
          this.settings = JSON.parse(JSON.stringify(store.settings));
          this.ownerId = store.ownerId;
          this.publicKey = store.publicKey;
        }
      } catch (e) {
        const errMsg = e.response?.data?.message || e.message || "Erro desconhecido ao carregar.";
        this.loadError = errMsg;
        this.showMessage(errMsg, "error");
      } finally {
        this.loading = false;
        if (typeof Notification !== "undefined") {
          this.permission = Notification.permission;
        }
      }
    },
    async save() {
      if (!this.settings) return;
      this.saving = true;
      try {
        this.settings.background_sync = true;
        const saved = await notificationService.save(this.settings, this.ownerId);
        useNotificationStore().setState({ settings: saved, user_id: this.ownerId });
        this.showMessage("Preferências salvas com sucesso.", "success");
      } catch (e) {
        this.showMessage(e.response?.data?.message || e.message, "error");
      } finally {
        this.saving = false;
      }
    },
    async activate() {
      this.saving = true;
      try {
        const store = useNotificationStore();
        await store.activatePush();
        if (this.settings) {
          this.settings.enabled = true;
          this.settings.background_sync = true;
        }
        if (typeof Notification !== "undefined") {
          this.permission = Notification.permission;
        }
        this.showMessage("Notificações ativadas com sucesso neste dispositivo.", "success");
      } catch (e) {
        this.showMessage(e.message, "error");
      } finally {
        if (typeof Notification !== "undefined") {
          this.permission = Notification.permission;
        }
        this.saving = false;
      }
    },
    async deactivate() {
      this.saving = true;
      try {
        const store = useNotificationStore();
        await store.deactivatePush();
        this.showMessage("Recebimento de notificações desativado neste dispositivo.", "info");
      } catch (e) {
        this.showMessage(e.message, "error");
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.privacy-wrapper {
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

/* Seções */
.priv-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-2);
  transition: opacity var(--transition-fast);
}

.priv-section.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.priv-section > h3 {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.priv-section p {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.65;
  margin: 0;
}

/* Cards */
.priv-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.priv-card.highlight {
  border-color: rgba(53, 90, 253, 0.25);
  background: linear-gradient(135deg, rgba(53, 90, 253, 0.05), transparent 70%), var(--surface-1);
}

.priv-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.priv-icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 1rem;
  transition: all var(--transition-fast);
}

.priv-icon.ok {
  background: var(--green-high);
  color: #2f8f4a;
}

.priv-icon.info {
  background: rgba(53, 90, 253, 0.12);
  color: var(--blue);
}

.priv-icon.warn {
  background: var(--amber-high);
  color: var(--amber);
}

.priv-icon.danger {
  background: var(--red-high);
  color: var(--red);
}

.priv-icon.muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

.priv-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.priv-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.35;
}

.priv-meta {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.priv-subhint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: 0.75rem;
  color: var(--amber);
}

.priv-meta-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: var(--space-2);
}

/* Badges */
.priv-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: var(--surface-3);
  color: var(--text-secondary);
  white-space: nowrap;
}

.priv-badge.ok {
  background: var(--green-high);
  color: #2f8f4a;
}

.priv-badge.info {
  background: rgba(53, 90, 253, 0.13);
  color: var(--blue);
}

.priv-badge.warn {
  background: var(--amber-high);
  color: #b45309;
}

.priv-badge.danger {
  background: var(--red-high);
  color: var(--red);
}

.priv-badge.muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

/* Switch iOS / macOS Style */
.priv-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.priv-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.priv-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--surface-3);
  border: 1px solid var(--glass-border);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  border-radius: var(--radius-pill);
}

.priv-slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #ffffff;
  border-radius: var(--radius-full);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform var(--transition-fast);
}

.priv-switch input:checked + .priv-slider {
  background: linear-gradient(135deg, #355afd, #243fb8);
  border-color: #355afd;
}

.priv-switch input:checked + .priv-slider::before {
  transform: translateX(20px);
}

.priv-switch input:focus-visible + .priv-slider {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.priv-switch input:disabled + .priv-slider {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Módulo Cards */
.module-card {
  gap: var(--space-4);
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--glass-border);
}

.module-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.module-heading {
  margin: 0;
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
}

.module-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.priv-items-list {
  display: flex;
  flex-direction: column;
}

.priv-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.priv-item-row:not(:last-child) {
  border-bottom: 1px solid var(--glass-border);
}

.priv-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.priv-item-title {
  font-size: var(--fontsize-xs);
  font-weight: 500;
  color: var(--text-primary);
}

.priv-item-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Form Grid de Horários */
.priv-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.priv-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.priv-field.full-width {
  grid-column: 1 / -1;
}

.priv-field-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fontsize-xs);
  font-weight: 500;
  color: var(--text-primary);
}

.priv-field-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.priv-input,
.priv-select {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  box-sizing: border-box;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.priv-input:focus,
.priv-select:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(53, 90, 253, 0.2);
}

.priv-input:disabled,
.priv-select.agenda-lead-select {
  width: auto;
  min-width: 190px;
  flex-shrink: 0;
}

.priv-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Barra de Salvar */
.priv-save-bar {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--space-2);
}

.save-btn {
  height: 42px;
  padding: 0 var(--space-7);
  font-size: var(--fontsize-sx);
}

/* Botões */
.priv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  height: 36px;
  padding: 0 var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);
}

.priv-btn:hover:not(:disabled) {
  background: var(--surface-3);
  transform: translateY(-1px);
}

.priv-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.priv-btn.primary {
  background-image: linear-gradient(to left, #355afd, #243fb8);
  border-color: transparent;
  color: #ffffff;
}

.priv-btn.primary:hover:not(:disabled) {
  background: linear-gradient(to left, #4a6cff, #2c4cd0);
}

.priv-btn.danger {
  background: var(--red-high);
  border-color: transparent;
  color: var(--red);
}

.priv-btn.danger:hover:not(:disabled) {
  background: var(--red);
  color: #ffffff;
}

.priv-btn.ghost {
  background: transparent;
}

.priv-btn.ghost:hover:not(:disabled) {
  background: var(--surface-2);
}

.priv-btn.icon-only {
  width: 36px;
  padding: 0;
}

.priv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-2);
}

/* Mensagens de Feedback & Estado Vazio */
.priv-inline-message {
  font-size: var(--fontsize-xs);
  font-weight: 500;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 var(--space-2);
}

.priv-msg-text {
  flex: 1;
}

.priv-msg-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 2px 6px;
  border-radius: 4px;
}

.priv-msg-close:hover {
  opacity: 1;
}

.priv-inline-message.error {
  background: var(--red-high);
  color: var(--red);
}

.priv-inline-message.success {
  background: var(--green-high);
  color: #2f8f4a;
}

.priv-inline-message.info {
  background: rgba(53, 90, 253, 0.1);
  color: var(--blue);
}

.priv-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-10) 0;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
}

.priv-empty {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.priv-empty-icon {
  font-size: 1.75rem;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.priv-empty-icon.danger {
  color: var(--red);
}

.priv-empty-title {
  font-size: var(--fontsize-sx);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.priv-empty-sub {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  margin: 0;
}

/* Transições */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 580px) {
  .priv-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
