<template>
  <BaseModal
    :model-value="visible"
    :title="event ? 'Corrigir Check-in de Saúde' : 'Novo Check-in de Saúde'"
    size="xl"
    custom-class="checkin-modal-shell"
    body-class="checkin-modal-body"
    @close="$emit('close')"
    @update:model-value="value => { if (!value) $emit('close'); }"
  >
    <form id="health-checkin-form" class="checkin-form" @submit.prevent="submit">
      <!-- Barra Superior de Contexto & Horário -->
      <div class="checkin-hero-banner">
        <div class="hero-info">
          <div class="hero-icon-avatar">
            <font-awesome-icon icon="heart-pulse" />
          </div>
          <div>
            <div class="hero-title-row">
              <h4>{{ event ? 'Revisão do Registro' : 'Como você está se sentindo?' }}</h4>
              <span class="status-badge" :class="{ 'is-completed': isAllFilled }">
                <font-awesome-icon :icon="isAllFilled ? 'circle-check' : 'sliders'" />
                {{ filledCount }} de {{ trackers.length }} preenchido{{ filledCount === 1 ? '' : 's' }}
              </span>
            </div>
            <p class="hero-sub">
              Preencha os sinais que desejar no seu ritmo. Você pode salvar agora e complementar mais tarde.
            </p>
          </div>
        </div>

        <!-- Seletor de Data e Horário Estilizado -->
        <div class="datetime-card">
          <div class="datetime-header">
            <label for="checkin-datetime">
              <font-awesome-icon icon="clock" />
              <span>Horário do registro</span>
            </label>
            <button
              type="button"
              class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact"
              title="Ajustar para o horário atual"
              @click="setNow"
            >
              <font-awesome-icon icon="arrows-rotate" />
              <span>Agora</span>
            </button>
          </div>
          <input
            id="checkin-datetime"
            v-model="occurredAt"
            type="datetime-local"
            class="datetime-input"
            required
          />
        </div>
      </div>

      <!-- Barra de Progresso Sutil -->
      <div v-if="trackers.length > 0" class="progress-track" :title="`${completionPercentage}% preenchido`">
        <div class="progress-fill" :style="{ width: `${completionPercentage}%` }"></div>
      </div>

      <!-- Grupos de Rastreadores -->
      <div class="groups-container">
        <div
          v-for="group in groups"
          :key="group.name"
          class="field-group-card"
          :class="{
            'is-single-field': group.trackers.length === 1,
            'has-full-fields': group.trackers.some(isSpanFull),
          }"
        >
          <!-- Cabeçalho do Grupo com Ícone e Contador -->
          <div class="group-card-header">
            <div class="group-title-wrap">
              <span class="group-accent-pill" :style="{ backgroundColor: getGroupColor(group.name) }"></span>
              <font-awesome-icon :icon="getGroupIcon(group.name)" class="group-header-icon" />
              <h4 class="group-name">{{ group.name }}</h4>
              <span class="group-counter">{{ group.trackers.length }} campo{{ group.trackers.length === 1 ? '' : 's' }}</span>
            </div>
          </div>

          <!-- Grade de Campos Responsiva (2 colunas no desktop) -->
          <div class="group-fields-grid">
            <div
              v-for="tracker in group.trackers"
              :key="tracker.local_key"
              class="field-box"
              :class="{
                'span-full': isSpanFull(tracker),
                'is-answered': hasValue(tracker.local_key),
              }"
            >
              <div class="field-meta-row">
                <label :for="`checkin-${tracker.local_key}`" class="field-label">
                  <span>{{ tracker.name }}</span>
                  <span v-if="hasValue(tracker.local_key)" class="field-check-badge">
                    <font-awesome-icon icon="check" />
                  </span>
                </label>

                <!-- Botão de limpar campo individual se preenchido -->
                <button
                  v-if="hasValue(tracker.local_key)"
                  type="button"
                  class="clear-field-btn"
                  title="Limpar este campo"
                  @click="clearField(tracker.local_key, tracker.value_type)"
                >
                  Limpar
                </button>
              </div>

              <span v-if="tracker.notes" class="field-hint">
                <font-awesome-icon icon="circle-info" />
                {{ tracker.notes }}
              </span>

              <!-- CONTROLE 1: ESCALA (SCALE) INTERATIVA -->
              <div v-if="tracker.value_type === 'SCALE'" class="scale-control-wrap">
                <div
                  v-if="isCompactScale(tracker)"
                  class="scale-pills-row"
                  :style="{ '--scale-count': scaleRange(tracker).length }"
                >
                  <button
                    v-for="num in scaleRange(tracker)"
                    :key="num"
                    type="button"
                    class="scale-pill-btn"
                    :class="{ 'is-selected': hasValue(tracker.local_key) && Number(values[tracker.local_key]) === num }"
                    :aria-label="`${tracker.name}: ${num}`"
                    :aria-pressed="hasValue(tracker.local_key) && Number(values[tracker.local_key]) === num"
                    @click="setScale(tracker.local_key, num)"
                  >
                    {{ num }}
                  </button>
                </div>

                <div v-else class="scale-slider-row">
                  <input
                    :id="`checkin-${tracker.local_key}`"
                    v-model.number="values[tracker.local_key]"
                    type="range"
                    :min="tracker.min_value"
                    :max="tracker.max_value"
                    step="1"
                    class="custom-slider"
                  />
                  <span class="scale-value-bubble">
                    {{ values[tracker.local_key] !== '' && values[tracker.local_key] !== undefined ? values[tracker.local_key] : '—' }}
                  </span>
                </div>

                <div class="scale-labels-row">
                  <span class="scale-label-min">{{ tracker.min_value }} (Mínimo)</span>
                  <span class="scale-label-max">{{ tracker.max_value }} (Máximo)</span>
                </div>
              </div>

              <!-- CONTROLE 2: NÚMERO COM UNIDADE (NUMBER) -->
              <div v-else-if="tracker.value_type === 'NUMBER'" class="number-input-wrap">
                <input
                  :id="`checkin-${tracker.local_key}`"
                  v-model="values[tracker.local_key]"
                  type="number"
                  step="any"
                  class="styled-input"
                  :placeholder="tracker.unit ? `Ex.: 0 ${tracker.unit}` : 'Informe o valor numérico'"
                />
                <span v-if="tracker.unit" class="input-unit-badge">{{ tracker.unit }}</span>
              </div>

              <!-- CONTROLE 3: SELEÇÃO ÚNICA (SINGLE) -->
              <div v-else-if="tracker.value_type === 'SINGLE'" class="single-choice-wrap">
                <!-- Se poucas opções, renderiza pills compactas para clique direto -->
                <div v-if="(tracker.options || []).length <= 5" class="choice-pills-grid">
                  <button
                    v-for="option in tracker.options || []"
                    :key="option"
                    type="button"
                    class="custom-radio-pill"
                    :class="{ 'is-selected': values[tracker.local_key] === option }"
                    @click="setSingle(tracker.local_key, option)"
                  >
                    <span class="radio-indicator">
                      <span class="radio-dot"></span>
                    </span>
                    <span class="choice-label">{{ option }}</span>
                  </button>
                </div>

                <!-- Se muitas opções, usa select estilizado -->
                <select
                  v-else
                  :id="`checkin-${tracker.local_key}`"
                  v-model="values[tracker.local_key]"
                  class="styled-select"
                >
                  <option value="">Não informado</option>
                  <option v-for="option in tracker.options || []" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>

              <!-- CONTROLE 4: MÚLTIPLA ESCOLHA (MULTI) COM CHECKBOXES PERSONALIZADOS -->
              <div v-else-if="tracker.value_type === 'MULTI'" class="multi-choice-container">
                <div class="custom-checkboxes-grid">
                  <label
                    v-for="option in tracker.options || []"
                    :key="option"
                    class="custom-checkbox-card"
                    :class="{ 'is-checked': isOptionChecked(tracker.local_key, option) }"
                  >
                    <!-- Input nativo oculto para acessibilidade e navegação por teclado -->
                    <input
                      type="checkbox"
                      class="sr-only-checkbox"
                      :value="option"
                      :checked="isOptionChecked(tracker.local_key, option)"
                      @change="toggleMultiOption(tracker.local_key, option)"
                    />
                    <!-- Checkbox visual estilizado com animação suave -->
                    <span class="custom-checkbox-indicator">
                      <font-awesome-icon icon="check" class="custom-check-svg" />
                    </span>
                    <span class="checkbox-label-text">{{ option }}</span>
                  </label>
                </div>

                <div v-if="!(tracker.options || []).length" class="empty-options-hint">
                  Nenhuma opção cadastrada para este rastreador.
                </div>
              </div>

              <!-- CONTROLE 5: TAGS LIVRES (TAGS) -->
              <div v-else-if="tracker.value_type === 'TAGS'" class="tags-input-wrap">
                <input
                  :id="`checkin-${tracker.local_key}`"
                  v-model="values[tracker.local_key]"
                  type="text"
                  class="styled-input"
                  placeholder="Digite tags separadas por vírgula (ex.: café, corrida, sem açúcar)"
                />
                <!-- Pré-visualização interativa das tags digitadas -->
                <div v-if="parsedTags(values[tracker.local_key]).length" class="active-tags-cloud">
                  <span
                    v-for="(tag, tIdx) in parsedTags(values[tracker.local_key])"
                    :key="tIdx"
                    class="tag-pill-badge"
                  >
                    <font-awesome-icon icon="tag" class="tag-mini-icon" />
                    <span>{{ tag }}</span>
                    <button
                      type="button"
                      class="tag-remove-btn"
                      title="Remover tag"
                      @click="removeTag(tracker.local_key, tag)"
                    >
                      <font-awesome-icon icon="xmark" />
                    </button>
                  </span>
                </div>
              </div>

              <!-- CONTROLE 6: TEXTO LIVRE (TEXT) -->
              <textarea
                v-else-if="tracker.value_type === 'TEXT'"
                :id="`checkin-${tracker.local_key}`"
                v-model="values[tracker.local_key]"
                rows="2"
                class="styled-textarea"
                placeholder="Descreva detalhes, contexto ou sentimentos..."
              />

              <!-- CONTROLE 7: SIM OU NÃO (BOOLEAN) - SEGMENTADO -->
              <div v-else class="boolean-segmented-control">
                <button
                  type="button"
                  class="seg-pill"
                  :class="{ 'is-active': values[tracker.local_key] === '' || values[tracker.local_key] === undefined }"
                  @click="values[tracker.local_key] = ''"
                >
                  Não informado
                </button>

                <button
                  type="button"
                  class="seg-pill seg-yes"
                  :class="{ 'is-active': values[tracker.local_key] === 'true' || values[tracker.local_key] === true }"
                  @click="values[tracker.local_key] = 'true'"
                >
                  <font-awesome-icon icon="check" />
                  <span>Sim</span>
                </button>

                <button
                  type="button"
                  class="seg-pill seg-no"
                  :class="{ 'is-active': values[tracker.local_key] === 'false' || values[tracker.local_key] === false }"
                  @click="values[tracker.local_key] = 'false'"
                >
                  <font-awesome-icon icon="xmark" />
                  <span>Não</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Observações Livres do Check-in -->
      <div class="notes-section-card">
        <div class="notes-header">
          <label for="checkin-notes" class="field-label">
            <font-awesome-icon icon="notes-medical" />
            <span>Observações livres & Diário do momento</span>
          </label>
          <span class="field-hint-inline">Opcional · alimentação, sintomas atípicos, sono ou notas gerais</span>
        </div>
        <textarea
          id="checkin-notes"
          v-model.trim="notes"
          rows="3"
          class="styled-textarea"
          placeholder="Ex.: Almocei mais tarde do que de costume; senti leve indisposição após o café da tarde, mas melhorei à noite..."
        ></textarea>
      </div>

    </form>

    <template #footer>
      <div class="checkin-modal-footer">
        <div v-if="error" class="form-error-banner">
          <font-awesome-icon icon="triangle-exclamation" />
          <span>{{ error }}</span>
        </div>

        <!-- Ações persistentes fora da área rolável -->
        <div class="form-actions-bar">
          <div class="actions-meta">
            <span class="filled-summary-text">
              <strong>{{ filledCount }}</strong> campo{{ filledCount === 1 ? '' : 's' }} respondido{{ filledCount === 1 ? '' : 's' }}
            </span>
            <button
              v-if="filledCount > 0"
              type="button"
              class="kadem-health-button kadem-health-button--quiet kadem-health-button--compact"
              @click="clearAll"
            >
              Limpar todos os campos
            </button>
          </div>

          <div class="action-buttons-wrap">
            <button
              class="kadem-health-button kadem-health-button--secondary"
              type="button"
              @click="$emit('close')"
            >
              Cancelar
            </button>

            <button
              class="kadem-health-button kadem-health-button--primary"
              type="submit"
              form="health-checkin-form"
              :disabled="loading"
            >
              <font-awesome-icon v-if="loading" icon="spinner" spin />
              <font-awesome-icon v-else icon="check" />
              <span>{{ loading ? 'Salvando check-in…' : event ? 'Salvar correções' : 'Salvar check-in' }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

const localDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default {
  name: "HealthCheckinModal",
  components: { BaseModal },
  props: {
    visible: { type: Boolean, default: false },
    trackers: { type: Array, default: () => [] },
    event: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "submit"],
  data() {
    return {
      occurredAt: "",
      notes: "",
      values: {},
    };
  },
  computed: {
    groups() {
      const grouped = new Map();
      for (const tracker of this.trackers) {
        const name = (tracker.group || "Geral").trim();
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name).push(tracker);
      }
      return [...grouped].map(([name, trackers]) => ({ name, trackers }));
    },
    filledCount() {
      let count = 0;
      for (const tracker of this.trackers) {
        if (this.hasValue(tracker.local_key)) count++;
      }
      return count;
    },
    completionPercentage() {
      if (!this.trackers.length) return 0;
      return Math.round((this.filledCount / this.trackers.length) * 100);
    },
    isAllFilled() {
      return this.trackers.length > 0 && this.filledCount === this.trackers.length;
    },
  },
  watch: {
    visible(value) {
      if (value) this.reset();
    },
  },
  methods: {
    reset() {
      this.occurredAt = localDateTime(this.event?.occurred_at);
      this.notes = this.event?.notes || "";
      this.values = {};
      for (const tracker of this.trackers) {
        const value = this.event?.values?.[tracker.local_key];
        if (tracker.value_type === "MULTI") {
          this.values[tracker.local_key] = Array.isArray(value) ? [...value] : [];
        } else if (tracker.value_type === "TAGS") {
          this.values[tracker.local_key] = Array.isArray(value)
            ? value.join(", ")
            : (value ?? "");
        } else if (tracker.value_type === "BOOLEAN") {
          this.values[tracker.local_key] =
            value === undefined || value === null || value === ""
              ? ""
              : String(value);
        } else {
          this.values[tracker.local_key] = value ?? "";
        }
      }
    },
    setNow() {
      this.occurredAt = localDateTime(new Date());
    },
    hasValue(localKey) {
      const val = this.values[localKey];
      if (val === undefined || val === null || val === "") return false;
      if (Array.isArray(val)) return val.length > 0;
      return true;
    },
    isSpanFull(tracker) {
      return ["MULTI", "TAGS", "TEXT"].includes(tracker.value_type) ||
        (tracker.value_type === "SINGLE" && (tracker.options || []).length > 3);
    },
    isCompactScale(tracker) {
      const min = Number(tracker.min_value ?? 0);
      const max = Number(tracker.max_value ?? 10);
      return max - min <= 10;
    },
    scaleRange(tracker) {
      const min = Number(tracker.min_value ?? 0);
      const max = Number(tracker.max_value ?? 10);
      const result = [];
      for (let i = min; i <= max; i++) result.push(i);
      return result;
    },
    setScale(localKey, num) {
      if (Number(this.values[localKey]) === num) {
        this.values[localKey] = "";
      } else {
        this.values[localKey] = num;
      }
    },
    setSingle(localKey, option) {
      if (this.values[localKey] === option) {
        this.values[localKey] = "";
      } else {
        this.values[localKey] = option;
      }
    },
    isOptionChecked(localKey, option) {
      const current = this.values[localKey];
      return Array.isArray(current) && current.includes(option);
    },
    toggleMultiOption(localKey, option) {
      if (!Array.isArray(this.values[localKey])) {
        this.values[localKey] = [];
      }
      const arr = this.values[localKey];
      const idx = arr.indexOf(option);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(option);
      }
    },
    parsedTags(raw) {
      if (!raw) return [];
      return String(raw)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    },
    removeTag(localKey, tagToRemove) {
      const currentTags = this.parsedTags(this.values[localKey]);
      const filtered = currentTags.filter((t) => t !== tagToRemove);
      this.values[localKey] = filtered.join(", ");
    },
    clearField(localKey, valueType) {
      if (valueType === "MULTI") {
        this.values[localKey] = [];
      } else {
        this.values[localKey] = "";
      }
    },
    clearAll() {
      for (const tracker of this.trackers) {
        this.clearField(tracker.local_key, tracker.value_type);
      }
      this.notes = "";
    },
    getGroupColor(groupName) {
      const name = (groupName || "").toLowerCase();
      if (name.includes("sintoma") || name.includes("dor")) return "#e25373";
      if (name.includes("hábito") || name.includes("rotina")) return "#3b82f6";
      if (name.includes("sono") || name.includes("descanso")) return "#6366f1";
      if (name.includes("digest") || name.includes("aliment")) return "#10b981";
      if (name.includes("humor") || name.includes("disposiç")) return "#f59e0b";
      if (name.includes("medic") || name.includes("reméd")) return "#ec4899";
      return "#8d5fd3";
    },
    getGroupIcon(groupName) {
      const name = (groupName || "").toLowerCase();
      if (name.includes("sintoma") || name.includes("dor")) return "triangle-exclamation";
      if (name.includes("hábito") || name.includes("rotina")) return "mug-saucer";
      if (name.includes("sono") || name.includes("descanso")) return "bed";
      if (name.includes("digest") || name.includes("aliment")) return "utensils";
      if (name.includes("medic") || name.includes("reméd")) return "pills";
      return "folder";
    },
    submit() {
      const formattedValues = {};
      for (const tracker of this.trackers) {
        const val = this.values[tracker.local_key];
        if (tracker.value_type === "TAGS") {
          formattedValues[tracker.local_key] = String(val || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        } else if (tracker.value_type === "BOOLEAN") {
          formattedValues[tracker.local_key] =
            val === "" ? "" : val === "true" || val === true;
        } else if (tracker.value_type === "SCALE" || tracker.value_type === "NUMBER") {
          formattedValues[tracker.local_key] =
            val === "" || val === null || val === undefined ? "" : Number(val);
        } else {
          formattedValues[tracker.local_key] = val;
        }
      }

      this.$emit("submit", {
        occurred_at: new Date(this.occurredAt).toISOString(),
        values: formattedValues,
        notes: this.notes,
        replaces_event_key: this.event?.local_key,
      });
    },
  },
};
</script>

