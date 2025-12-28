<template>
  <div class="logout-view">
    <img
      src="@/assets/images/icons/system.png"
      alt="Logo"
      class="logo"
      :class="{ visible: isLogoVisible }"
    />
    <Transition name="fade-text" mode="out-in">
      <p class="status-text" :key="currentPhrase">
        {{ currentPhrase }}
      </p>
    </Transition>
  </div>
</template>

<script>
import { mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";

const TOTAL_DURATION = 5000;
const PHRASE_DURATION = 1500;
const LOGO_FADE_IN_TIME = 2000;

export default {
  name: "LogoutView",
  data() {
    return {
      isLogoVisible: false,
      currentPhraseIndex: 0,
      phrases: ["Encerrando sessão...", "Desconectando...", "El Psy Congroo!"],
      phraseInterval: null,
      redirectTimeout: null,
    };
  },
  computed: {
    currentPhrase() {
      return this.phrases[this.currentPhraseIndex];
    },
  },
  methods: {
    ...mapActions(useAuthStore, ["logout"]),
    startLogoutSequence() {
      this.phraseInterval = setInterval(() => {
        this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.phrases.length;
      }, PHRASE_DURATION);

      setTimeout(() => {
        this.isLogoVisible = true;
      }, LOGO_FADE_IN_TIME);

      this.redirectTimeout = setTimeout(() => {
        this.logout();
      }, TOTAL_DURATION);
    },
    cleanupTimers() {
      if (this.phraseInterval) {
        clearInterval(this.phraseInterval);
      }
      if (this.redirectTimeout) {
        clearTimeout(this.redirectTimeout);
      }
    },
  },
  mounted() {
    this.startLogoutSequence();
  },
  beforeUnmount() {
    this.cleanupTimers();
  },
};
</script>

<style scoped>
.logout-view {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  background-image: var(--yellow-gradient);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo {
  width: 150px;
  max-width: 40%;
  height: auto;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 1s ease-out, transform 1s ease-out;
  filter: drop-shadow(0px 2px 8px rgba(0, 0, 0, 0.3));
}

.logo.visible {
  opacity: 1;
  transform: scale(1);
}

.status-text {
  color: var(--white);
  font-size: var(--fontsize-md);
  margin-top: var(--space-8);
  font-weight: 400;
  position: absolute;
  bottom: 30%;
}

.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.4s ease;
}

.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>
