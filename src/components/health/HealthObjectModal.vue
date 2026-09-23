<template>
  <Transition name="slide-over-root">
    <div v-if="visible" class="modal-wrapper-fixed">
      <div class="modal-overlay" @click.self="$emit('close')"></div>
      <form class="modal-content health-modal glass" @submit.prevent="handleSubmit">
        <div class="modal-header">
          <h3>Novo Objeto de Saúde</h3>
          <button type="button" class="close-icon-btn" aria-label="Fechar" @click="$emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>

        <!-- Seletor do Tipo de Objeto -->
        <div class="health-field static-label">
          <label>Tipo de Objeto</label>
          <SearchableDropdown
            v-model="form.object_type"
            :options="objectTypeOptions"
            :searchable="false"
            size="md"
            placeholder="Selecione o tipo..."
          />
        </div>

        <div class="health-field static-label">
          <label for="obj-name">Nome do objeto</label>
          <input
            id="obj-name"
            v-model.trim="form.name"
            placeholder="Ex.: Aplicação mensal, Vitamina D, Treino A, etc."
            required
            autofocus
          />
        </div>

        <!-- Campos de SCHEDULE (Agenda / Rotina) -->
        <template v-if="form.object_type === 'SCHEDULE'">
          <div class="form-row">
            <div class="health-field static-label">
              <label for="obj-freq-val">Repetir a cada</label>
              <input
                id="obj-freq-val"
                v-model.number="form.frequency_value"
                type="number"
                min="1"
                required
              />
            </div>
            <div class="health-field static-label">
              <label>Intervalo</label>
              <SearchableDropdown
                v-model="form.frequency_unit"
                :options="frequencyOptions"
                :searchable="false"
                size="md"
                placeholder="Selecione o intervalo..."
              />
            </div>
          </div>

          <div class="form-row">
            <div class="health-field static-label">
              <label for="obj-anchor">Data de início ou referência</label>
              <input id="obj-anchor" v-model="form.anchor_date" type="date" required />
            </div>
            <div class="health-field static-label">
              <label for="obj-warning">Aviso prévio (dias)</label>
              <input id="obj-warning" v-model.number="form.warning_before" type="number" min="0" />
            </div>
          </div>
        </template>

        <!-- Campos de SUPPLY ou MEDICATION (Insumo / Estoque) -->
        <template v-else-if="form.object_type === 'SUPPLY' || form.object_type === 'MEDICATION'">
          <div class="form-row">
            <div class="health-field static-label">
              <label>Unidade de medida</label>
              <SearchableDropdown
                v-model="form.unit"
                :options="unitOptions"
                :searchable="true"
                size="md"
                search-placeholder="Buscar unidade..."
                placeholder="Selecione a unidade..."
              />
            </div>
            <div class="health-field static-label">
              <label for="obj-initial-stock">Estoque inicial</label>
              <input
                id="obj-initial-stock"
                v-model.number="form.initial_stock"
                type="number"
                min="0"
                step="any"
              />
            </div>
          </div>

          <div class="health-field static-label">
            <label for="obj-min">Alerta de estoque mínimo</label>
            <input
              id="obj-min"
              v-model.number="form.minimum_quantity"
              type="number"
              min="0"
              step="any"
            />
            <span class="field-hint">Alerta visual quando o saldo for menor ou igual a este limite.</span>
          </div>
        </template>

        <!-- Observações / Notas -->
        <div class="health-field static-label">
          <label for="obj-notes">Observações adicionais (opcional)</label>
          <textarea
            id="obj-notes"
            v-model.trim="form.notes"
            placeholder="Instruções, dosagem, médico responsável, local de armazenamento, etc."
          ></textarea>
        </div>

        <p v-if="error" class="modal-error">
          <font-awesome-icon icon="triangle-exclamation" />
          <span>{{ error }}</span>
        </p>

        <div class="modal-actions">
          <button type="button" class="text-btn" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="primary-action modal-submit" :disabled="loading">
            <font-awesome-icon v-if="loading" icon="spinner" spin />
            <span>{{ loading ? "Salvando…" : "Criar Objeto" }}</span>
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script>
import { mapState } from "pinia";
import { useHealthStore } from "@/stores/health";
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";

