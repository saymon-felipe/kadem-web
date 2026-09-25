<template>
  <div class="health-card-tab custom-scrollbar">
    <!-- Cabeçalho idêntico à linguagem visual Kadem Health -->
    <header class="tab-header">
      <div class="heading-copy">
        <span class="eyebrow">EMERGÊNCIA & ACESSO RÁPIDO</span>
        <h3 class="tab-title">
          <font-awesome-icon icon="address-card" class="title-icon" />
          <span>Cartão de Saúde</span>
        </h3>
        <p class="tab-subtitle">
          Reúna dados vitais, tipo sanguíneo, alergias e contatos de emergência acessíveis via QR code ou link seguro.
        </p>
      </div>

      <div class="header-actions">
        <div class="status-pill" :class="{ 'is-active': form.is_published }">
          <i class="status-dot"></i>
          <span>{{ form.is_published ? 'Publicação Ativa' : 'Cartão Privado' }}</span>
        </div>

        <button
          class="kadem-health-button kadem-health-button--primary kadem-health-button--compact"
          type="button"
          :disabled="saving || loading"
          @click="save"
        >
          <font-awesome-icon :icon="saving ? 'circle-notch' : 'floppy-disk'" :spin="saving" />
          <span>{{ saving ? 'Salvando…' : 'Salvar Alterações' }}</span>
        </button>
      </div>
    </header>

    <!-- Estado de Carregamento -->
    <div v-if="loading" class="tab-loading-state" role="status">
      <font-awesome-icon icon="circle-notch" spin />
      <span>Carregando dados do cartão…</span>
    </div>

    <!-- Conteúdo Principal em 2 Colunas (Editor + Studio Lateral) -->
    <div v-else class="tab-layout">
      <!-- Coluna da Esquerda: Formulário de Edição -->
      <form class="editor-pane" @submit.prevent="save">
        <!-- Banner de Segurança & Privacidade -->
        <div class="security-banner">
          <div class="security-icon-box">
            <font-awesome-icon icon="shield-halved" />
          </div>
          <div class="security-copy">
            <strong>Privacidade e Controle Total</strong>
            <p>
              Somente pessoas com seu link exclusivo ou que escanearem seu QR code poderão visualizar os dados.
              Ao desativar a publicação e salvar, qualquer link existente é revogado imediatamente.
            </p>
          </div>
        </div>

        <!-- Seção 1: Identificação Pessoal -->
        <section class="form-section">
          <div class="section-header">
            <div class="section-icon-tag section-icon-tag--identity">
              <font-awesome-icon icon="user" />
            </div>
            <div>
              <h4 class="section-title">Identificação Pessoal</h4>
              <p class="section-description">Dados essenciais para identificação rápida do titular em caso de socorro.</p>
            </div>
          </div>

          <div class="fields-grid">
            <label class="field-item field-span-full">
              <span class="field-label">
                Nome completo a exibir
                <span v-if="form.is_published" class="required-indicator">*</span>
              </span>
              <div class="input-wrapper">
                <input
                  v-model.trim="form.full_name"
                  maxlength="120"
                  autocomplete="name"
                  placeholder="Ex.: Maria Souza Silva"
                  :required="form.is_published"
                />
              </div>
            </label>

            <label class="field-item">
              <span class="field-label">Tipo Sanguíneo</span>
              <div class="select-wrapper">
                <select v-model="form.blood_type">
                  <option value="">Não informado</option>
                  <option v-for="type in bloodTypes" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
              </div>
            </label>

            <label class="field-item">
              <span class="field-label">Plano de Saúde / Convênio</span>
              <div class="input-wrapper">
                <input
                  v-model.trim="form.health_insurance"
                  maxlength="120"
                  placeholder="Ex.: Unimed, Bradesco, SUS"
                />
              </div>
            </label>

            <label class="field-item field-span-full">
              <span class="field-label">Número da Carteirinha / Beneficiário</span>
              <div class="input-wrapper">
                <input
                  v-model.trim="form.health_card_number"
                  maxlength="80"
                  autocomplete="off"
                  placeholder="Ex.: 0012 3456 7890"
                />
              </div>
            </label>
          </div>
        </section>

        <!-- Seção 2: Informações Clínicas & Alertas -->
        <section class="form-section">
          <div class="section-header">
            <div class="section-icon-tag section-icon-tag--clinical">
              <font-awesome-icon icon="heart-pulse" />
            </div>
            <div>
              <h4 class="section-title">Informações Clínicas & Alertas</h4>
              <p class="section-description">Condições médicas, medicamentos e fatores que a equipe de socorro deve saber.</p>
            </div>
          </div>

          <div class="fields-grid">
            <label class="field-item field-span-full field-item--critical">
              <div class="field-label-row">
                <span class="field-label">
                  <font-awesome-icon icon="triangle-exclamation" class="alert-icon" />
                  Alergias conhecidas (medicamentos, alimentos, substâncias)
                </span>
                <span class="field-hint">Separe por vírgulas ou linhas</span>
              </div>
              <textarea
                v-model.trim="form.allergies"
                maxlength="2000"
                rows="2"
                placeholder="Ex.: Dipirona, Penicilina, Amendoim, Frutos do mar, Látex"
              />
            </label>

            <label class="field-item field-span-full">
              <div class="field-label-row">
                <span class="field-label">Condições importantes de saúde</span>
                <span class="field-hint">Diagnósticos relevantes</span>
              </div>
              <textarea
                v-model.trim="form.conditions"
                maxlength="2000"
                rows="2"
                placeholder="Ex.: Diabetes tipo 1, Hipertensão arterial, Asma, Portador de marca-passo"
              />
            </label>

            <label class="field-item field-span-full">
              <div class="field-label-row">
                <span class="field-label">Medicamentos em uso contínuo</span>
                <span class="field-hint">Nome e posologia se relevante</span>
              </div>
              <textarea
                v-model.trim="form.medications"
                maxlength="2000"
                rows="2"
                placeholder="Ex.: Insulina NPH 20 UI pela manhã, Losartana 50mg 1x/dia"
              />
            </label>
          </div>
        </section>

        <!-- Seção 3: Contato de Emergência -->
        <section class="form-section">
          <div class="section-header">
            <div class="section-icon-tag section-icon-tag--emergency">
              <font-awesome-icon icon="phone" />
            </div>
            <div>
              <h4 class="section-title">Contato de Emergência</h4>
              <p class="section-description">Pessoa de confiança que deve ser avisada em caso de imprevisto.</p>
            </div>
          </div>

          <div class="fields-grid">
            <label class="field-item">
              <span class="field-label">Nome do contato de emergência</span>
              <div class="input-wrapper">
                <input
                  v-model.trim="form.emergency_contact_name"
                  maxlength="120"
                  autocomplete="off"
                  placeholder="Ex.: Carlos Souza (Pai)"
                />
              </div>
            </label>

            <label class="field-item">
              <span class="field-label">Telefone de contato</span>
              <div class="input-wrapper">
                <input
                  v-model.trim="form.emergency_contact_phone"
                  maxlength="40"
                  type="tel"
                  autocomplete="tel"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </label>

            <label class="field-item field-span-full">
              <span class="field-label">Instruções adicionais para socorristas</span>
              <textarea
                v-model.trim="form.additional_notes"
                maxlength="2000"
                rows="2"
                placeholder="Ex.: Em caso de crise hipoglicêmica, verificar sachê de glicose no bolso frontal da mochila."
              />
            </label>
          </div>
        </section>

        <!-- Seção 4: Chave de Publicação & Visibilidade -->
        <section class="publish-card" :class="{ 'is-active': form.is_published }">
          <div class="publish-info">
            <div class="publish-status-tag">
              <span class="status-indicator"></span>
              <strong>{{ form.is_published ? 'Cartão Público Ativo' : 'Modo Privado (Desativado)' }}</strong>
            </div>
            <p>
              {{
                form.is_published
                  ? 'O link seguro e o QR code estão ativos. Quem consultar terá acesso direto aos dados preenchidos.'
                  : 'Ative esta opção e clique em Salvar para gerar ou reativar seu endereço seguro e QR code.'
              }}
            </p>
          </div>

          <label class="switch-toggle" title="Alternar status de publicação">
            <span class="visually-hidden">Publicar cartão de saúde</span>
            <input v-model="form.is_published" type="checkbox" />
            <span class="slider" aria-hidden="true"></span>
          </label>
        </section>

        <!-- Mensagens de Feedback -->
        <div v-if="error" class="alert-message alert-message--error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" />
          <span>{{ error }}</span>
        </div>

        <div v-if="savedMessage" class="alert-message alert-message--success" role="status">
          <font-awesome-icon icon="circle-check" />
          <span>{{ savedMessage }}</span>
        </div>

        <!-- Ações do Rodapé -->
        <div class="editor-actions">
          <button
            class="kadem-health-button kadem-health-button--primary"
            type="submit"
            :disabled="saving"
          >
            <font-awesome-icon :icon="saving ? 'circle-notch' : 'floppy-disk'" :spin="saving" />
            <span>{{ saving ? 'Salvando dados…' : 'Salvar Cartão de Saúde' }}</span>
          </button>
        </div>
      </form>

      <!-- Coluna da Direita: Studio Lateral (Prévia ao Vivo + Compartilhamento) -->
      <aside class="studio-pane">
        <!-- Pré-visualização do Cartão em Tempo Real -->
        <div class="preview-box">
          <div class="preview-box-header">
            <div class="preview-title">
              <font-awesome-icon icon="eye" />
              <span>Prévia ao vivo do cartão</span>
            </div>
            <span class="preview-pill" :class="{ active: form.is_published }">
              {{ form.is_published ? 'Público' : 'Rascunho' }}
            </span>
          </div>

          <!-- O cartão renderizado em miniatura -->
          <article class="live-card">
            <div class="live-card-stripe"></div>

            <header class="live-card-header">
              <div class="live-brand">
                <font-awesome-icon icon="heart-pulse" class="live-brand-icon" />
                <div>
                  <span class="live-brand-kadem">KADEM HEALTH</span>
                  <span class="live-brand-sub">Cartão de Emergência</span>
                </div>
              </div>
              <span v-if="form.blood_type" class="live-blood-badge">
                <font-awesome-icon icon="droplet" />
                {{ form.blood_type }}
              </span>
            </header>

            <div class="live-card-body">
              <!-- Identificação -->
              <div class="live-identity">
                <div class="live-avatar">
                  <font-awesome-icon icon="user" />
                </div>
                <div class="live-person-info">
                  <span class="live-role-label">TITULAR</span>
                  <h4 class="live-name">{{ form.full_name || 'Nome do Titular' }}</h4>
                  <p v-if="form.health_insurance || form.health_card_number" class="live-insurance-text">
                    {{ form.health_insurance }}
                    <span v-if="form.health_card_number">({{ form.health_card_number }})</span>
                  </p>
                </div>
              </div>

              <!-- Alerta de Alergias -->
              <div v-if="hasAllergies" class="live-alert-card">
                <div class="live-alert-icon">
                  <font-awesome-icon icon="triangle-exclamation" />
                </div>
                <div class="live-alert-content">
                  <strong>ALERGIAS</strong>
                  <div class="live-chips-list">
                    <span v-for="item in splitItems(form.allergies)" :key="item" class="live-chip live-chip--critical">
                      {{ item }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Condições & Remédios -->
              <div v-if="hasConditions || hasMedications" class="live-details-grid">
                <div v-if="hasConditions" class="live-detail-box">
                  <span class="live-detail-label">
                    <font-awesome-icon icon="stethoscope" /> Condições
                  </span>
                  <p class="live-detail-text">{{ form.conditions }}</p>
                </div>

                <div v-if="hasMedications" class="live-detail-box">
                  <span class="live-detail-label">
                    <font-awesome-icon icon="pills" /> Medicamentos
                  </span>
                  <p class="live-detail-text">{{ form.medications }}</p>
                </div>
              </div>

              <!-- Contato de Emergência -->
              <div v-if="form.emergency_contact_name || form.emergency_contact_phone" class="live-emergency-box">
                <span class="live-detail-label">
                  <font-awesome-icon icon="phone" /> Contato de Emergência
                </span>
                <div class="live-contact-row">
                  <strong>{{ form.emergency_contact_name || 'Contato' }}</strong>
                  <span v-if="form.emergency_contact_phone" class="live-contact-phone">
                    {{ form.emergency_contact_phone }}
                  </span>
                </div>
              </div>

              <!-- Observações Adicionais -->
              <div v-if="form.additional_notes" class="live-notes-box">
                <span class="live-detail-label">
                  <font-awesome-icon icon="circle-info" /> Observações
                </span>
                <p class="live-detail-text">{{ form.additional_notes }}</p>
              </div>

              <!-- Dica quando vazio -->
              <div v-if="isCardEmpty" class="live-empty-hint">
                <p>Preencha os campos ao lado para acompanhar a pré-visualização em tempo real.</p>
              </div>
            </div>

            <footer class="live-card-footer">
              <span>Em caso de socorro médico imediato, ligue para o SAMU (192).</span>
            </footer>
          </article>
        </div>

        <!-- Painel de Compartilhamento & QR Code -->
        <div class="share-box">
          <div class="share-box-header">
            <div class="share-title">
              <font-awesome-icon icon="qrcode" />
              <div>
                <h4>Acesso & Compartilhamento</h4>
                <p>Use o QR code para pulseiras, carteiras ou bloqueio de tela.</p>
              </div>
            </div>
            <span class="share-status-tag" :class="{ 'is-active': settings.is_published }">
              {{ settings.is_published ? 'Ativo' : 'Inativo' }}
            </span>
          </div>

          <!-- Moldura do QR Code -->
          <div class="qr-container" :class="{ 'is-disabled': !settings.is_published }">
            <div v-if="settings.is_published && qrDataUrl" class="qr-active-wrap">
              <img :src="qrDataUrl" alt="QR code do cartão público de saúde" />
              <span class="qr-caption">Aponte a câmera do celular para testar</span>
            </div>
            <div v-else class="qr-placeholder-state">
              <font-awesome-icon
                :icon="settings.is_published ? 'circle-notch' : 'qrcode'"
                :spin="settings.is_published && qrLoading"
                class="qr-placeholder-icon"
              />
              <p>
                {{
                  settings.is_published
                    ? 'Gerando código QR de alta resolução…'
                    : 'Publique e salve o cartão para ativar o link público e gerar seu QR code.'
                }}
              </p>
            </div>
          </div>

          <!-- Ações de Compartilhamento -->
          <template v-if="settings.is_published && publicUrl">
            <div class="link-display" :title="publicUrl">
              <font-awesome-icon icon="link" />
              <span class="link-url">{{ publicUrl }}</span>
            </div>

            <div class="share-buttons-grid">
              <button
                class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
                type="button"
                @click="copyLink"
              >
                <font-awesome-icon :icon="copied ? 'check' : 'copy'" />
                <span>{{ copied ? 'Copiado!' : 'Copiar Link' }}</span>
              </button>

              <button
                class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
                type="button"
                :disabled="!qrDataUrl"
                title="Imprimir cartão de identificação com QR code"
                @click="printQr"
              >
                <font-awesome-icon icon="print" />
                <span>Imprimir QR</span>
              </button>

              <button
                class="kadem-health-button kadem-health-button--primary kadem-health-button--compact action-open-link"
                type="button"
                @click="openPublicCard"
              >
                <font-awesome-icon icon="arrow-up-right-from-square" />
                <span>Abrir Cartão</span>
              </button>
            </div>
          </template>

          <footer class="share-security-footer">
            <font-awesome-icon icon="lock" />
            <span>Desativar a publicação e salvar invalida este link e QR code na hora.</span>
          </footer>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode';
import { healthPublicCardService } from '@/services/healthPublicCardService';

const emptyCard = () => ({
  full_name: '',
  blood_type: '',
  health_insurance: '',
  health_card_number: '',
  allergies: '',
  conditions: '',
  medications: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  additional_notes: '',
});

export default {
  name: 'HealthPublicCardTab',
  data() {
    return {
      loading: true,
      saving: false,
      qrLoading: false,
      copied: false,
      error: '',
      savedMessage: '',
      settings: { is_published: false, public_token: null, data: emptyCard() },
      form: { is_published: false, ...emptyCard() },
      qrDataUrl: '',
      bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    };
  },
  computed: {
    publicUrl() {
      if (!this.settings.public_token || typeof window === 'undefined') return '';
      const route = this.$router.resolve({
        name: 'HealthPublicCard',
        params: { token: this.settings.public_token },
      });
      return `${window.location.origin}${route.href}`;
    },
    hasAllergies() {
      return Boolean(this.form.allergies && this.form.allergies.trim().length);
    },
    hasConditions() {
      return Boolean(this.form.conditions && this.form.conditions.trim().length);
    },
    hasMedications() {
      return Boolean(this.form.medications && this.form.medications.trim().length);
    },
    isCardEmpty() {
      return (
        !this.form.full_name &&
        !this.form.blood_type &&
        !this.form.health_insurance &&
        !this.form.health_card_number &&
        !this.hasAllergies &&
        !this.hasConditions &&
        !this.hasMedications &&
        !this.form.emergency_contact_name &&
        !this.form.emergency_contact_phone &&
        !this.form.additional_notes
      );
    },
  },
  async mounted() {
    await this.loadSettings();
  },
  methods: {
    splitItems(value) {
      return String(value || '')
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    },
    async loadSettings() {
      this.loading = true;
      this.error = '';
      try {
        const data = await healthPublicCardService.getMine();
        this.settings = data;
        this.form = { is_published: data.is_published, ...emptyCard(), ...data.data };
        await this.refreshQr();
      } catch (error) {
        this.error = error.response?.data?.message || 'Não foi possível carregar o cartão de saúde.';
      } finally {
        this.loading = false;
      }
    },
    async save() {
      this.saving = true;
      this.error = '';
      this.savedMessage = '';
      try {
        const { is_published, ...data } = this.form;
        this.settings = await healthPublicCardService.saveMine({ is_published, data });
        this.form = {
          is_published: this.settings.is_published,
          ...emptyCard(),
          ...this.settings.data,
        };
        await this.refreshQr();
        this.savedMessage = 'Cartão de saúde salvo com sucesso.';
        window.setTimeout(() => {
          this.savedMessage = '';
        }, 3500);
      } catch (error) {
        this.error = error.response?.data?.message || 'Não foi possível salvar o cartão.';
      } finally {
        this.saving = false;
      }
    },
    async refreshQr() {
      this.qrDataUrl = '';
      if (!this.settings.is_published || !this.publicUrl) return;
      this.qrLoading = true;
      try {
        this.qrDataUrl = await QRCode.toDataURL(this.publicUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 240,
          color: { dark: '#1e293b', light: '#ffffff' },
        });
      } catch {
        this.error = 'Não foi possível gerar o QR code neste dispositivo.';
      } finally {
        this.qrLoading = false;
      }
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.publicUrl);
        this.copied = true;
        window.setTimeout(() => {
          this.copied = false;
        }, 1800);
      } catch {
        this.error = 'Não foi possível copiar o link. Selecione e copie o endereço manualmente.';
      }
    },
    async printQr() {
      if (!this.publicUrl) return;

      let printQrDataUrl = this.qrDataUrl;
      try {
        printQrDataUrl = await QRCode.toDataURL(this.publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 500,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
      } catch {
        printQrDataUrl = this.qrDataUrl;
      }

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>QR Code de Emergência - Cartão de Saúde</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-card-wrapper {
      width: 340px;
      border: 2px dashed #94a3b8;
      border-radius: 18px;
      padding: 10px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .print-card {
      border: 2.5px solid #1F274C;
      border-radius: 14px;
      padding: 20px 18px 16px;
      text-align: center;
      background: #ffffff;
    }
    .card-top-tag {
      display: inline-block;
      background: #dc2626;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 10px;
    }
    .main-heading {
      font-size: 16px;
      font-weight: 900;
      color: #1F274C;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .sub-heading {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      margin-top: 3px;
    }
    .divider {
      height: 2px;
      background: #e2e8f0;
      margin: 12px 0;
    }
    .qr-frame {
      margin: 8px auto;
      padding: 10px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      width: fit-content;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .qr-image {
      width: 250px;
      height: 250px;
      display: block;
    }
    .instructions-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      margin-top: 12px;
      font-size: 11px;
      color: #334155;
      line-height: 1.45;
      text-align: center;
    }
    .instructions-box strong {
      display: block;
      color: #dc2626;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-size: 11.5px;
    }
    .url-text {
      font-size: 9px;
      color: #64748b;
      word-break: break-all;
      margin-top: 8px;
    }
    .cut-notice {
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="print-card-wrapper">
    <div class="print-card">
      <div class="card-top-tag">PRIMEIROS SOCORROS & EMERGÊNCIA</div>
      <div class="main-heading">CARTÃO DE SAÚDE • INFORMAÇÕES VITAIS</div>
      <div class="sub-heading">Acesso Médico Imediato via QR Code</div>

      <div class="divider"></div>

      <div class="qr-frame">
        <img src="${printQrDataUrl}" class="qr-image" alt="QR Code de Emergência" />
      </div>

      <div class="instructions-box">
        <strong>⚠️ ATENÇÃO SOCORRISTAS / EQUIPE MÉDICA</strong>
        Aponte a câmera do celular para este QR Code para visualizar a ficha médica de emergência do titular: <b>tipo sanguíneo, alergias, condições de saúde, medicamentos contínuos e contatos de familiares</b>.
      </div>

      <div class="url-text">${this.publicUrl}</div>
    </div>
    <div class="cut-notice">✂ Recorte na linha pontilhada para carteira, crachá, pulseira ou veículo</div>
  </div>
</body>
</html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 3000);
      }, 400);
    },
    openPublicCard() {
      if (this.publicUrl && typeof window !== 'undefined') {
        window.open(this.publicUrl, '_blank', 'noopener,noreferrer');
      }
    },
  },
};
</script>

