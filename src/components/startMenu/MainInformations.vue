<template>
    <div class="info-wrapper">

        <transition-group tag="div" name="tag-anim" class="tags-container">
            <div class="tag-container" v-for="tag in user.occupations" :key="tag.localId">
                <span class="tag">{{ tag.name }}</span>
                <button class="delete-tag-btn" @click="handleRemoveOccupation(tag)" title="Remover">
                    <font-awesome-icon icon="xmark" />
                </button>
            </div>

            <transition name="fade-switch" mode="out-in" :key="'static-add-key'">
                <div v-if="!isAddingOccupation" class="tag-container" key="add-btn">
                    <button class="add-tag-btn" @click="showAddInput" title="Adicionar Ocupação">
                        <font-awesome-icon icon="plus" />
                    </button>
                </div>
                <div v-else class="add-tag-form" key="add-form">
                    <input type="text" v-model="newOccupationName" placeholder="Nova ocupação"
                        @keyup.enter="handleAddNewOccupation" @keyup.esc="cancelAddOccupation"
                        @focusout="handleAddNewOccupation" ref="addTagInput" maxlength="50" />
                </div>
            </transition>
        </transition-group>

        <section class="info-section">
            <div class="section-header">
                <p>Biografia</p>
                <button @click="toggleBioEdit(true)" class="icon-button" title="Editar Biografia" v-if="!isEditingBio">
                    <font-awesome-icon icon="pencil" />
                </button>
            </div>

            <transition name="fade-switch" mode="out-in">
                <p v-if="!isEditingBio" class="biography-text" key="bio-text">
                    {{ user.bio || "Escreva sobre você..." }}
                </p>

                <div v-else class="bio-editor" key="bio-editor">
                    <textarea v-model="editableBio" ref="bioTextarea" rows="5"
                        placeholder="Escreva sobre você..."></textarea>
                    <div class="bio-editor-actions">
                        <button @click="toggleBioEdit(false)" class="btn-small btn-cancel">Cancelar</button>
                        <button @click="handleSaveBio" class="btn-small btn-save">Salvar</button>
                    </div>
                </div>
            </transition>
        </section>

        <section class="info-section">
            <div class="section-header">
                <p>Meus projetos</p>
                <button class="icon-button" id="create-group" title="Adicionar Projeto"
                    @click="$emit('request-new-group')">
                    <font-awesome-icon icon="plus" />
                </button>
            </div>

            <div class="projects-grid" v-if="my_projects.length > 0">
                <div class="project-card" v-for="project in projects" :key="project.id || project.localId"
                    @click="$emit('request-edit-group', project)">
                    <img :src="project.image || defaultProjectImage" :alt="project.name">
                    <span :data-name="project.name">&nbsp;</span>
                </div>
            </div>
            <p v-else class="empty-state">Você ainda não criou nenhum projeto.</p>
        </section>
        <section class="info-section" v-if="participating_projects.length > 0">
            <div class="section-header">
                <p>Projetos que eu faço parte</p>
            </div>

            <div class="projects-grid">
                <div class="project-card" v-for="project in projects" :key="project.id || project.localId"
                    @click="$emit('request-edit-group', project)">
                    <img :src="project.image || defaultProjectImage" :alt="project.name">
                    <span :data-name="project.name">&nbsp;</span>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useProjectStore } from '@/stores/projects';
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";

export default {
    name: "MainInformations",
    emits: ['request-new-group', 'request-edit-group'],
    data() {
        return {
            isAddingOccupation: false,
            newOccupationName: '',
            defaultProjectImage: defaultProjectImage,
            isEditingBio: false,
            editableBio: ''
        }
    },
    computed: {
        ...mapState(useAuthStore, ['user']),
        ...mapState(useProjectStore, ['projects']),
        my_projects() {
            if (!this.user || !this.user.id) return [];

            return this.projects.filter(project => {
                if (!Array.isArray(project.members)) return false;

                const me = project.members.find(member => member.id === this.user.id);

                return me && me.role === 'admin';
            });
        },
        participating_projects() {
            if (!this.user || !this.user.id) return [];

            return this.projects.filter(project => {
                if (!Array.isArray(project.members)) return false;

                const me = project.members.find(member => member.id === this.user.id);

                return me && me.role !== 'admin';
            });
        }
    },
    methods: {
        ...mapActions(useAuthStore, [
            'addNewOccupation',
            'removeOccupation',
            'updateUserBio'
        ]),
        toggleBioEdit(isEditing) {
            this.isEditingBio = isEditing;
            if (isEditing) {
                this.editableBio = this.user.bio || '';
                setTimeout(() => {
                    this.$refs.bioTextarea.focus();
                }, 300)
            }
        },

        async handleSaveBio() {
            if (this.editableBio === this.user.bio) {
                this.toggleBioEdit(false);
                return;
            }
            try {
                await this.updateUserBio(this.editableBio);
                this.toggleBioEdit(false);
            } catch (error) {
                console.error("Falha ao salvar bio localmente:", error);
            }
        },
        showAddInput() {
            this.isAddingOccupation = true;
            setTimeout(() => {
                this.$refs.addTagInput.focus();
            }, 300);
        },
        cancelAddOccupation() {
            this.isAddingOccupation = false;
            this.newOccupationName = '';
        },
        async handleAddNewOccupation() {
            if (this.newOccupationName.trim() !== '') {
                await this.addNewOccupation(this.newOccupationName);
            }
            this.cancelAddOccupation();
        },
        async handleRemoveOccupation(occupation) {
            await this.removeOccupation(occupation);
        }
    }
}
</script>

