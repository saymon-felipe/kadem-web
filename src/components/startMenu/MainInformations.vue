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
                <button class="icon-button" title="Adicionar Projeto">
                    <font-awesome-icon icon="plus" />
                </button>
            </div>
            <div class="projects-grid">
                <div class="project-card" v-for="i in 10" :key="i">
                    <img src="https://via.placeholder.com/150/d3d3d3/808080?text=Cademint" alt="Cademint">
                    <span>Cademint</span>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useAuthStore } from '@/stores/auth';

export default {
    // --- Nome do Componente ---
    name: "MainInformations",

    // --- Estado Local (data) ---
    data() {
        return {
            // Estado de Ocupações
            isAddingOccupation: false,
            newOccupationName: '',

            // Estado de Biografia
            isEditingBio: false,
            editableBio: ''
        }
    },

    // --- Propriedades Computadas (getters) ---
    computed: {
        ...mapState(useAuthStore, ['user']),
    },

    // --- Métodos (setters/ações) ---
    methods: {
        // --- Ações da Store ---
        ...mapActions(useAuthStore, [
            'updateUserProfile',
            'addNewOccupation',
            'removeOccupation',
            'updateUserBio'
        ]),

        // --- Métodos de Biografia ---
        toggleBioEdit(isEditing) {
            this.isEditingBio = isEditing;
            if (isEditing) {
                this.editableBio = this.user.bio || '';
                // Aguarda a animação de transição (0.2s) + margem
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

        // --- Métodos de Ocupações (Tags) ---
        showAddInput() {
            this.isAddingOccupation = true;
            // Aguarda a animação de transição (0.2s) + margem
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
/* ======================= */
/* --- Layout Geral --- */
/* ======================= */
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

/* ======================= */
/* --- Tags (Ocupações) --- */
/* ======================= */
.tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

/* Simula o 'gap' para permitir animação */
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

/* --- Formulário de Adicionar Tag --- */
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

/* ======================= */
/* --- Editor de Bio --- */
/* ======================= */
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
    /* Estilos (provavelmente globais) */
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

/* ======================= */
/* --- Seção Projetos --- */
/* ======================= */
.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-5);
}

.project-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;

    & img {
        width: 100%;
        height: 80px;
        object-fit: cover;
    }

    & span {
        font-weight: 500;
        color: var(--deep-blue);
        text-align: center;
        padding-bottom: var(--space-2);
    }
}

/* ======================= */
/* --- Animações Vue --- */
/* ======================= */

/* Animação de troca (Bio e Botão Add) */
.fade-switch-enter-active,
.fade-switch-leave-active {
    transition: all 0.2s ease;
}

.fade-switch-enter-from,
.fade-switch-leave-to {
    opacity: 0;
    transform: translateY(5px);
}

/* Animação da lista de Tags */
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