<style scoped>
.checkin-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  color: var(--text-primary);
  box-sizing: border-box;
}

/* ==========================================================
   BARRA SUPERIOR DE CONTEXTO & HORÁRIO
   ========================================================== */
.checkin-hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  flex-wrap: wrap;
}

.hero-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  min-width: 260px;
}

.hero-icon-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(226, 83, 115, 0.2), rgba(141, 95, 211, 0.2));
  color: #e25373;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(226, 83, 115, 0.3);
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.hero-title-row h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all var(--transition-fast);
}

.status-badge.is-completed {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.hero-sub {
  margin: 4px 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

/* Card Data e Horário */
.datetime-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  min-width: 220px;
}

.datetime-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.datetime-header label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.datetime-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  border-radius: var(--radius-xs);
  padding: 6px 10px;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 600;
  outline: none;
  transition: border-color var(--transition-fast);
}

.datetime-input:focus {
  border-color: #e25373;
  box-shadow: 0 0 0 2px rgba(226, 83, 115, 0.15);
}

/* Barra de Progresso */
.progress-track {
  width: 100%;
  height: 4px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e25373 0%, #8d5fd3 100%);
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ==========================================================
   GRUPOS DE RASTREADORES
   ========================================================== */
.groups-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field-group-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) 0 var(--space-5);
  border-bottom: 1px solid var(--glass-border);
}

