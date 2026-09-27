<template>
  <section class="sec-section">
    <h3>
      <span>Dispositivos e sessões</span>
      <button class="sec-btn ghost icon-only" title="Atualizar" aria-label="Atualizar" :disabled="loading" @click="$emit('refresh')">
        <font-awesome-icon icon="arrows-rotate" :spin="loading" />
      </button>
    </h3>
    <p>
      Veja onde a sua conta está conectada. <strong>Desconectar</strong> encerra a sessão do dispositivo;
      <strong>Remover</strong> também apaga o dispositivo da lista. Um dispositivo <strong>confiável</strong> não pede o
      código da verificação em duas etapas: o Kadem pergunta isso logo depois que você entra com o código.
    </p>

    <div v-if="!devices.length && !loading" class="sec-empty">Nenhum dispositivo registrado.</div>

    <div v-for="device in devices" :key="device.id" class="sec-card" :class="{ 'is-current': device.is_current }">
      <div class="sec-row">
        <div class="sec-icon" :class="{ ok: device.connected }">
          <font-awesome-icon :icon="deviceIcon(device.device_type)" />
        </div>
        <div class="sec-body">
          <div class="sec-title">
            {{ device.label }}
            <span v-if="device.is_current" class="sec-badge info">Este dispositivo</span>
            <span v-else-if="device.connected" class="sec-badge ok">Conectado</span>
            <span v-else class="sec-badge">Desconectado</span>
            <span v-if="device.trusted" class="sec-badge warn" title="Não pede o código da verificação em duas etapas">
              <font-awesome-icon icon="shield-halved" /> Confiável
            </span>
          </div>
          <div class="sec-meta">
            <span>{{ locationText(device) }}</span>
            <br />
            <span>{{ activityText(device) }}</span>
          </div>
        </div>
      </div>

      <div class="sec-actions">
        <button v-if="device.trusted" class="sec-btn" :disabled="!online || busy(device)" @click="untrust(device)">
          Remover confiança
        </button>
        <button
          v-if="device.connected && !device.is_current"
          class="sec-btn"
          :disabled="!online || busy(device)"
          @click="ask('disconnect', device)"
        >
          Desconectar
        </button>
        <button class="sec-btn danger" :disabled="!online || busy(device)" @click="ask('remove', device)">
          <font-awesome-icon icon="trash" /> Remover
        </button>
      </div>
    </div>

    <div v-if="others.length" class="sec-actions">
      <button class="sec-btn danger" :disabled="!online || bulkBusy" @click="showDisconnectOthers = true">
        Sair de todos os outros dispositivos
      </button>
    </div>

    <ConfirmationModal
      v-model="showAction"
      :message="actionTitle"
      :description="actionDescription"
      :confirm-text="action === 'remove' ? 'Remover' : 'Desconectar'"
      @confirmed="runAction"
    />
    <ConfirmationModal
      v-model="showDisconnectOthers"
      message="Sair de todos os outros dispositivos?"
      description="Todas as outras sessões serão encerradas e a confiança desses dispositivos será removida. Você continua conectado aqui."
      confirm-text="Desconectar"
      @confirmed="disconnectOthers"
    />
  </section>
</template>

<script>
import { mapActions } from "pinia";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import { useAppStore } from "@/stores/app";
import { apiErrorMessage, securityService } from "@/services/securityService";
import "./security.css";

const RTF = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export default {
  name: "DevicesSection",
  components: { ConfirmationModal },
  props: {
    devices: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    online: { type: Boolean, default: true },
  },
  emits: ["changed", "refresh"],
  data() {
    return {
      showAction: false,
      showDisconnectOthers: false,
      action: "",
      target: null,
      busyIds: [],
      bulkBusy: false,
    };
  },
  computed: {
    others() {
      return this.devices.filter((device) => !device.is_current && device.connected);
    },
    actionTitle() {
      return this.action === "remove" ? "Remover este dispositivo?" : "Desconectar este dispositivo?";
    },
    actionDescription() {
      const name = this.target?.label || "o dispositivo";
      if (this.action === "remove") {
        return this.target?.is_current
          ? "É o dispositivo que você está usando: a sessão será encerrada e você precisará entrar de novo."
          : `${name} sai da lista, perde a confiança e é desconectado.`;
      }
      return `A sessão em ${name} será encerrada e ele voltará a pedir a verificação em duas etapas.`;
    },
  },
  methods: {
    ...mapActions(useAppStore, ["showToast"]),
    deviceIcon(type) {
      return { mobile: "mobile-screen-button", tablet: "tablet-screen-button" }[type] || "desktop";
    },
    busy(device) {
      return this.busyIds.includes(device.id);
    },
    locationText(device) {
      const where = device.location || "Local desconhecido";
      return device.ip ? `${where} · IP ${device.ip}` : where;
    },
    activityText(device) {
      if (device.is_current) return "Ativo agora";

      const last = new Date(device.last_seen_at).getTime();
      const minutes = Math.round((last - Date.now()) / 60000);
      const relative = Math.abs(minutes) < 60
        ? RTF.format(minutes, "minute")
        : Math.abs(minutes) < 60 * 24
          ? RTF.format(Math.round(minutes / 60), "hour")
          : RTF.format(Math.round(minutes / 1440), "day");

      return `Última atividade ${relative}`;
    },
    ask(action, device) {
      this.action = action;
      this.target = device;
      this.showAction = true;
    },
    async guard(device, task, successMessage) {
      this.busyIds.push(device.id);

      try {
        const outcome = await task();
        this.showToast({ message: successMessage, type: "success" });
        this.$emit("changed", outcome);
        return outcome;
      } catch (error) {
        if (error?.response?.data?.data?.code !== "REAUTH_REQUIRED") {
          this.showToast({ message: apiErrorMessage(error, "Não foi possível concluir a ação."), type: "error" });
        }
        return null;
      } finally {
        this.busyIds = this.busyIds.filter((id) => id !== device.id);
      }
    },
    async runAction() {
      const device = this.target;
      if (!device) return;

      const removing = this.action === "remove";
      return this.guard(
        device,
        () => (removing ? securityService.removeDevice(device.id) : securityService.disconnectDevice(device.id)),
        removing ? "Dispositivo removido." : "Dispositivo desconectado.",
      );
    },
    untrust(device) {
      return this.guard(device, () => securityService.untrustDevice(device.id), "Confiança removida.");
    },
    async disconnectOthers() {
      this.bulkBusy = true;

      try {
        const result = await securityService.disconnectAll(false);
        this.showToast({
          message: result.revoked ? "Os outros dispositivos foram desconectados." : "Nenhum outro dispositivo estava conectado.",
          type: "success",
        });
        this.$emit("changed", result);
      } catch (error) {
        this.showToast({ message: apiErrorMessage(error, "Não foi possível desconectar os dispositivos."), type: "error" });
      } finally {
        this.bulkBusy = false;
      }
    },
  },
};
</script>
