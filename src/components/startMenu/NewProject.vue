<template>
  <div class="new-group-wrapper">
    <!-- Header com ícone, título e subtítulo -->
    <div class="new-project-header">
      <div class="header-icon-badge" :class="{ 'is-editing': isEditMode }" aria-hidden="true">
        <font-awesome-icon :icon="isEditMode ? 'pencil' : 'folder-plus'" />
      </div>
      <div class="header-text-group">
        <h2 class="title">{{ title }}</h2>
        <p class="subtitle">
          {{
            isEditMode
              ? "Atualize as informações, foto de capa e membros deste projeto."
              : "Defina os detalhes iniciais e escolha o fluxo de trabalho ideal."
          }}
        </p>
      </div>
    </div>

    <!-- Conteúdo principal do formulário -->
    <div class="form-container" :class="{ 'is-creating-project': !isEditMode }">
      <!-- Coluna esquerda: Campos e membros -->
      <div class="form-inputs">
        <div class="form-group custom-field">
          <input
            id="group-name"
            type="text"
            v-model="project.name"
            placeholder=" "
            required
            :disabled="!canEditProject"
            autocomplete="off"
          />
          <label for="group-name">Nome do projeto *</label>
        </div>

        <div class="form-group custom-field">
          <input
            id="group-desc"
            type="text"
            v-model="project.description"
            placeholder=" "
            required
            :disabled="!canEditProject"
            autocomplete="off"
          />
          <label for="group-desc">Descrição (opcional)</label>
        </div>

        <div class="form-group custom-field member-input-group" v-if="canEditProject">
          <div class="input-with-button">
            <input
              id="add-member"
              type="email"
              v-model="memberEmail"
              @keyup.enter.prevent="addMemberToList"
              placeholder=" "
              required
              :disabled="!connection.connected"
              :title="
                !connection.connected
                  ? 'A funcionalidade de convidar membros para o grupo só está disponível online.'
                  : ''
              "
              autocomplete="off"
            />
            <label for="add-member">Adicionar membro por e-mail</label>

            <button
              type="button"
              class="btn-inline-add"
              :class="{ 'is-active': isValidEmail && connection.connected }"
              :disabled="!isValidEmail || !connection.connected"
              @click="addMemberToList"
              :title="isValidEmail ? 'Adicionar participante' : 'Digite um e-mail válido'"
            >
              <font-awesome-icon icon="plus" class="btn-inline-icon" />
              <span class="btn-inline-label">Adicionar</span>
            </button>
          </div>
        </div>

        <!-- Alerta suave de modo offline para membros -->
        <div v-if="!connection.connected && canEditProject" class="offline-member-notice">
          <font-awesome-icon icon="wifi" class="notice-icon" />
          <span>Modo offline: novos membros poderão ser convidados ao reconectar.</span>
        </div>

        <!-- Lista de membros e convites pendentes -->
        <div class="pending-members-section" v-if="displayList.length">
          <div class="members-section-header">
            <font-awesome-icon icon="users" class="members-header-icon" />
            <span class="members-header-title">Participantes</span>
            <span class="members-count-badge">{{ displayList.length }}</span>
          </div>

          <transition-group name="chip-anim" tag="div" class="pending-members">
            <span
              v-for="(item, index) in displayList"
              :key="item.displayName || index"
              class="member-chip"
              :class="getBadgeClass(item)"
              :title="getBadgeTitle(item)"
            >
              <span class="member-chip-avatar">{{ getMemberInitials(item.displayName) }}</span>
              <span class="member-badge-name">{{ item.displayName }}</span>
              <span v-if="item.isOwner" class="owner-pill">Admin</span>
              <span v-else-if="item.type === 'invite'" class="invite-pill">Pendente</span>

              <button
                type="button"
                @click="handleRemoveItem(item)"
                class="remove-member-btn"
                title="Remover"
                :disabled="isCreating"
                v-if="canEditProject && !item.isOwner"
              >
                <font-awesome-icon icon="xmark" />
              </button>
            </span>
          </transition-group>
        </div>

        <LoadingResponse
          v-if="response"
          :msg="response"
          :type="responseType"
          styletype="small"
          :loading="false"
        />
      </div>

      <!-- Coluna direita: Card de Capa / Imagem do Projeto -->
      <div class="preview-card-container">
        <div
          class="preview-card"
          :class="{ 'is-clickable': canEditProject }"
          @click="canEditProject && triggerImageUpload()"
          :title="canEditProject ? 'Clique para alterar a capa do projeto' : ''"
        >
          <img :src="projectImageBase64" alt="Prévia da capa" class="preview-image" />

          <!-- Tag de cabeçalho da capa -->
          <div class="preview-card-tag" aria-hidden="true">
            <font-awesome-icon icon="image" />
            <span>Capa do projeto</span>
          </div>

          <!-- Overlay no hover para incentivar clique de upload -->
          <div v-if="canEditProject" class="preview-hover-scrim" aria-hidden="true">
            <div class="preview-hover-badge">
              <font-awesome-icon icon="camera" />
              <span>Alterar imagem</span>
            </div>
          </div>

          <!-- Barra de título e ações na base da imagem -->
          <div class="preview-overlay" @click.stop>
            <div class="preview-info-box">
              <span class="preview-tag-small">Prévia</span>
              <span class="preview-title" :title="project.name || 'Nome do grupo'">
                {{ project.name || "Nome do grupo" }}
              </span>
            </div>

            <div class="image-actions">
              <button
                v-if="canEditProject"
                type="button"
                class="preview-action-btn"
                @click="triggerImageUpload"
                title="Alterar imagem"
              >
                <font-awesome-icon icon="arrows-rotate" />
              </button>
              <button
                v-if="
                  project.image &&
                  project.image !== defaultProjectImage &&
                  canEditProject
                "
                type="button"
                class="preview-action-btn delete-action"
                @click="handleDeleteImage"
                title="Remover capa personalizada"
              >
                <font-awesome-icon icon="trash-can" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divisor sutil e Seção do Modelo de Kanban -->
    <div class="kanban-section-divider" v-if="!isEditMode"></div>

    <KanbanPresetPicker
      v-if="!isEditMode"
      v-model="selectedKanbanPreset"
      :disabled="isCreating"
      class="kanban-presets"
    />

    <!-- Rodapé de ações -->
    <div class="actions-footer">
      <div class="footer-left">
        <button
          v-if="isEditMode && isUserAdmin"
          type="button"
          class="btn btn-danger-outline"
          @click="confirmDeleteProject"
          :disabled="isCreating"
        >
          <font-awesome-icon icon="trash-can" class="btn-icon" />
          <span>Excluir projeto</span>
        </button>
      </div>

      <div class="footer-right">
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleCancelNewGroup"
          :disabled="isCreating"
        >
          {{ canEditProject ? "Cancelar" : "Fechar" }}
        </button>

        <button
          v-if="canEditProject"
          type="button"
          class="btn btn-primary"
          :class="{ 'btn-loading': isCreating }"
          @click="handleSave"
          :disabled="isCreating || (!isEditMode && !isFormValid)"
        >
          <font-awesome-icon
            v-if="!isCreating"
            :icon="isEditMode ? 'check' : 'plus'"
            class="btn-icon"
          />
          <font-awesome-icon
            v-else
            icon="circle-notch"
            class="btn-icon fa-spin"
          />
          <span>{{ saveButtonText }}</span>
        </button>
      </div>
    </div>

    <ConfirmationModal
      v-model="showDeleteProjectModal"
      message="Tem certeza que deseja excluir este projeto?"
      confirm-text="Excluir"
      @confirmed="handleDeleteProject"
      @cancelled="showDeleteProjectModal = false"
    />

    <ImageCropperModal
      v-model="isCropModalOpen"
      title="Foto do Projeto"
      :aspect-ratio="1"
      @close="isCropModalOpen = false"
      @save="handleCropSave"
    />
  </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import { mapActions, mapState } from "pinia";
