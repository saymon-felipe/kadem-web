<template>
  <div id="youtube-player-container" class="global-youtube-player" aria-hidden="true"></div>
</template>

<script>
import { mapActions } from "pinia";
import { usePlayerStore } from "@/stores/player";

export default {
  name: "GlobalPlayerHost",
  data() {
    return {
      yt_player: null,
    };
  },
  methods: {
    ...mapActions(usePlayerStore, [
      "register_yt_instance",
      "restorePlayerConnection",
      "handle_youtube_state_change",
      "next",
    ]),
    init_youtube_api() {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const first_script_tag = document.getElementsByTagName("script")[0];
        first_script_tag.parentNode.insertBefore(tag, first_script_tag);
        window.onYouTubeIframeAPIReady = () => this.create_yt_player();
      } else if (window.YT.Player) {
        this.create_yt_player();
      }
    },
    create_yt_player() {
      if (this.yt_player) return;

      this.yt_player = new window.YT.Player("youtube-player-container", {
        height: "0",
        width: "0",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
        events: {
          onReady: (event) => {
            this.register_yt_instance(event.target);
            this.restorePlayerConnection();
          },
          onStateChange: (event) => {
            this.handle_youtube_state_change(event);
            if (event.data === 0) this.next();
          },
        },
      });
    },
  },
  mounted() {
    this.init_youtube_api();
    this.restorePlayerConnection();
  },
  beforeUnmount() {
    this.yt_player?.destroy();
  },
};
</script>

<style scoped>
.global-youtube-player {
  height: 1px;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  top: -9999px;
  width: 1px;
}
</style>