.field-group-card:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.group-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-accent-pill {
  width: 4px;
  height: 16px;
  border-radius: 2px;
}

.group-header-icon {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.group-name {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.group-counter {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
  background: var(--surface-2);
  padding: 1px 7px;
  border-radius: 10px;
}

/* Grid Responsiva dos Campos (Duas colunas no Desktop) */
.group-fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: var(--space-4);
}

.field-group-card.has-full-fields .field-box:not(.span-full) {
  grid-column: 1 / -1;
}

.field-group-card.is-single-field .field-box {
  grid-column: 1 / -1;
}

.field-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  transition: all var(--transition-fast);
}

.field-box:hover {
  background: var(--surface-1);
  border-color: rgba(226, 83, 115, 0.2);
}

.field-box.is-answered {
  border-left: 3px solid #e25373;
  background: var(--surface-1);
}

.field-box.span-full {
  grid-column: 1 / -1;
}

.field-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.field-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.field-check-badge {
  color: #10b981;
  font-size: 0.72rem;
  background: rgba(16, 185, 129, 0.12);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
}

.clear-field-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 1px 6px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.clear-field-btn:hover {
  color: var(--red);
  background: rgba(214, 74, 46, 0.1);
}

.field-hint {
  font-size: 0.74rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: -2px;
}