import { useProjectStore } from "@/stores/projects";
import { useAuthStore } from "@/stores/auth";
import { useUtilsStore } from "@/stores/utils";

import ConfirmationModal from "@/components/ConfirmationModal.vue";
import LoadingResponse from "@/components/loadingResponse.vue";
import ImageCropperModal from "@/components/ImageCropperModal.vue";
import KanbanPresetPicker from "@/components/projects/KanbanPresetPicker.vue";
import { DEFAULT_KANBAN_PRESET } from "@/utils/kanbanPresets";

export default {
  name: "NewProject",
  components: {
    ConfirmationModal,
    LoadingResponse,
    ImageCropperModal,
    KanbanPresetPicker,
  },
  props: {
    projectToEdit: {
      type: Object,
      default: null,
    },
  },
  emits: ["cancel-new-group"],
  data() {
    return {
      project: {
        name: "",
        description: "",
        image: "",
        members: [], // Objetos completos {id, name, email, role}
        invites: [], // Strings de email ["a@a.com", "b@b.com"]
      },
      originalProject: null,
      selectedKanbanPreset: DEFAULT_KANBAN_PRESET,
      projectImageBase64: defaultProjectImage,
      memberEmail: "",
      isCreating: false,
      showDeleteProjectModal: false,
      isCropModalOpen: false,
      newlyAddedEmails: [],
      response: "",
      responseType: "",
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useUtilsStore, ["connection"]),

    displayList() {
      const list = [];

      if (this.project.members && Array.isArray(this.project.members)) {
        this.project.members.forEach((m) => {
          list.push({
            type: "member",
            data: m,
            displayName: m.name || m.email,
            isOwner: this.isMemberOwner(m),
            status: m.status || "active",
          });
        });
      }

      if (this.project.invites && Array.isArray(this.project.invites)) {
        this.project.invites.forEach((email) => {
          const exists = list.some(
            (item) => item.data.email === email || item.displayName === email
          );

          if (!exists) {
            list.push({
              type: "invite",
              data: email,
              displayName: email,
              isOwner: false,
              status: "pending",
            });
          }
        });
      }

      return list;
    },

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
        const me = this.originalProject.members.find((m) => m.id === this.user.id);
        return me && me.role === "admin";
      }

      return false;
    },

    title() {
      if (!this.isEditMode) return "Criar projeto";
      return this.canEditProject
        ? "Editar projeto"
        : this.project.name || "Detalhes do Projeto";
    },

    saveButtonText() {
      return this.isCreating
        ? this.isEditMode
          ? "Salvando..."
          : "Criando..."
        : this.isEditMode
        ? "Salvar alterações"
        : "Criar projeto";
    },

    isValidEmail() {
      if (!this.memberEmail) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(this.memberEmail.trim());
    },

    isFormValid() {
      return !!(this.project.name && this.project.name.trim());
    },
  },
  watch: {
    projectToEdit: {
      handler(newProject) {
        if (newProject) {
          this.project = {
            name: newProject.name,
            description: newProject.description,
            image: newProject.image || "",
            members: newProject.members
              ? JSON.parse(JSON.stringify(newProject.members))
              : [],
            invites: newProject.invites
              ? JSON.parse(JSON.stringify(newProject.invites))
              : [],
          };
          this.originalProject = newProject;
          this.projectImageBase64 = newProject.image || defaultProjectImage;
        } else {
          this.selectedKanbanPreset = DEFAULT_KANBAN_PRESET;
          this.project = {
            name: "",
            description: "",
            image: "",
            members: [],
            invites: [],
          };
          this.originalProject = null;
          this.projectImageBase64 = defaultProjectImage;
        }
      },
      immediate: true,
    },
  },

  methods: {
    ...mapActions(useProjectStore, [
      "createProject",
      "updateProject",
      "deleteProject",
      "removeProjectMember",
      "revokeProjectInvite",
    ]),

    getMemberInitials(name) {
      if (!name) return "?";
      const clean = name.trim();
      const parts = clean.split(/\s+/);
      if (parts.length === 1) {
        return clean.substring(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    handleCancelNewGroup() {
      this.project = {
        name: "",
        description: "",
        image: "",
        members: [],
        invites: [],
      };
      this.originalProject = null;
      this.projectImageBase64 = defaultProjectImage;
      this.selectedKanbanPreset = DEFAULT_KANBAN_PRESET;
      this.memberEmail = "";
      this.isCreating = false;
      this.showDeleteProjectModal = false;
      this.isCropModalOpen = false;
      this.newlyAddedEmails = [];
      this.response = "";
      this.responseType = "";

      this.$emit("cancel-new-group");
    },

    getBadgeClass(item) {
      if (item.type === "member" && item.status !== "pending") return "badge-active";
      return "badge-pending";
    },

    getBadgeTitle(item) {
      if (item.type === "member") return "Membro do Grupo";
      return "Convite Enviado (Pendente)";
    },

    isMemberOwner(member) {
      if (member.role === "admin") return true;

      if (
        this.isEditMode &&
        this.originalProject &&
        Array.isArray(this.originalProject.members)
      ) {
        const owner = this.originalProject.members.find((m) => m.role === "admin");
        if (owner) {
          if (member.id && member.id === owner.id) return true;
          if (member.email && owner.email && member.email === owner.email) return true;
        }
      }
      return false;
    },

    addMemberToList() {
      if (!this.memberEmail) return;
      const emailTrimmed = this.memberEmail.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) return;

      const existsInMembers = this.project.members.some(
        (m) => m.email === emailTrimmed
      );
      const existsInInvites = this.project.invites.some(
        (email) => email === emailTrimmed
      );

      if (existsInMembers || existsInInvites) {
        this.memberEmail = "";
        return;
      }

      this.project.invites.push(emailTrimmed);

      if (this.isEditMode) {
        this.newlyAddedEmails.push(emailTrimmed);
      }

      this.memberEmail = "";
    },

    async handleRemoveItem(item) {
      if (this.isCreating) return;

      if (item.type === "member") {
        if (this.isEditMode) {
          this.isCreating = true;
          try {
            await this.removeProjectMember(
              this.originalProject.id,
              this.originalProject.localId,
              item.data.id
            );

            this.project.members = this.project.members.filter(
              (m) => m.id !== item.data.id
            );
          } catch (e) {
            console.error(e);
          } finally {
            this.isCreating = false;
          }
        } else {
          this.project.members = this.project.members.filter((m) => m !== item.data);
        }
      } else if (item.type === "invite") {
        const targetEmail = item.data;

        if (this.isEditMode) {
          if (this.newlyAddedEmails.includes(targetEmail)) {
            this.newlyAddedEmails = this.newlyAddedEmails.filter(
              (e) => e !== targetEmail
            );
            this.project.invites = this.project.invites.filter((e) => e !== targetEmail);
            return;
          }

          this.isCreating = true;
          try {
            await this.revokeProjectInvite(
              this.originalProject.id,
              this.originalProject.localId,
              targetEmail
            );
            this.project.invites = this.project.invites.filter((e) => e !== targetEmail);
          } catch (e) {
            console.error(e);
          } finally {
            this.isCreating = false;
          }
        } else {
          this.project.invites = this.project.invites.filter((e) => e !== targetEmail);
        }
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
      if (this.isCreating || !this.project.name.trim()) return;
      this.isCreating = true;
      this.response = "";

      try {
        const result = await this.createProject(this.project, this.selectedKanbanPreset);

        if (result.invites_status && result.invites_status.length > 0) {
          const hasErrors = this.checkInviteErrors(result.invites_status);
          if (hasErrors) return;
        }

        this.handleCancelNewGroup();
      } catch (error) {
        this.response =
          error?.response?.data?.message || error.message || "Falha ao criar projeto.";
        this.responseType = "error";
      } finally {
        this.isCreating = false;
      }
    },

    async handleUpdateProject() {
      if (this.isCreating) return;
      this.isCreating = true;
      this.response = "";

      let changes = {};
      if (this.project.name !== this.originalProject.name)
        changes.name = this.project.name;
      if (this.project.description !== this.originalProject.description)
        changes.description = this.project.description;
      if (this.project.image !== this.originalProject.image)
        changes.image = this.project.image;

      if (
        JSON.stringify(this.project.invites) !==
        JSON.stringify(this.originalProject.invites)
      ) {
        changes.invites = this.project.invites;
      }

      try {
        if (Object.keys(changes).length > 0) {
          const result = await this.updateProject(this.originalProject, changes);

          if (result.invites_status && result.invites_status.length > 0) {
            const hasErrors = this.checkInviteErrors(result.invites_status);
            if (hasErrors) {
              this.newlyAddedEmails = [];
              return;
            }
          }
        }

        this.handleCancelNewGroup();
      } catch (error) {
        this.response =
          error?.response?.data?.message || error.message || "Erro ao atualizar projeto.";
        this.responseType = "error";
      } finally {
        this.isCreating = false;
        if (this.responseType !== "error") this.newlyAddedEmails = [];
      }
    },
    checkInviteErrors(details) {
      const failedItems = details.filter((d) => d.status === "error");

      if (failedItems.length > 0) {
        const failedEmails = failedItems.map((d) => d.email);
        this.project.members = this.project.members.filter(
          (m) => !failedEmails.includes(m.email)
        );
        this.project.invites = this.project.invites.filter(
          (e) => !failedEmails.includes(e)
        );

        const firstError = failedItems[0].error || "Alguns convites falharam.";
        this.response = firstError;
        this.responseType = "error";
        return true;
      }
      return false;
    },
    triggerImageUpload() {
      if (this.canEditProject) {
        this.isCropModalOpen = true;
      }
    },

    handleCropSave(base64Image) {
      this.project.image = base64Image;
      this.projectImageBase64 = base64Image;
      this.isCropModalOpen = false;
    },

    handleDeleteImage() {
      this.project.image = "";
      this.projectImageBase64 = defaultProjectImage;
    },

    confirmDeleteProject() {
      this.showDeleteProjectModal = true;
    },

    async handleDeleteProject() {
      if (
        !this.originalProject ||
        !this.originalProject.id ||
        !this.originalProject.localId
      ) {
        return;
      }

      this.isCreating = true;
      try {
        await this.deleteProject(this.originalProject.id, this.originalProject.localId);
        this.handleCancelNewGroup();
      } catch (error) {
        console.error("Erro ao deletar projeto:", error);
      } finally {
        this.showDeleteProjectModal = false;
        this.isCreating = false;
      }
    },
  },
};
</script>

<style scoped>
.new-group-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  padding-bottom: var(--space-4);
}

/* Header com Ícone e Hierarquia Visual */
.new-project-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.header-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(95, 124, 255, 0.12);
  color: var(--color-info);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
  border: 1px solid rgba(95, 124, 255, 0.2);
  transition: transform var(--transition-fast);
}

