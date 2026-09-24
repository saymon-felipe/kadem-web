<template>
  <BaseModal
    :model-value="visible"
    :title="group ? 'Editar Grupo de Rastreadores' : 'Novo Grupo de Rastreadores'"
    size="lg"
    @close="$emit('close')"
    @update:model-value="val => { if (!val) $emit('close'); }"
  >
    <form class="health-modal-body" @submit.prevent="handleSubmit">
      <p class="modal-intro">
        Organize seus rastreadores em grupos para facilitar o acompanhamento diário e a visualização no diário de saúde.
      </p>

      <div class="health-field static-label">
        <label for="group-name">Nome do grupo</label>
        <input
          id="group-name"
          v-model.trim="form.name"
          type="text"
          required
          maxlength="80"
          placeholder="Ex.: Bem-estar, Sintomas, Hábitos, Digestão..."
          autofocus
        />
      </div>

      <div class="health-field static-label">
        <label for="group-desc">Descrição (opcional)</label>
        <input
          id="group-desc"
          v-model.trim="form.description"
          type="text"
          maxlength="160"
          placeholder="Ex.: Disposição geral, energia e vitalidade diária"
        />
      </div>

      <div class="health-field static-label">
        <label>Cor de destaque</label>
        <div class="color-palette">
          <button
            v-for="color in availableColors"
            :key="color"
            type="button"
            class="color-chip"
            :class="{ active: form.color === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="form.color = color"
          >
            <font-awesome-icon v-if="form.color === color" icon="check" />
          </button>
        </div>
      </div>

      <div class="health-field static-label">
        <label>Ícone do grupo</label>
        <div class="icon-selector">
          <button
            v-for="opt in availableIcons"
            :key="opt.icon"
            type="button"
            class="icon-chip"
            :class="{ active: form.icon === opt.icon }"
            :title="opt.label"
            @click="form.icon = opt.icon"
          >
            <font-awesome-icon :icon="opt.icon" />
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <p v-if="error || localError" class="modal-error">
        <font-awesome-icon icon="triangle-exclamation" />
        <span>{{ error || localError }}</span>
      </p>

      <div class="modal-actions">
        <button type="button" class="text-btn" @click="$emit('close')">Cancelar</button>
        <button type="submit" class="primary-action modal-submit" :disabled="loading">
          <font-awesome-icon v-if="loading" icon="spinner" spin />
          <span>{{ loading ? 'Salvando…' : group ? 'Salvar alterações' : 'Criar Grupo' }}</span>
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

const AVAILABLE_COLORS = [
  "#e25373",
  "#8d5fd3",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
];

const AVAILABLE_ICONS = [
  { icon: "heart", label: "Coração" },
  { icon: "triangle-exclamation", label: "Sintoma" },
  { icon: "mug-saucer", label: "Hábito" },
  { icon: "shield-halved", label: "Proteção" },
  { icon: "user", label: "Corpo" },
  { icon: "pills", label: "Remédio" },
  { icon: "droplet", label: "Água" },
  { icon: "bed", label: "Sono" },
  { icon: "bolt", label: "Energia" },
  { icon: "folder", label: "Pasta" },
];

export default {
  name: "HealthTrackerGroupModal",
  components: { BaseModal },
  props: {
    visible: { type: Boolean, default: false },
    group: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "submit"],
  data() {
    return {
      form: {
        name: "",
        description: "",
        color: "#e25373",
        icon: "heart",
      },
      localError: "",
      availableColors: AVAILABLE_COLORS,
      availableIcons: AVAILABLE_ICONS,
    };
  },
  watch: {
    visible(val) {
      if (val) this.reset();
    },
    group() {
      if (this.visible) this.reset();
    },
  },
  methods: {
    reset() {
      this.form = {
        name: this.group?.name || "",
        description: this.group?.description || "",
        color: this.group?.color || "#e25373",
        icon: this.group?.icon || "heart",
      };
      this.localError = "";
    },
    handleSubmit() {
      const name = String(this.form.name || "").trim();
      if (!name) {
        this.localError = "Informe o nome do grupo.";
        return;
      }
      this.localError = "";
      this.$emit("submit", {
        name,
        description: String(this.form.description || "").trim(),
        color: this.form.color || "#e25373",
        icon: this.form.icon || "heart",
      });
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

.health-field.static-label label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.health-field input {
  width: 100%;
  box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.health-field input:focus {
  border-color: #e25373;
  box-shadow: 0 0 0 3px rgba(226, 83, 115, 0.15);
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-chip {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 0.8rem;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.color-chip:hover {
  transform: scale(1.1);
}

.color-chip.active {
  border-color: var(--text-primary);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
  gap: 8px;
}

.icon-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-chip:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-chip.active {
  background: rgba(226, 83, 115, 0.12);
  border-color: #e25373;
  color: #e25373;
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
</style>