/* ==========================================================
   CONTROLES PERSONALIZADOS
   ========================================================== */

/* 1. SCALE PILLS */
.scale-control-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scale-pills-row {
  display: grid;
  grid-template-columns: repeat(var(--scale-count), minmax(0, 1fr));
  gap: var(--space-2);
  min-width: 0;
  overflow: hidden;
  padding: 2px 1px 4px;
}

.scale-pill-btn {
  min-width: 0;
  width: 100%;
  height: 36px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--glass-border);
  background: var(--surface-0);
  color: var(--text-primary);
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-pill-btn:hover {
  background: var(--surface-2);
  border-color: rgba(226, 83, 115, 0.4);
  transform: translateY(-1px);
}

.scale-pill-btn:active {
  transform: scale(0.95);
}

.scale-pill-btn.is-selected {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 3px 10px rgba(226, 83, 115, 0.3);
  transform: translateY(-1px);
}

.scale-slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.custom-slider {
  flex: 1;
  accent-color: #e25373;
}

.scale-value-bubble {
  min-width: 32px;
  font-weight: 800;
  font-size: 0.95rem;
  text-align: center;
  color: #e25373;
}

.scale-labels-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* 2. NUMBER INPUT COM UNIDADE */
.number-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-unit-badge {
  position: absolute;
  right: 10px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-2);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  pointer-events: none;
}

