<template>
  <BaseModal
    :model-value="visible"
    :title="modalTitle"
    size="lg"
    @update:model-value="val => { if (!val) $emit('close'); }"
    @close="$emit('close')"
  >
    <form class="health-modal-body" @submit.prevent="handleSubmit">
        <!-- O tipo é definido na criação e preservado na edição. -->
        <div v-if="!object" class="health-field static-label">
          <label>Tipo de entidade</label>
          <SearchableDropdown
            v-model="form.object_type"
            :options="objectTypeOptions"
            :searchable="false"
            size="md"
            placeholder="Selecione o tipo..."
          />
        </div>

        <div class="health-field static-label">
          <label for="obj-name">Nome da entidade</label>
          <input
            id="obj-name"
            v-model.trim="form.name"
            :placeholder="scope === 'schedules' ? 'Ex.: Consulta, exame de sangue, fisioterapia' : 'Ex.: Vitamina D, Bolsa de ileostomia'"
            required
            autofocus
          />
        </div>

        <label class="schedule-switch">
          <span class="switch-copy">
            <strong>Agendamento / recorrência</strong>
            <small>{{ form.schedule_enabled ? 'Aparecerá em Rotinas & Agendas.' : 'Aparecerá em Entidades de saúde.' }}</small>
          </span>
          <input v-model="form.schedule_enabled" type="checkbox" role="switch" aria-label="Agendamento / recorrência" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>

        <template v-if="form.schedule_enabled">
          <div class="form-row">
            <div class="health-field static-label">
              <label for="obj-anchor">{{ form.recurrence_enabled ? 'Primeira ocorrência' : 'Data e hora do agendamento' }}</label>
              <input id="obj-anchor" v-model="form.anchor_date" type="datetime-local" required />
            </div>
            <div class="health-field static-label">
              <label for="obj-warning">Aviso prévio (dias)</label>
              <input id="obj-warning" v-model.number="form.warning_before" type="number" min="0" step="1" />
            </div>
          </div>

          <label class="schedule-switch">
            <span class="switch-copy">
              <strong>Repetir agendamento</strong>
              <small>{{ form.recurrence_enabled ? 'Uma nova ocorrência será prevista após concluir.' : 'Ocorrência única, sem repetição.' }}</small>
            </span>
            <input v-model="form.recurrence_enabled" type="checkbox" role="switch" aria-label="Repetir agendamento" />
            <span class="switch-track" aria-hidden="true"></span>
          </label>

          <div v-if="form.recurrence_enabled" class="form-row">
            <div class="health-field static-label">
              <label for="obj-freq-val">Repetir a cada</label>
              <input
                id="obj-freq-val"
                v-model.number="form.frequency_value"
                type="number"
                min="1"
                step="1"
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

        </template>

        <!-- Campos de SUPPLY ou MEDICATION (Insumo / Estoque) -->
        <template v-if="form.object_type === 'SUPPLY' || form.object_type === 'MEDICATION'">
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
              <label for="obj-initial-stock">{{ object ? 'Estoque atual' : 'Estoque inicial' }}</label>
              <input
                id="obj-initial-stock"
                v-model.number="form.stock_quantity"
                type="number"
                :min="object ? undefined : 0"
                step="any"
                required
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
          <button type="button" class="kadem-health-button kadem-health-button--secondary kadem-health-button--compact" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="kadem-health-button kadem-health-button--primary" :disabled="loading">
            <font-awesome-icon v-if="loading" icon="spinner" spin />
            <span>{{ loading ? "Salvando…" : object ? "Salvar alterações" : form.schedule_enabled ? "Criar agendamento" : "Criar entidade" }}</span>
          </button>
        </div>
      </form>
  </BaseModal>
</template>

<script>
import { mapState } from "pinia";
import { useHealthStore } from "@/stores/health";
import BaseModal from "@/components/BaseModal.vue";
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";
import { HEALTH_ENTITY_TYPE_OPTIONS, HEALTH_SCHEDULE_TYPE_OPTIONS, HEALTH_OBJECT_TYPE_OPTIONS, isHealthScheduled, isHealthRecurring } from "@/utils/healthObjectTypes";

