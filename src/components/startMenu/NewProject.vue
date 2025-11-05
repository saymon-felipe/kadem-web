<template>
    <div class="new-group-wrapper">
        <h2 class="title">Criar projeto</h2>

        <div class="form-container">
            <div class="form-inputs">
                <div class="form-group">
                    <input id="group-name" type="text" v-model="groupName" placeholder=" " required />
                    <label for="group-name">Nome</label>
                </div>

                <div class="form-group">
                    <input id="add-member" type="email" v-model="memberEmail" placeholder=" " required />
                    <label for="add-member">Adicionar membro</label>
                </div>

                <div class="pending-members">
                    <span>linnuxbr@gmail.com</span>
                    <span>joaojunior.jj@hotmail.com</span>
                </div>
            </div>

            <div class="preview-card-container">
                <div class="preview-card">
                    <img :src="previewImageSrc" alt="Preview" class="preview-image" />
                    <div class="preview-overlay">
                        <span class="preview-title">{{ groupName || "Nome do grupo" }}</span>
                        <button class="preview-refresh" @click="triggerImageUpload">
                            <font-awesome-icon icon="arrows-rotate" />
                        </button>
                    </div>
                </div>

                <input type="file" ref="imageInput" @change="handleImageUpload" accept="image/png, image/jpeg"
                    style="display: none" />

                <div class="actions-footer">
                    <button class="btn" @click="$emit('cancel-new-group')">
                        Cancelar
                    </button>
                    <button class="btn btn-primary">
                        Criar grupo
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";

export default {
    name: "NewProject",
    emits: ['cancel-new-group'],
    data() {
        return {
            groupName: '',
            memberEmail: '',
            previewImageSrc: defaultProjectImage
        }
    },
    methods: {
        triggerImageUpload() {
            // Dispara o clique no input de arquivo oculto
            this.$refs.imageInput.click();
        },
        handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            if (!['image/png', 'image/jpeg'].includes(file.type)) {
                console.warn('Por favor, selecione um arquivo PNG ou JPG.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewImageSrc = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
}
</script>

<style scoped>
.new-group-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.title {
    font-size: var(--fontsize-lg);
    font-weight: 600;
    color: var(--deep-blue);
    margin-bottom: var(--space-7);
}

.form-container {
    display: flex;
    gap: var(--space-8);
    flex-grow: 1;
}

.form-inputs {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin-left: 4px;
}

.pending-members {
    display: flex;
    gap: var(--space-3);
    font-size: var(--fontsize-xs);
    color: var(--text-gray);
    margin-top: var(--space-2);
}

.pending-members span {
    background-color: var(--gray-700);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
}

.preview-card-container {
    flex: 1;
}

.preview-card {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--gray-600);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.preview-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.preview-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-4);
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.preview-title {
    font-weight: 600;
}

.preview-refresh {
    background: none;
    border: none;
    color: white;
    font-size: var(--fontsize-sm);
    cursor: pointer;
}

.actions-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--gray-700);
}
</style>