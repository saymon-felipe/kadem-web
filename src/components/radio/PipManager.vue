<template>
  <div class="hidden-pip-elements">
    <canvas ref="pip_canvas" width="350" height="250"></canvas>
    <video
      ref="pip_video"
      playsinline
      autoplay
      muted
      @play="on_native_play"
      @pause="on_native_pause"
      @volumechange="on_native_volume_change"
      @leavepictureinpicture="on_leave_pip"
    ></video>
  </div>
</template>

<script>
import system_icon from "@/assets/images/icons/system.png";
import background_image_src from "@/assets/images/fundo-auth.webp";
import { decode_html_entities } from "@/utils/string_helpers";

export default {
  name: "PipPlayer",
  props: {
    current_music: { type: Object, required: true },
    current_playlist: { type: Object, required: true },
    is_playing: { type: Boolean, required: true },
    current_time: { type: Number, default: 0 },
    duration: { type: Number, default: 1 },
    volume: { type: Number, required: true },
  },
  data() {
    return {
      ctx: null,

      album_art_img: new Image(),
      system_icon_img: new Image(),
      background_img: new Image(),

      system_icon_src: system_icon,
      background_src: background_image_src,

      is_stream_initialized: false,
      is_pip_ready: false,
      is_internal_update: false,
      is_initializing: false,

      audio_ctx: null,
      silent_stream_destination: null,
      oscillator: null,
    };
  },
  async mounted() {
    this.album_art_img.crossOrigin = "anonymous";
    this.background_img.crossOrigin = "anonymous";

    this.ctx = this.$refs.pip_canvas.getContext("2d", { alpha: false });
    await this.load_assets();
  },
  watch: {
    "current_music.thumbnail": {
      handler(new_cover_url) {
        if (new_cover_url) {
          const separator = new_cover_url.includes("?") ? "&" : "?";
          const safeUrl = `${new_cover_url}${separator}pip_request=true`;

          this.album_art_img.src = safeUrl;

          this.album_art_img.onload = () => {
            this.draw_canvas_content();
          };

          this.album_art_img.onerror = (e) => {
            console.warn("Falha ao carregar capa no PiP com CORS:", e);

            this.album_art_img.removeAttribute("src");
            this.draw_canvas_content();
          };
        } else {
          this.draw_canvas_content();
        }
      },
      immediate: true,
    },
    is_playing: {
      handler(should_play) {
        const video_el = this.$refs.pip_video;
        if (!video_el || !this.is_pip_ready) return;

        if (should_play && !video_el.paused) return;
        if (!should_play && video_el.paused) {
          if (document.pictureInPictureElement) {
            this.draw_canvas_content();
            this.force_frame_update();
          }
          return;
        }

        this.is_internal_update = true;

        if (should_play) {
          video_el
            .play()
            .catch((e) => {
              if (e.name !== "AbortError") console.warn(e);
            })
            .finally(() => {
              this.is_internal_update = false;
            });
        } else {
          this.draw_canvas_content();

          video_el.pause();

          this.$nextTick(() => {
            this.is_internal_update = false;
          });
        }
      },
      immediate: true,
    },
    current_time() {
      if (document.pictureInPictureElement && !this.$refs.pip_video.paused) {
        this.draw_canvas_content();
      }
    },
    volume: {
      handler(new_val) {
        const video_el = this.$refs.pip_video;
        if (!video_el) return;
        if (Math.abs(video_el.volume - new_val) > 0.01) {
          this.is_internal_update = true;
          video_el.volume = Math.min(Math.max(new_val, 0), 1);
          video_el.muted = new_val === 0;
          setTimeout(() => {
            this.is_internal_update = false;
          }, 50);
        }
      },
      immediate: true,
    },
  },
  methods: {
    decode_html_entities,
    force_frame_update() {
      if (!document.pictureInPictureElement) return;
      if (this.is_internal_update) return;

      this.is_internal_update = true;
      const video_el = this.$refs.pip_video;

      video_el
        .play()
        .then(() => {
          setTimeout(() => {
            video_el.pause();
            setTimeout(() => {
              this.is_internal_update = false;
            }, 50);
          }, 20);
        })
        .catch(() => {
          this.is_internal_update = false;
        });
    },

    on_native_play() {
      if (this.is_internal_update || this.is_initializing) return;
      if (this.is_playing) return;

      this.$emit("toggle-play", true);
    },

    on_native_pause() {
      if (this.is_internal_update || this.is_initializing) return;

      if (document.visibilityState === "hidden" && document.pictureInPictureElement)
        return;

      if (!this.is_playing) return;

      this.$emit("toggle-play", false);
    },
    on_native_volume_change() {
      if (
        !this.is_pip_ready &&
        !document.pictureInPictureElement &&
        !this.is_initializing
      ) {
        return;
      }

      if (this.is_internal_update || this.is_initializing) return;

      const video_el = this.$refs.pip_video;
      const vol = video_el.muted ? 0 : video_el.volume;
      this.$emit("set-volume", vol);
    },

    on_leave_pip() {
      this.is_pip_ready = false;
      const video_el = this.$refs.pip_video;
      if (video_el) video_el.pause();
    },

    async load_assets() {
      try {
        await Promise.all([
          new Promise((resolve) => {
            this.system_icon_img.src = this.system_icon_src;
            this.system_icon_img.onload = resolve;
            this.system_icon_img.onerror = resolve;
          }),
          new Promise((resolve) => {
            this.background_img.src = this.background_src;
            this.background_img.onload = resolve;
            this.background_img.onerror = resolve;
          }),
        ]);
        this.draw_canvas_content();
      } catch (error) {
        console.error("KADEM: Erro assets PiP:", error);
      }
    },
    draw_play_icon(ctx, x, y, size) {
      const w = size;
      const h = size * 0.9;
      const r = 3;
      const x_offset = w * 0.15;
      const cx = x + x_offset;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      const p1 = { x: cx + w / 2, y: y };
      const p2 = { x: cx - w / 2, y: y + h / 2 };
      const p3 = { x: cx - w / 2, y: y - h / 2 };
      ctx.moveTo(p3.x, (p3.y + p2.y) / 2);
      ctx.arcTo(p3.x, p3.y, p1.x, p1.y, r);
      ctx.arcTo(p1.x, p1.y, p2.x, p2.y, r);
      ctx.arcTo(p2.x, p2.y, p3.x, p3.y, r);
      ctx.closePath();
      ctx.fill();
    },

    draw_pause_icon(ctx, x, y, size) {
      const bar_width = size * 0.28;
      const bar_height = size;
      const gap = size * 0.25;
      const start_x = x - (bar_width * 2 + gap) / 2;
      ctx.fillStyle = "#FFFFFF";
      this.draw_round_rect(ctx, start_x, y - bar_height / 2, bar_width, bar_height, 2);
      ctx.fill();
      this.draw_round_rect(
        ctx,
        start_x + bar_width + gap,
        y - bar_height / 2,
        bar_width,
        bar_height,
        2
      );
      ctx.fill();
    },

    draw_image_cover(ctx, img, x, y, w, h, radius = 0) {
      if (!img.complete || img.naturalHeight === 0) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      let draw_w = w;
      let draw_h = draw_w / ratio;
      if (draw_h < h) {
        draw_h = h;
        draw_w = draw_h * ratio;
      }
      const offset_x = x + (w - draw_w) / 2;
      const offset_y = y + (h - draw_h) / 2;
      ctx.save();
      if (radius > 0) {
        this.draw_round_rect(ctx, x, y, w, h, radius);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
      }
      try {
        ctx.drawImage(img, offset_x, offset_y, draw_w, draw_h);
      } catch (e) {
        console.warn(e);
      }
      ctx.restore();
    },

    draw_canvas_content() {
      if (!this.ctx) return;
      const canvas = this.$refs.pip_canvas;
      const W = canvas.width;
      const H = canvas.height;
      const PADDING = 15;

      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "alphabetic";

      // 1. Fundo
      this.ctx.fillStyle = "#121212";
      this.ctx.fillRect(0, 0, W, H);

      if (this.background_img.complete) {
        this.draw_image_cover(this.ctx, this.background_img, 0, 0, W, H, 0);
      }

      // 2. Overlay
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      this.ctx.fillRect(0, 0, W, H);

      if (!this.current_music) return;

      // --- Layout ---
      const cover_h = 150;
      const target_w = W - PADDING * 2;
      const target_h = cover_h - PADDING * 2;
      const cover_x = PADDING;
      const cover_y = PADDING;

      // 3. Capa
      if (this.album_art_img.complete && this.album_art_img.naturalWidth > 0) {
        this.draw_image_cover(
          this.ctx,
          this.album_art_img,
          cover_x,
          cover_y,
          target_w,
          target_h,
          8
        );
      } else {
        // Placeholder
        this.ctx.save();
        this.draw_round_rect(this.ctx, cover_x, cover_y, target_w, target_h, 8);
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        this.ctx.fill();
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.font = "40px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("🎵", cover_x + target_w / 2, cover_y + target_h / 2 + 15);
        this.ctx.restore();
      }

      // --- Botão Play/Pause ---
      const cover_center_x = cover_x + target_w / 2;
      const cover_center_y = cover_y + target_h / 2;
      const btn_radius = 20;

      this.ctx.beginPath();
      this.ctx.arc(cover_center_x, cover_center_y, btn_radius, 0, 2 * Math.PI);
      this.ctx.save();
      this.ctx.globalAlpha = 0.85;
      this.ctx.fillStyle = "#1F274C";
      this.ctx.fill();
      this.ctx.restore();

      if (this.is_playing) {
        this.draw_pause_icon(this.ctx, cover_center_x, cover_center_y, 16);
      } else {
        this.draw_play_icon(this.ctx, cover_center_x, cover_center_y, 18);
      }

      // 4. Ícone do Sistema
      const icon_sz = 30;
      this.ctx.save();
      this.ctx.globalAlpha = 0.9;
      this.ctx.fillStyle = "#CEB386";
      this.draw_round_rect(this.ctx, PADDING + 8, 146 - icon_sz - 8, icon_sz, icon_sz, 6);
      this.ctx.fill();
      this.ctx.restore();

      if (this.system_icon_img.complete) {
        this.ctx.drawImage(this.system_icon_img, PADDING + 14, 146 - icon_sz - 2, 18, 18);
      }

      // 5. Textos
      const text_y = 165;
      const max_w = W - PADDING * 2;

      this.ctx.textAlign = "left";

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      this.ctx.font = "13px Roboto, sans-serif";
      const playlistName =
        this.decode_html_entities(this.current_playlist?.name) || "Kadem Radio";
      this.fill_text_with_ellipsis(playlistName, PADDING, text_y, max_w);

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 16px Roboto, sans-serif";
      this.fill_text_with_ellipsis(
        this.decode_html_entities(this.current_music?.title) || "Sem Título",
        PADDING,
        text_y + 19,
        max_w
      );

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      this.ctx.font = "13px Roboto, sans-serif";
      const artist =
        this.decode_html_entities(this.current_music?.artist) ||
        this.decode_html_entities(this.current_music?.channel) ||
        "";
      this.fill_text_with_ellipsis(artist, PADDING, text_y + 36, max_w);

      const time_y = 148;
      const gap = 7;

      this.ctx.font = "11px Roboto, sans-serif";
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

      const current_text = this.format_time(this.current_time);
      const total_text = this.format_time(this.duration);
      const separator = "/";

      this.ctx.textAlign = "right";

      let cursor_x = W - PADDING;

      this.ctx.fillText(total_text, cursor_x, time_y);

      const total_width = this.ctx.measureText(total_text).width;
      cursor_x -= total_width + gap;

      this.ctx.fillText(separator, cursor_x, time_y);

      const sep_width = this.ctx.measureText(separator).width;
      cursor_x -= sep_width + gap;

      this.ctx.fillText(current_text, cursor_x, time_y);
    },

    initialize_stream() {
      if (this.is_stream_initialized && this.$refs.pip_video.readyState >= 1) {
        return Promise.resolve();
      }

      this.is_initializing = true;

      return new Promise(async (resolve) => {
        const video_el = this.$refs.pip_video;

        if (this.background_img.complete) {
          this.draw_canvas_content();
        } else {
          this.background_img.onload = () => this.draw_canvas_content();
        }

        const canvas_stream = this.$refs.pip_canvas.captureStream(30);

        if (!this.audio_ctx) {
          this.audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audio_ctx.state === "suspended") {
          await this.audio_ctx.resume();
        }

        this.oscillator = this.audio_ctx.createOscillator();
        const gain_node = this.audio_ctx.createGain();
        gain_node.gain.value = 0;

        this.silent_stream_destination = this.audio_ctx.createMediaStreamDestination();
        this.oscillator.connect(gain_node);
        gain_node.connect(this.silent_stream_destination);
        this.oscillator.start();

        const combined_stream = new MediaStream([
          ...canvas_stream.getVideoTracks(),
          ...this.silent_stream_destination.stream.getAudioTracks(),
        ]);

        video_el.srcObject = combined_stream;
        video_el.volume = this.volume;
        video_el.muted = this.volume === 0;

        this.is_stream_initialized = true;

        video_el.onloadedmetadata = () => {
          this.is_pip_ready = true;
          if (this.is_playing) {
            video_el.play().catch((e) => console.warn("Autoplay PiP blocked", e));
          }
          this.is_initializing = false;
          resolve();
        };
      });
    },

    async toggle_pip() {
      const video_el = this.$refs.pip_video;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          return false;
        } else {
          this.is_initializing = true;
          await this.initialize_stream();
          if (this.is_playing && video_el.paused) {
            await video_el.play();
          }
          await video_el.requestPictureInPicture();
          return true;
        }
      } catch (error) {
        console.error("KADEM: Erro PiP:", error);
        this.is_initializing = false;
        return false;
      }
    },

    format_time(seconds) {
      if (isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    },

    draw_round_rect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    },

    fill_text_with_ellipsis(text, x, y, max_width) {
      if (!text) return;
      let truncated = text;
      if (this.ctx.measureText(text).width > max_width) {
        while (
          this.ctx.measureText(truncated + " ...").width > max_width &&
          truncated.length > 0
        ) {
          truncated = truncated.slice(0, -1);
        }
        truncated += "...";
      }
      this.ctx.fillText(truncated, x, y);
    },
  },
  beforeUnmount() {
    if (this.$refs.pip_video && this.$refs.pip_video.srcObject) {
      const stream = this.$refs.pip_video.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      this.$refs.pip_video.srcObject = null;
    }

    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {}
      this.oscillator.disconnect();
    }
    if (this.audio_ctx) this.audio_ctx.close();
  },
};
</script>

<style scoped>
.hidden-pip-elements {
  position: absolute;
  top: -9999px;
  left: -9999px;
  visibility: hidden;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
