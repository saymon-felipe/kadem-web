<template>
  <div class="health-categories-tab">
    <div class="categories-header">
      <div class="heading-copy">
        <span class="eyebrow">CONFIGURAÇÃO</span>
        <h3>Gerenciar Categorias</h3>
      </div>

      <div class="header-actions">
        <!-- Filtros -->
        <div class="filter-pills" v-if="categories.length">
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'ALL' }"
            type="button"
            @click="currentFilter = 'ALL'"
          >
            Todas ({{ categories.length }})
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'SCHEDULE' }"
            type="button"
            @click="currentFilter = 'SCHEDULE'"
          >
            <font-awesome-icon icon="calendar" />
            <span>Agendas ({{ scheduleCategories.length }})</span>
          </button>
          <button
            class="filter-pill"
            :class="{ active: currentFilter === 'SUPPLY' }"
            type="button"
            @click="currentFilter = 'SUPPLY'"
          >
            <font-awesome-icon icon="basket-shopping" />
            <span>Insumos ({{ supplyCategories.length }})</span>
          </button>
        </div>

        <button class="kadem-health-button kadem-health-button--primary kadem-health-button--compact" type="button" @click="$emit('new-category')">
          <font-awesome-icon icon="plus" />
          <span>Nova Categoria</span>
        </button>
      </div>
    </div>

    <HealthEmptyState
      v-if="!categories.length"
      icon="layer-group"
      title="Comece pelas categorias"
      text="Crie sua primeira rotina periódica ou cadastre um insumo/medicamento para acompanhar o estoque."
      action-label="Criar Primeira Categoria"
      @action="$emit('new-category')"
    />

    <div v-else class="category-grid">
      <article
        v-for="category in filteredCategories"
        :key="category.local_key"
        class="category-card"
        :class="category.kind === 'SCHEDULE' ? 'cat-schedule' : 'cat-supply'"
      >
        <div class="category-top">
          <div
            class="cat-icon"
            :class="category.kind === 'SCHEDULE' ? 'icon-schedule' : 'icon-supply'"
          >
            <font-awesome-icon :icon="category.kind === 'SCHEDULE' ? 'calendar' : 'basket-shopping'" />
          </div>
          <div class="cat-title-group">
            <span class="cat-kind-tag">
              {{ category.kind === "SCHEDULE" ? "Agenda Recorrente" : "Insumo de Estoque" }}
            </span>
            <h4>{{ category.name }}</h4>
          </div>
        </div>

        <div class="category-body">
          <template v-if="category.kind === 'SCHEDULE'">
            <div class="info-row">
              <span class="info-label">Recorrência</span>
              <strong>{{ frequencyLabel(category) }}</strong>
            </div>
            <div class="info-row">
              <span class="info-label">Próxima prevista</span>
              <strong>{{ formatDate(nextDueAt(category)) }}</strong>
            </div>
            <div v-if="linkedSupply(category)" class="info-row">
              <span class="info-label">Insumo vinculado</span>
              <span class="linked-tag">
                <font-awesome-icon icon="link" />
                {{ linkedSupply(category).name }}
              </span>
            </div>
          </template>

          <template v-else>
            <div class="info-row">
              <span class="info-label">Estoque atual</span>
              <strong>{{ formatNumber(category.current_quantity) }} {{ category.unit }}</strong>
            </div>
            <div class="info-row">
              <span class="info-label">Alerta de mínimo</span>
              <span>{{ formatNumber(category.minimum_quantity || 0) }} {{ category.unit }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="status-pill" :class="isLowStock(category) ? 'status-warning' : 'status-healthy'">
                {{ isLowStock(category) ? "Abaixo do mínimo" : "Estoque adequado" }}
              </span>
            </div>
          </template>

          <p v-if="category.notes" class="category-notes">{{ category.notes }}</p>
        </div>

        <div class="category-footer">
          <button
            v-if="!overviewCategoryKeys.includes(category.local_key)"
            class="pin-btn add"
            type="button"
            @click="$emit('add-overview', category.local_key)"
          >
            <font-awesome-icon icon="plus" />
            <span>Fixar no Overview</span>
          </button>
          <button
            v-else
            class="pin-btn active"
            type="button"
            title="Clique para desmarcar do Overview"
            @click="$emit('remove-overview', category.local_key)"
          >
            <font-awesome-icon icon="check" />
            <span>No Overview</span>
          </button>

          <!-- Ação Rápida Direta -->
          <button
            v-if="category.kind === 'SCHEDULE'"
            class="quick-icon-btn"
            type="button"
            title="Concluir esta agenda"
            @click="$emit('quick-schedule', category.local_key)"
          >
            <font-awesome-icon icon="check" />
          </button>
          <button
            v-else
            class="quick-icon-btn"
            type="button"
            title="Registrar gasto deste insumo"
            @click="$emit('quick-usage', category.local_key)"
          >
            <font-awesome-icon icon="arrow-down" />
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import HealthEmptyState from "./HealthEmptyState.vue";

export default {
  name: "HealthCategoriesTab",
  components: {
    HealthEmptyState,
  },
  props: {
    categories: {
      type: Array,
      default: () => [],
    },
    scheduleCategories: {
      type: Array,
      default: () => [],
    },
    supplyCategories: {
      type: Array,
      default: () => [],
    },
    overviewCategoryKeys: {
      type: Array,
      default: () => [],
    },
    nextDueAt: {
      type: Function,
      required: true,
    },
    linkedSupply: {
      type: Function,
      required: true,
    },
    formatNumber: {
      type: Function,
      required: true,
    },
    formatDate: {
      type: Function,
      required: true,
    },
    frequencyLabel: {
      type: Function,
      required: true,
    },
    isLowStock: {
      type: Function,
      required: true,
    },
  },
  emits: [
    "new-category",
    "add-overview",
    "remove-overview",
    "quick-schedule",
    "quick-usage",
  ],
  data() {
    return {
      currentFilter: "ALL",
    };
  },
  computed: {
    filteredCategories() {
      if (this.currentFilter === "SCHEDULE") {
        return this.scheduleCategories;
      }
      if (this.currentFilter === "SUPPLY") {
        return this.supplyCategories;
      }
      return this.categories;
    },
  },
};
</script>

<style scoped>
.health-categories-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.heading-copy h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.eyebrow {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e25373;
  margin-bottom: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: var(--space-2);
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--surface-1);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.filter-pill:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}

