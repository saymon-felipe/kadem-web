<template>
  <ConfirmationModal
    v-model="confirm_open"
    :message="consent.message"
    :description="consent.description"
    confirm-text="Permitir"
    cancel-text="Agora não"
    @confirmed="allow"
    @cancelled="deny"
  />
</template>

<script>
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import { genosRemote } from "@/services/genosRemote";
import { authorize_scopes, consent_text, has_scopes } from "@/services/genosAccess";
import { genosBridge } from "@/services/genosBridge/runtime";
import { record_bridge_event, reply_to_genos } from "@/services/genosBridge/reply";
import { radioFlowApi } from "@/services/radioFlowApi";
import { record_player_event } from "@/services/playerDiagnostics";
import { useAppStore } from "@/stores/app";
import { usePlayerStore } from "@/stores/player";
import {
  BRIDGE_ERRORS,
  BRIDGE_SCOPES,
  bridge_fail,
  bridge_required_scopes,
  is_bridge_query,
  parse_bridge_command,
} from "@/utils/genos_bridge";
import {
  genos_failure_message,
  has_genos_query,
  parse_genos_command,
  strip_genos_query,
} from "@/utils/genos_command";

const CHANNEL = "kadem-genos-remote";
const BRIDGE_CLOSE_GRACE_MS = 45000;

const BRIDGE_PROGRESS = {
  agenda: "Genos: consultando a Agenda…",
  health: "Genos: consultando o Health…",
  nexo: "Genos: consultando o Nexo…",
};

/**
 * Recebe os comandos do Genos que chegam na URL de abertura do PWA (ver services/genosRemote.js).
 * No Android cada abertura pelo Genos pode criar outra página do Kadem: a página que recebe o comando avisa as
 * outras, que pausam o player e, se estiverem escondidas, se fecham, para não sobrar mais de um Kadem tocando.
 *
 * Pedidos da ponte (Agenda, Health e Nexo) executam nos dados locais e devolvem o resultado ao Genos por um servidor
 * local do celular (services/genosBridge); não tocam o player. A página aberta só para isso se fecha sozinha depois
 * que o Genos devolve a tela anterior, se ninguém a usou e nada toca nela.
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
  computed: {
    consent() {
      if (this.pending?.action === "bridge") {
        return { message: "Permitir que o Genos use a Agenda, o Health e o Nexo?", description: consent_text(BRIDGE_SCOPES) };
      }
      return {
        message: "Permitir que o Genos controle o Radio Flow?",
        description: "O Genos, seu app de voz neste celular, poderá abrir o Kadem e tocar suas playlists e músicas, inclusive as baixadas, quando você pedir. A permissão fica só neste aparelho.",
      };
    },
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
    this.stop_bridge_watch();
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
      if (is_bridge_query(query)) {
        this.consume_bridge(query);
        return;
      }
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
    consume_bridge(query) {
      const command = parse_bridge_command(query);
      this.$router.replace({ query: strip_genos_query(query) });
      if (!command) {
        this.toast("O pedido do Genos não pôde ser lido.", "error");
        return;
      }
      if (!genosRemote.claim_nonce(command.nonce)) return;

      const required = bridge_required_scopes(command.op);
      if (!required.length || has_scopes(command.key, required)) {
        void this.run_bridge(command);
      } else {
        // Uma confirmação cobre Agenda, Health e Nexo de uma vez; a pessoa não é interrompida a cada área.
        this.pending = command;
        this.confirm_open = true;
      }
    },
    allow() {
      const command = this.pending;
      this.pending = null;
      this.confirm_open = false;
      if (!command) return;
      if (command.action === "bridge") {
        authorize_scopes(command.key, BRIDGE_SCOPES);
        void this.run_bridge(command);
        return;
      }
      genosRemote.authorize(command.key);
      void this.run(command);
    },
    deny() {
      const command = this.pending;
      this.pending = null;
      this.confirm_open = false;
      // O Genos está esperando: avisa que a pessoa recusou para ele não ficar parado até o tempo acabar.
      if (command?.action === "bridge") {
        void reply_to_genos(command, bridge_fail(BRIDGE_ERRORS.UNAUTHORIZED, "Você não permitiu que o Genos use o Kadem."));
      }
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
    async run_bridge(command) {
      const scope = bridge_required_scopes(command.op)[0];
      if (scope) this.toast(BRIDGE_PROGRESS[scope], "info", 3000);
      record_bridge_event("run", { op: command.op, write: command.confirmed });
      const untouched = this.watch_bridge_page();
      let result;
      try {
        result = await genosBridge.execute(command);
      } catch {
        result = bridge_fail(BRIDGE_ERRORS.FAILED, "Não consegui concluir no Kadem.");
      }
      record_bridge_event("result", { op: command.op, ok: result.ok, code: result.code || "" });
      const delivered = await reply_to_genos(command, result);
      if (!delivered) {
        this.toast("Não consegui responder ao Genos. Confira se o Genos está aberto e se o Kadem pode acessar este aparelho.", "error");
      } else if (!result.ok) {
        this.toast(result.message || "O Genos não conseguiu concluir o pedido.", "error");
      } else if (untouched() && !usePlayerStore().is_playing) {
        // Entregue e sem ninguém usando a página: ela se fecha e o Android volta ao app que estava à frente.
        setTimeout(() => { if (untouched()) { try { window.close(); } catch { /* fechamento recusado */ } } }, 600);
      }
    },
    // Fecha a página aberta só para o Genos quando ela fica escondida sem ter sido usada (ver o comentário da classe).
    watch_bridge_page() {
      this.stop_bridge_watch();
      let touched = false;
      const touch = () => { touched = true; };
      const started = Date.now();
      const on_visibility = () => {
        if (document.visibilityState !== "hidden" || touched) return;
        if (Date.now() - started > BRIDGE_CLOSE_GRACE_MS) return;
        if (usePlayerStore().is_playing) return;
        setTimeout(() => {
          if (document.visibilityState === "hidden" && !touched) {
            try { window.close(); } catch { /* fechamento recusado */ }
          }
        }, 500);
      };
      const events = ["pointerdown", "keydown", "touchstart"];
      events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
      document.addEventListener("visibilitychange", on_visibility);
      this.bridge_watch_off = () => {
        events.forEach((name) => window.removeEventListener(name, touch));
        document.removeEventListener("visibilitychange", on_visibility);
      };
      setTimeout(() => this.stop_bridge_watch(), BRIDGE_CLOSE_GRACE_MS + 5000);
      return () => !touched;
    },
    stop_bridge_watch() {
      this.bridge_watch_off?.();
      this.bridge_watch_off = null;
    },
    toast(message, type, duration = 5000) {
      useAppStore().showToast({ message, type, duration });
    },
  },
};
</script>