<style scoped>
.info-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
    padding: var(--space-4) 0;
}

.info-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    & p {
        font-size: var(--fontsize-sm);
        font-weight: 600;
        color: var(--deep-blue);
    }
}

.icon-button {
    background: none;
    border: none;
    color: var(--gray-100);
    font-size: var(--fontsize-sm);
    cursor: pointer;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

.tags-container>* {
    margin: calc(var(--space-3) / 2);
}

.tag-container {
    background-color: var(--gray-700);
    color: var(--gray-100);
    border-radius: var(--radius-sm);
    font-size: var(--fontsize-xs);
    font-weight: 500;
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
}

.tag {
    padding: var(--space-2) var(--space-4);
    transition: padding 0.2s ease;
}

.delete-tag-btn {
    background: var(--gray-600);
    color: var(--gray-100);
    border: none;
    cursor: pointer;
    font-size: var(--fontsize-xs);
    height: 100%;
    width: 0;
    opacity: 0;
    padding-left: 0 !important;
    transition: all 0.25s ease-out;
    white-space: nowrap;
}

.tag-container:hover .delete-tag-btn {
    width: auto;
    opacity: 1;
    padding: var(--space-2) var(--space-3);
}

.delete-tag-btn:hover {
    background: var(--red-high);
}

.add-tag-btn {
    background: none;
    border: 1px dashed var(--gray-500);
    color: var(--gray-100);
    padding: calc(var(--space-2) - 1px) var(--space-4);
    border-radius: var(--radius-sm);
    cursor: pointer;
    height: 25px;
    font-size: var(--fontsize-xs);
    transition: all 0.15s ease;
}

.add-tag-btn:hover {
    background: var(--gray-700);
    border-color: var(--gray-700);
}

.add-tag-form {
    display: flex;
    gap: var(--space-2);
}

.add-tag-form input {
    padding: var(--space-2);
    margin-left: 5px;
    width: 150px;
    height: 25px;
    border-radius: 5px;
}

.biography-text {
    color: var(--text-gray);
    line-height: 1.6;
    font-size: var(--fontsize-xs);
}

.bio-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.bio-editor textarea {
    padding: var(--space-3);
    margin-left: 4px;
    width: 100%;
    background-color: var(--gray-700);
    color: var(--text-gray);
    border: 1px solid var(--gray-600);
    border-radius: var(--radius-sm);
    resize: vertical;
}

.bio-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
}

.projects-grid {
    display: flex;
    gap: var(--space-5);
    flex-wrap: wrap;
}

.project-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    border-radius: var(--radius-sm);
    overflow: hidden;
    cursor: pointer;
    position: relative;
    min-width: 180px;

    & img {
        width: 100%;
        height: 120px;
        object-fit: cover;
    }

    & span {
        font-weight: 500;
        color: var(--deep-blue);
        padding-bottom: var(--space-2);
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        display: inline-block;
        color: var(--white);

        &::after {
            content: attr(data-name);
            width: 100%;
            position: absolute;
            bottom: 0;
            left: 0;
            background-image: linear-gradient(to top, rgba(46, 46, 46, 0.6) 60%, transparent);
            height: 120%;
            display: flex;
            align-items: center;
            padding-left: var(--space-6);
            padding-bottom: var(--space-3);
            padding-top: var(--space-3);
        }
    }
}

.fade-switch-enter-active,
.fade-switch-leave-active {
    transition: all 0.2s ease;
}

.fade-switch-enter-from,
.fade-switch-leave-to {
    opacity: 0;
    transform: translateY(5px);
}

.tag-anim-enter-active,
.tag-anim-leave-active,
.tag-anim-move {
    transition: opacity 0.4s ease,
        max-width 0.4s ease,
        padding 0.4s ease,
        margin 0.4s ease,
        transform 0.4s ease;
}

.tag-anim-enter-from,
.tag-anim-leave-to {
    opacity: 0;
    max-width: 0;
    padding-left: 0;
    padding-right: 0;
    margin-left: 0 !important;
    margin-right: 0 !important;
}

.tag-anim-leave-active {
    position: absolute;
    z-index: -1;
}
</style>