<template>
  <BaseModal
    :model-value="visible"
    title="Nova Categoria"
    size="md"
    @update:model-value="val => { if (!val) $emit('close'); }"
    @close="$emit('close')"
  >
    <form class="health-modal-body" @submit.prevent="handleSubmit">
        <!-- Tipo de categoria -->
        <div class="segmented">
          <button
            type="button"
            :class="{ active: form.kind === 'SCHEDULE' }"
            @click="form.kind = 'SCHEDULE'"
          >
            <font-awesome-icon icon="calendar" />
            <span>Agenda Recorrente</span>
          </button>
          <button
            type="button"
            :class="{ active: form.kind === 'SUPPLY' }"
            @click="form.kind = 'SUPPLY'"
          >
            <font-awesome-icon icon="basket-shopping" />
            <span>Insumo de Estoque</span>
          </button>
        </div>

        <div class="health-field static-label">
          <label for="cat-name">Nome da categoria</label>
          <input
            id="cat-name"
            v-model.trim="form.name"
            placeholder="Ex.: Aplicação mensal, Vitamina D, etc."
            required
            autofocus
          />
        </div>

        <!-- Campos de AGENDA -->
        <template v-if="form.kind === 'SCHEDULE'">
          <div class="form-row">
            <div class="health-field static-label">
              <label for="cat-freq-val">Repetir a cada</label>
              <input
                id="cat-freq-val"
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

          <div class="health-field static-label">
            <label for="cat-anchor">Data de início ou referência</label>
            <input id="cat-anchor" v-model="form.anchor_date" type="date" required />
          </div>

          <div class="health-field static-label">
            <label>Insumo consumido automaticamente</label>
            <SearchableDropdown
              v-model="form.linked_supply_key"
              :options="linkedSupplyOptions"
              :searchable="true"
              size="md"
              search-placeholder="Buscar insumo..."
              placeholder="Nenhum insumo vinculado"
            />
            <span class="field-hint">Ao concluir esta rotina, a baixa no estoque será feita automaticamente.</span>
          </div>
        </template>

        <!-- Campos de INSUMO -->
        <template v-else>
          <div class="form-row">
            <div class="health-field static-label">
              <label>Unidade de medida</label>
              <SearchableDropdown
                v-model="form.unit"
                :options="unitOptions"
                :searchable="true"
                size="md"
                search-placeholder="Buscar unidade de medida..."
                placeholder="Selecione a unidade..."
              />
            </div>
            <div class="health-field static-label">
              <label for="cat-qty">Estoque inicial</label>
              <input id="cat-qty" v-model.number="form.current_quantity" type="number" min="0" />
            </div>
          </div>

          <div class="health-field static-label">
            <label for="cat-min">Alerta de estoque mínimo</label>
            <input id="cat-min" v-model.number="form.minimum_quantity" type="number" min="0" />
            <span class="field-hint">Aviso visual quando o saldo for menor ou igual a este limite.</span>
          </div>
        </template>

        <div class="health-field static-label">
          <label for="cat-notes">Observações (opcional)</label>
          <textarea
            id="cat-notes"
            v-model.trim="form.notes"
            placeholder="Instruções de aplicação, posologia, local de armazenamento, etc."
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
            <span>{{ loading ? "Salvando…" : "Criar Categoria" }}</span>
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

export default {
  name: "HealthCategoryModal",
  components: {
    BaseModal,
    SearchableDropdown,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    supplyCategories: {
      type: Array,
      default: () => [],
    },
    formatNumber: {
      type: Function,
      required: true,
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
        kind: "SCHEDULE",
        frequency_unit: "months",
        frequency_value: 1,
        anchor_date: "",
        linked_supply_key: "",
        unit: "comprimidos",
        current_quantity: 0,
        minimum_quantity: 0,
        notes: "",
      },
    };
  },
  computed: {
    ...mapState(useHealthStore, ["units"]),
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
    linkedSupplyOptions() {
      const items = [{ value: "", label: "Nenhum insumo vinculado" }];
      this.supplyCategories.forEach((supply) => {
        items.push({
          value: supply.local_key,
          label: `${supply.name} (${this.formatNumber(supply.current_quantity)} ${supply.unit})`,
        });
      });
      return items;
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
        kind: "SCHEDULE",
        frequency_unit: "months",
        frequency_value: 1,
        anchor_date: this.localDate(),
        linked_supply_key: "",
        unit: this.unitOptions[0]?.value || "comprimidos",
        current_quantity: 0,
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
.health-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.segmented button {
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-secondary);
  height: 38px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.segmented button:hover {
  color: var(--text-primary);
}

.segmented button.active {
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
  font-weight: 700;
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
  border-radius: var(--radius-sm);
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
