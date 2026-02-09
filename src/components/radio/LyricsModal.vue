<template>
  <transition name="lyrics-fade">
    <div class="lyrics-modal-overlay" v-if="modelValue" @click.self="close_modal">
      <div class="lyrics-modal-content glass" :class="{ 'is-closing': is_closing }">
        <div class="modal-drag-indicator"></div>

        <div class="lyrics-header">
          <img :src="track?.thumbnail || default_cover" class="track-art" />
          <div class="track-info-meta">
            <strong class="track-title">{{ track?.title }}</strong>
            <span class="track-channel">{{ track?.channel }}</span>
          </div>
          <button class="close-modal-btn" @click="close_modal" title="Fechar">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>

        <div
          class="lyrics-scroll-area custom-scrollbar"
          :class="{
            'is-at-top': is_at_top,
            'is-at-bottom': is_at_bottom,
          }"
          ref="scrollContainer"
          @scroll="handle_scroll"
        >
          <template v-if="lyrics && lyrics.length > 0">
            <div
              v-for="(line, index) in lyrics"
              :key="index"
              :ref="
                (el) => {
                  if (index === active_index) active_lyric_el = el;
                }
              "
              class="lyric-item"
              :class="{
                'is-past': index < active_index,
                'is-active': index === active_index,
                'is-future': index > active_index,
              }"
            >
              <span class="lyric-text">{{ line.text }}</span>
            </div>
          </template>

          <div v-else class="empty-state-container">
            <font-awesome-icon icon="microphone-slash" class="empty-icon" />
            <p>Letra indisponível para esta faixa.</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "LyricsModal",
  props: {
    modelValue: Boolean,
    lyrics: {
      type: Array,
      default: () => [],
    },
    current_time: Number,
    track: Object,
    default_cover: String,
  },
  data() {
    return {
      active_index: -1,
      active_lyric_el: null,
      is_manual_scrolling: false,
      scroll_timeout: null,
      is_closing: false,
      is_at_top: true,
      is_at_bottom: false,
    };
  },
  watch: {
    current_time(val) {
      if (this.lyrics && this.lyrics.length > 0) {
        this.sync_lyrics_index(val);
      }
    },
    active_index() {
      this.perform_auto_scroll();
    },
    modelValue(val) {
      if (val) {
        this.$nextTick(() => {
          this.check_scroll_position();
          this.perform_auto_scroll();
        });
      }
    },
  },
  methods: {
    sync_lyrics_index(time) {
      const index = this.lyrics.findIndex((line, i) => {
        const next = this.lyrics[i + 1];
        return time >= line.start && (!next || time < next.start);
      });
      if (index !== -1 && index !== this.active_index) {
        this.active_index = index;
      }
    },
    handle_scroll() {
      this.check_scroll_position();
      this.is_manual_scrolling = true;
      clearTimeout(this.scroll_timeout);

      this.scroll_timeout = setTimeout(() => {
        this.is_manual_scrolling = false;
      }, 3000);
    },
    check_scroll_position() {
      const el = this.$refs.scrollContainer;
      if (!el) return;
      this.is_at_top = el.scrollTop <= 2;
      const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      this.is_at_bottom = Math.abs(scrollBottom) <= 2;
    },
    perform_auto_scroll() {
      if (!this.active_lyric_el || this.is_manual_scrolling || !this.modelValue) return;

      this.active_lyric_el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    close_modal() {
      this.is_closing = true;
      setTimeout(() => {
        this.$emit("update:modelValue", false);
        this.is_closing = false;
      }, 400);
    },
  },
};
</script>

<style scoped>
.lyrics-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100% - 108px);
  z-index: 2500;
  display: flex;
  justify-content: center;
}

.lyrics-modal-content {
  width: calc(100% - 42px);
  height: 100%;
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.1);
}

.modal-drag-indicator {
  width: 40px;
  height: 5px;
  background: var(--gray-600);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-6);
}

.lyrics-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.track-art {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  box-shadow: var(--boxshadow-default);
}

.track-info-meta {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.track-title {
  color: var(--deep-blue);
  font-size: 1.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-channel {
  color: var(--text-gray);
  font-size: 0.95rem;
}

.close-modal-btn {
  font-size: 1.8rem;
  color: var(--deep-blue);
  transition: transform 0.2s;
  background: none;
  border: none;
  cursor: pointer;
}

.close-modal-btn:hover {
  transform: scale(1.1);
}

.lyrics-scroll-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0 var(--space-4) 40vh;
  text-align: center;

  --mask-top: transparent;
  --mask-bottom: transparent;

  -webkit-mask-image: linear-gradient(
    to bottom,
    var(--mask-top) 0%,
    black 15%,
    black 85%,
    var(--mask-bottom) 100%
  );
  mask-image: linear-gradient(
    to bottom,
    var(--mask-top) 0%,
    black 15%,
    black 85%,
    var(--mask-bottom) 100%
  );
}

.lyrics-scroll-area.is-at-top {
  --mask-top: black;
}
.lyrics-scroll-area.is-at-bottom {
  --mask-bottom: black;
}

/* Items da Letra */
.lyric-item {
  padding: var(--space-6) 0;
  font-size: var(--fontsize-md);
  font-weight: 800;
  line-height: 1.5;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--black);
}

.lyric-text {
  display: inline-block;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

.lyric-item.is-active .lyric-text {
  background-color: var(--dark-yellow-2);
  color: var(--deep-blue);
  transform: scale(1.05);
}

.lyric-item.is-past {
  opacity: 1;
}
.lyric-item.is-future {
  opacity: 0.3;
}

/* Estado Vazio (Sem Letra) */
.empty-state-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-gray);
  opacity: 0.7;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--space-4);
  color: var(--gray-300);
}

.empty-state-container p {
  font-size: 1.1rem;
  font-weight: 500;
}

/* Animações */
.lyrics-fade-enter-active {
  animation: overlayFadeIn 0.4s ease;
}
.lyrics-fade-leave-active {
  animation: overlayFadeIn 0.4s ease reverse;
}

.lyrics-fade-enter-active .lyrics-modal-content {
  animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.lyrics-fade-leave-active .lyrics-modal-content {
  animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@container (max-width: 1100px) {
  .lyrics-modal-content {
    width: 100%;
    border-radius: 0;
  }

  .lyrics-modal-overlay {
    height: calc(100% - 163px);
  }
}
</style>