.header-icon-badge.is-editing {
  background: rgba(255, 202, 55, 0.14);
  color: var(--yellow);
  border-color: rgba(255, 202, 55, 0.25);
}

.header-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-size: var(--fontsize-lg);
  font-weight: 700;
  color: var(--deep-blue);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

/* Layout do Formulário */
.form-container {
  display: flex;
  gap: var(--space-7);
  flex-grow: 1;
}

.form-container.is-creating-project {
  flex-grow: 0;
}

.form-inputs {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

/* Input com Botão Inline */
.input-with-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.btn-inline-add {
  position: absolute;
  right: 8px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 3;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.btn-inline-add.is-active {
  background: var(--color-info);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(53, 90, 253, 0.3);
}

.btn-inline-add.is-active:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-inline-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.offline-member-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(245, 158, 11, 0.1);
  border: 1px dashed rgba(245, 158, 11, 0.35);
  color: var(--color-warning);
  font-size: 12px;
  line-height: 1.4;
}

/* Seção de Participantes */
.pending-members-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.members-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.members-header-icon {
  font-size: 11px;
  color: var(--color-info);
}

.members-count-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  color: var(--text-muted);
}

.pending-members {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.member-chip {
  padding: 4px 10px 4px 6px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.member-chip:hover {
  transform: translateY(-1px);
}

.member-chip-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.member-badge-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-active {
  background: var(--surface-2);
  border-color: rgba(95, 124, 255, 0.25);
}

[data-theme="dark"] .badge-active {
  background: rgba(95, 124, 255, 0.12);
  color: #c5cae9;
  border-color: rgba(95, 124, 255, 0.35);
}

.badge-pending {
  border: 1px dashed var(--gray-400);
  background: var(--surface-1);
  color: var(--text-muted);
}

.owner-pill {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  background: var(--color-info);
  color: #ffffff;
  letter-spacing: 0.5px;
}

.invite-pill {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  background: rgba(245, 158, 11, 0.18);
  color: var(--color-warning);
}

.remove-member-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  margin-left: 2px;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.remove-member-btn:hover {
  background: rgba(214, 74, 46, 0.15);
  color: var(--red);
  transform: scale(1.15);
}

/* Transições dos Chips de Membros */
.chip-anim-enter-active,
.chip-anim-leave-active {
  transition: all 0.2s ease;
}

.chip-anim-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

.chip-anim-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* Card de Capa / Imagem */
.preview-card-container {
  flex: 1;
  min-width: 220px;
  max-width: 280px;
}

.preview-card {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--surface-2);
  border: 1px solid var(--glass-border);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  cursor: default;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.preview-card.is-clickable {
  cursor: pointer;
}

.preview-card.is-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
  border-color: rgba(95, 124, 255, 0.4);
}

.preview-image {
  width: 100%;
  height: 190px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.preview-card.is-clickable:hover .preview-image {
  transform: scale(1.04);
}

.preview-card-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.preview-hover-scrim {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.preview-card.is-clickable:hover .preview-hover-scrim {
  opacity: 1;
}

.preview-hover-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.95);
  color: #111827;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
  transform: translateY(4px);
  transition:
    transform var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.preview-hover-badge svg {
  color: #111827;
  font-size: 12px;
}

.preview-card.is-clickable:hover .preview-hover-badge {
  transform: translateY(0);
}

[data-theme="dark"] .preview-hover-badge {
  background: rgba(255, 255, 255, 0.95);
  color: #111827;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
}

[data-theme="dark"] .preview-hover-badge svg {
  color: #111827;
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(0deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.4) 75%, transparent 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-2);
}

.preview-info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.preview-tag-small {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.preview-action-btn {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.preview-action-btn:hover {
  background: rgba(255, 255, 255, 0.32);
  transform: rotate(30deg);
}

.preview-action-btn.delete-action {
  color: #ff8577;
}

.preview-action-btn.delete-action:hover {
  background: rgba(214, 74, 46, 0.4);
  color: #ffffff;
  transform: scale(1.1);
}

/* Divisor e Presets */
.kanban-section-divider {
  width: 100%;
  height: 1px;
  background: var(--glass-border);
  margin: var(--space-5) 0 var(--space-4);
}

.kanban-presets {
  margin-top: var(--space-2);
}

/* Rodapé */
.actions-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--glass-border);
  gap: var(--space-4);
  width: 100%;
}

.footer-left {
  display: flex;
  align-items: center;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn-icon {
  margin-right: 6px;
  font-size: 13px;
}

.actions-footer .btn {
  width: auto;
  min-width: 130px;
  height: 44px;
  min-height: 44px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast),
    opacity var(--transition-fast);
}

.btn-secondary {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-3);
  transform: translateY(-1px);
}

.btn-danger-outline {
  background: transparent;
  color: var(--red);
  border: 1px solid rgba(214, 74, 46, 0.35);
}

.btn-danger-outline:hover:not(:disabled) {
  background: rgba(214, 74, 46, 0.12);
  border-color: var(--red);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
}

.btn-loading {
  pointer-events: none;
  opacity: 0.8;
}

@media (max-width: 900px) {
  .form-container {
    flex-direction: column;
    gap: var(--space-5);
  }

  .preview-card-container {
    max-width: 100%;
    width: 100%;
  }

  .preview-image {
    height: 140px;
  }
}

@media (max-width: 600px) {
  .actions-footer {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  .footer-left,
  .footer-right {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: var(--space-3);
  }

  .footer-right {
    flex-direction: column-reverse;
  }

  .actions-footer .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-icon-badge,
  .preview-card,
  .preview-image,
  .preview-action-btn,
  .btn-inline-add,
  .chip-anim-enter-active,
  .chip-anim-leave-active {
    transition: none !important;
  }
}
</style>
