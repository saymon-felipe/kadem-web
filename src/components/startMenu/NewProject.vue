<template>
    <div class="new-group-wrapper">
        <h2 class="title">{{ title }}</h2>

        <div class="form-container">
            <div class="form-inputs">
                <div class="form-group">
                    <input id="group-name" type="text" v-model="project.name" placeholder=" " required
                        :disabled="!canEditProject" />
                    <label for="group-name">Nome</label>
                </div>

                <div class="form-group">
                    <input id="group-desc" type="text" v-model="project.description" placeholder=" " required
                        :disabled="!canEditProject" />
                    <label for="group-desc">Descrição</label>
                </div>

                <div class="form-group" v-if="canEditProject">
                    <input id="add-member" type="email" v-model="memberEmail" @keyup.enter="addMemberToList"
                        placeholder=" " required :disabled="!isConnected"
                        :title="!isConnected ? 'A funcionalidade de convidar membros para o grupo só está disponível offline.' : ''" />
                    <label for="add-member">Adicionar membro (pressione Enter)</label>
                </div>

                <div class="pending-members">
                    <span v-for="(member, index) in project.members" :key="index">
                        {{ member.email || member.name }}
                        <button v-if="canEditProject" @click="removeMemberFromList(index)" class="remove-member-btn"
                            title="Remover">&times;</button>
                    </span>
                </div>

                <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="false" />
            </div>

            <div class="preview-card-container">
                <div class="preview-card">
                    <img :src="projectImageBase64" alt="Preview" class="preview-image" />
                    <div class="preview-overlay">
                        <span class="preview-title">{{ project.name || "Nome do grupo" }}</span>
                        <div class="image-actions">
                            <button v-if="canEditProject" class="preview-refresh" @click="triggerImageUpload"
                                title="Alterar imagem">
                                <font-awesome-icon icon="arrows-rotate" />
                            </button>
                            <button
                                v-if="project.image && project.image !== defaultProjectImage && isEditMode && canEditProject"
                                class="preview-delete-image" @click="handleDeleteImage" title="Remover imagem">
                                <font-awesome-icon icon="trash-can" />
                            </button>
                        </div>
                    </div>
                </div>

                <input type="file" ref="imageInput" @change="handleImageUpload" accept="image/png, image/jpeg"
                    style="display: none" />

                <div class="actions-footer">
                    <button v-if="isEditMode && isUserAdmin" class="btn btn-red" @click="confirmDeleteProject"
                        :disabled="isCreating">
                        Excluir projeto
                    </button>

                    <button class="btn" @click="$emit('cancel-new-group')">
                        {{ canEditProject ? 'Cancelar' : 'Fechar' }}
                    </button>

                    <button v-if="canEditProject" class="btn btn-primary" @click="handleSave" :disabled="isCreating">
                        {{ saveButtonText }}
                    </button>
                </div>
            </div>
        </div>
        <ConfirmationModal v-model="showDeleteProjectModal" message="Tem certeza que deseja excluir este projeto?"
            confirm-text="Excluir" @confirmed="handleDeleteProject" @cancelled="showDeleteProjectModal = false" />
    </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import { mapActions, mapState } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import { useAuthStore } from '@/stores/auth';
import { useUtilsStore } from "@/stores/utils";
import { api } from '@/plugins/api';

import ConfirmationModal from '@/components/ConfirmationModal.vue';
import LoadingResponse from "@/components/loadingResponse.vue";

