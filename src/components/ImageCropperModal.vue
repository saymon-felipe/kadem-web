<template>
  <BaseModal
    :model-value="modelValue"
    :title="title || 'Ajustar Imagem'"
    size="md"
    @close="close"
  >
    <div class="modal-body-custom">
      <div
        v-if="!uploaded_image.src"
        class="upload-placeholder"
        @click="trigger_input"
      >
        <div class="icon-circle">
          <font-awesome-icon icon="cloud-arrow-up" />
        </div>
        <p>Clique para selecionar uma imagem</p>
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          style="display: none"
          @change="on_file_change"
        />
      </div>

      <div v-else class="cropper-container">
        <cropper
          ref="cropper"
          class="cropper"
          :src="uploaded_image.src"
          :stencil-props="{ aspectRatio: aspectRatio || 1 }"
          image-restriction="stencil"
        />
      </div>
    </div>

    <template #footer>
      <div class="cropper-footer">
        <button type="button" class="btn btn-cancel" @click="close">Cancelar</button>

        <button
          type="button"
          class="btn btn-primary"
          @click="save_crop"
          :disabled="!uploaded_image.src || processing"
        >
          <font-awesome-icon v-if="processing" icon="spinner" spin class="icon-gap" />
          {{ processing ? "Processando..." : "Confirmar" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import BaseModal from "@/components/BaseModal.vue";

export default {
  name: "ImageCropperModal",
  components: {
    BaseModal,
    Cropper,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "" },
    aspectRatio: { type: Number, default: 1 },
  },
  emits: ["close", "save", "update:modelValue"],
  data() {
    return {
      uploaded_image: { src: null, type: null },
      processing: false,
    };
  },
  watch: {
    modelValue(val) {
      if (!val) this.reset_state();
    },
  },
  methods: {
    trigger_input() {
      this.$refs.fileInput.click();
    },
    on_file_change(event) {
      const file = event.target.files[0];
      if (file) {
        if (this.uploaded_image.src) URL.revokeObjectURL(this.uploaded_image.src);

        this.uploaded_image = {
          src: URL.createObjectURL(file),
          type: file.type,
        };
      }
      event.target.value = "";
    },
    reset_state() {
      if (this.uploaded_image.src) {
        URL.revokeObjectURL(this.uploaded_image.src);
      }
      this.uploaded_image = { src: null, type: null };
      this.processing = false;
    },
    close() {
      this.$emit("update:modelValue", false);
      this.$emit("close");
    },
    save_crop() {
      if (!this.uploaded_image.src) {
        this.trigger_input();
        return;
      }

      const { canvas } = this.$refs.cropper.getResult();
      if (canvas) {
        this.processing = true;
        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        this.$emit("save", base64);
        this.$emit("update:modelValue", false);
      }
    },
  },
};
</script>

<style scoped>
.modal-body-custom {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.upload-placeholder {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border: 2px dashed var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--surface-1);
  color: var(--text-secondary);
}

.upload-placeholder:hover {
  border-color: var(--text-primary);
  background: var(--surface-2);
}

.icon-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.cropper-container {
  height: 300px;
  width: 100%;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.cropper {
  height: 100%;
  width: 100%;
}

.cropper-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--glass-border);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.cropper-footer .btn {
  height: 42px;
  min-width: 110px;
  font-size: var(--fontsize-xs);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-cancel {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.btn-cancel:hover {
  background: var(--surface-3);
}

.btn-primary {
  background: var(--deep-blue);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--deep-blue-2);
}

.icon-gap {
  margin-right: 8px;
}

@media (max-width: 768px) {
  .cropper-footer {
    flex-direction: column-reverse;
  }

  .cropper-footer .btn {
    width: 100%;
    height: 48px;
  }

  .cropper-container {
    height: 240px;
  }
}
</style>
