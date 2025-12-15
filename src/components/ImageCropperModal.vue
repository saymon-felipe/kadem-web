<template>
  <Transition name="slide-over-root">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal-content glass" role="dialog" aria-modal="true">
        <div class="modal-header-row">
          <h3>{{ title || "Ajustar Imagem" }}</h3>
          <button class="close-btn-icon" @click="close">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>

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

        <div class="modal-footer">
          <button class="btn" @click="close">Cancelar</button>

          <button
            class="btn btn-primary"
            @click="save_crop"
            :disabled="!uploaded_image.src || processing"
          >
            <font-awesome-icon v-if="processing" icon="spinner" spin class="icon-gap" />
            {{ processing ? "Salvando..." : "Concluir" }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

export default {
  name: "ImageCropperModal",
  components: { Cropper },
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "" },
    aspectRatio: { type: Number, default: 1 },
  },
  emits: ["close", "save"],
  data() {
    return {
      uploaded_image: { src: null, type: null },
      processing: false,
    };
  },
  watch: {
    show(val) {
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
      }
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: rgba(255, 255, 255, 0.85); /* Mantém fundo base */
  width: 90%;
  max-width: 500px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: var(--space-6, 24px);
  display: flex;
  flex-direction: column;
  /* Animação de entrada idêntica ao ConfirmationModal */
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: var(--deep-blue, #1f274c);
}

/* Transições Vue (Entrada/Saída do Overlay) */
.slide-over-root-enter-active,
.slide-over-root-leave-active {
  transition: opacity 0.3s ease;
}

.slide-over-root-enter-from,
.slide-over-root-leave-to {
  opacity: 0;
}

/* Keyframes (Entrada do Painel) */
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ESTILOS ESPECÍFICOS DO CROPPER
   (Conteúdo interno diferente do ConfirmationModal)
*/

.modal-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 16px);
}

.modal-header-row h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--deep-blue, #1f274c);
}

.close-btn-icon {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.close-btn-icon:hover {
  color: var(--deep-blue, #1f274c);
}

.modal-body-custom {
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-6, 24px);
}

.upload-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border: 2px dashed rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.5);
  color: var(--text-muted, #666);
}
.upload-placeholder:hover {
  border-color: var(--deep-blue);
  background: rgba(255, 255, 255, 0.8);
}

.icon-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--gray-100, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--white);
}

.cropper-container {
  height: 300px;
  width: 100%;
  background: #000;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}
.cropper {
  height: 100%;
  width: 100%;
}

.modal-footer {
  display: flex;
  gap: var(--space-3, 12px);
  width: 100%;
  justify-content: flex-end;
}

.icon-gap {
  margin-right: 8px;
}

.slide-over-root-enter-active,
.slide-over-root-leave-active {
  transition: opacity 0.3s ease;
}

.slide-over-root-enter-active .modal-content,
.slide-over-root-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 0.3s ease-out;
}

.slide-over-root-enter-active .modal-overlay,
.slide-over-root-leave-active .modal-overlay {
  transition: opacity 0.3s ease;
}

.slide-over-root-enter-from,
.slide-over-root-leave-to {
  opacity: 0;
}

.slide-over-root-enter-from .modal-content {
  transform: translateY(20px);
}

.slide-over-root-leave-to .modal-content {
  transform: translateY(20px);
}
</style>