/* 3. SINGLE CHOICE PILLS */
.choice-pills-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.custom-radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.18s ease;
}

.custom-radio-pill:hover {
  background: var(--surface-2);
  border-color: rgba(226, 83, 115, 0.35);
  transform: translateY(-1px);
}

.custom-radio-pill:active {
  transform: scale(0.97);
}

.custom-radio-pill.is-selected {
  background: rgba(226, 83, 115, 0.12);
  border-color: #e25373;
  color: #e25373;
  box-shadow: 0 2px 6px rgba(226, 83, 115, 0.15);
}

.radio-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--glass-border);
  background: var(--surface-1);
  display: grid;
  place-items: center;
  transition: all 0.18s ease;
}

.custom-radio-pill.is-selected .radio-indicator {
  border-color: #e25373;
  background: #ffffff;
}

.radio-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.18s ease;
}

.custom-radio-pill.is-selected .radio-dot {
  background: #e25373;
}

/* 4. CHECKBOXES PERSONALIZADOS (MULTI) */
.multi-choice-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-checkboxes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-checkbox-card {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  background: var(--surface-0);
  border: 1.5px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.custom-checkbox-card:hover {
  background: var(--surface-2);
  border-color: rgba(226, 83, 115, 0.45);
  transform: translateY(-1px);
  box-shadow: var(--shadow-xs);
}

.custom-checkbox-card:active {
  transform: scale(0.97);
}

.custom-checkbox-card:has(.sr-only-checkbox:focus-visible) {
  outline: 2px solid #e25373;
  outline-offset: 2px;
}

.custom-checkbox-card.is-checked {
  background: rgba(226, 83, 115, 0.12);
  border-color: #e25373;
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(226, 83, 115, 0.18);
}

.sr-only-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

.custom-checkbox-indicator {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--glass-border);
  background: var(--surface-1);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-check-svg {
  font-size: 0.7rem;
  color: #ffffff;
  opacity: 0;
  transform: scale(0.4);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.custom-checkbox-card.is-checked .custom-checkbox-indicator {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  border-color: transparent;
  box-shadow: 0 2px 5px rgba(226, 83, 115, 0.35);
}

.custom-checkbox-card.is-checked .custom-check-svg {
  opacity: 1;
  transform: scale(1);
}

.checkbox-label-text {
  line-height: 1.3;
}

.empty-options-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}

/* 5. TAGS LIVRES */
.tags-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.active-tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  animation: tagAppear 0.2s ease;
}

