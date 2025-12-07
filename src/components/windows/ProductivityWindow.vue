<template>
  <div class="productivity-container">
    <transition name="app-switch" mode="out-in" appear>
      <div v-if="!active_app" class="app-grid" key="grid">
        <div class="app-card" @click="open_app('radio_flow')">
          <div class="icon-wrapper gradient-orange">
            <font-awesome-icon icon="music" />
          </div>
          <span>Radio Flow</span>
          <p>Sua música, em qualquer lugar.</p>
        </div>

        <div class="app-card disabled">
          <div class="icon-wrapper gradient-gray">
            <font-awesome-icon icon="list-check" />
          </div>
          <span>Kadem Tasks</span>
          <p>Em breve.</p>
        </div>
      </div>

      <div v-else class="active-app-view" key="app">
        <button class="back-btn" @click="close_app">
          <font-awesome-icon icon="arrow-left" /> Voltar
        </button>
        <component :is="apps[active_app]" />
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useWindowStore } from "@/stores/windows"; // Necessário para verificar estado da janela
import RadioFlow from "../radio/RadioFlow.vue";

export default {
  components: { RadioFlow },
  props: ["windowId"], // Recebe o ID da janela do BaseWindow
  data() {
    return {
      apps: {
        radio_flow: "RadioFlow",
      },
    };
  },
  computed: {
    ...mapState(usePlayerStore, ["active_app"]),
  },
  methods: {
    ...mapActions(usePlayerStore, ["setActiveApp"]),

    open_app(app_key) {
      this.setActiveApp(app_key);
    },
    close_app() {
      this.setActiveApp(null);
    },
  },
  beforeUnmount() {
    const windowStore = useWindowStore();

    if (!windowStore.currentUserWindows[this.windowId]) {
      this.setActiveApp(null);
    }
  },
};
</script>

<style scoped>
.productivity-container {
  height: 100%;
  padding: var(--space-4);
  overflow: hidden;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-5);
}

.app-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  border: 1px solid transparent;
}

.app-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.app-card:active {
  transform: scale(0.98);
}

.app-card.disabled {
  opacity: 0.6;
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
.gradient-gray {
  background: var(--gray-300);
}

/* App View */
.active-app-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--deep-blue);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-5);
  width: fit-content;
  transition: transform 0.2s;
}
.back-btn:hover {
  transform: translateX(-4px);
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