.filter-pill.active {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
}

.compact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  border: none;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast), filter var(--transition-fast);
}

.compact-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.category-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.category-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.cat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.icon-schedule {
  background: rgba(53, 90, 253, 0.12);
  color: var(--color-info);
}

.icon-supply {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
}

.cat-title-group {
  min-width: 0;
}

.cat-kind-tag {
  display: block;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cat-title-group h4 {
  margin: 1px 0 0;
  font-size: 1rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.category-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  padding: 3px 0;
  border-bottom: 1px dashed var(--glass-border);
}

.info-label {
  color: var(--text-secondary);
}

.linked-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-info);
  font-weight: 700;
}

.status-pill {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
}

.status-healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.status-warning {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.category-notes {
  margin: var(--space-2) 0 0;
  font-size: 0.76rem;
  color: var(--text-muted);
  font-style: italic;
}

.category-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.pin-btn {
  flex-grow: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-xs);
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid var(--glass-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pin-btn.add {
  background: var(--surface-1);
  color: var(--text-primary);
}

.pin-btn.add:hover {
  background: var(--surface-2);
}

.pin-btn.active {
  background: rgba(226, 83, 115, 0.12);
  color: #e25373;
  border-color: rgba(226, 83, 115, 0.3);
}

.pin-btn.active:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: #ef4444;
}

.quick-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-xs);
  background: var(--surface-1);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.quick-icon-btn:hover {
  background: linear-gradient(135deg, #e25373 0%, #8d5fd3 100%);
  color: #ffffff;
  border-color: transparent;
}
</style>