@keyframes tagAppear {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

.tag-mini-icon {
  font-size: 0.65rem;
  color: #e25373;
}

.tag-remove-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  padding: 0;
  margin-left: 2px;
  transition: color var(--transition-fast);
}

.tag-remove-btn:hover {
  color: var(--red);
}

/* 6. BOOLEAN SEGMENTADO */
.boolean-segmented-control {
  display: flex;
  border-radius: var(--radius-xs);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  padding: 2px;
  gap: 3px;
}

.seg-pill {
  flex: 1;
  padding: 7px 10px;
  border-radius: calc(var(--radius-xs) - 1px);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.18s ease;
}

.seg-pill:hover {
  background: var(--surface-1);
  color: var(--text-primary);
}

.seg-pill.is-active {
  background: var(--surface-2);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
}

.seg-pill.seg-yes.is-active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.seg-pill.seg-no.is-active {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* ==========================================================
   INPUTS BÁSICOS REUTILIZÁVEIS
   ========================================================== */
.styled-input,
.styled-select,
.styled-textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  background: var(--surface-0);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.84rem;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.styled-input:focus,
.styled-select:focus,
.styled-textarea:focus {
  border-color: #e25373;
  box-shadow: 0 0 0 2px rgba(226, 83, 115, 0.15);
}

.styled-textarea {
  resize: vertical;
  min-height: 54px;
}

/* ==========================================================
   OBSERVAÇÕES LIVRES & NOTAS
   ========================================================== */
.notes-section-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.field-hint-inline {
  font-size: 0.74rem;
  color: var(--text-muted);
}

/* Erro */
.form-error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-expense, #ef4444);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
}

