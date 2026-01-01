<template>
  <transition name="menu-pop">
    <div v-if="modelValue" class="options-backdrop" @click.self="close">
      <div class="options-menu" :style="position_style">
        <button class="menu-item option-red" @click="$emit('delete')">
          <font-awesome-icon icon="trash-can" />
          <span>Excluir</span>
        </button>

        <button
          class="menu-item"
          @click="!isInQueue && $emit('add-queue')"
          :class="{ 'disabled-item': isInQueue }"
          :disabled="isInQueue"
        >
          <font-awesome-icon
            :icon="isInQueue ? 'check' : 'plus'"
            :class="{ 'success-icon': isInQueue }"
          />
          <span>{{ isInQueue ? "Na fila" : "Adicionar à fila" }}</span>
        </button>

        <button class="menu-item" @click="$emit('copy-link')">
          <font-awesome-icon icon="link" />
          <span>Copiar link</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    modelValue: { type: Boolean, required: true },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    isInQueue: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "delete", "add-queue", "copy-link"],
  computed: {
    position_style() {
      return {
        top: `${this.position.y}px`,
        left: `${this.position.x - 150}px`,
      };
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
  },
};
</script>

<style scoped>
.options-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: transparent;
}

.options-menu {
  position: absolute;
  width: 180px;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.disabled-item {
  cursor: default !important;
  color: var(--gray-400) !important;
  background: none !important;
}

.success-icon {
  color: var(--green);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--deep-blue);
  transition: background 0.1s;
  font-size: 0.9rem;
}

.menu-item:hover {
  background: var(--background-gray);
}

.option-red {
  color: var(--red);
}

/* --- Animação Menu Pop --- */
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.2s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
}

.menu-pop-enter-active .options-menu,
.menu-pop-leave-active .options-menu {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.menu-pop-enter-from .options-menu,
.menu-pop-leave-to .options-menu {
  transform: scale(0.8) translateY(-10px);
}
</style>
