<template>
  <main class="public-health-page custom-scrollbar">
    <div class="public-page-shell">
      <!-- Barra Superior da Marca Kadem Health com Alto Contraste -->
      <header class="public-header-bar">
        <div class="brand-group">
          <img src="@/assets/images/kadem-logo-branco.png" alt="Kadem" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-tag">KADEM HEALTH</span>
            <span class="brand-title">Ficha Médica de Emergência</span>
          </div>
        </div>

        <div class="header-badge">
          <font-awesome-icon icon="shield-halved" />
          <span>Identificação Oficial</span>
        </div>
      </header>

      <!-- Estado de Carregamento -->
      <div v-if="loading" class="public-state glass" role="status">
        <font-awesome-icon icon="circle-notch" spin size="2x" class="state-spinner" />
        <span>Carregando informações de emergência…</span>
      </div>

      <!-- Estado de Cartão Indisponível -->
      <section v-else-if="error" class="unavailable-card glass" role="status">
        <div class="unavailable-icon">
          <font-awesome-icon icon="heart-pulse" />
        </div>
        <h1>Cartão Indisponível</h1>
        <p>Este link não existe, expirou ou a publicação foi desativada pelo titular.</p>
        <a href="/" class="back-link">Conhecer o Kadem</a>
      </section>

      <!-- Cartão de Saúde Principal com Identidade Kadem de Alto Contraste -->
      <article v-else class="health-card">
        <!-- Faixa Gradiente Kadem Health -->
        <div class="card-accent-stripe" aria-hidden="true"></div>

        <!-- Barra de Metadados / Validação -->
        <div class="card-meta-bar">
          <div class="meta-tag">
            <font-awesome-icon icon="address-card" />
            <span>DADOS VITAIS DO PACIENTE</span>
          </div>
          <span class="status-badge">
            <i class="status-dot"></i> Verificado via Link Seguro
          </span>
        </div>

        <!-- Hero: Titular do Cartão + Tipo Sanguíneo em Destaque Clínico Máximo -->
        <section class="patient-hero">
          <div class="patient-profile">
            <div class="patient-avatar">
              <font-awesome-icon icon="user" />
            </div>
            <div class="patient-details">
              <span class="patient-eyebrow">TITULAR DO CARTÃO</span>
              <h1 class="patient-name">{{ card.full_name || 'Nome não informado' }}</h1>
              <p v-if="card.health_insurance" class="patient-insurance">
                <font-awesome-icon icon="address-card" />
                <span>{{ card.health_insurance }}</span>
                <span v-if="card.health_card_number" class="insurance-number-tag">
                  Nº {{ card.health_card_number }}
                </span>
              </p>
            </div>
          </div>

          <!-- Tipo Sanguíneo com Máximo Destaque de Emergência -->
          <div v-if="card.blood_type" class="blood-hero-card">
            <span class="blood-title">TIPO SANGUÍNEO</span>
            <div class="blood-value-row">
              <font-awesome-icon icon="droplet" class="blood-icon" />
              <strong class="blood-type">{{ card.blood_type }}</strong>
            </div>
          </div>
        </section>

        <!-- Ação de Contato de Emergência -->
        <section
          v-if="card.emergency_contact_phone || card.emergency_contact_name"
          class="emergency-contact-banner"
        >
          <div class="contact-info-block">
            <div class="contact-icon-wrap">
              <font-awesome-icon icon="phone" />
            </div>
            <div class="contact-details">
              <span class="contact-eyebrow">CONTATO DE EMERGÊNCIA</span>
              <strong class="contact-person">{{ card.emergency_contact_name || 'Familiar / Responsável' }}</strong>
              <span v-if="card.emergency_contact_phone" class="contact-formatted-phone">
                {{ formatPhone(card.emergency_contact_phone) }}
              </span>
            </div>
          </div>

          <a
            v-if="card.emergency_contact_phone"
            :href="phoneHref(card.emergency_contact_phone)"
            class="call-contact-btn"
            title="Ligar para o contato de emergência"
          >
            <font-awesome-icon icon="phone" />
            <span>Ligar para Contato</span>
          </a>
        </section>

        <!-- Alerta Crítico: Alergias Médicas (Alto Contraste e Atenção) -->
        <section v-if="hasAllergies" class="critical-alert-box">
          <div class="alert-box-header">
            <div class="alert-icon-wrap">
              <font-awesome-icon icon="triangle-exclamation" />
            </div>
            <div>
              <h3 class="alert-title">ALERGIAS CONHECIDAS (ATENÇÃO MÉDICA)</h3>
              <p class="alert-desc">Evitar administração das substâncias abaixo:</p>
            </div>
          </div>

          <div class="allergies-chips-wrap">
            <span
              v-for="allergy in lines(card.allergies)"
              :key="allergy"
              class="allergy-tag"
            >
              {{ allergy }}
            </span>
          </div>
        </section>

        <!-- Grade Clínica & Convênio (2 Colunas com Fundo Nítido) -->
        <div class="card-sections-grid">
          <!-- Condições Importantes -->
          <section v-if="hasConditions" class="info-section-card">
            <div class="info-section-header">
              <div class="info-icon-badge">
                <font-awesome-icon icon="heart-pulse" />
              </div>
              <h4>Condições Importantes</h4>
            </div>
            <div class="chips-container">
              <span
                v-for="cond in lines(card.conditions)"
                :key="cond"
                class="condition-pill"
              >
                {{ cond }}
              </span>
            </div>
          </section>

          <!-- Medicamentos em Uso Contínuo -->
          <section v-if="hasMedications" class="info-section-card">
            <div class="info-section-header">
              <div class="info-icon-badge">
                <font-awesome-icon icon="pills" />
              </div>
              <h4>Medicamentos em Uso</h4>
            </div>
            <ul class="medications-list">
              <li v-for="med in lines(card.medications)" :key="med">
                {{ med }}
              </li>
            </ul>
          </section>

          <!-- Plano de Saúde & Carteirinha -->
          <section v-if="card.health_insurance || card.health_card_number" class="info-section-card">
            <div class="info-section-header">
              <div class="info-icon-badge">
                <font-awesome-icon icon="address-card" />
              </div>
              <h4>Convênio & Carteirinha</h4>
            </div>
            <div class="insurance-content">
              <strong v-if="card.health_insurance" class="insurance-name">{{ card.health_insurance }}</strong>
              <div v-if="card.health_card_number" class="card-number-row">
                <span class="card-number-label">Carteirinha: <strong>{{ card.health_card_number }}</strong></span>
                <button
                  type="button"
                  class="mini-copy-btn"
                  :title="copiedKey === 'card_num' ? 'Copiado!' : 'Copiar número da carteirinha'"
                  @click="copyText(card.health_card_number, 'card_num')"
                >
                  <font-awesome-icon :icon="copiedKey === 'card_num' ? 'check' : 'copy'" />
                  <span>{{ copiedKey === 'card_num' ? 'Copiado' : 'Copiar' }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Orientações para Socorristas -->
          <section v-if="card.additional_notes" class="info-section-card info-section-card--full">
            <div class="info-section-header">
              <div class="info-icon-badge">
                <font-awesome-icon icon="circle-info" />
              </div>
              <h4>Orientações para Socorristas</h4>
            </div>
            <p class="notes-text">{{ card.additional_notes }}</p>
          </section>
        </div>

        <!-- Ações do Rodapé: Copiar Resumo Completo -->
        <div class="card-actions-bar">
          <button
            type="button"
            class="copy-summary-btn"
            @click="copyFullSummary"
          >
            <font-awesome-icon :icon="copiedKey === 'summary' ? 'check' : 'copy'" />
            <span>{{ copiedKey === 'summary' ? 'Ficha Copiada para a Área de Transferência' : 'Copiar Ficha Completa de Emergência' }}</span>
          </button>
        </div>

        <!-- Aviso Médico de Proteção -->
        <footer class="card-disclaimer">
          <font-awesome-icon icon="circle-info" />
          <span>
            Informações declaradas pelo titular para auxílio em emergências. Em casos de urgência com risco à vida, acione imediatamente o SAMU (192) ou Bombeiros (193).
          </span>
        </footer>
      </article>

      <footer class="public-page-footer">
        <div class="footer-badge">
          <span>Cartão de Saúde Seguro disponibilizado via</span>
          <a href="/">Kadem Health</a>
        </div>
      </footer>
    </div>
  </main>
</template>

<script>
import { healthPublicCardService } from '@/services/healthPublicCardService';

export default {
  name: 'HealthPublicCardView',
  data() {
    return {
      loading: true,
      error: false,
      card: {},
      previousTitle: '',
      copiedKey: '',
    };
  },
  computed: {
    hasAllergies() {
      return Boolean(this.card.allergies && this.card.allergies.trim().length);
    },
    hasConditions() {
      return Boolean(this.card.conditions && this.card.conditions.trim().length);
    },
    hasMedications() {
      return Boolean(this.card.medications && this.card.medications.trim().length);
    },
  },
  mounted() {
    this.previousTitle = document.title;
    document.title = 'Cartão de Saúde | Kadem';
    const robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    robotsMeta.content = 'noindex, nofollow, noarchive';
    robotsMeta.dataset.healthPublicCard = 'true';
    document.head.appendChild(robotsMeta);
    this.loadCard();
  },
  watch: {
    '$route.params.token'() {
      this.loadCard();
    },
  },
  beforeUnmount() {
    document.head.querySelector('meta[data-health-public-card="true"]')?.remove();
    document.title = this.previousTitle || 'Kadem';
  },
  methods: {
    async loadCard(token = this.$route.params.token) {
      this.loading = true;
      this.error = false;
      this.card = {};
      try {
        const result = await healthPublicCardService.getPublic(token);
        if (token === this.$route.params.token) {
          this.card = result.data || {};
          if (this.card.full_name) {
            document.title = `Cartão de Saúde - ${this.card.full_name} | Kadem`;
          }
        }
      } catch {
        if (token === this.$route.params.token) this.error = true;
      } finally {
        if (token === this.$route.params.token) this.loading = false;
      }
    },
    lines(value) {
      return String(value || '')
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    },
    phoneHref(value) {
      return `tel:${String(value || '').replace(/[^\d+]/g, '')}`;
    },
    formatPhone(phone) {
      if (!phone) return '';
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      }
      if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
      return phone;
    },
    async copyText(text, key) {
      try {
        await navigator.clipboard.writeText(String(text || ''));
        this.copiedKey = key;
        setTimeout(() => {
          if (this.copiedKey === key) this.copiedKey = '';
        }, 2200);
      } catch (err) {
        console.error('Falha ao copiar:', err);
      }
    },
    async copyFullSummary() {
      const parts = [
        `FICHA MÉDICA DE EMERGÊNCIA - KADEM HEALTH`,
        `Nome: ${this.card.full_name || 'Não informado'}`,
        this.card.blood_type ? `Tipo Sanguíneo: ${this.card.blood_type}` : null,
        this.card.health_insurance
          ? `Plano de Saúde: ${this.card.health_insurance}${this.card.health_card_number ? ` (Carteirinha: ${this.card.health_card_number})` : ''}`
          : null,
        this.card.allergies ? `ALERGIAS: ${this.card.allergies}` : null,
        this.card.conditions ? `Condições: ${this.card.conditions}` : null,
        this.card.medications ? `Medicamentos em uso: ${this.card.medications}` : null,
        this.card.emergency_contact_name || this.card.emergency_contact_phone
          ? `Contato de Emergência: ${this.card.emergency_contact_name || 'Responsável'} - ${this.formatPhone(this.card.emergency_contact_phone)}`
          : null,
        this.card.additional_notes ? `Observações Adicionais: ${this.card.additional_notes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await this.copyText(parts, 'summary');
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   Página Pública de Cartão de Saúde — Kadem Visual Identity
   ========================================================================== */
.public-health-page {
  width: 100dvw;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6) var(--space-4) var(--space-10);
  background-color: var(--surface-3);
  background-image: url("@/assets/images/fundo-auth.webp");
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  color: var(--text-primary);
  font-family: inherit;
  box-sizing: border-box;
}

.public-page-shell {
  width: min(100%, 720px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-8);
}

/* ==========================================================================
   Barra Superior de Marca — Alto Contraste & Logo Adequada
   ========================================================================== */
.public-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-tag {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--yellow);
  text-transform: uppercase;
}

.brand-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 0.76rem;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.header-badge svg {
  color: var(--yellow);
}

/* ==========================================================================
   Cartão de Saúde Principal (Base Branca Nítida de Alto Contraste)
   ========================================================================== */
.health-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(31, 39, 76, 0.12);
  border-radius: var(--radius-md);
  box-shadow:
    0 24px 48px -12px rgba(15, 23, 42, 0.25),
    0 4px 12px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
}

.card-accent-stripe {
  height: 5px;
  background: linear-gradient(90deg, #e25373 0%, #8d5fd3 65%, var(--yellow) 100%);
}

.card-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #f8fafc;
  border-bottom: 1.5px solid #e2e8f0;
  font-size: 0.74rem;
}

.meta-tag {
  color: var(--deep-blue);
  font-weight: 900;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-transform: uppercase;
}

.meta-tag svg {
  color: var(--deep-blue-2);
  font-size: 0.95rem;
}

.status-badge {
  color: #065f46;
  background: #ecfdf5;
  border: 1.5px solid #059669;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-weight: 800;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

/* ==========================================================================
   Hero: Titular + Tipo Sanguíneo em Destaque Clínico
   ========================================================================== */
.patient-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 28px;
  background: #ffffff;
  border-bottom: 1.5px solid #e2e8f0;
}

.patient-profile {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  flex: 1;
}

.patient-avatar {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-sm);
  background: #eef2ff;
  color: var(--deep-blue);
  border: 1.5px solid #cbd5e1;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.patient-details {
  min-width: 0;
}

.patient-eyebrow {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--deep-blue-2);
  text-transform: uppercase;
  margin-bottom: 3px;
}

.patient-name {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--deep-blue);
  line-height: 1.2;
  word-break: break-word;
}

.patient-insurance {
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--deep-blue);
  font-weight: 700;
  flex-wrap: wrap;
}

.patient-insurance svg {
  color: var(--deep-blue-2);
  font-size: 0.95rem;
}

.insurance-number-tag {
  background: #f1f5f9;
  border: 1.5px solid #cbd5e1;
  padding: 2px 9px;
  border-radius: 4px;
  font-weight: 800;
  color: var(--deep-blue);
  font-size: 0.82rem;
}

/* Destaque Máximo de Tipo Sanguíneo (Padrão de Emergência Vermelho) */
.blood-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
  border: 2px solid #991b1b;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.28);
  flex-shrink: 0;
  min-width: 110px;
}

.blood-title {
  font-size: 0.68rem;
  font-weight: 800;
  color: #fee2e2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.blood-value-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.blood-icon {
  color: #fee2e2;
  font-size: 1.25rem;
}

.blood-type {
  font-size: 1.85rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* ==========================================================================
   Contato de Emergência
   ========================================================================== */
.emergency-contact-banner {
  margin: 20px 24px 16px;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.contact-info-block {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.contact-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #dcfce7;
  color: #15803d;
  border: 1.5px solid #86efac;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.contact-details {
  display: flex;
  flex-direction: column;
}

.contact-eyebrow {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--deep-blue-2);
  text-transform: uppercase;
}

.contact-person {
  font-size: 1.05rem;
  color: var(--deep-blue);
  font-weight: 900;
  margin-top: 1px;
}

.contact-formatted-phone {
  font-size: 0.95rem;
  color: var(--deep-blue);
  font-weight: 800;
  margin-top: 2px;
}

.call-contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background-image: var(--deep-blue-gradient);
  color: var(--white);
  padding: 12px 22px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(31, 39, 76, 0.28);
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.call-contact-btn:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

/* ==========================================================================
   Alerta Crítico: Alergias Médicas (Alto Contraste)
   ========================================================================== */
.critical-alert-box {
  margin: 0 24px 18px;
  padding: 16px 20px;
  background: #fff1f2;
  border: 1.5px solid #fda4af;
  border-left: 5px solid #dc2626;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.08);
}

.alert-box-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.alert-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-xs);
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.alert-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 900;
  color: #991b1b;
  letter-spacing: 0.04em;
}

.alert-desc {
  margin: 3px 0 0;
  font-size: 0.82rem;
  color: #7f1d1d;
  font-weight: 700;
}

.allergies-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.allergy-tag {
  background: #ffffff;
  color: #991b1b;
  border: 2px solid #f87171;
  padding: 6px 14px;
  border-radius: var(--radius-xs);
  font-weight: 800;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(185, 28, 28, 0.08);
}

/* ==========================================================================
   Grade de Informações Clínicas & Convênio
   ========================================================================== */
.card-sections-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 0 24px 18px;
}

.info-section-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-section-card--full {
  grid-column: 1 / -1;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon-badge {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs);
  background: rgba(31, 39, 76, 0.08);
  color: var(--deep-blue);
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.info-section-header h4 {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--deep-blue);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.condition-pill {
  background: #ffffff;
  color: var(--deep-blue);
  border: 1.5px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.85rem;
  font-weight: 700;
}

.medications-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.medications-list li {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.85rem;
  color: var(--deep-blue);
  font-weight: 700;
}

.insurance-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.88rem;
}

.insurance-name {
  font-size: 1rem;
  color: var(--deep-blue);
  font-weight: 900;
}

.card-number-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-number-label {
  font-size: 0.85rem;
  color: var(--deep-blue-2);
  font-weight: 700;
}

.card-number-label strong {
  color: var(--deep-blue);
  font-weight: 900;
}

.mini-copy-btn {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: var(--radius-xs);
  padding: 4px 10px;
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--deep-blue);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all var(--transition-fast);
}

.mini-copy-btn:hover {
  background: var(--deep-blue);
  color: #ffffff;
  border-color: var(--deep-blue);
}

.notes-text {
  margin: 0;
  font-size: 0.86rem;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ==========================================================================
   Ações e Rodapé do Cartão
   ========================================================================== */
.card-actions-bar {
  display: flex;
  justify-content: center;
  padding: 6px 24px 18px;
}

.copy-summary-btn {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: var(--deep-blue);
  border-radius: var(--radius-sm);
  padding: 11px 22px;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(31, 39, 76, 0.06);
  transition: all var(--transition-fast);
}

.copy-summary-btn:hover {
  background: #f1f5f9;
  border-color: var(--deep-blue);
  box-shadow: 0 4px 12px rgba(31, 39, 76, 0.12);
}

.card-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1.5px solid #e2e8f0;
  font-size: 0.78rem;
  color: #334155;
  font-weight: 600;
  line-height: 1.5;
}

.card-disclaimer svg {
  color: var(--deep-blue-2);
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 0.95rem;
}

/* ==========================================================================
   Estados de Carregamento & Erro
   ========================================================================== */
.public-state,
.unavailable-card {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
  text-align: center;
  color: var(--deep-blue);
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.15);
}

.state-spinner {
  color: var(--deep-blue);
}

.unavailable-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  color: #e25373;
  background: rgba(226, 83, 115, 0.12);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-md);
}

.unavailable-card h1 {
  margin: 0;
  color: var(--deep-blue);
  font-size: 1.3rem;
  font-weight: 900;
}

.unavailable-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
  font-weight: 600;
}

.back-link {
  padding: 10px 20px;
  color: #fff;
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(226, 83, 115, 0.25);
  transition: all var(--transition-fast);
}

.back-link:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.public-page-footer {
  margin-top: var(--space-2);
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.footer-badge a {
  color: var(--yellow);
  font-weight: 800;
  text-decoration: none;
}

.footer-badge a:hover {
  text-decoration: underline;
}

/* ==========================================================================
   Responsividade Mobile (< 640px)
   ========================================================================== */
@media (max-width: 640px) {
  .public-health-page {
    padding: var(--space-3) var(--space-3) var(--space-6);
  }

  .public-header-bar {
    padding: 10px 14px;
  }

  .brand-logo {
    height: 32px;
  }

  .patient-hero {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 18px 16px;
  }

  .patient-name {
    font-size: 1.35rem;
  }

  .blood-hero-card {
    flex-direction: row;
    justify-content: space-between;
    padding: 10px 16px;
    min-width: 0;
  }

  .blood-title {
    margin-bottom: 0;
  }

  .emergency-contact-banner {
    flex-direction: column;
    align-items: stretch;
    margin: 14px 16px;
    padding: 14px;
    gap: 12px;
  }

  .call-contact-btn {
    width: 100%;
    justify-content: center;
    box-sizing: border-box;
  }

  .critical-alert-box {
    margin-left: 16px;
    margin-right: 16px;
    padding: 14px;
  }

  .card-sections-grid {
    grid-template-columns: 1fr;
    padding: 0 16px 14px;
    gap: 10px;
  }

  .card-meta-bar,
  .card-disclaimer,
  .card-actions-bar {
    padding-left: 16px;
    padding-right: 16px;
  }

  .copy-summary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
