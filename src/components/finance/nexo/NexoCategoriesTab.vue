<template>
  <section class="panel categories-panel">
    <div class="panel-title">
      <h3>Categorias</h3>
      <div class="inline-actions">
        <button class="text-btn" @click="$emit('new-macro')">
          <font-awesome-icon icon="layer-group" />
          Macro categoria
        </button>
        <button class="primary-action compact" @click="$emit('new-category')">
          <font-awesome-icon icon="plus" />
          Categoria
        </button>
      </div>
    </div>

    <div class="category-filter">
      <font-awesome-icon icon="magnifying-glass" />
      <div class="form-group">
        <input
          id="filtrar-categorias"
          :value="categorySearch"
          type="search"
          placeholder=" "
          @input="$emit('update:categorySearch', $event.target.value)"
        />
        <label for="filtrar-categorias">Filtrar categorias</label>
      </div>
    </div>

    <div class="macro-groups">
      <section
        v-for="group in groupedCategories"
        :key="group.id || group.name"
        class="macro-group"
        :style="budgetGroupStyle({ macro_color: group.color })"
      >
        <header :style="budgetGroupHeaderStyle({ macro_color: group.color })">
          <div class="macro-heading">
            <span class="swatch" :style="{ background: group.color || '#999999' }"></span>
            <div>
              <h4>{{ group.name }}</h4>
              <span>
                {{ group.items.length }}
                {{ group.items.length === 1 ? 'categoria' : 'categorias' }}
              </span>
            </div>
          </div>
          <div class="row-actions">
            <button class="icon-btn small" title="Editar macro" @click="$emit('edit-macro', group)">
              <font-awesome-icon icon="pen" />
            </button>
            <button
              class="icon-btn small danger"
              title="Excluir macro"
              @click="$emit('delete-macro', group)"
            >
              <font-awesome-icon icon="trash" />
            </button>
          </div>
        </header>
        <div class="category-grid">
          <article
            v-for="category in group.items"
            :key="category.local_id || category.id"
            class="category-card"
          >
            <span class="swatch" :style="{ background: category.color || '#999999' }"></span>
            <font-awesome-icon :icon="category.icon || 'tag'" class="category-icon" />
            <div>
              <strong>{{ category.name }}</strong>
              <small>{{ typeLabel(category.type) }}</small>
            </div>
            <div class="row-actions">
              <button
                class="icon-btn small"
                title="Editar"
                @click="$emit('edit-category', category)"
              >
                <font-awesome-icon icon="pen" />
              </button>
              <button
                class="icon-btn small danger"
                title="Excluir"
                @click="$emit('delete-category', category)"
              >
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </article>
        </div>
      </section>
      <p v-if="filteredCategories.length === 0" class="empty-line">Nenhuma categoria encontrada.</p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NexoCategoriesTab',
  emits: [
    'delete-category',
    'delete-macro',
    'edit-category',
    'edit-macro',
    'new-category',
    'new-macro',
    'update:categorySearch',
  ],
  props: {
    groupedCategories: {
      type: Array,
      required: true,
    },
    filteredCategories: {
      type: Array,
      required: true,
    },
    categorySearch: {
      type: String,
      default: '',
    },
    typeLabel: {
      type: Function,
      required: true,
    },
    budgetGroupStyle: {
      type: Function,
      required: true,
    },
    budgetGroupHeaderStyle: {
      type: Function,
      required: true,
    },
  },
}
</script>

<style scoped>
.panel,
.category-card {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel {
  padding: var(--space-5);
  min-height: 0;
}

.panel-title,
.inline-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel-title {
  margin-bottom: var(--space-5);
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel-title h3,
.macro-group h4 {
  margin: 0;
}

.inline-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.macro-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.macro-group {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-left: 4px solid var(--budget-macro-color, var(--glass-border));
  transition: background var(--transition-base);
}

.macro-group header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base);
}

.macro-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.macro-group header span,
.category-card small,
.empty-line {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.category-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) !important;
  background: var(--surface-1) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--shadow-xs) !important;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast) !important;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card) !important;
  background: var(--surface-2) !important;
}

.category-card div {
  min-width: 0;
}

.category-card strong,
.category-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.category-card .row-actions {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
  opacity: 0.4;
  transition: opacity var(--transition-fast);
}

.category-card:hover .row-actions {
  opacity: 1;
}

.category-card button {
  margin-left: initial !important;
}

.category-filter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 42px;
  margin-bottom: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  padding: 0 var(--space-3);
  transition: background var(--transition-base);
}

.category-filter input {
  min-width: 0;
  width: 100%;
  height: 40px;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
  color: var(--text-primary);
  padding: 0;
}

.category-icon {
  color: var(--text-primary);
  width: 18px;
  opacity: 0.7;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.primary-action,
.text-btn,
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

.primary-action.compact {
  min-height: 36px;
}

.text-btn {
  background: transparent;
  padding: 0 var(--space-3);
}

.icon-btn {
  width: 40px;
  background: var(--surface-2);
}

.icon-btn.small {
  width: 34px;
  min-height: 34px;
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.text-btn:hover,
.icon-btn:hover {
  background: var(--dark-yellow-2);
}

.icon-btn.danger:hover {
  background: var(--red-high);
  color: var(--red);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .panel {
    padding: var(--space-4);
  }

  .category-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
