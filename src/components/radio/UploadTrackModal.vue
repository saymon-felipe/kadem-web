<template>
  <BaseModal
    :model-value="modelValue"
    title="Enviar música"
    size="sm"
    body-class="upload-modal-body"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handle_close"
  >
    <div class="upload-track-modal">
      <div v-if="!selected_file" class="upload-picker">
        <input
          type="file"
          accept="audio/*"
          ref="fileInput"
          style="display: none"
          @change="handle_file_change"
        />
        <button type="button" class="btn-circle upload-picker-btn" @click="$refs.fileInput.click()">
          <font-awesome-icon icon="cloud-arrow-up" />
        </button>
        <p>Escolha um arquivo de áudio do seu dispositivo</p>
        <button type="button" class="btn btn-primary" @click="$refs.fileInput.click()">
          Escolher arquivo
        </button>
      </div>

      <div v-else class="upload-preview">
        <div class="upload-file-card">
          <img :src="kadem_default_music" class="upload-cover" alt="Capa padrão" />

          <div class="upload-file-info">
            <strong class="upload-file-name" :title="selected_file.name">{{ selected_file.name }}</strong>
            <div class="upload-file-chips">
              <span class="upload-chip">
                <font-awesome-icon icon="clock" />
                {{ format_seconds_to_time(duration_seconds) }}
              </span>
              <span class="upload-chip">
                <font-awesome-icon icon="music" />
                {{ format_bytes(selected_file.size) }}
              </span>
            </div>
          </div>
        </div>

        <div class="form-group upload-title-group">
          <input
            type="text"
            v-model="title_input"
            placeholder=" "
            id="upload-track-title"
            :disabled="isSubmitting"
            maxlength="255"
          />
          <label for="upload-track-title">Título da música</label>
        </div>

        <p v-if="quota_error_message" class="upload-quota-error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" />
          {{ quota_error_message }}
        </p>

        <div v-if="isSubmitting" class="upload-progress-track">
          <span :style="{ width: `${progress}%` }"></span>
        </div>

        <div class="upload-actions-row">
          <button type="button" class="btn" :disabled="isSubmitting" @click="reset_selection">
            Trocar arquivo
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="isSubmitting || !title_input.trim() || !!quota_error_message"
            @click="handle_submit"
          >
            {{ isSubmitting ? `Enviando... ${progress}%` : "Enviar" }}
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script>
import { mapState } from "pinia";
import { useRadioStore } from "@/stores/radio";
import BaseModal from "@/components/BaseModal.vue";
import kadem_default_music from "@/assets/images/kadem-default-music.jpg";

export default {
  name: "UploadTrackModal",
  components: { BaseModal },
  props: {
    modelValue: { type: Boolean, default: false },
    isSubmitting: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
  },
  emits: ["update:modelValue", "submit"],
  data() {
    return {
      selected_file: null,
      title_input: "",
      duration_seconds: 0,
      kadem_default_music,
      probe_audio_url: null,
    };
  },
  computed: {
    ...mapState(useRadioStore, ["upload_usage_bytes", "upload_quota_bytes"]),
    quota_error_message() {
      if (!this.selected_file || !this.upload_quota_bytes) return "";

      const remaining = this.upload_quota_bytes - this.upload_usage_bytes;
      if (this.selected_file.size > remaining) {
        return `Esse arquivo (${this.format_bytes(this.selected_file.size)}) excede o espaço que ainda resta no seu plano (${this.format_bytes(Math.max(0, remaining))} de ${this.format_bytes(this.upload_quota_bytes)}). Exclua alguma música enviada ou escolha um arquivo menor.`;
      }
      return "";
    },
  },
  beforeUnmount() {
    if (this.probe_audio_url) URL.revokeObjectURL(this.probe_audio_url);
  },
  methods: {
    handle_file_change(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      this.selected_file = file;
      this.title_input = file.name.replace(/\.[^./]+$/, "");
      this.duration_seconds = 0;
      this.probe_duration(file);
    },
    probe_duration(file) {
      if (this.probe_audio_url) URL.revokeObjectURL(this.probe_audio_url);

      const audio = new Audio();
      this.probe_audio_url = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        this.duration_seconds = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      });
      audio.addEventListener("error", () => {
        this.duration_seconds = 0;
      });
      audio.src = this.probe_audio_url;
    },
    reset_selection() {
      this.selected_file = null;
      this.title_input = "";
      this.duration_seconds = 0;
      if (this.probe_audio_url) {
        URL.revokeObjectURL(this.probe_audio_url);
        this.probe_audio_url = null;
      }
    },
    handle_submit() {
      if (!this.selected_file || !this.title_input.trim() || this.isSubmitting || this.quota_error_message) return;
      this.$emit("submit", { file: this.selected_file, title: this.title_input.trim() });
    },
    handle_close() {
      this.$emit("update:modelValue", false);
      if (!this.isSubmitting) this.reset_selection();
    },
    format_bytes(bytes) {
      if (!bytes) return "0 MB";
      const mb = bytes / (1024 * 1024);
      if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
      return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
    },
  },
};
</script>

<style>
/* Conteúdo curto de sobra: o BaseModal já ajusta a altura do card ao
   conteúdo, mas por algum arredondamento o corpo abre uma barra de rolagem
   mesmo sem precisar. Como é específico deste modal, ajusta só aqui via
   `bodyClass` em vez de mexer no BaseModal compartilhado. */
.upload-modal-body {
  overflow-y: visible !important;
}
</style>

<style scoped>
.upload-track-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.upload-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  color: var(--text-secondary);
}

.upload-picker-btn {
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--color-info);
  font-size: 1.6rem;
  display: grid;
  place-items: center;
  border: none;
  cursor: pointer;
}

.upload-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.upload-file-card {
  display: grid;
  grid-template-columns: 56px 1fr;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
}

.upload-cover {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.upload-file-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.upload-file-name {
  font-size: var(--fontsize-sm);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file-chips {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.upload-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.upload-chip svg {
  font-size: 0.7rem;
  color: var(--text-muted, var(--text-secondary));
}

.upload-title-group {
  margin: 0;
}

.upload-quota-error {
  width: 100%;
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--red-high);
  color: var(--red);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.upload-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--surface-2);
  overflow: hidden;
}

.upload-progress-track span {
  display: block;
  height: 100%;
  background: var(--color-info);
  transition: width 0.2s ease;
}

.upload-actions-row {
  width: 100%;
  display: flex;
  gap: var(--space-3);
}

.upload-actions-row .btn {
  flex: 1;
}
</style>
