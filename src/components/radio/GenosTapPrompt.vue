<template>
  <Transition name="genos-tap">
    <div
      v-if="visible"
      class="genos-tap"
      role="button"
      tabindex="0"
      aria-live="assertive"
      @pointerdown.prevent="tap"
      @keydown.enter.prevent="tap"
      @keydown.space.prevent="tap"
    >
      <div class="genos-tap__pulse" aria-hidden="true"></div>
      <p class="genos-tap__title">Toque em qualquer parte da tela</p>
      <p v-if="track_title" class="genos-tap__track">{{ track_title }}</p>
      <p class="genos-tap__hint">O Android só deixa o som começar depois de um toque seu.</p>
    </div>
  </Transition>
</template>

<script>
import { usePlayerStore } from "@/stores/player";

/**
 * O Chrome só inicia som sozinho depois de uma interação da pessoa com a página. Quando o Genos pede uma música e o
 * player descobre que o início foi bloqueado (youtube_failure "needs_tap"), esta camada cobre a tela com um aviso
 * grande: qualquer toque conta como a interação e já dá play, sem procurar o botão.
 */
export default {
  name: "GenosTapPrompt",
  computed: {
    player() {
      return usePlayerStore();
    },
    visible() {
      return this.player.genos_tap_prompt && this.player.youtube_failure?.reason === "needs_tap";
    },
    track_title() {
      return this.player.current_music?.title || "";
    },
  },
  methods: {
    tap() {
      const player = this.player;
      player.genos_tap_prompt = false;
      player.youtube_failure = null;
      // O toque já é a interação que o Chrome pedia: o play acontece dentro dele.
      if (!player.is_playing) void player.toggle_play();
    },
  },
};
</script>

<style scoped>
.genos-tap {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 32px;
  text-align: center;
  color: #fff;
  background: rgba(8, 10, 20, 0.92);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}

.genos-tap__pulse {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle, #8ab4ff 0%, #3a6df0 70%);
  animation: genos-tap-pulse 1.4s ease-in-out infinite;
}

.genos-tap__title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}

.genos-tap__track {
  margin: 0;
  max-width: 90vw;
  font-size: 20px;
  font-weight: 600;
  opacity: 0.95;
}

.genos-tap__hint {
  margin: 0;
  max-width: 80vw;
  font-size: 16px;
  opacity: 0.75;
}

.genos-tap-enter-active,
.genos-tap-leave-active {
  transition: opacity 0.2s ease;
}

.genos-tap-enter-from,
.genos-tap-leave-to {
  opacity: 0;
}

@keyframes genos-tap-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.12); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .genos-tap__pulse { animation: none; }
}
</style>
