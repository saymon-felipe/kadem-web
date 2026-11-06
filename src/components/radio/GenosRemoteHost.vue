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
import { useAppStore } from "@/stores/app";
import {
  genos_failure_message,
  has_genos_query,
  parse_genos_command,
  strip_genos_query,
} from "@/utils/genos_command";

/** Recebe os comandos do Genos que chegam na URL de abertura do PWA (ver services/genosRemote.js). */
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
    async run(command) {
      if (this.running) return;
      this.running = true;
      try {
        const result = await genosRemote.run(command);
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
