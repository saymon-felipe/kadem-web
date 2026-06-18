<template>
  <Transition name="slide-over-root">
    <div v-if="visible" class="modal-wrapper-fixed">
      <div class="modal-overlay" @click.self="$emit('close')"></div>
      <form
        class="modal-content nexo-modal transaction-modal glass"
        :class="form.type.toLowerCase()"
        @submit.prevent="$emit('save')"
      >
        <h3>{{ form.id ? 'Editar lançamento' : 'Novo lançamento' }}</h3>
        <div class="segmented">
          <button
            type="button"
            class="expense-toggle"
            :class="{ active: form.type === 'EXPENSE' }"
            @click="updateField('type', 'EXPENSE')"
          >
            Saída
          </button>
          <button
            type="button"
            class="income-toggle"
            :class="{ active: form.type === 'INCOME' }"
            @click="updateField('type', 'INCOME')"
          >
            Entrada
          </button>
        </div>
        <div class="nexo-field static-label">
          <label for="transaction-description">Descrição</label>
          <input
            id="transaction-description"
            :value="form.description"
            placeholder=""
            required
            @input="updateField('description', $event.target.value)"
          />
        </div>
        <div class="nexo-field static-label textarea">
          <label for="transaction-observation">Observação</label>
          <textarea
            id="transaction-observation"
            :value="form.observation"
            placeholder="Detalhe opcional para diferenciar este movimento"
            @input="updateField('observation', $event.target.value.trim())"
          ></textarea>
        </div>
        <div class="form-grid">
          <div class="nexo-field static-label">
            <label for="transaction-amount">Valor</label>
            <input
              id="transaction-amount"
              :value="form.amount_display"
              type="text"
              inputmode="numeric"
              placeholder=""
              required
              @input="$emit('update-amount', $event)"
            />
          </div>
          <div class="nexo-field static-label">
            <label for="transaction-date">Data</label>
            <input
              id="transaction-date"
              :value="form.transaction_date"
              type="date"
              placeholder=""
              required
              @input="updateField('transaction_date', $event.target.value)"
            />
          </div>
        </div>
        <CategoryCombo
          :model-value="form.category_id"
          :categories="categories"
          placeholder="Sem categoria"
          @update:modelValue="updateField('category_id', $event)"
        />
        <div class="modal-actions">
          <button type="button" class="text-btn" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="primary-action">
            {{ form.id ? 'Salvar alterações' : 'Salvar' }}
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>

<script>
import CategoryCombo from '../CategoryCombo.vue'

export default {
  name: 'NexoTransactionModal',
  components: {
    CategoryCombo,
  },
  emits: ['close', 'save', 'update-amount', 'update-field'],
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    form: {
      type: Object,
      required: true,
    },
    categories: {
      type: Array,
      required: true,
    },
  },
  methods: {
    updateField(field, value) {
      this.$emit('update-field', { field, value })
    },
  },
}
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

.nexo-modal {
  position: relative;
  z-index: 1;
  width: min(500px, 92vw);
  max-height: min(680px, 90vh);
  overflow-y: auto;
  background: var(--surface-0);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  pointer-events: auto;
  transition: background var(--transition-base);
}

.transaction-modal.expense {
  background: linear-gradient(160deg, rgba(255, 246, 246, 0.97), rgba(255, 255, 255, 0.95));
}

.transaction-modal.income {
  background: linear-gradient(160deg, rgba(243, 255, 247, 0.97), rgba(255, 255, 255, 0.95));
}
[data-theme='dark'] .nexo-modal {
  background: var(--surface-2);
  color: var(--text-primary);
}

[data-theme='dark'] .transaction-modal.expense {
  background: linear-gradient(160deg, rgba(231, 76, 60, 0.12), var(--surface-2)) !important;
}

[data-theme='dark'] .transaction-modal.income {
  background: linear-gradient(160deg, rgba(46, 204, 113, 0.12), var(--surface-2)) !important;
}

.nexo-modal h3 {
  margin: 0;
}

.nexo-field {
  margin: 0;
  min-width: 0;
}

.nexo-field input,
.nexo-field select,
.nexo-field textarea {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: none;
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4);
  outline: none;
  transition:
    border-color var(--transition-fast),
    background var(--transition-base);
}

.nexo-field input:focus,
.nexo-field select:focus,
.nexo-field textarea:focus {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(31, 39, 76, 0.08);
}

.nexo-field input,
.nexo-field select {
  height: 50px;
}

.nexo-field textarea {
  min-height: 130px;
  padding: var(--space-4);
  resize: vertical;
}

.nexo-field label {
  color: var(--black);
}

[data-theme='dark'] .nexo-field label {
  color: var(--gray-400);
}

.nexo-field.static-label {
  display: grid;
  gap: var(--space-1);
}

.nexo-field.static-label label {
  position: static;
  transform: none;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 600;
  padding-left: var(--space-1);
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
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  height: 38px;
  cursor: pointer;
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.segmented button:hover,
.segmented button.active {
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
}

.segmented .expense-toggle.active {
  color: var(--red);
  background: rgba(255, 230, 230, 0.95);
}

[data-theme='dark'] .segmented .expense-toggle.active {
  color: var(--red);
  background: rgba(231, 76, 60, 0.2);
}

.segmented .income-toggle.active {
  color: #2e9b62;
  background: rgba(225, 247, 233, 0.95);
}

[data-theme='dark'] .segmented .income-toggle.active {
  color: var(--green);
  background: rgba(46, 204, 113, 0.2);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}

.primary-action,
.text-btn {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.text-btn {
  background: transparent;
  color: var(--text-primary);
  padding: 0;
}

.text-btn:hover {
  color: var(--deep-blue);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
