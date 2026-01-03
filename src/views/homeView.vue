<template>
  <div class="loading-overlay" :class="{ 'fade-out': !isLoading }">
    <loadingSpinner type="yellow" />
  </div>
  <div class="main" :style="background">
    <headerSystem ref="systemHeader" />
    <SyncIndicator :syncing="is_syncing" />
    <homeWidgets />
    <DesktopWindowManager />
  </div>
</template>
<script>
import { mapState, mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import { useUtilsStore } from "@/stores/utils";
import headerSystem from "../components/headerSystem.vue";
import homeWidgets from "../components/homeWidgets.vue";
import loadingSpinner from "../components/loadingSpinner.vue";
import systemBackground from "../assets/images/system-background.webp";
import DesktopWindowManager from "../components/windowing/DesktopWindowManager.vue";
import SyncIndicator from "@/components/SyncIndicator.vue";

export default {
  components: {
    headerSystem,
    homeWidgets,
    loadingSpinner,
    DesktopWindowManager,
    SyncIndicator,
  },
  computed: {
    ...mapState(useAuthStore, ["user", "checkAuthStatus"]),
    ...mapState(useUtilsStore, ["is_syncing"]),
    ...mapState(useAppStore, ["system"]),
    finalImageUrl() {
      if (this.system && this.system.background && this.system.background != "") {
        return this.system.background;
      }

      return this.defaultBackground;
    },
    background() {
      if (!this.isImageReady) {
        return "";
      }
      return `background-image: url(${this.finalImageUrl});`;
    },
  },
  data() {
    return {
      defaultBackground: systemBackground,
      isLoading: true,
      isImageReady: false,
    };
  },
  watch: {
    finalImageUrl: {
      handler(newUrl) {
        if (!newUrl) {
          this.isLoading = false;
          this.isImageReady = false;
          return;
        }

        this.isLoading = true;
        this.isImageReady = false;

        const img = new Image();

        img.onload = () => {
          this.isImageReady = true;
          this.$nextTick(() => {
            requestAnimationFrame(() => {
              this.isLoading = false;
            });
          });
        };

        img.onerror = () => {
          console.error("Falha ao carregar imagem de fundo:", newUrl);
          this.isLoading = false;
          this.isImageReady = false;
        };

        img.src = newUrl;
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useAuthStore, ["setUser", "checkAuthStatus"]),
    ...mapActions(useAppStore, ["setSystem", "updateMobileStatus"]),
    returnSystem: function () {
      this.api.get("/system").then((response) => {
        this.setSystem(response.data);
      });
    },
    init_connection_monitor() {
      const utilsStore = useUtilsStore();
      utilsStore._start_smart_polling();
    },
    handleResize() {
      this.updateMobileStatus();
    },
    handleProjectRevoked() {
      this.$router.go();
    },
    checkLandingSource() {
      const source = this.$route.query.source;
      if (source === "site_landing") {
        setTimeout(() => {
          if (this.$refs.systemHeader) {
            this.$refs.systemHeader.open_plan_modal();
            this.$router.replace({ query: null });
          }
        }, 500);
      }
    },
  },
  created() {
    window.addEventListener("project-access-revoked", this.handleProjectRevoked);
  },
  mounted: function () {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    this.returnSystem();
    this.init_connection_monitor();

    this.checkAuthStatus(true);

    this.checkLandingSource();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("project-access-revoked", this.handleProjectRevoked);
  },
};
</script>
<style scoped>
.main {
  width: 100%;
  height: 100%;
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
}
</style>
