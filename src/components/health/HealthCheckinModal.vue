<template>
  <BaseModal :model-value="visible" :title="event ? 'Corrigir check-in' : 'Como você está agora?'" size="md" @close="$emit('close')" @update:model-value="value => { if (!value) $emit('close'); }">
    <form class="checkin-form" @submit.prevent="submit">
      <p class="intro">Registre o que importa para você. Pode preencher só alguns campos e voltar mais tarde.</p>
      <label class="field">Data e horário<input v-model="occurredAt" type="datetime-local" required /></label>
      <div v-for="group in groups" :key="group.name" class="field-group">
        <h4>{{ group.name }}</h4>
        <div v-for="tracker in group.trackers" :key="tracker.local_key" class="field">
          <label :for="`checkin-${tracker.local_key}`">{{ tracker.name }}</label>
          <span v-if="tracker.notes" class="hint">{{ tracker.notes }}</span>
          <input v-if="tracker.value_type === 'SCALE'" :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]" type="number" :min="tracker.min_value" :max="tracker.max_value" step="1" :placeholder="`${tracker.min_value} a ${tracker.max_value}`" />
          <input v-else-if="tracker.value_type === 'NUMBER'" :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]" type="number" step="any" :placeholder="tracker.unit || 'Valor'" />
          <select v-else-if="tracker.value_type === 'SINGLE'" :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]">
            <option value="">Não informado</option><option v-for="option in tracker.options || []" :key="option" :value="option">{{ option }}</option>
          </select>
          <div v-else-if="tracker.value_type === 'MULTI'" class="choices">
            <label v-for="option in tracker.options || []" :key="option"><input v-model="values[tracker.local_key]" type="checkbox" :value="option" /> {{ option }}</label>
          </div>
          <input v-else-if="tracker.value_type === 'TAGS'" :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]" type="text" placeholder="Separe por vírgulas, ex.: carne, café" />
          <textarea v-else-if="tracker.value_type === 'TEXT'" :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]" rows="2" />
          <select v-else :id="`checkin-${tracker.local_key}`" v-model="values[tracker.local_key]"><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>
        </div>
      </div>
      <label class="field">Observações livres<textarea v-model.trim="notes" rows="3" placeholder="Contexto, sintomas, alimentação ou algo incomum" /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="actions"><button class="ghost" type="button" @click="$emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="loading">{{ loading ? 'Salvando…' : 'Salvar check-in' }}</button></div>
    </form>
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
  data() { return { occurredAt: "", notes: "", values: {} }; },
  computed: {
    groups() {
      const grouped = new Map();
      for (const tracker of this.trackers) {
        const name = tracker.group || "Bem-estar";
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name).push(tracker);
      }
      return [...grouped].map(([name, trackers]) => ({ name, trackers }));
    },
  },
  watch: { visible(value) { if (value) this.reset(); } },
  methods: {
    reset() {
      this.occurredAt = localDateTime(this.event?.occurred_at);
      this.notes = this.event?.notes || "";
      this.values = {};
      for (const tracker of this.trackers) {
        const value = this.event?.values?.[tracker.local_key];
        this.values[tracker.local_key] = ["MULTI", "TAGS"].includes(tracker.value_type)
          ? tracker.value_type === "TAGS" ? (Array.isArray(value) ? value.join(", ") : "") : [...(Array.isArray(value) ? value : [])]
          : tracker.value_type === "BOOLEAN" ? value === undefined ? "" : String(value)
          : value ?? "";
      }
    },
    submit() {
      const values = {};
      for (const tracker of this.trackers) {
        const value = this.values[tracker.local_key];
        if (tracker.value_type === "TAGS") values[tracker.local_key] = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
        else if (tracker.value_type === "BOOLEAN") values[tracker.local_key] = value === "" ? "" : value === "true";
        else values[tracker.local_key] = value;
      }
      this.$emit("submit", { occurred_at: new Date(this.occurredAt).toISOString(), values, notes: this.notes, replaces_event_key: this.event?.local_key });
    },
  },
};
</script>

<style scoped>
.checkin-form { display: grid; gap: var(--space-4); color: var(--text-primary); }
.intro { margin: 0; font-size: .84rem; line-height: 1.45; color: var(--text-secondary); }
.field-group { display: grid; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-1); }
.field-group h4 { margin: 0; color: #e25373; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
.field { display: grid; gap: 5px; color: var(--text-secondary); font-size: .8rem; font-weight: 700; }
.field label { color: var(--text-secondary); }
.hint { font-size: .72rem; color: var(--text-muted); font-weight: 400; }
input:not([type='checkbox']), select, textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-0); color: var(--text-primary); font: inherit; outline: none; }
input:focus, select:focus, textarea:focus { border-color: #e25373; }
.choices { display: flex; flex-wrap: wrap; gap: 7px; }
.choices label { display: inline-flex; gap: 5px; align-items: center; padding: 6px 10px; background: var(--surface-2); border-radius: var(--radius-xs); cursor: pointer; }
.form-error { color: var(--color-expense); margin: 0; font-size: .8rem; }
.actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
button { border: 0; border-radius: var(--radius-sm); padding: 9px 15px; cursor: pointer; font-weight: 700; }
.ghost { background: var(--surface-2); color: var(--text-primary); }
.primary { background: linear-gradient(135deg, #e25373, #8d5fd3); color: white; }
.primary:disabled { opacity: .6; cursor: wait; }
</style>
