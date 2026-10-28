<template>
  <header class="nexo-header">
    <div class="nexo-title-group">
      <h2>Kadem Nexo</h2>
      <span>{{ planLabel }} · {{ aiUsageLabel }}</span>
    </div>

    <div class="nexo-actions">
      <!-- Seletor de mês visível no Desktop: setas, texto animado e painel de meses por ano -->
      <div class="desktop-month-picker">
        <NexoMonthPicker
          :model-value="selectedMonth"
          @update:modelValue="$emit('update:selectedMonth', $event)"
          @change="$emit('reload')"
        />
      </div>

      <!-- Filtro de mês no Responsivo: um modal (bottom sheet no celular) com o mesmo painel de meses por ano -->
      <div class="mobile-month-filter">
        <button
          type="button"
          class="icon-btn filter-trigger-btn"
          :class="{ 'is-active': isMonthModalOpen }"
          title="Filtrar por mês"
          aria-label="Filtrar por mês"
          aria-haspopup="dialog"
          @click="isMonthModalOpen = true"
        >
          <font-awesome-icon icon="filter" />
        </button>

        <BaseModal v-model="isMonthModalOpen" title="Filtrar por mês" size="sm">
          <div class="month-modal-body">
            <p class="month-modal-current">
              Mês selecionado
              <strong>{{ monthLabel(selectedMonth) }}</strong>
            </p>
            <NexoMonthPanel :value="selectedMonth" @select="selectMonth" />
          </div>
        </BaseModal>
      </div>

      <!-- Botão de Atualizar -->
      <button class="icon-btn reload-btn" :disabled="loading" title="Atualizar" @click="$emit('reload')">
        <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
      </button>

      <!-- Botão de Lançamento (ícone no responsivo, no canto) -->
      <button
        class="primary-action new-transaction-btn"
        title="Novo lançamento"
        aria-label="Novo lançamento"
        @click="$emit('new-transaction')"
      >
        <font-awesome-icon icon="plus" />
        <span class="btn-label">Lançamento</span>
      </button>
    </div>
  </header>
</template>

<script>
import BaseModal from '@/components/BaseModal.vue';
import NexoMonthPanel from './NexoMonthPanel.vue';
import NexoMonthPicker from './NexoMonthPicker.vue';
import { monthLabel } from '@/utils/monthKey';

export default {
  name: 'NexoHeader',
  components: { BaseModal, NexoMonthPanel, NexoMonthPicker },
  emits: ['new-transaction', 'reload', 'update:selectedMonth'],
  props: {
    selectedMonth: {
      type: String,
      required: true,
    },
    planLabel: {
      type: String,
      required: true,
    },
    aiUsageLabel: {
      type: String,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isMonthModalOpen: false,
    };
  },
  methods: {
    monthLabel,
    selectMonth(month) {
      this.isMonthModalOpen = false;
      if (month === this.selectedMonth) return;
      this.$emit('update:selectedMonth', month);
      this.$emit('reload');
    },
  },
}
</script>

<style scoped>
.nexo-header,
.nexo-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.nexo-header {
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.nexo-title-group h2 {
  margin: 0;
}

.nexo-title-group span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.nexo-actions {
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.mobile-month-filter {
  display: none;
  position: relative;
}

/* Conteúdo do modal de mês (celular): o rótulo do mês atual acima do painel de meses por ano. */
.month-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.month-modal-current {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.month-modal-current strong {
  font-size: 1rem;
  color: var(--text-primary);
}

.filter-trigger-btn.is-active {
  background: var(--deep-blue);
  color: var(--white);
}

.primary-action,
.icon-btn {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 42px;
  min-height: 42px;
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

.primary-action:active,
.icon-btn:active {
  transform: scale(0.97);
}

.icon-btn {
  width: 42px;
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-btn:hover {
  background: var(--dark-yellow-2);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Responsivo (Container query) */
@container (max-width: 600px) {
  .nexo-header {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
  }

  .nexo-title-group {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nexo-title-group h2 {
    font-size: 1.15rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nexo-title-group span {
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nexo-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .desktop-month-picker {
    display: none;
  }

  .mobile-month-filter {
    display: block;
  }

  .icon-btn,
  .new-transaction-btn {
    width: 38px;
    height: 38px;
    min-height: 38px;
    flex: 0 0 38px;
    padding: 0;
    box-sizing: border-box;
    border-radius: var(--radius-sm);
  }

  .new-transaction-btn .btn-label {
    display: none;
  }
}

/* Responsivo (Media query fallback) */
@media (max-width: 600px) {
  .nexo-header {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
  }

  .nexo-title-group {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nexo-title-group h2 {
    font-size: 1.15rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nexo-title-group span {
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nexo-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .desktop-month-picker {
    display: none;
  }

  .mobile-month-filter {
    display: block;
  }

  .icon-btn,
  .new-transaction-btn {
    width: 38px;
    height: 38px;
    min-height: 38px;
    flex: 0 0 38px;
    padding: 0;
    box-sizing: border-box;
    border-radius: var(--radius-sm);
  }

  .new-transaction-btn .btn-label {
    display: none;
  }
}
</style>
