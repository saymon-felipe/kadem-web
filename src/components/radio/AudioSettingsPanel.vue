<template>
  <BaseModal
    :model-value="modelValue"
    size="xl"
    title="Ajustes de áudio"
    custom-class="audio-settings-modal"
    body-class="audio-modal-body custom-scrollbar"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Cabeçalho com ícone e subtítulo -->
    <template #title>
      <div class="modal-title-wrap">
        <div class="title-icon-badge" aria-hidden="true">
          <font-awesome-icon :icon="faSliders" />
        </div>
        <div class="title-text-group">
          <h3 class="title-text">Ajustes de áudio</h3>
          <span class="title-caption">Equalizador e preferências de som</span>
        </div>
      </div>
    </template>

    <div ref="panel" class="audio-panel-content" @keydown="trap_focus">
      <!-- Banner informativo / indisponibilidade -->
      <div v-if="unavailable" class="audio-banner is-warning" role="status">
        <font-awesome-icon :icon="faCircleInfo" class="banner-icon" />
        <span class="banner-text">{{ detail || 'Os ajustes não estão disponíveis para esta faixa.' }}</span>
      </div>
      <div v-else class="audio-banner is-info">
        <font-awesome-icon :icon="faCircleInfo" class="banner-icon" />
        <span class="banner-text">Os ajustes valem para as próximas músicas e são salvos neste dispositivo.</span>
      </div>

      <!-- Grid responsivo de duas colunas no desktop -->
      <div class="audio-grid">
        <!-- CARD 1: VOLUME E SAÍDA (Coluna Esquerda - Topo) -->
        <section class="settings-card card-volume">
          <div class="card-title-row">
            <span class="card-section-label">Saída e volume</span>
          </div>

          <!-- Volume Principal -->
          <div class="control-row">
            <div class="control-label-row">
              <div class="label-with-icon">
                <button
                  type="button"
                  class="icon-btn-mute"
                  :title="volume > 0 ? 'Mutar áudio' : 'Desmutar áudio'"
                  @click="toggle_volume_mute"
                >
                  <font-awesome-icon :icon="volume_icon" />
                </button>
                <label :for="`${title_id}-volume`" class="control-title">Volume principal</label>
              </div>
              <output :for="`${title_id}-volume`" class="value-badge">
                {{ Math.round(volume * 100) }}%
              </output>
            </div>

            <div class="slider-wrapper">
              <input
                :id="`${title_id}-volume`"
                ref="volume_input"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="volume"
                class="audio-range"
                :style="calc_volume_track"
                aria-label="Volume principal"
                :aria-valuetext="`${Math.round(volume * 100)}%`"
                @input="$emit('volume', Number($event.target.value))"
              />
            </div>
          </div>

          <hr class="card-divider" />

          <!-- Normalização de volume -->
          <div
            class="toggle-row"
            :class="{ 'is-disabled': normalizationStatus === 'unavailable' }"
            @click="toggle_normalization"
          >
            <div class="toggle-text-group">
              <div class="toggle-title-line">
                <span class="toggle-title">Normalizar volume</span>
                <span v-if="normalizationStatus === 'measuring'" class="status-chip is-measuring">
                  <span class="pulse-dot"></span> Analisando
                </span>
                <span v-else-if="normalizationEnabled && normalizationStatus !== 'unavailable'" class="status-chip is-active">
                  Ativo
                </span>
              </div>
              <span class="toggle-desc">Equilibra o volume entre faixas automaticamente</span>
            </div>

            <button
              type="button"
              role="switch"
              :aria-checked="normalizationEnabled && normalizationStatus !== 'unavailable'"
              :disabled="normalizationStatus === 'unavailable'"
              class="modern-switch"
              :class="{ 'is-active': normalizationEnabled && normalizationStatus !== 'unavailable' }"
              :title="normalization_tooltip"
              @click.stop="toggle_normalization"
            >
              <span class="switch-thumb"></span>
            </button>
          </div>
        </section>

        <!-- CARD 2: EQUALIZADOR (Coluna Direita - Altura total) -->
        <section class="settings-card card-equalizer">
          <!-- Master EQ Header -->
          <div class="eq-header-row" @click="toggle_eq_master">
            <div class="toggle-text-group">
              <div class="toggle-title-line">
                <span class="card-section-label">Equalizador</span>
                <span v-if="status === 'pending'" class="status-chip is-pending">
                  <span class="pulse-dot"></span> Preparando
                </span>
                <span v-else-if="settings.enabled && !unavailable" class="status-chip is-active">
                  Ativo
                </span>
              </div>
              <span class="toggle-desc">Personalize frequências graves, médias e agudas</span>
            </div>

            <button
              type="button"
              role="switch"
              :aria-checked="settings.enabled && !unavailable"
              :disabled="unavailable"
              class="modern-switch"
              :class="{ 'is-active': settings.enabled && !unavailable }"
              aria-label="Ativar equalizador"
              @click.stop="toggle_eq_master"
            >
              <span class="switch-thumb"></span>
            </button>
          </div>

          <div class="eq-content" :class="{ 'is-bypassed': !settings.enabled || unavailable }">
            <!-- Chips de Perfis / Presets -->
            <div class="preset-section">
              <span class="preset-title">Perfil predefinido</span>
              <div class="preset-chips" role="radiogroup" aria-label="Perfil de áudio">
                <button
                  v-for="preset in presets"
                  :key="preset.id"
                  type="button"
                  role="radio"
                  :aria-checked="settings.preset === preset.id"
                  class="preset-chip"
                  :class="{ 'is-selected': settings.preset === preset.id }"
                  :disabled="unavailable || !settings.enabled"
                  @click="$emit('preset', preset.id)"
                >
                  {{ preset.label }}
                </button>
                <button
                  v-if="settings.preset === 'custom'"
                  type="button"
                  role="radio"
                  aria-checked="true"
                  class="preset-chip is-selected is-custom"
                  :disabled="unavailable || !settings.enabled"
                >
                  Personalizado
                </button>
              </div>
            </div>

            <!-- Sliders de Frequência (Bands) -->
            <div class="bands-list">
              <div
                v-for="band in bands"
                :key="band.id"
                class="band-item"
              >
                <div class="control-label-row">
                  <div class="band-tag-row">
                    <span class="band-name">{{ band.label }}</span>
                    <span class="freq-tag">{{ format_freq(band.frequency) }}</span>
                  </div>
                  <output
                    class="value-badge"
                    :class="{
                      'is-boost': settings.bands[band.id] > 0,
                      'is-cut': settings.bands[band.id] < 0,
                    }"
                    title="Clique duplo para redefinir para 0 dB"
                    @dblclick="reset_band(band.id)"
                  >
                    {{ format_db(settings.bands[band.id]) }} dB
                  </output>
                </div>

                <div class="slider-wrapper with-center-tick">
                  <div class="center-detent-mark" aria-hidden="true"></div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    :value="settings.bands[band.id]"
                    :style="calc_band_track(settings.bands[band.id])"
                    class="audio-range"
                    :aria-label="band.label"
                    :aria-valuetext="`${format_db(settings.bands[band.id])} dB`"
                    :disabled="unavailable || !settings.enabled"
                    @input="update_band(band.id, Number($event.target.value))"
                    @change="$emit('save')"
                    @dblclick="reset_band(band.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CARD 3: BALANÇO E ESPACIALIDADE (Coluna Esquerda - Base) -->
        <section class="settings-card card-balance">
          <div class="card-title-row">
            <span class="card-section-label">Balanço e espacialidade</span>
          </div>

          <!-- Balanço Estéreo -->
          <div class="control-row">
            <div class="control-label-row">
              <span class="control-title">Balanço estéreo</span>
              <output
                class="value-badge"
                title="Clique duplo para centralizar"
                @dblclick="reset_balance"
              >
                {{ balance_label }}
              </output>
            </div>

            <div class="slider-wrapper with-center-tick">
              <div class="center-detent-mark" aria-hidden="true"></div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="settings.balance"
                :style="calc_balance_track(settings.balance)"
                class="audio-range"
                aria-label="Balanço estéreo"
                :aria-valuetext="balance_label"
                :disabled="unavailable"
                @input="$emit('settings', { enabled: true, balance: Number($event.target.value) }, { persist: false })"
                @change="$emit('save')"
                @dblclick="reset_balance"
              />
            </div>

            <div class="channel-ends">
              <button
                type="button"
                class="channel-end-btn"
                :disabled="unavailable"
                @click="set_balance(-1)"
              >
                L (Esquerda)
              </button>
              <button
                type="button"
                class="channel-end-btn is-center"
                :disabled="unavailable"
                @click="reset_balance"
              >
                Centro
              </button>
              <button
                type="button"
                class="channel-end-btn"
                :disabled="unavailable"
                @click="set_balance(1)"
              >
                R (Direita)
              </button>
            </div>
          </div>

          <hr class="card-divider" />

          <!-- Áudio Mono -->
          <div
            class="toggle-row"
            :class="{ 'is-disabled': unavailable }"
            @click="toggle_mono"
          >
            <div class="toggle-text-group">
              <div class="toggle-title-line">
                <span class="toggle-title">Áudio mono</span>
                <span v-if="settings.mono" class="status-chip is-active">Ativo</span>
              </div>
              <span class="toggle-desc">Mesmo áudio reproduzido nos canais esquerdo e direito</span>
            </div>

            <button
              type="button"
              role="switch"
              :aria-checked="settings.mono"
              :disabled="unavailable"
              class="modern-switch"
              :class="{ 'is-active': settings.mono }"
              aria-label="Áudio mono"
              @click.stop="toggle_mono"
            >
              <span class="switch-thumb"></span>
            </button>
          </div>

          <hr class="card-divider" />

          <!-- Modo Noturno -->
          <div
            class="toggle-row"
            :class="{ 'is-disabled': unavailable }"
            @click="toggle_night_mode"
          >
            <div class="toggle-text-group">
              <div class="toggle-title-line">
                <span class="toggle-title">Modo noturno</span>
                <span v-if="settings.night_mode" class="status-chip is-active">Ativo</span>
              </div>
              <span class="toggle-desc">Suaviza os sons mais altos para audição confortável</span>
            </div>

            <button
              type="button"
              role="switch"
              :aria-checked="settings.night_mode"
              :disabled="unavailable"
              class="modern-switch"
              :class="{ 'is-active': settings.night_mode }"
              aria-label="Modo noturno"
              @click.stop="toggle_night_mode"
            >
              <span class="switch-thumb"></span>
            </button>
          </div>
        </section>
      </div>
    </div>

    <!-- RODAPÉ DE AÇÕES -->
    <template #footer>
      <div class="audio-modal-footer">
        <button
          type="button"
          class="btn-restore"
          :disabled="unavailable"
          title="Redefinir todas as configurações para os padrões de fábrica"
          @click="$emit('reset')"
        >
          <font-awesome-icon :icon="faRotateLeft" class="restore-icon" />
          <span>Restaurar padrão</span>
        </button>

        <button
          type="button"
          class="btn-done"
          @click="$emit('update:modelValue', false)"
        >
          Concluir
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import { useId } from 'vue';
import BaseModal from '@/components/BaseModal.vue';
import { AUDIO_BANDS, AUDIO_PRESETS } from '@/services/audio/audioSettings';
import {
  faSliders,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
  faRotateLeft,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

export default {
  name: 'AudioSettingsPanel',
  components: { BaseModal },
  props: {
    modelValue: Boolean,
    settings: { type: Object, required: true },
    volume: { type: Number, default: 1 },
    status: { type: String, default: 'disabled' },
    detail: { type: String, default: '' },
    normalizationEnabled: Boolean,
    normalizationStatus: { type: String, default: 'disabled' },
    normalizationDetail: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'settings', 'preset', 'volume', 'normalization', 'reset', 'save'],
  setup() {
    return {
      bands: AUDIO_BANDS,
      presets: AUDIO_PRESETS,
      title_id: useId(),
      faSliders,
      faCircleInfo,
      faRotateLeft,
    };
  },
  data() {
    return {
      prev_volume: 1,
    };
  },
  computed: {
    unavailable() {
      return this.status === 'unavailable';
    },
    volume_icon() {
      if (this.volume <= 0.01) return faVolumeXmark;
      if (this.volume < 0.5) return faVolumeLow;
      return faVolumeHigh;
    },
    calc_volume_track() {
      const pct = Math.max(0, Math.min(100, Math.round(this.volume * 100)));
      return {
        background: `linear-gradient(to right, var(--color-info) 0%, var(--color-info) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`,
      };
    },
    balance_label() {
      const value = this.settings.balance;
      if (Math.abs(value) < 0.01) return 'Centro';
      const pct = Math.round(Math.abs(value) * 100);
      return value < 0 ? `${pct}% Esquerda` : `${pct}% Direita`;
    },
    normalization_tooltip() {
      const explanation = 'Equilibra o volume entre faixas automaticamente.';
      if (this.normalizationStatus === 'unavailable') {
        return `${explanation} ${this.normalizationDetail || 'Indisponível para esta faixa.'}`;
      }
      if (!this.normalizationEnabled) {
        return `${explanation} Clique para ativar.`;
      }
      const state = this.normalizationStatus === 'measuring' ? 'Analisando a faixa atual.' : 'Ativada.';
      return `${explanation} ${state} ${this.normalizationDetail || 'Clique para desativar.'}`;
    },
  },
  watch: {
    modelValue(visible) {
      if (visible) {
        this.$nextTick(() => this.$refs.volume_input?.focus());
      }
    },
  },
  methods: {
    format_db(value) {
      return value > 0 ? `+${value}` : String(value);
    },
    format_freq(freq) {
      if (!freq) return '';
      return freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`;
    },
    calc_band_track(val) {
      const clamped = Math.max(-12, Math.min(12, Number(val) || 0));
      const pct = Math.round(((clamped + 12) / 24) * 100);
      if (clamped >= 0) {
        return {
          background: `linear-gradient(to right, var(--surface-3) 0%, var(--surface-3) 50%, var(--color-info) 50%, var(--color-info) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`,
        };
      }
      return {
        background: `linear-gradient(to right, var(--surface-3) 0%, var(--surface-3) ${pct}%, var(--color-info) ${pct}%, var(--color-info) 50%, var(--surface-3) 50%, var(--surface-3) 100%)`,
      };
    },
    calc_balance_track(val) {
      const clamped = Math.max(-1, Math.min(1, Number(val) || 0));
      const pct = Math.round(((clamped + 1) / 2) * 100);
      if (clamped >= 0) {
        return {
          background: `linear-gradient(to right, var(--surface-3) 0%, var(--surface-3) 50%, var(--color-info) 50%, var(--color-info) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`,
        };
      }
      return {
        background: `linear-gradient(to right, var(--surface-3) 0%, var(--surface-3) ${pct}%, var(--color-info) ${pct}%, var(--color-info) 50%, var(--surface-3) 50%, var(--surface-3) 100%)`,
      };
    },
    update_band(id, value) {
      this.$emit('settings', { enabled: true, preset: 'custom', bands: { [id]: value } }, { persist: false });
    },
    reset_band(id) {
      if (this.unavailable || !this.settings.enabled) return;
      this.update_band(id, 0);
      this.$emit('save');
    },
    reset_balance() {
      if (this.unavailable) return;
      this.$emit('settings', { enabled: true, balance: 0 }, { persist: false });
      this.$emit('save');
    },
    set_balance(val) {
      if (this.unavailable) return;
      this.$emit('settings', { enabled: true, balance: val }, { persist: false });
      this.$emit('save');
    },
    toggle_volume_mute() {
      if (this.volume > 0) {
        this.prev_volume = this.volume;
        this.$emit('volume', 0);
      } else {
        this.$emit('volume', this.prev_volume || 0.5);
      }
    },
    toggle_normalization() {
      if (this.normalizationStatus === 'unavailable') return;
      this.$emit('normalization', !this.normalizationEnabled);
    },
    toggle_eq_master() {
      if (this.unavailable) return;
      this.$emit('settings', { enabled: !this.settings.enabled });
    },
    toggle_mono() {
      if (this.unavailable) return;
      this.$emit('settings', { enabled: true, mono: !this.settings.mono });
    },
    toggle_night_mode() {
      if (this.unavailable) return;
      this.$emit('settings', { enabled: true, preset: 'custom', night_mode: !this.settings.night_mode });
    },
    trap_focus(event) {
      if (event.key !== 'Tab') return;
      const controls = Array.from(this.$refs.panel.querySelectorAll('button, input, select')).filter(
        (element) => !element.matches(':disabled')
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first?.focus();
      }
    },
  },
};
</script>

<style scoped>
/* Modal Card Customizado: mais largo e compacto */
:deep(.audio-settings-modal.kadem-modal-card) {
  max-width: 760px;
  width: 94%;
}

.audio-panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

/* Header Slot */
.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.title-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(53, 90, 253, 0.12);
  color: var(--color-info);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.title-text-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-text {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.title-caption {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 400;
  line-height: 1.2;
}

/* Banner de informação */
.audio-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  line-height: 1.4;
}

.audio-banner.is-info {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
}

.audio-banner.is-warning {
  background: var(--amber-high);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: var(--amber);
  font-weight: 500;
}

.banner-icon {
  flex-shrink: 0;
  font-size: 0.95rem;
}

.banner-text {
  flex: 1;
}

/* Grid Responsivo de Conteúdo */
.audio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "volume equalizer"
    "balance equalizer";
  gap: var(--space-3);
  align-items: stretch;
}

.card-volume {
  grid-area: volume;
}

.card-balance {
  grid-area: balance;
}

.card-equalizer {
  grid-area: equalizer;
  display: flex;
  flex-direction: column;
}

/* Cards de Configuração */
.settings-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-section-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.card-divider {
  border: none;
  border-top: 1px solid var(--glass-border);
  margin: var(--space-1) 0;
}

/* Controles e Sliders */
.control-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.label-with-icon {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.icon-btn-mute {
  background: none;
  border: none;
  padding: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.icon-btn-mute:hover {
  color: var(--color-info);
  transform: scale(1.1);
}

.control-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.value-badge {
  font-size: 0.76rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  min-width: 42px;
  text-align: center;
  user-select: none;
  transition: all var(--transition-fast);
}

.value-badge.is-boost {
  color: var(--color-info);
  border-color: rgba(53, 90, 253, 0.3);
  background: rgba(53, 90, 253, 0.08);
}

.value-badge.is-cut {
  color: var(--amber);
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.08);
}

/* Slider Track e Thumb */
.slider-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  height: 22px;
}

.center-detent-mark {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 10px;
  border-radius: 1px;
  background: var(--text-muted);
  opacity: 0.45;
  pointer-events: none;
  z-index: 1;
}

.audio-range {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  outline: none;
  margin: 0;
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
  z-index: 2;
  background-color: transparent;
}

.audio-range::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid var(--color-info);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.audio-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(53, 90, 253, 0.2), 0 2px 6px rgba(0, 0, 0, 0.3);
}

.audio-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid var(--color-info);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.audio-range::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(53, 90, 253, 0.2), 0 2px 6px rgba(0, 0, 0, 0.3);
}

.audio-range:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Linha de Toggle (Switch) */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  padding: 1px 0;
  transition: opacity var(--transition-fast);
}

.toggle-row.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toggle-text-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.toggle-title-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toggle-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.25;
}

/* Switch Moderno */
.modern-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  border: 1px solid var(--glass-border);
  padding: 2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.modern-switch.is-active {
  background: var(--color-info);
  border-color: var(--color-info);
  box-shadow: 0 2px 8px rgba(53, 90, 253, 0.35);
}

.modern-switch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modern-switch .switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform var(--transition-base) cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: translateX(0);
}

.modern-switch.is-active .switch-thumb {
  transform: translateX(16px);
}

/* Status Chips */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
}

.status-chip.is-active {
  background: rgba(53, 90, 253, 0.14);
  color: var(--color-info);
}

.status-chip.is-measuring {
  background: var(--amber-high);
  color: var(--amber);
}

.status-chip.is-pending {
  background: var(--surface-3);
  color: var(--text-muted);
}

.pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: pulseDot 1.4s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 0.3; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); }
}

/* Equalizador */
.eq-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
}

.eq-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-1);
  flex: 1;
  justify-content: space-between;
  transition: opacity var(--transition-base), filter var(--transition-base);
}

.eq-content.is-bypassed {
  opacity: 0.4;
  filter: grayscale(40%);
  pointer-events: none;
}

.preset-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preset-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.preset-chip:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.preset-chip.is-selected {
  background: var(--color-info);
  border-color: var(--color-info);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(53, 90, 253, 0.3);
}

.preset-chip.is-custom {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
}

.preset-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.bands-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-1);
}

.band-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.band-tag-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.band-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

.freq-tag {
  font-size: 0.7rem;
  color: var(--text-muted);
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
}

/* Balanço Canais */
.channel-ends {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -3px;
}

.channel-end-btn {
  background: none;
  border: none;
  padding: 1px 3px;
  font-size: 0.72rem;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast);
}

.channel-end-btn:hover:not(:disabled) {
  color: var(--text-primary);
}

.channel-end-btn.is-center {
  color: var(--text-secondary);
  font-weight: 600;
}

.channel-end-btn.is-center:hover:not(:disabled) {
  color: var(--color-info);
}

.channel-end-btn:disabled {
  cursor: not-allowed;
}

/* Rodapé do Modal */
:global(.audio-settings-modal .modal-footer-row) {
  border-top: 1px solid var(--glass-border);
  background: var(--surface-0);
  flex-shrink: 0;
  padding: 0;
}

.audio-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  background: var(--surface-0);
  box-sizing: border-box;
  gap: var(--space-4);
}

.btn-restore {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0 var(--space-4);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.btn-restore:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
  border-color: var(--text-muted);
  transform: translateY(-1px);
}

.btn-restore:hover:not(:disabled) .restore-icon {
  transform: rotate(-45deg);
}

.restore-icon {
  font-size: 0.9rem;
  transition: transform var(--transition-fast);
}

.btn-restore:active:not(:disabled) {
  transform: translateY(0);
}

.btn-restore:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-done {
  height: 38px;
  background: var(--color-info);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0 var(--space-6);
  cursor: pointer;
  white-space: nowrap;
  transition:
    filter var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.btn-done:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(53, 90, 253, 0.4);
}

.btn-done:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .audio-modal-footer {
    padding: var(--space-3) var(--space-5);
    padding-bottom: max(var(--space-3), env(safe-area-inset-bottom, 16px));
  }
}

/* Acessibilidade de foco */
input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

/* ===================================================
   RESPONSIVIDADE (Telas menores / Celular)
   =================================================== */
@container (max-width: 680px) {
  .audio-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "volume"
      "equalizer"
      "balance";
    gap: var(--space-2);
  }

  .settings-card {
    padding: var(--space-3);
  }
}

@media (max-width: 720px) {
  .audio-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "volume"
      "equalizer"
      "balance";
    gap: var(--space-2);
  }

  .settings-card {
    padding: var(--space-3);
  }
}
</style>
