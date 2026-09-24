<template>
  <BaseModal
    :model-value="visible"
    :title="tracker ? 'Editar Rastreador' : 'Novo Rastreador'"
    size="lg"
    @close="$emit('close')"
    @update:model-value="value => { if (!value) $emit('close'); }"
  >
    <form class="health-modal-body" @submit.prevent="submit">
      <p class="modal-intro">
        Escolha o que deseja acompanhar. O campo aparecerá no seu check-in diário e alimentará os resumos e análises.
      </p>

      <div class="health-field static-label">
        <label for="tracker-name">Nome do rastreador</label>
        <input
          id="tracker-name"
          v-model.trim="form.name"
          required
          maxlength="100"
          placeholder="Ex.: Dor abdominal, Disposição, Horas de sono..."
          autofocus
        />
      </div>

      <div class="health-field static-label">
        <div class="field-label-row">
          <label>Grupo</label>
          <button
            type="button"
            class="mini-link-btn"
            @click="$emit('new-group')"
          >
            <font-awesome-icon icon="plus" />
            <span>Novo Grupo</span>
          </button>
        </div>
        <SearchableDropdown
          v-model="form.group"
          :options="groupOptions"
          :searchable="true"
          size="md"
          placeholder="Selecione o grupo..."
          search-placeholder="Buscar ou filtrar grupo..."
        />
      </div>

      <div class="health-field static-label">
        <label>Tipo de resposta</label>
        <SearchableDropdown
          v-model="form.value_type"
          :options="valueTypeOptions"
          :searchable="false"
          size="md"
          placeholder="Selecione o tipo..."
        />
      </div>

      <div v-if="form.value_type === 'SCALE'" class="form-row">
        <div class="health-field static-label">
          <label for="scale-min">Mínimo</label>
          <input id="scale-min" v-model.number="form.min_value" type="number" required />
        </div>
        <div class="health-field static-label">
          <label for="scale-max">Máximo</label>
          <input
            id="scale-max"
            v-model.number="form.max_value"
            type="number"
            :min="Number(form.min_value) + 1"
            required
          />
        </div>
      </div>

      <div v-if="form.value_type === 'NUMBER'" class="health-field static-label">
        <label for="tracker-unit">Unidade de medida (opcional)</label>
        <input id="tracker-unit" v-model.trim="form.unit" maxlength="30" placeholder="Ex.: kg, horas, ml, passos" />
      </div>

      <div v-if="['SINGLE', 'MULTI'].includes(form.value_type)" class="health-field static-label">
        <label for="tracker-options">Opções disponíveis (uma por linha)</label>
        <textarea
          id="tracker-options"
          v-model="optionsText"
          required
          rows="4"
          placeholder="Ex.: Leve&#10;Moderada&#10;Intensa"
        ></textarea>
      </div>

      <div class="health-field static-label">
        <label for="tracker-notes">Instruções ou ajuda para preencher (opcional)</label>
        <textarea
          id="tracker-notes"
          v-model.trim="form.notes"
          rows="2"
          placeholder="Ex.: 0 = nenhuma dor; 10 = dor máxima suportável"
        ></textarea>
      </div>

      <p v-if="error || localError" class="modal-error">
        <font-awesome-icon icon="triangle-exclamation" />
        <span>{{ error || localError }}</span>
      </p>

      <div class="modal-actions">
        <button class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact" type="button" @click="$emit('close')">Cancelar</button>
        <button class="kadem-health-button kadem-health-button--primary" type="submit" :disabled="loading">
          <font-awesome-icon v-if="loading" icon="spinner" spin />
          <span>{{ loading ? 'Salvando…' : tracker ? 'Salvar alterações' : 'Criar rastreador' }}</span>
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";

const VALUE_TYPES = [
  { value: "SCALE", label: "Escala numérica (ex.: 0 a 10)", icon: "sliders" },
  { value: "NUMBER", label: "Número com unidade (ex.: peso, horas)", icon: "hashtag" },
  { value: "SINGLE", label: "Uma opção (escolha única)", icon: "circle-dot" },
  { value: "MULTI", label: "Várias opções (múltipla escolha)", icon: "square-check" },
  { value: "TAGS", label: "Tags livres (palavras-chave)", icon: "tags" },
  { value: "TEXT", label: "Texto descritivo livre", icon: "align-left" },
  { value: "BOOLEAN", label: "Sim ou não (binário)", icon: "toggle-on" },
];

export default {
  name: "HealthTrackerModal",
  components: { BaseModal, SearchableDropdown },
  props: {
    visible: { type: Boolean, default: false },
    tracker: { type: Object, default: null },
    groups: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "submit", "new-group"],
  data() {
    return {
      form: {},
      optionsText: "",
      localError: "",
      valueTypeOptions: VALUE_TYPES,
    };
  },
  computed: {
    groupOptions() {
      const opts = (this.groups || []).map((g) => ({
        value: g.name,
        label: g.name,
        icon: g.icon || "folder",
        color: g.color || "#e25373",
      }));

      if (this.form.group && !opts.some((o) => o.value.toLowerCase() === this.form.group.toLowerCase())) {
        opts.unshift({
          value: this.form.group,
          label: this.form.group,
          icon: "folder",
          color: "#e25373",
        });
      }

      if (!opts.length) {
        opts.push({ value: "Bem-estar", label: "Bem-estar", icon: "heart", color: "#e25373" });
      }

      return opts;
    },
  },
  watch: {
    visible(value) {
      if (value) this.reset();
    },
    tracker() {
      if (this.visible) this.reset();
    },
  },
  methods: {
    reset() {
      const fallbackGroup = this.groups?.[0]?.name || "Bem-estar";
      this.form = {
        name: this.tracker?.name || "",
        group: this.tracker?.group || fallbackGroup,
        value_type: this.tracker?.value_type || "SCALE",
        min_value: this.tracker?.min_value ?? 0,
        max_value: this.tracker?.max_value ?? 10,
        unit: this.tracker?.unit || "",
        notes: this.tracker?.notes || "",
      };
      this.optionsText = (this.tracker?.options || []).join("\n");
      this.localError = "";
    },
    submit() {
      const options = [...new Set(this.optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
      if (this.form.value_type === "SCALE" && Number(this.form.max_value) <= Number(this.form.min_value)) {
        this.localError = "O máximo deve ser maior que o mínimo.";
        return;
      }
      if (["SINGLE", "MULTI"].includes(this.form.value_type) && !options.length) {
        this.localError = "Adicione pelo menos uma opção.";
        return;
      }
      this.localError = "";
      this.$emit("submit", { ...this.form, options });
    },
  },
};
</script>

<style scoped>
.health-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  color: var(--text-primary);
}

.modal-intro {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.health-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-field.static-label label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.mini-link-btn {
  background: transparent;
  border: none;
  color: #e25373;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.mini-link-btn:hover {
  background: rgba(226, 83, 115, 0.1);
  color: #8d5fd3;
}

.health-field input,
.health-field textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.health-field textarea {
  resize: vertical;
}

.health-field input:focus,
.health-field textarea:focus {
  border-color: #e25373;
  box-shadow: 0 0 0 3px rgba(226, 83, 115, 0.15);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.modal-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-expense, #ef4444);
  background: rgba(239, 68, 68, 0.1);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.82rem;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.text-btn:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.primary-action.modal-submit {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border: none;
  padding: 9px 20px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(226, 83, 115, 0.25);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.primary-action.modal-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-action.modal-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
