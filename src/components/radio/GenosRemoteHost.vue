<template>
  <ConfirmationModal
    v-model="confirm_open"
    message="Permitir que o Genos controle o Radio Flow?"
    description="O Genos, seu app de voz neste celular, poderá abrir o Kadem e tocar suas playlists e músicas, inclusive as baixadas, quando você pedir. A permissão fica só neste aparelho."
    confirm-text="Permitir"
    cancel-text="Agora não"
    @confirmed="allow"
    @cancelled="deny"
  />
</template>

<script>
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import { genosRemote } from "@/services/genosRemote";
import { radioFlowApi } from "@/services/radioFlowApi";
import { record_player_event } from "@/services/playerDiagnostics";
import { useAppStore } from "@/stores/app";
import {
  genos_failure_message,
  has_genos_query,
  parse_genos_command,
  strip_genos_query,
} from "@/utils/genos_command";

const CHANNEL = "kadem-genos-remote";

/**
 * Recebe os comandos do Genos que chegam na URL de abertura do PWA (ver services/genosRemote.js).
 * No Android cada abertura pelo Genos pode criar outra página do Kadem: a página que recebe o comando avisa as
 * outras, que pausam o player e, se estiverem escondidas, se fecham, para não sobrar mais de um Kadem tocando.
 */
export default {
  name: "GenosRemoteHost",
  components: { ConfirmationModal },
  data() {
    return {
      confirm_open: false,
      pending: null,
      running: false,
    };
  },
  created() {
    this.page_id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    if (typeof BroadcastChannel === "function") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event) => this.on_channel_message(event.data);
    }
  },
  beforeUnmount() {
    this.channel?.close();
    this.channel = null;
  },
  watch: {
    "$route.query": {
      handler(query) {
        this.consume(query);
      },
      immediate: true,
    },
  },
  methods: {
    consume(query) {
      if (!has_genos_query(query)) return;
      const command = parse_genos_command(query);
      // A URL perde o comando (e a chave) assim que ele é lido.
      this.$router.replace({ query: strip_genos_query(query) });

      if (!command) {
        this.toast("O comando do Genos não pôde ser lido.", "error");
        return;
      }
      if (!genosRemote.claim_nonce(command.nonce)) return;

      if (genosRemote.is_authorized(command.key)) {
        void this.run(command);
      } else {
        this.pending = command;
        this.confirm_open = true;
      }
    },
    allow() {
      const command = this.pending;
      this.pending = null;
      this.confirm_open = false;
      if (!command) return;
      genosRemote.authorize(command.key);
      void this.run(command);
    },
    deny() {
      this.pending = null;
      this.confirm_open = false;
    },
    on_channel_message(message) {
      if (message?.type !== "took-over" || message.page_id === this.page_id) return;
      record_player_event("genos:took-over", { from: message.page_id });
      void radioFlowApi.pause();
      if (document.visibilityState === "hidden") {
        // Só fecha se o navegador deixar (página aberta pelo Android, sem histórico); senão fica pausada.
        setTimeout(() => { try { window.close(); } catch { /* fechamento recusado */ } }, 300);
      }
    },
    async run(command) {
      if (this.running) return;
      this.running = true;
      this.channel?.postMessage({ type: "took-over", page_id: this.page_id });
      try {
        record_player_event("genos:command", { kind: command.kind });
        const result = await genosRemote.run(command);
        record_player_event("genos:result", { ok: result.ok, reason: result.reason || "" });
        if (result.ok) {
          this.toast(result.title ? `Genos: tocando ${result.title}.` : "Genos: tocando.", "success");
        } else {
          this.toast(genos_failure_message(result.reason, result.name || command.name), "error");
        }
      } finally {
        this.running = false;
      }
    },
    toast(message, type) {
      useAppStore().showToast({ message, type, duration: 5000 });
    },
  },
};
</script>
