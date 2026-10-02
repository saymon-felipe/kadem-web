<template>
  <!-- Sem app aberto a janela mostra a grade de apps: o esqueleto imita os 4 cartoes. -->
  <KademSkeletonGroup v-if="!active_app" class="sk-apps" label="Abrindo Produtividade…">
    <div class="sk-app-grid">
      <div v-for="n in 4" :key="n" class="sk-app-card" :style="{ '--sk-delay': `${n * 90}ms` }">
        <KademSkeleton shape="block" :width="60" :height="60" class="sk-app-icon" />
        <div class="sk-line-box sk-title-box">
          <KademSkeleton :width="`${n % 2 ? 56 : 44}%`" :height="13" />
        </div>
        <div class="sk-line-box sk-subtitle-box">
          <KademSkeleton :width="`${n % 2 ? 80 : 68}%`" :height="10" />
        </div>
      </div>
    </div>
  </KademSkeletonGroup>

  <!-- Com um app salvo (reaberto apos F5) ele monta logo depois e traz o esqueleto dos proprios dados. -->
  <div v-else class="sk-opening">
    <KademLoader size="lg" :title="`Abrindo ${app_name}…`" />
  </div>
</template>

<script>
import { mapState } from "pinia";
import { usePlayerStore } from "@/stores/player";
import KademSkeleton from "@/components/ui/KademSkeleton.vue";
import KademSkeletonGroup from "@/components/ui/KademSkeletonGroup.vue";
import KademLoader from "@/components/ui/KademLoader.vue";

const APP_NAMES = {
  radio_flow: "Radio Flow",
  kadem_nexo: "Kadem Nexo",
  kadem_health: "Kadem Health",
};

// loadingComponent da janela de Produtividade enquanto o chunk dela baixa.
export default {
  name: "ProductivityWindowSkeleton",
  components: { KademSkeleton, KademSkeletonGroup, KademLoader },
  computed: {
    ...mapState(usePlayerStore, ["active_app"]),
    app_name() {
      return APP_NAMES[this.active_app] || "aplicativo";
    },
  },
};
</script>

<style scoped>
.sk-apps,
.sk-opening {
  height: 100%;
  padding: var(--space-4);
  overflow: hidden;
}

.sk-opening {
  display: grid;
  place-items: center;
}

/* Mesma grade e casca do .app-grid / .app-card real. */
.sk-app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-5);
}

.sk-app-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.sk-app-card .sk-app-icon {
  --sk-radius: var(--radius-lg);
}

/* Caixas com a altura de linha do titulo/subtitulo reais, para o cartao ter a mesma altura. */
.sk-line-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.sk-title-box {
  height: 24px;
}

.sk-subtitle-box {
  height: 20px;
}
</style>
