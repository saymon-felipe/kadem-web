<template>
  <div class="status-dropdown-wrapper" v-click-outside="close_dropdown">
    <button
      class="status-trigger"
      @click="toggle_dropdown"
      :class="{ disabled: !is_admin }"
      :disabled="!is_admin"
      :title="
        !is_admin ? 'Apenas administradores podem alterar o status' : 'Alterar status'
      "
    >
      <span class="status-dot" :class="current_status_obj.color_class"></span>
      <span class="status-label">{{ current_status_obj.label }}</span>
      <font-awesome-icon v-if="is_admin" icon="chevron-down" class="chevron-icon" />
    </button>

    <transition name="fade">
      <div v-if="is_open && is_admin" class="dropdown-content">
        <ul>
          <li
            v-for="(status, key) in available_statuses"
            :key="key"
            @click="select_status(key)"
            :class="{ selected: modelValue === key }"
          >
            <span class="status-dot" :class="status.color_class"></span>
            <span>{{ status.label }}</span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: "ProjectStatusDropdown",
  props: {
    modelValue: {
      type: String,
      required: true,
      validator: (value) =>
        ["em_andamento", "em_risco", "em_espera", "cancelado"].includes(value),
    },
    is_admin: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "change"],
  data() {
    return {
      is_open: false,
      available_statuses: {
        em_andamento: { label: "Em Andamento", color_class: "bg-green" },
        em_risco: { label: "Em Risco", color_class: "bg-red" },
        em_espera: { label: "Em Espera", color_class: "bg-yellow" },
        cancelado: { label: "Cancelado", color_class: "bg-gray" },
      },
    };
  },
  computed: {
    current_status_obj() {
      return (
        this.available_statuses[this.modelValue] ||
        this.available_statuses["em_andamento"]
      );
    },
  },
  methods: {
    toggle_dropdown() {
      if (this.is_admin) {
        this.is_open = !this.is_open;
      }
    },
    close_dropdown() {
      this.is_open = false;
    },
    select_status(key) {
      if (this.modelValue !== key) {
        this.$emit("update:modelValue", key);
        this.$emit("change", key);
      }
      this.close_dropdown();
    },
  },
  directives: {
    "click-outside": {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.body.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.body.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },
};
</script>

<style scoped>
.status-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.status-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  font-weight: 600;
  backdrop-filter: var(--glass-blur);
}

.status-trigger:hover:not(.disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}

.status-trigger.disabled {
  cursor: not-allowed;
  opacity: 0.8;
  background: rgba(0, 0, 0, 0.05);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chevron-icon {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 4px;
}

.dropdown-content {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  min-width: 160px;
  z-index: 200;
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.dropdown-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dropdown-content li {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  transition: background 0.15s, color 0.15s;
}

.dropdown-content li:hover {
  background: var(--surface-3);
}

.dropdown-content li.selected {
  background: var(--surface-3);
  font-weight: 700;
  border-left: 3px solid var(--color-info);
  padding-left: 9px;
}

.status-label {
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