/* ==========================================================
   BARRA DE AÇÕES INFERIOR
   ========================================================== */
.form-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
  flex-wrap: wrap;
}

.checkin-modal-footer {
  width: 100%;
}

:global(.checkin-modal-shell .modal-footer-row) {
  flex-shrink: 0;
  padding: var(--space-3) var(--space-6);
  border-top: 1px solid var(--glass-border);
  background: var(--surface-0);
}

.checkin-modal-footer .form-actions-bar {
  padding-top: 0;
  border-top: 0;
}

.actions-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.filled-summary-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.filled-summary-text strong {
  color: #e25373;
}

.action-buttons-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 720px) {
  .checkin-hero-banner {
    flex-direction: column;
    align-items: stretch;
  }
  .datetime-card {
    min-width: 100%;
  }
  .group-fields-grid {
    grid-template-columns: 1fr;
  }
  .form-actions-bar {
    flex-direction: column;
    align-items: stretch;
  }
  :global(.checkin-modal-shell .modal-footer-row) {
    padding: var(--space-3) var(--space-5);
  }
  .checkin-modal-footer .form-actions-bar {
    gap: var(--space-2);
  }
  .actions-meta {
    justify-content: space-between;
  }
  .action-buttons-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr);
  }
  .action-buttons-wrap .kadem-health-button {
    min-width: 0;
    padding: var(--space-3);
  }
  .action-buttons-wrap .kadem-health-button--primary {
    justify-content: center;
  }
}
</style>
