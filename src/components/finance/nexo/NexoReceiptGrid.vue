<template>
  <div class="receipt-grid-wrap">
    <table class="receipt-grid" :aria-label="label">
      <thead>
        <tr>
          <th v-for="column in orderedColumns" :key="column.key"
            :class="{ numeric: column.numeric, dragging: dragging === column.key }"
            :aria-sort="sortKey === column.key && sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
            draggable="true" @dragstart="startDrag($event, column.key)" @dragend="dragging = null"
            @dragover.prevent @drop.prevent="dropColumn(column.key)">
            <button type="button" class="column-heading"
              :title="`${column.label}: arraste para mover a coluna${column.sortable === false ? '' : '; clique para ordenar'}. Alt + setas também move a coluna.`"
              @click="toggleSort(column)" @keydown.alt.left.prevent="shiftColumn(column.key, -1)"
              @keydown.alt.right.prevent="shiftColumn(column.key, 1)">
              {{ column.label }}
              <span v-if="sortKey === column.key && sortDirection" aria-hidden="true">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in sortedRows" :key="row[rowKey] ?? index">
          <td v-for="column in orderedColumns" :key="column.key" :class="{ numeric: column.numeric }">
            <slot :name="column.key" :row="row">{{ row[column.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { orderedReceiptColumns, moveReceiptColumn, sortReceiptRows } from '@/utils/receiptGrid';
export default {
  name: 'NexoReceiptGrid',
  props: {
    columns: { type: Array, required: true }, rows: { type: Array, required: true },
    columnOrder: { type: Array, default: () => [] }, rowKey: { type: String, default: 'id' },
    label: { type: String, required: true },
  },
  emits: ['update:columnOrder'],
  data: () => ({ sortKey: null, sortDirection: null, dragging: null }),
  computed: {
    orderedColumns() { return orderedReceiptColumns(this.columns, this.columnOrder); },
    sortedRows() { return sortReceiptRows(this.rows, this.columns.find((column) => column.key === this.sortKey), this.sortDirection); },
  },
  methods: {
    toggleSort(column) {
      if (column.sortable === false) return;
      this.sortDirection = this.sortKey !== column.key ? 'asc' : this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
      this.sortKey = column.key;
    },
    startDrag(event, key) { this.dragging = key; event.dataTransfer?.setData('text/plain', key); },
    dropColumn(key) {
      if (!this.dragging) return;
      this.$emit('update:columnOrder', moveReceiptColumn(this.orderedColumns.map((column) => column.key), this.dragging, key));
      this.dragging = null;
    },
    shiftColumn(key, offset) {
      const order = this.orderedColumns.map((column) => column.key);
      const target = order[order.indexOf(key) + offset];
      if (target) this.$emit('update:columnOrder', moveReceiptColumn(order, key, target));
    },
  },
};
</script>

<style scoped>
.receipt-grid-wrap { overflow-x: auto; border: 1px solid var(--glass-border); border-radius: 8px; }
.receipt-grid { width: 100%; border-collapse: collapse; text-align: left; color: var(--text-primary); font-size: .82rem; }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--glass-border); vertical-align: middle; }
th { background: var(--surface-2); color: var(--text-secondary); cursor: grab; }
th.dragging { opacity: .5; }
tbody tr:last-child td { border-bottom: 0; }
.column-heading { display: inline-flex; align-items: center; gap: 6px; padding: 4px 0; background: none; border: 0; color: inherit; font: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
.column-heading:focus-visible { outline: 2px solid var(--color-primary, #818cf8); outline-offset: 3px; border-radius: 3px; }
.numeric { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