<style scoped>
.health-card-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 1280px;
  margin: 0 auto;
}

/* ==========================================================================
   Header Padrão Kadem Health
   ========================================================================== */
.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding-bottom: var(--space-1);
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

.tab-title {
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

.tab-subtitle {
  margin: 0;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: var(--radius-pill);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--text-muted);
}

.status-pill.is-active {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.status-pill.is-active .status-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

/* ==========================================================================
   Loading State
   ========================================================================== */
.tab-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 300px;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
}

.tab-loading-state svg {
  font-size: 1.8rem;
  color: #e25373;
}

/* ==========================================================================
   Layout Principal em 2 Colunas (Editor + Studio)
   ========================================================================== */
.tab-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr);
  gap: var(--space-4);
  align-items: start;
}

/* ==========================================================================
   Coluna da Esquerda: Formulário de Edição
   ========================================================================== */
.editor-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  box-shadow: var(--shadow-card);
  border-top: 3px solid #e25373;
}

/* Banner de Segurança */
.security-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, rgba(226, 83, 115, 0.06), rgba(141, 95, 211, 0.05));
  border: 1px solid rgba(226, 83, 115, 0.18);
}

.security-icon-box {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-xs);
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
  font-size: 0.9rem;
}

.security-copy strong {
  display: block;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.security-copy p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

/* Seções do Formulário */
.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--glass-border);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.section-icon-tag {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  font-size: 0.82rem;
}

