<template>
  <Transition name="slide-over-root">
    <div v-if="visible" class="modal-wrapper-fixed">
      <div class="modal-overlay" @click.self="$emit('close')"></div>
      <form class="modal-content health-modal glass" @submit.prevent="handleSubmit">
        <div class="modal-header">
          <h3>Novo Lançamento</h3>
          <button type="button" class="close-icon-btn" aria-label="Fechar" @click="$emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>

        <!-- Controle Segmentado do Tipo de Registro -->
        <div class="segmented">
          <button
            type="button"
            :class="{ active: currentType === 'SCHEDULE' }"
            :disabled="!schedules.length"
            @click="setType('SCHEDULE')"
          >
            <font-awesome-icon icon="check" />
            <span>Rotina</span>
          </button>
          <button
            type="button"
            class="entry-btn"
            :class="{ active: currentType === 'ENTRY' }"
            :disabled="!supplies.length"
            @click="setType('ENTRY')"
          >
            <font-awesome-icon icon="plus" />
            <span>Entrada</span>
          </button>
          <button
            type="button"
            class="usage-btn"
            :class="{ active: currentType === 'USAGE' }"
            :disabled="!supplies.length"
            @click="setType('USAGE')"
          >
            <font-awesome-icon icon="arrow-down" />
            <span>Gasto</span>
          </button>
          <button
            type="button"
            class="obs-btn"
            :class="{ active: currentType === 'OBSERVATION' }"
            :disabled="!objects.length"
            @click="setType('OBSERVATION')"
          >
            <font-awesome-icon icon="clipboard" />
            <span>Nota</span>
          </button>
        </div>

        <!-- Campos de AGENDA / ROTINA -->
        <template v-if="currentType === 'SCHEDULE'">
          <div class="health-field static-label">
            <label>Selecione a rotina</label>
            <SearchableDropdown
              v-model="localForm.object_key"
              :options="scheduleOptions"
              :searchable="true"
              size="md"
              search-placeholder="Buscar rotina..."
              placeholder="Selecione uma rotina..."
            />
          </div>

          <div class="health-field static-label">
            <label for="action-schedule-date">Data e horário da realização</label>
            <input
              id="action-schedule-date"
              v-model="localForm.occurred_at"
              type="datetime-local"
              required
            />
          </div>

          <div v-if="linkedConsumptionsForSelected.length" class="linked-supply-info">
            <span class="info-tag-title">
              <font-awesome-icon icon="link" /> Baixa automática no estoque:
            </span>
            <ul class="auto-deduct-list">
              <li v-for="c in linkedConsumptionsForSelected" :key="c.local_key">
                <strong>{{ c.supplyName }}</strong>: -{{ c.quantity }} {{ c.unit }}
                <span class="stock-reminder">(Saldo atual: {{ supplyBalance(c.supplyKey) }} {{ c.unit }})</span>
              </li>
            </ul>
          </div>

          <div class="health-field static-label">
            <label for="action-schedule-notes">Observações ou sintomas (opcional)</label>
            <textarea
              id="action-schedule-notes"
              v-model.trim="localForm.notes"
              placeholder="Ex.: dosagem aplicada, local, observações adicionais"
            ></textarea>
          </div>
        </template>

        <!-- Campos de INSUMO (Entrada ou Gasto) -->
        <template v-else-if="currentType === 'ENTRY' || currentType === 'USAGE'">
          <div class="health-field static-label">
            <label>Selecione o insumo / medicação</label>
            <SearchableDropdown
              v-model="localForm.object_key"
              :options="supplyOptions"
              :searchable="true"
              size="md"
              search-placeholder="Buscar insumo..."
              placeholder="Selecione um insumo..."
            />
          </div>

          <div class="health-field static-label">
            <label for="action-movement-qty">
              Quantidade a {{ currentType === 'USAGE' ? 'deduzir (gasto)' : 'adicionar (entrada)' }}
              <span v-if="selectedSupplyUnit">({{ selectedSupplyUnit }})</span>
            </label>
            <input
              id="action-movement-qty"
              v-model.number="localForm.quantity"
              type="number"
              min="0.01"
              step="any"
              required
            />
          </div>

          <div class="health-field static-label">
            <label for="action-movement-date">Data e horário do registro</label>
            <input
              id="action-movement-date"
              v-model="localForm.occurred_at"
              type="datetime-local"
              required
            />
          </div>

          <div class="health-field static-label">
            <label for="action-movement-notes">Observações (opcional)</label>
            <textarea
              id="action-movement-notes"
              v-model.trim="localForm.notes"
              :placeholder="currentType === 'USAGE' ? 'Ex.: dose extra, motivo do gasto' : 'Ex.: compra na farmácia, lote, fornecedor'"
            ></textarea>
          </div>
        </template>

        <!-- Campos de ANOTAÇÃO / EVENTO -->
        <template v-else>
          <div class="health-field static-label">
            <label>Objeto relacionado</label>
            <SearchableDropdown
              v-model="localForm.object_key"
              :options="allObjectOptions"
              :searchable="true"
              size="md"
              search-placeholder="Buscar objeto..."
              placeholder="Selecione o objeto..."
            />
          </div>

          <div class="health-field static-label">
            <label for="action-obs-title">Título do evento</label>
            <input
              id="action-obs-title"
              v-model.trim="localForm.title"
              placeholder="Ex.: Dor de cabeça moderada, aferição de pressão, etc."
              required
            />
          </div>

          <div class="health-field static-label">
            <label for="action-obs-date">Data e horário</label>
            <input
              id="action-obs-date"
              v-model="localForm.occurred_at"
              type="datetime-local"
              required
            />
          </div>

          <div class="health-field static-label">
            <label for="action-obs-notes">Descrição detalhada</label>
            <textarea
              id="action-obs-notes"
              v-model.trim="localForm.notes"
              placeholder="Descreva sintomas, medições, orientações ou contexto"
            ></textarea>
          </div>
        </template>

        <p v-if="error" class="modal-error">
          <font-awesome-icon icon="triangle-exclamation" />
          <span>{{ error }}</span>
        </p>

        <div class="modal-actions">
          <button type="button" class="text-btn" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="primary-action modal-submit" :disabled="loading">
            <font-awesome-icon v-if="loading" icon="spinner" spin />
            <span>{{ loading ? "Salvando…" : "Salvar Registro" }}</span>
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script>
import SearchableDropdown from "@/components/ui/SearchableDropdown.vue";

