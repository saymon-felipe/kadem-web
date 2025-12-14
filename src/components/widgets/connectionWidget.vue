<template>
  <div class="connection-status" :title="connection_status.text">
    <font-awesome-icon
      :icon="connection_status.icon"
      :style="{ color: connection_status.color }"
    />

    <font-awesome-icon
      v-if="connection.checking"
      :icon="['fas', 'spinner']"
      pulse
      class="checking-spinner"
    />
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useUtilsStore } from "@/stores/utils";

export default {
  name: "ConnectionWidget",
  computed: {
    ...mapState(useUtilsStore, [
      "is_network_online",
      "is_kadem_api_available",
      "connection",
    ]),

    connection_status() {
      const is_online = this.is_network_online;
      const is_api_available = this.is_kadem_api_available;

      if (this.connection.checking) {
        return {
          text: "Verificando Conexão...",
          icon: "wifi",
          color: "var(--warning-color)",
        };
      }

      if (is_online && is_api_available) {
        return {
          text: "Conectado e Sincronizado",
          icon: "wifi",
          color: "var(--success-color)",
        };
      } else if (is_online && !is_api_available) {
        return {
          text: "Rede Ativa, API Kadem Indisponível",
          icon: "wifi",
          color: "var(--warning-color)",
        };
      } else {
        return {
          text: "Sem conexão",
          icon: "globe",
          color: "var(--error-color)",
        };
      }
    },
  },
};
</script>

<style scoped>
.connection-status {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  color: var(--white);

  & svg {
    color: var(--white);
    font-size: var(--fontsize-md);
    position: static;
    right: auto;
    transition: color 0.3s ease;
  }

  & .checking-spinner {
    position: absolute;
    right: 0;
    font-size: 0.6em;
    top: 0;
    color: var(--warning-color);
  }
}
</style>