.section-icon-tag--identity {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.section-icon-tag--clinical {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
}

.section-icon-tag--emergency {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.section-title {
  margin: 0;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.section-description {
  margin: 2px 0 0;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-span-full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.required-indicator {
  color: #ef4444;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.field-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
}

.field-item--critical .alert-icon {
  color: #ef4444;
}

/* Campos de entrada e seleção */
.input-wrapper,
.select-wrapper {
  position: relative;
  width: 100%;
}

.input-wrapper input,
.select-wrapper select,
.field-item textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--text-primary);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

.input-wrapper input:focus,
.select-wrapper select:focus,
.field-item textarea:focus {
  background: var(--surface-0);
  border-color: #e25373;
  box-shadow: 0 0 0 3px rgba(226, 83, 115, 0.16);
}

.field-item textarea {
  resize: vertical;
  min-height: 64px;
  line-height: 1.45;
}

.field-item--critical textarea:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

/* Card de Controle de Publicação */
.publish-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.publish-card.is-active {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.28);
}

.publish-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.publish-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--text-muted);
}

.publish-card.is-active .status-indicator {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
}

.publish-info p {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Switch Toggle Customizado */
.switch-toggle {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.switch-toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.switch-toggle .slider {
  width: 100%;
  height: 100%;
  background: var(--surface-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  transition: background var(--transition-fast);
}

.switch-toggle .slider::after {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 14px;
  height: 14px;
  content: '';
  background: #ffffff;
  border-radius: var(--radius-full);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-fast);
}

.switch-toggle input:checked + .slider {
  background: #10b981;
}

.switch-toggle input:checked + .slider::after {
  transform: translateX(20px);
}

.switch-toggle input:focus-visible + .slider {
  outline: 2px solid #e25373;
  outline-offset: 2px;
}

/* Alertas de Retorno */
.alert-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.alert-message--error {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.alert-message--success {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-2);
}

/* ==========================================================================
   Coluna da Direita: Studio Lateral (Prévia + Compartilhamento)
   ========================================================================== */
.studio-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: sticky;
  top: var(--space-2);
}

/* Caixa da Prévia ao Vivo */
.preview-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}