export default {
  name: "HealthActionModal",
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
    initialObjectKey: {
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
    objects: {
      type: Array,
      default: () => [],
    },
    relations: {
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
      currentType: "SCHEDULE",
      localForm: {
        object_key: "",
        title: "",
        occurred_at: "",
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
        label: `${s.name} · Saldo: ${this.supplyBalance(s.local_key)} ${s.unit}`,
      }));
    },
    allObjectOptions() {
      return this.objects.map((o) => ({
        value: o.local_key,
        label: `${o.name} (${o.object_type})`,
      }));
    },
    selectedSupplyUnit() {
      const supply = this.supplies.find((s) => s.local_key === this.localForm.object_key);
      return supply ? supply.unit : "";
    },
    linkedConsumptionsForSelected() {
      if (this.currentType !== "SCHEDULE" || !this.localForm.object_key) return [];
      const matchingRelations = this.relations.filter(
        (r) => r.source_key === this.localForm.object_key && r.relation_type === "CONSUMES",
      );
      return matchingRelations.map((r) => {
        const sup = this.supplies.find((s) => s.local_key === r.target_key);
        return {
          local_key: r.local_key,
          supplyKey: r.target_key,
          supplyName: sup?.name || "Insumo",
          quantity: r.quantity,
          unit: sup?.unit || "",
        };
      });
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
    localDateTime() {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    },
    resetForm() {
      let type = this.initialType || "SCHEDULE";
      if (type === "SCHEDULE" && !this.schedules.length && this.supplies.length) {
        type = "USAGE";
      }
      this.currentType = type;

      let defaultKey = this.initialObjectKey || "";
      if (!defaultKey) {
        if (this.currentType === "SCHEDULE" && this.schedules.length) {
          defaultKey = this.schedules[0].local_key;
        } else if (["ENTRY", "USAGE"].includes(this.currentType) && this.supplies.length) {
          defaultKey = this.supplies[0].local_key;
        } else if (this.objects.length) {
          defaultKey = this.objects[0].local_key;
        }
      }

      this.localForm = {
        object_key: defaultKey,
        title: "",
        occurred_at: this.localDateTime(),
        quantity: 1,
        notes: "",
      };
    },
    setType(type) {
      this.currentType = type;
      if (type === "SCHEDULE") {
        this.localForm.object_key = this.schedules[0]?.local_key || "";
      } else if (type === "ENTRY" || type === "USAGE") {
        this.localForm.object_key = this.supplies[0]?.local_key || "";
      } else {
        this.localForm.object_key = this.objects[0]?.local_key || "";
      }
    },
    handleSubmit() {
      this.$emit("submit", {
        type: this.currentType,
        payload: {
          object_key: this.localForm.object_key,
          title: this.localForm.title,
          occurred_at: this.localForm.occurred_at,
          quantity: this.localForm.quantity,
          notes: this.localForm.notes,
          movement_type: this.currentType === "ENTRY" ? "ENTRY" : "USAGE",
        },
      });
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

.segmented {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.segmented button {
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-secondary);
  height: 36px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.segmented button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.segmented button:not(:disabled):hover {
  color: var(--text-primary);
}

.segmented button.active {
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
  font-weight: 700;
}

.segmented .usage-btn.active {
  color: #e25373;
}

.segmented .entry-btn.active {
  color: var(--color-info);
}

.segmented .obs-btn.active {
  color: #8d5fd3;
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

.linked-supply-info {
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
}

.info-tag-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 4px;
}

.auto-deduct-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.auto-deduct-list li {
  color: var(--text-primary);
}

.stock-reminder {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-left: 5px;
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
