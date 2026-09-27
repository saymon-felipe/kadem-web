<template>
  <BaseModal
    :model-value="visible"
    :title="title"
    size="md"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    :handle-mobile-back="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="sec-form">
      <p>{{ description }}</p>

      <ul class="codes-grid" :aria-label="title">
        <li v-for="code in codes" :key="code">{{ code }}</li>
      </ul>

      <div class="codes-tools">
        <button type="button" class="sec-btn" @click="copyCodes">
          <font-awesome-icon :icon="copied ? 'check' : 'copy'" />
          {{ copied ? "Copiado" : "Copiar" }}
        </button>
        <button type="button" class="sec-btn" @click="downloadCodes">
          <font-awesome-icon icon="download" />
          Baixar .txt
        </button>
      </div>

      <label class="codes-ack">
        <input v-model="acknowledged" type="checkbox" />
        <span>Guardei estes códigos em um lugar seguro.</span>
      </label>
    </div>

    <template #footer>
      <div class="codes-footer">
        <button type="button" class="sec-btn primary" :disabled="!acknowledged" @click="close">Concluir</button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import "./security.css";

const REVEAL_DELAY_MS = 350;
const DOWNLOAD_NAME = "kadem-codigos-de-backup.txt";
const DOWNLOAD_HEADER = "Kadem - códigos de backup da verificação em duas etapas\nCada código funciona uma única vez.";

// Os códigos só existem em texto puro aqui: o servidor guarda apenas o hash e não consegue mostrá-los de novo.
export default {
  name: "RecoveryCodesModal",
  components: { BaseModal },
  props: {
    modelValue: { type: Boolean, default: false },
    codes: { type: Array, default: () => [] },
    title: { type: String, default: "Guarde seus códigos de backup" },
    description: {
      type: String,
      default:
        "Se você perder o acesso ao seu app autenticador ou ao celular, cada um destes códigos permite entrar uma vez. "
        + "Eles não serão exibidos novamente.",
    },
  },
  emits: ["update:modelValue", "closed"],
  data() {
    return { visible: false, acknowledged: false, copied: false, revealTimer: null };
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(open) {
        clearTimeout(this.revealTimer);

        if (!open) {
          this.visible = false;
          return;
        }

        this.acknowledged = false;
        this.copied = false;
        // Costuma abrir logo depois de outro modal fechar. O BaseModal desfaz o histórico do modal que fechou com
        // history.back() (assíncrono) e o popstate resultante fecharia ESTE modal, que já estaria no topo da pilha.
        // Esperar o popstate passar evita que os códigos, exibidos uma única vez, sumam sem serem vistos.
        this.revealTimer = setTimeout(() => {
          this.visible = this.modelValue;
        }, REVEAL_DELAY_MS);
      },
    },
  },
  beforeUnmount() {
    clearTimeout(this.revealTimer);
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
      this.$emit("closed");
    },
    async copyCodes() {
      try {
        await navigator.clipboard.writeText(this.codes.join("\n"));
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch {
        this.copied = false;
      }
    },
    downloadCodes() {
      const content = `${DOWNLOAD_HEADER}\n\n${this.codes.join("\n")}\n`;
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = DOWNLOAD_NAME;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.codes-grid {
  list-style: none;
  margin: var(--space-3) 0;
  padding: var(--space-5);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-5);
  background: var(--surface-1);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
}

.codes-grid li {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--fontsize-sx);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  text-align: center;
  user-select: all;
  overflow-wrap: anywhere;
}

.codes-tools {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.codes-ack {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  cursor: pointer;
}

.codes-ack input[type="checkbox"] {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  box-shadow: none;
  border: none;
  background: transparent;
  accent-color: var(--blue);
}

.codes-footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
}
</style>