export default {
  name: "HealthObjectModal",
  components: {
    SearchableDropdown,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    initialType: {
      type: String,
      default: "SCHEDULE",
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: "",
    },
  },
  emits: ["close", "submit"],
  data() {
    return {
      form: {
        name: "",
        object_type: "SCHEDULE",
        frequency_unit: "months",
        frequency_value: 1,
        anchor_date: "",
        warning_before: 7,
        unit: "comprimidos",
        initial_stock: 0,
        minimum_quantity: 0,
        notes: "",
      },
    };
  },
  computed: {
    ...mapState(useHealthStore, ["units"]),
    objectTypeOptions() {
      return [
        { value: "SCHEDULE", label: "Agenda Recorrente / Rotina" },
        { value: "SUPPLY", label: "Insumo / Estoque" },
        { value: "MEDICATION", label: "Medicação" },
        { value: "TREATMENT", label: "Tratamento" },
        { value: "EXAM", label: "Exame Periódico" },
        { value: "APPOINTMENT", label: "Consulta Médica" },
        { value: "SYMPTOM", label: "Rastreio de Sintoma" },
        { value: "DEVICE", label: "Dispositivo de Saúde" },
        { value: "CUSTOM", label: "Objeto Livre" },
      ];
    },
    unitOptions() {
      return (this.units || []).map((u) => ({
        value: u.value,
        label: u.label || u.value,
        subtitle: u.category ? `Categoria: ${u.category}` : undefined,
      }));
    },
    frequencyOptions() {
      return [
        { value: "days", label: "Dias" },
        { value: "weeks", label: "Semanas" },
        { value: "months", label: "Meses" },
      ];
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.resetForm();
      }
    },
  },
  methods: {
    localDate() {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 10);
    },
    resetForm() {
      this.form = {
        name: "",
        object_type: this.initialType || "SCHEDULE",
        frequency_unit: "months",
        frequency_value: 1,
        anchor_date: this.localDate(),
        warning_before: 7,
        unit: this.unitOptions[0]?.value || "comprimidos",
        initial_stock: 0,
        minimum_quantity: 0,
        notes: "",
      };
    },
    handleSubmit() {
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>

<style scoped>
.modal-wrapper-fixed {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: auto;
}

.health-modal {
  position: relative;
  z-index: 1;
  width: min(500px, 92vw);
  max-height: min(680px, 90vh);
  overflow-y: auto;
  background: var(--surface-0);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  pointer-events: auto;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-float);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.close-icon-btn {
  border: none;
  background: var(--surface-2);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.close-icon-btn:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.health-field {
  display: grid;
  gap: var(--space-1);
  margin: 0;
}

.health-field.static-label label {
  position: static !important;
  transform: none !important;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 600;
  padding-left: var(--space-1);
  margin: 0;
}

.health-field input,
.health-field select,
.health-field textarea {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: none !important;
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4);
  outline: none;
  font-size: var(--fontsize-sx);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.health-field input,
.health-field select {
  height: 46px;
}

.health-field textarea {
  min-height: 80px;
  padding: var(--space-3) var(--space-4);
  resize: vertical;
}

.health-field input:focus,
.health-field select:focus,
.health-field textarea:focus {
  border-color: #e25373 !important;
  box-shadow: 0 0 0 3px rgba(226, 83, 115, 0.15) !important;
}

.field-hint {
  display: block;
  font-size: 0.74rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.modal-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--red);
  font-size: 0.82rem;
  background: var(--red-high);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  margin: 0;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.86rem;
  padding: 8px 14px;
}

.text-btn:hover {
  color: var(--text-primary);
}

.modal-submit {
  min-height: 40px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(226, 83, 115, 0.25);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.modal-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.modal-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 500px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