.preview-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.preview-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preview-title svg {
  color: #e25373;
}

.preview-pill {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-muted);
}

.preview-pill.active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

/* Cartão Live Miniatura */
.live-card {
  position: relative;
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
}

.live-card-stripe {
  height: 5px;
  background: linear-gradient(90deg, #e25373, #8d5fd3);
}

.live-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-0);
}

.live-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-brand-icon {
  color: #e25373;
  font-size: 1rem;
}

.live-brand-kadem {
  display: block;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.live-brand-sub {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
}

.live-blood-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 800;
  border-radius: var(--radius-xs);
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.live-card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 0.95rem;
  flex-shrink: 0;
}

.live-person-info {
  min-width: 0;
  flex: 1;
}

.live-role-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.live-name {
  margin: 1px 0 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-insurance-text {
  margin: 2px 0 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Alerta de Alergias no Live Card */
.live-alert-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.live-alert-icon {
  color: #ef4444;
  font-size: 0.8rem;
  margin-top: 1px;
}

.live-alert-content {
  min-width: 0;
  flex: 1;
}

.live-alert-content strong {
  display: block;
  font-size: 0.65rem;
  font-weight: 800;
  color: #ef4444;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.live-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.live-chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.live-chip--critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Detalhes & Caixas */
.live-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.live-detail-box,
.live-emergency-box,
.live-notes-box {
  padding: 8px 10px;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.live-detail-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}

.live-detail-text {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-primary);
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.live-contact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.72rem;
}

.live-contact-phone {
  color: #10b981;
  font-weight: 700;
}

.live-empty-hint {
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.72rem;
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-xs);
}

.live-empty-hint p {
  margin: 0;
}

.live-card-footer {
  padding: 8px 12px;
  background: var(--surface-0);
  border-top: 1px solid var(--glass-border);
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.3;
}

/* ==========================================================================
   Painel de Compartilhamento & QR Code
   ========================================================================== */
.share-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}

