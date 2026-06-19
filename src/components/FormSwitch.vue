<template>
  <button
    :id="id"
    type="button"
    class="form-switch"
    :class="{ checked: modelValue, disabled }"
    role="switch"
    :aria-checked="String(modelValue)"
    :aria-disabled="String(disabled)"
    @click="toggle"
  >
    <span class="form-switch-track">
      <span class="form-switch-thumb"></span>
    </span>
  </button>
</template>

<script>
export default {
  name: 'FormSwitch',
  props: {
    id: {
      type: String,
      default: null,
    },
    modelValue: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  methods: {
    toggle() {
      if (this.disabled) return
      this.$emit('update:modelValue', !this.modelValue)
    },
  },
}
</script>

<style scoped>
.form-switch {
  --switch-width: 50px;
  --switch-height: 30px;
  --switch-padding: 3px;
  --thumb-size: 24px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: var(--switch-width);
  min-width: var(--switch-width);
  height: var(--switch-height);
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  background: var(--surface-1);
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.form-switch:hover {
  border-color: rgba(31, 39, 76, 0.26);
}

.form-switch:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(53, 90, 253, 0.18),
    inset 0 1px 1px rgba(0, 0, 0, 0.04);
}

.form-switch:active {
  transform: scale(0.98);
}

.form-switch-track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.form-switch-thumb {
  position: absolute;
  top: 50%;
  left: var(--switch-padding);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 242, 255, 0.94));
  box-shadow:
    0 6px 16px rgba(10, 16, 41, 0.18),
    0 1px 2px rgba(10, 16, 41, 0.16);
  transform: translate(0, -50%);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.form-switch.checked {
  background:
    linear-gradient(135deg, rgba(53, 90, 253, 0.24), rgba(42, 199, 154, 0.22)),
    var(--surface-1);
  border-color: rgba(53, 90, 253, 0.34);
}

.form-switch.checked .form-switch-thumb {
  transform: translate(calc(var(--switch-width) - var(--thumb-size) - (var(--switch-padding) * 2)), -50%);
  background: linear-gradient(180deg, #ffffff, #eef3ff);
  box-shadow:
    0 8px 18px rgba(53, 90, 253, 0.24),
    0 1px 2px rgba(10, 16, 41, 0.16);
}

.form-switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-theme='dark'] .form-switch {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .form-switch.checked {
  background:
    linear-gradient(135deg, rgba(53, 90, 253, 0.36), rgba(42, 199, 154, 0.24)),
    rgba(255, 255, 255, 0.06);
  border-color: rgba(122, 144, 255, 0.4);
}

[data-theme='dark'] .form-switch-thumb {
  background: linear-gradient(180deg, #f8faff, #dbe4ff);
}
</style>
