<template>
  <div class="productivity-container">
    <transition
      name="app-switch"
      mode="out-in"
      appear
      @before-leave="detach_grid_from_flow"
      @after-leave="reveal_active_app"
    >
      <div v-if="!active_app" class="app-grid" key="grid">
        <div class="app-card" @click="open_app('radio_flow')">
          <div class="icon-wrapper gradient-orange">
            <font-awesome-icon icon="music" />
          </div>
          <span>Radio Flow</span>
          <p>Sua música, em qualquer lugar.</p>
        </div>

        <div class="app-card" @click="open_app('kadem_nexo')">
          <div class="icon-wrapper gradient-blue">
            <font-awesome-icon icon="chart-simple" />
          </div>
          <span>Nexo</span>
          <p>Gerenciamento de finanças</p>
        </div>

        <div class="app-card disabled">
          <div class="icon-wrapper gradient-gray">
            <font-awesome-icon icon="list-check" />
          </div>
          <span>Time Manager</span>
          <p>Em breve.</p>
        </div>
      </div>

    </transition>

    <div
      v-show="active_app"
      class="active-app-view"
      :class="{ 'is-visible': is_app_view_visible }"
    >
      <button class="back-btn" @click="close_app">
        <font-awesome-icon icon="arrow-left" /> Voltar
      </button>

      <RadioFlow
        v-if="has_opened_radio"
        v-show="active_app === 'radio_flow'"
      />
      <KademNexo v-if="active_app === 'kadem_nexo'" />
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useWindowStore } from "@/stores/windows"; // Necessário para verificar estado da janela
import RadioFlow from "../radio/RadioFlow.vue";
import KademNexo from "../finance/KademNexo.vue";

export default {
  components: { RadioFlow, KademNexo },
  props: ["windowId"], // Recebe o ID da janela do BaseWindow
  data() {
    return {
      has_opened_radio: false,
      is_app_view_visible: false,
    };
  },
  computed: {
    ...mapState(usePlayerStore, ["active_app"]),
  },
  methods: {
    ...mapActions(usePlayerStore, ["setActiveApp"]),

    open_app(app_key) {
      if (app_key === "radio_flow") {
        this.has_opened_radio = true;
      }
      this.setActiveApp(app_key);
    },
    close_app() {
      this.is_app_view_visible = false;
      this.setActiveApp(null);
    },
    detach_grid_from_flow(element) {
      const { width, height } = element.getBoundingClientRect();
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.classList.add("is-leaving-app-grid");
    },
    reveal_active_app() {
      if (!this.active_app) return;
      this.$nextTick(() => {
        this.is_app_view_visible = true;
      });
    },
  },
  beforeUnmount() {
    const windowStore = useWindowStore();

    if (!windowStore.currentUserWindows[this.windowId]) {
      this.setActiveApp(null);
    }
  },
  mounted() {
    if (this.active_app === "radio_flow") {
      this.has_opened_radio = true;
    }
    if (this.active_app) {
      this.$nextTick(() => {
        this.is_app_view_visible = true;
      });
    }
  },
};
</script>

<style scoped>
.productivity-container {
  position: relative;
  height: 100%;
  padding: var(--space-4);
  overflow: hidden;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-5);
}

/* Durante a transição de saída o grid ainda está montado. Tiramos ele do
   fluxo para que a visão do app não seja empurrada para baixo. */
.app-grid.is-leaving-app-grid {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
}

.app-card {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  color: var(--text-primary);
}

.app-card span {
  font-weight: 600;
  color: var(--text-primary);
}

.app-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.app-card:hover {
  background: var(--surface-3);
  border-color: var(--color-info);
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
}

.app-card:active {
  transform: scale(0.98);
}

.app-card.disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

/* Ícones */
.icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}
.gradient-orange {
  background: var(--yellow-gradient);
}
.gradient-blue {
  background: var(--deep-blue-gradient-right);
}
.gradient-gray {
  background: var(--gray-300);
}

/* App View */
.active-app-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.active-app-view.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-5);
  width: fit-content;
  transition: transform 0.2s, color 0.2s;
}
.back-btn:hover {
  transform: translateX(-4px);
  color: var(--color-info);
}

/* --- ANIMAÇÕES --- */
.app-switch-enter-active,
.app-switch-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-switch-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.app-switch-leave-to {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(4px);
}
</style>