.share-box-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.share-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.share-title svg {
  color: #8d5fd3;
  font-size: 1.1rem;
}

.share-title h4 {
  margin: 0;
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.share-title p {
  margin: 2px 0 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.share-status-tag {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-muted);
}

.share-status-tag.is-active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

/* Moldura QR Code */
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 190px;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: #ffffff;
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.qr-container.is-disabled {
  background: var(--surface-1);
}

.qr-active-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-active-wrap img {
  display: block;
  width: 170px;
  height: 170px;
  image-rendering: pixelated;
  border-radius: var(--radius-xs);
}

.qr-caption {
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 600;
}

.qr-placeholder-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
  max-width: 220px;
  color: var(--text-muted);
}

.qr-placeholder-icon {
  font-size: 2rem;
  color: var(--text-muted);
  opacity: 0.7;
}

.qr-placeholder-state p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

/* Exibição do Link */
.link-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.link-display svg {
  color: #8d5fd3;
  flex-shrink: 0;
}

.link-url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Botões do Studio */
.share-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.share-buttons-grid .kadem-health-button {
  font-size: 0.72rem;
  padding: 0 8px;
}

.action-open-link {
  grid-column: span 1;
}

.share-security-footer {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.share-security-footer svg {
  margin-top: 1px;
  flex-shrink: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ==========================================================================
   Responsividade
   ========================================================================== */
@media (max-width: 1040px) {
  .tab-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .studio-pane {
    position: static;
  }
}

@media (max-width: 640px) {
  .fields-grid {
    grid-template-columns: 1fr;
  }

  .field-span-full {
    grid-column: auto;
  }

  .share-buttons-grid {
    grid-template-columns: 1fr;
  }

  .editor-pane,
  .preview-box,
  .share-box {
    padding: var(--space-4);
  }
}
</style>
