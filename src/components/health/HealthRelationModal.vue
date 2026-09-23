<template>
  <Transition name="slide-over-root">
    <div v-if="visible" class="modal-wrapper-fixed">
      <div class="modal-overlay" @click.self="$emit('close')"></div>
      <form class="modal-content health-modal glass" @submit.prevent="handleSubmit">
        <div class="modal-header">
          <h3>Vincular Insumo a Rotina</h3>
          <button type="button" class="close-icon-btn" aria-label="Fechar" @click="$emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>

        <p class="modal-description">
          Conecte um insumo a esta rotina. Toda vez que a rotina for concluída, o sistema registrará a baixa automática no estoque.
        </p>

        <div class="health-field static-label">
          <label>Rotina / Agenda</label>
          <SearchableDropdown
            v-model="form.schedule_key"
            :options="scheduleOptions"
            :searchable="true"
            size="md"
            placeholder="Selecione a rotina..."
          />
        </div>

        <div class="health-field static-label">
          <label>Insumo consumido</label>
          <SearchableDropdown
            v-model="form.supply_key"
            :options="supplyOptions"
            :searchable="true"
            size="md"
            search-placeholder="Buscar insumo..."
            placeholder="Selecione o insumo a debitar..."
          />
        </div>

        <div class="health-field static-label">
          <label for="rel-quantity">
            Quantidade debitada por execução
            <span v-if="selectedSupplyUnit">({{ selectedSupplyUnit }})</span>
          </label>
          <input
            id="rel-quantity"
            v-model.number="form.quantity"
            type="number"
            min="0.01"
            step="any"
            required
            placeholder="Ex.: 1, 2, 0.5"
          />
        </div>

        <div class="health-field static-label">
          <label for="rel-notes">Observações (opcional)</label>
          <textarea
            id="rel-notes"
            v-model.trim="form.notes"
            placeholder="Ex.: 1 comprimido pela manhã após o café"
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
            <span>{{ loading ? "Salvando…" : "Criar Vínculo" }}</span>
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script>
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";

export default {
  name: "HealthRelationModal",
  components: {
    SearchableDropdown,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    initialScheduleKey: {
      type: String,
      default: "",
    },
    schedules: {
      type: Array,
      default: () => [],
    },
    supplies: {
      type: Array,
      default: () => [],
    },
    supplyBalance: {
      type: Function,
      default: () => 0,
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
        schedule_key: "",
        supply_key: "",
        quantity: 1,
        notes: "",
      },
    };
  },
  computed: {
    scheduleOptions() {
      return this.schedules.map((s) => ({
        value: s.local_key,
        label: s.name,
      }));
    },
    supplyOptions() {
      return this.supplies.map((s) => ({
        value: s.local_key,
        label: `${s.name} (Saldo: ${this.supplyBalance(s.local_key)} ${s.unit})`,
      }));
    },
    selectedSupplyUnit() {
      const supply = this.supplies.find((s) => s.local_key === this.form.supply_key);
      return supply ? supply.unit : "";
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
    resetForm() {
      this.form = {
        schedule_key: this.initialScheduleKey || this.schedules[0]?.local_key || "",
        supply_key: this.supplies[0]?.local_key || "",
        quantity: 1,
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
  width: min(480px, 92vw);
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

.modal-description {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.45;
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

.health-field input {
  height: 46px;
}

.health-field textarea {
  min-height: 80px;
  padding: var(--space-3) var(--space-4);
  resize: vertical;
}

.health-field input:focus,
.health-field textarea:focus {
  border-color: #e25373 !important;
  box-shadow: 0 0 0 3px rgba(226, 83, 115, 0.15) !important;
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
</style>
