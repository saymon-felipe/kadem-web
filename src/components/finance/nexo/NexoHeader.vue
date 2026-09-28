<template>
  <header class="nexo-header">
    <div class="nexo-title-group">
      <h2>Kadem Nexo</h2>
      <span>{{ planLabel }} · {{ aiUsageLabel }}</span>
    </div>

    <div class="nexo-actions">
      <!-- Input de data visível no Desktop -->
      <div class="desktop-month-picker">
        <input
          :value="selectedMonth"
          type="month"
          @input="$emit('update:selectedMonth', $event.target.value)"
          @change="$emit('reload')"
        />
      </div>

      <!-- Dropdown de filtro no Responsivo -->
      <div class="mobile-filter-dropdown" v-click-outside="closeDateDropdown">
        <button
          type="button"
          class="icon-btn filter-trigger-btn"
          :class="{ 'is-active': isDateDropdownOpen }"
          title="Filtrar por data"
          aria-label="Filtrar por data"
          @click="toggleDateDropdown"
        >
          <font-awesome-icon icon="filter" />
        </button>

        <transition name="dropdown-fade">
          <div v-if="isDateDropdownOpen" class="date-dropdown-menu">
            <div class="date-dropdown-header">
              <span class="date-dropdown-title">Filtrar por data</span>
              <span class="date-dropdown-current">{{ formatMonthLabel(selectedMonth) }}</span>
            </div>
            <div class="date-dropdown-body">
              <input
                :value="selectedMonth"
                type="month"
                class="mobile-date-input"
                @input="onMonthInput($event.target.value)"
                @change="onMonthChange"
              />
            </div>
            <div class="date-dropdown-quick">
              <button
                type="button"
                class="quick-month-btn"
                title="Mês anterior"
                @click="changeMonth(-1)"
              >
                <font-awesome-icon icon="chevron-left" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                class="quick-month-btn current"
                title="Ir para o mês atual"
                @click="goToCurrentMonth"
              >
                Atual
              </button>
              <button
                type="button"
                class="quick-month-btn"
                title="Próximo mês"
                @click="changeMonth(1)"
              >
                <span>Próximo</span>
                <font-awesome-icon icon="chevron-right" />
              </button>
            </div>
          </div>
        </transition>
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
export default {
  name: 'NexoHeader',
  emits: ['new-transaction', 'reload', 'update:selectedMonth'],
  directives: {
    'click-outside': {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.body.addEventListener('click', el.clickOutsideEvent);
      },
      unmounted(el) {
        document.body.removeEventListener('click', el.clickOutsideEvent);
      },
    },
  },
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
      isDateDropdownOpen: false,
    };
  },
  methods: {
    toggleDateDropdown() {
      this.isDateDropdownOpen = !this.isDateDropdownOpen;
    },
    closeDateDropdown() {
      this.isDateDropdownOpen = false;
    },
    onMonthInput(val) {
      this.$emit('update:selectedMonth', val);
    },
    onMonthChange() {
      this.$emit('reload');
    },
    changeMonth(offset) {
      if (!this.selectedMonth) return;
      const [yearStr, monthStr] = this.selectedMonth.split('-');
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) + offset;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
      this.$emit('update:selectedMonth', formattedMonth);
      this.$emit('reload');
    },
    goToCurrentMonth() {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.$emit('update:selectedMonth', currentMonth);
      this.$emit('reload');
    },
    formatMonthLabel(monthStr) {
      if (!monthStr) return '';
      const [y, m] = monthStr.split('-');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const idx = parseInt(m, 10) - 1;
      return `${monthNames[idx] || m} de ${y}`;
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

.desktop-month-picker input {
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  box-shadow: none;
  outline: none;
  font-size: var(--fontsize-sx);
  transition: border-color var(--transition-fast);
}

.desktop-month-picker input:focus {
  border-color: var(--deep-blue);
  outline: none;
  box-shadow: none;
}

.mobile-filter-dropdown {
  display: none;
  position: relative;
}

.date-dropdown-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 1000;
  width: 260px;
  max-width: min(280px, 86vw);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.date-dropdown-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-dropdown-title {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-dropdown-current {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.mobile-date-input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  font-size: var(--fontsize-xs);
  box-sizing: border-box;
  outline: none;
  transition: border-color var(--transition-fast);
}

.mobile-date-input:focus {
  border-color: var(--deep-blue);
}

.date-dropdown-quick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  border-top: 1px solid var(--glass-border);
  padding-top: var(--space-2);
}

.quick-month-btn {
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  transition: background var(--transition-fast);
}

.quick-month-btn:hover {
  background: var(--surface-2);
}

.quick-month-btn.current {
  background: rgba(31, 39, 76, 0.08);
  font-weight: 700;
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

.primary-action:active,
.icon-btn:active {
  transform: scale(0.97);
}

.icon-btn {
  width: 40px;
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

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
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

  .mobile-filter-dropdown {
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

  .mobile-filter-dropdown {
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