export default {
    name: "NewProject",
    components: {
        ConfirmationModal,
        LoadingResponse
    },
    props: {
        projectToEdit: {
            type: Object,
            default: null
        }
    },
    emits: ['cancel-new-group'],
    data() {
        return {
            project: {
                name: '',
                description: '',
                image: '',
                members: []
            },
            originalProject: null,
            projectImageBase64: defaultProjectImage,
            memberEmail: '',
            isCreating: false,
            showDeleteProjectModal: false,
            newlyAddedEmails: []
        }
    },
    computed: {
        ...mapState(useAuthStore, ['user']),
        ...mapState(useUtilsStore, ['isConnected']),

        isEditMode() {
            return !!this.projectToEdit;
        },
        canEditProject() {
            if (!this.isEditMode) return true;
            return this.isUserAdmin;
        },

        isUserAdmin() {
            if (!this.isEditMode) return true;

            if (!this.originalProject || !this.user || !this.user.id) {
                return false;
            }

            if (Array.isArray(this.originalProject.members)) {
                const me = this.originalProject.members.find(m => m.id === this.user.id);
                return me && me.role === 'admin';
            }

            return false;
        },

        title() {
            if (!this.isEditMode) return 'Criar projeto';
            return this.canEditProject ? 'Editar projeto' : (this.project.name || 'Detalhes do Projeto');
        },

        saveButtonText() {
            return this.isCreating ?
                (this.isEditMode ? 'Salvando...' : 'Criando...') :
                (this.isEditMode ? 'Salvar alterações' : 'Criar grupo');
        }
    },
    watch: {
        projectToEdit: {
            handler(newProject) {
                if (newProject) {
                    this.project = {
                        name: newProject.name,
                        description: newProject.description,
                        image: newProject.image || '',
                        members: newProject.members ? JSON.parse(JSON.stringify(newProject.members)) : []
                    };
                    this.originalProject = newProject;
                    this.projectImageBase64 = newProject.image || defaultProjectImage;
                } else {
                    this.project = { name: '', description: '', image: '', members: [] };
                    this.originalProject = null;
                    this.projectImageBase64 = defaultProjectImage;
                }
            },
            immediate: true
        },
        isCreating: {
            handler() {
                if (!this.isCreating && !this.isEditMode) {

                }
            }
        }
    },

    methods: {
        ...mapActions(useProjectStore, ['createProject', 'updateProject', 'deleteProject']),

        triggerImageUpload() {
            if (this.canEditProject) {
                this.$refs.imageInput.click();
            }
        },

        handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            if (!['image/png', 'image/jpeg'].includes(file.type)) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.project.image = e.target.result;
                this.projectImageBase64 = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        addMemberToList() {
            if (!this.memberEmail) return;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.memberEmail)) return;

            const exists = this.project.members.some(m => m.email === this.memberEmail || m.name === this.memberEmail);
            if (exists) {
                this.memberEmail = '';
                return;
            }

            this.project.members.push({ email: this.memberEmail });

            if (this.isEditMode) {
                this.newlyAddedEmails.push(this.memberEmail);
            }

            this.memberEmail = '';
        },

        removeMemberFromList(index) {
            const memberToRemove = this.project.members[index];
            this.project.members.splice(index, 1);

            if (this.isEditMode && memberToRemove.email) {
                this.newlyAddedEmails = this.newlyAddedEmails.filter(e => e !== memberToRemove.email);
            }
        },

        async handleSave() {
            if (!this.canEditProject) return;

            if (this.isEditMode) {
                await this.handleUpdateProject();
            } else {
                await this.handleCreateProject();
            }
        },

        async handleCreateProject() {
            if (this.isCreating || !this.project.name) return;
            this.isCreating = true;

            try {
                const invitesList = this.project.members
                    .map(m => m.email)
                    .filter(email => email);

                const payload = {
                    ...this.project,
                    invites: invitesList
                };

                await this.createProject(payload);
                this.$emit('cancel-new-group');
            } catch (error) {
                console.error("Falha ao criar projeto:", error);
            } finally {
                this.isCreating = false;
            }
        },

        async handleUpdateProject() {
            if (this.isCreating) return;
            this.isCreating = true;

            try {
                const changes = {};
                if (this.project.name !== this.originalProject.name) changes.name = this.project.name;
                if (this.project.description !== this.originalProject.description) changes.description = this.project.description;
                if (this.project.image !== this.originalProject.image) changes.image = this.project.image;

                if (Object.keys(changes).length > 0) {
                    await this.updateProject(this.originalProject, changes);
                }

                if (this.newlyAddedEmails.length > 0 && this.isConnected) {
                    await api.post(`/projects/${this.originalProject.id}/invite/batch`, {
                        emails: this.newlyAddedEmails
                    });
                }

                this.$emit('cancel-new-group');
            } catch (error) {
                console.error("Falha ao atualizar projeto:", error);
            } finally {
                this.isCreating = false;
                this.newlyAddedEmails = [];
            }
        },

        handleDeleteImage() {
            this.project.image = '';
            this.projectImageBase64 = defaultProjectImage;
        },

        confirmDeleteProject() {
            this.showDeleteProjectModal = true;
        },

        async handleDeleteProject() {
            if (!this.originalProject || !this.originalProject.id || !this.originalProject.localId) {
                return;
            }

            this.isCreating = true;
            try {
                await this.deleteProject(this.originalProject.id, this.originalProject.localId);
                this.$emit('cancel-new-group');
            } catch (error) {
                console.error("Erro ao deletar projeto:", error);
            } finally {
                this.showDeleteProjectModal = false;
                this.isCreating = false;
            }
        },
    }
}
</script>

<style scoped>
.new-group-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
}

.modal-wrapper {
    position: absolute !important;
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

.remove-member-btn {
    background: none;
    border: none;
    color: var(--white);
    font-size: var(--fontsize-sm);
    cursor: pointer;
    margin-left: 5px;
}

.pending-members {
    display: flex;
    gap: var(--space-3);
    font-size: var(--fontsize-xs);
    flex-wrap: wrap;
    color: var(--text-gray);
    margin-top: var(--space-2);
}

.pending-members span {
    background-color: var(--deep-blue);
    color: var(--white);
    padding: var(--space-2) var(--space-3);
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

.image-actions {
    display: flex;
    gap: var(--space-3);
}

.preview-refresh,
.preview-delete-image {
    background: none;
    border: none;
    color: white;
    font-size: var(--fontsize-sm);
    cursor: pointer;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;
}

.preview-refresh:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

.preview-delete-image {
    color: var(--red);
}

.preview-delete-image:hover {
    background-color: rgba(255, 0, 0, 0.2);
}

.actions-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--gray-700);
}

@media (max-width: 768px) {
    .form-container {
        flex-direction: column;
        flex-grow: initial;
    }

    .preview-image {
        height: 150px;
    }

    .form-inputs {
        gap: var(--space-2);
    }
}
</style>