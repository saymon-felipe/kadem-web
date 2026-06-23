<template>
  <main class="app-shell custom-scrollbar">
    <section v-if="localDbIssue" class="storage-repair-banner">
      <div class="storage-repair-copy">
        <strong>{{ localDbIssue.title || "Armazenamento local indisponível" }}</strong>
        <p>{{ localDbIssue.message }}</p>
      </div>

      <button class="btn btn-primary" :disabled="repairingStorage" @click="repairStorage">
        {{ repairingStorage ? "Reparando ambiente..." : "Reparar ambiente" }}
      </button>
    </section>

    <router-view />
  </main>
</template>

<script>
import { useAppStore } from "@/stores/app";
import {
  consumeLocalDbIssue,
  onLocalDbIssue,
  repairLocalEnvironment,
  rememberLocalDbIssue,
} from "@/db";

export default {
  data() {
    return {
      localDbIssue: null,
      repairingStorage: false,
      removeLocalDbIssueListener: null,
    };
  },
  created() {
    const appStore = useAppStore();
    appStore.initTheme();

    this.localDbIssue = consumeLocalDbIssue();
    this.removeLocalDbIssueListener = onLocalDbIssue((issue) => {
      this.localDbIssue = issue;
    });
  },
  beforeUnmount() {
    this.removeLocalDbIssueListener?.();
  },
  methods: {
    async repairStorage() {
      if (this.repairingStorage) {
        return;
      }

      this.repairingStorage = true;

      try {
        await repairLocalEnvironment();
      } catch (error) {
        this.localDbIssue = rememberLocalDbIssue(
          "Não foi possível concluir o reparo automático do ambiente local. Feche o navegador e tente novamente.",
          {
            type: "repair_failure",
            original_name: error?.name || "RepairError",
            original_message: error?.message || "Falha desconhecida ao reparar o ambiente.",
          },
        );
      } finally {
        this.repairingStorage = false;
      }
    },
  },
};
</script>

<style scoped>
.app-shell {
  min-height: 100dvh;
}

.storage-repair-banner {
  position: fixed;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20000;
  width: min(960px, calc(100dvw - var(--space-6)));
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(255, 243, 205, 0.96);
  border: 1px solid rgba(146, 64, 14, 0.18);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.storage-repair-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  color: #7c2d12;
}

.storage-repair-copy p {
  margin: 0;
  font-size: var(--fontsize-sm);
}

@media (max-width: 768px) {
  .storage-repair-banner {
    align-items: stretch;
    flex-direction: column;
  }

  .storage-repair-banner .btn {
    width: 100%;
  }
}
</style>