export default {
  name: "HealthObjectModal",
  components: {
    BaseModal,
    SearchableDropdown,
  },
  props: {
    object: { type: Object, default: null },
    scope: { type: String, default: "entities", validator: (value) => ["entities", "schedules"].includes(value) },
    currentStock: { type: Number, default: 0 },
    currentDueAt: { type: String, default: null },
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
      originalStock: 0,
      form: {
        name: "",
        object_type: "SCHEDULE",
        schedule_enabled: false,
        recurrence_enabled: false,
        frequency_unit: "months",
        frequency_value: 1,
        anchor_date: "",
        warning_before: 7,
        unit: "comprimidos",
        stock_quantity: 0,
        minimum_quantity: 0,
        notes: "",
      },
    };
  },
  computed: {
    ...mapState(useHealthStore, ["units"]),
    modalTitle() {
      if (this.scope === "schedules") return this.object ? "Editar agendamento" : "Novo agendamento";
      return this.object ? "Editar entidade de saúde" : "Nova entidade de saúde";
    },
    objectTypeOptions() {
      if (this.object) return HEALTH_OBJECT_TYPE_OPTIONS;
      return this.scope === "schedules" ? HEALTH_SCHEDULE_TYPE_OPTIONS : HEALTH_ENTITY_TYPE_OPTIONS;
    },
    unitOptions() {
      const options = (this.units || []).map((u) => ({
        value: u.value,
        label: u.label || u.value,
        subtitle: u.category ? `Categoria: ${u.category}` : undefined,
      }));
      if (this.object?.unit && !options.some((option) => option.value === this.object.unit)) {
        options.push({ value: this.object.unit, label: this.object.unit });
      }
      return options;
    },
    frequencyOptions() {
      return [
        { value: "hours", label: "Horas" },
        { value: "days", label: "Dias" },
        { value: "weeks", label: "Semanas" },
        { value: "months", label: "Meses" },
      ];
    },
  },
  watch: {
    "form.object_type"(type) {
      if (this.object) return;
      this.form.schedule_enabled = isHealthScheduled({ object_type: type });
      this.form.recurrence_enabled = type === "SCHEDULE";
    },
    visible(val) {
      if (val) {
        this.resetForm();
      }
    },
  },
  methods: {
    localDateTime(value) {
      if (value && value.length === 10) return value + "T09:00";
      const d = value ? new Date(value) : new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    },
    resetForm() {
      const object = this.object;
      this.originalStock = this.currentStock;
      const initialType = this.objectTypeOptions.some((option) => option.value === this.initialType)
        ? this.initialType : this.objectTypeOptions[0].value;
      this.form = {
        name: object?.name || "",
        object_type: object?.object_type || initialType,
        schedule_enabled: isHealthScheduled(object || { object_type: initialType }),
        recurrence_enabled: isHealthRecurring(object || { object_type: initialType }),
        frequency_unit: object?.frequency_unit || "months",
        frequency_value: object?.frequency_value ?? 1,
        anchor_date: this.localDateTime(object?.object_type === "SCHEDULE" && object.schedule_enabled === undefined ? this.currentDueAt || object.anchor_date : object?.anchor_date),
        warning_before: object?.warning_before ?? 7,
        unit: object?.unit || this.unitOptions[0]?.value || "comprimidos",
        stock_quantity: object ? this.currentStock : 0,
        minimum_quantity: object?.minimum_quantity ?? 0,
        notes: object?.notes || "",
      };
    },
    handleSubmit() {
      if (this.loading || !this.objectTypeOptions.some((option) => option.value === this.form.object_type)) return;
      const payload = { ...this.form };
      if (this.object) {
        if (payload.stock_quantity === this.originalStock) delete payload.stock_quantity;
      } else {
        payload.initial_stock = payload.stock_quantity;
      }
      this.$emit("submit", payload);
    },
  },
};
</script>

<style scoped>
.health-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.schedule-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  cursor: pointer;
}

.switch-copy { display: grid; gap: var(--space-1); }
.switch-copy strong { font-size: var(--fontsize-xs); color: var(--text-primary); }
.switch-copy small { font-size: 0.74rem; color: var(--text-secondary); }
.schedule-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch-track { width: 40px; height: 24px; flex-shrink: 0; border-radius: 12px; background: var(--surface-3); transition: background var(--transition-fast); }
.switch-track::after { content: ""; display: block; width: 18px; height: 18px; margin: 3px; border-radius: 50%; background: var(--text-secondary); transition: transform var(--transition-fast); }
.schedule-switch input:checked + .switch-track { background: #e25373; }
.schedule-switch input:checked + .switch-track::after { transform: translateX(16px); background: white; }
.schedule-switch input:focus-visible + .switch-track { outline: 2px solid var(--text-primary); outline-offset: 3px; }

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
