<template>
  <BaseModal :model-value="visible" :title="tracker ? 'Editar rastreador' : 'Novo rastreador'" size="md" @close="$emit('close')" @update:model-value="value => { if (!value) $emit('close'); }">
    <form class="tracker-form" @submit.prevent="submit">
      <p class="intro">Escolha o que deseja acompanhar. O campo aparecerá no seu check-in e poderá ser usado nas análises.</p>
      <label>Nome<input v-model.trim="form.name" required maxlength="100" placeholder="Ex.: Dor abdominal" /></label>
      <label>Grupo<input v-model.trim="form.group" maxlength="80" placeholder="Ex.: Sintomas" /></label>
      <label>Tipo de resposta
        <select v-model="form.value_type">
          <option value="SCALE">Escala</option>
          <option value="NUMBER">Número</option>
          <option value="SINGLE">Uma opção</option>
          <option value="MULTI">Várias opções</option>
          <option value="TAGS">Tags livres</option>
          <option value="TEXT">Texto</option>
          <option value="BOOLEAN">Sim ou não</option>
        </select>
      </label>
      <div v-if="form.value_type === 'SCALE'" class="form-row">
        <label>Mínimo<input v-model.number="form.min_value" type="number" required /></label>
        <label>Máximo<input v-model.number="form.max_value" type="number" :min="Number(form.min_value) + 1" required /></label>
      </div>
      <label v-if="form.value_type === 'NUMBER'">Unidade (opcional)<input v-model.trim="form.unit" maxlength="30" placeholder="Ex.: kg, horas" /></label>
      <label v-if="['SINGLE', 'MULTI'].includes(form.value_type)">Opções, uma por linha
        <textarea v-model="optionsText" required rows="4" placeholder="Ex.: Leve&#10;Moderada&#10;Intensa" />
      </label>
      <label>Ajuda para preencher (opcional)<textarea v-model.trim="form.notes" rows="2" placeholder="Ex.: 0 = nenhuma dor; 10 = dor máxima" /></label>
      <p v-if="error || localError" class="form-error">{{ error || localError }}</p>
      <div class="actions">
        <button class="ghost" type="button" @click="$emit('close')">Cancelar</button>
        <button class="primary" type="submit" :disabled="loading">{{ loading ? 'Salvando…' : tracker ? 'Salvar alterações' : 'Criar rastreador' }}</button>
      </div>
    </form>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";

export default {
  name: "HealthTrackerModal",
  components: { BaseModal },
  props: {
    visible: { type: Boolean, default: false },
    tracker: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "submit"],
  data() {
    return { form: {}, optionsText: "", localError: "" };
  },
  watch: {
    visible(value) { if (value) this.reset(); },
    tracker() { if (this.visible) this.reset(); },
  },
  methods: {
    reset() {
      this.form = {
        name: this.tracker?.name || "",
        group: this.tracker?.group || "Bem-estar",
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
.tracker-form { display: grid; gap: var(--space-3); color: var(--text-primary); }
.intro { margin: 0; color: var(--text-secondary); font-size: .85rem; line-height: 1.45; }
label { display: grid; gap: 5px; font-size: .8rem; font-weight: 700; color: var(--text-secondary); }
input, select, textarea { width: 100%; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: var(--surface-1); color: var(--text-primary); padding: 10px 12px; outline: none; font: inherit; }
input:focus, select:focus, textarea:focus { border-color: #e25373; }
textarea { resize: vertical; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-error { color: var(--color-expense); margin: 0; font-size: .8rem; }
.actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
button { border: 0; border-radius: var(--radius-sm); padding: 9px 15px; cursor: pointer; font-weight: 700; }
.ghost { background: var(--surface-2); color: var(--text-primary); }
.primary { background: linear-gradient(135deg, #e25373, #8d5fd3); color: white; }
.primary:disabled { opacity: .6; cursor: wait; }
@media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
</style>
