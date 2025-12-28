<template>
  <div class="new-group-wrapper">
    <h2 class="title">{{ title }}</h2>

    <div class="form-container">
      <div class="form-inputs">
        <div class="form-group">
          <input
            id="group-name"
            type="text"
            v-model="project.name"
            placeholder=" "
            required
            :disabled="!canEditProject"
          />
          <label for="group-name">Nome</label>
        </div>

        <div class="form-group">
          <input
            id="group-desc"
            type="text"
            v-model="project.description"
            placeholder=" "
            required
            :disabled="!canEditProject"
          />
          <label for="group-desc">Descrição</label>
        </div>

        <div class="form-group" v-if="canEditProject">
          <input
            id="add-member"
            type="email"
            v-model="memberEmail"
            @keyup.enter="addMemberToList"
            placeholder=" "
            required
            :disabled="!connection.connected"
            :title="
              !connection.connected
                ? 'A funcionalidade de convidar membros para o grupo só está disponível offline.'
                : ''
            "
          />
          <label for="add-member">Adicionar membro (pressione Enter)</label>
        </div>

        <div class="pending-members">
          <span
            v-for="(item, index) in displayList"
            :key="index"
            :class="getBadgeClass(item)"
            :title="getBadgeTitle(item)"
          >
            {{ item.displayName }} {{ item.isOwner ? "(Admin)" : "" }}

            <button
              @click="handleRemoveItem(item)"
              class="remove-member-btn"
              title="Remover"
              :disabled="isCreating"
              v-if="canEditProject && !item.isOwner"
            >
              &times;
            </button>
          </span>
        </div>

        <LoadingResponse
          :msg="response"
          :type="responseType"
          styletype="small"
          :loading="false"
        />
      </div>

      <div class="preview-card-container">
        <div class="preview-card">
          <img :src="projectImageBase64" alt="Preview" class="preview-image" />
          <div class="preview-overlay">
            <span class="preview-title">{{ project.name || "Nome do grupo" }}</span>
            <div class="image-actions">
              <button
                v-if="canEditProject"
                class="preview-refresh"
                @click="triggerImageUpload"
                title="Alterar imagem"
              >
                <font-awesome-icon icon="arrows-rotate" />
              </button>
              <button
                v-if="
                  project.image &&
                  project.image !== defaultProjectImage &&
                  isEditMode &&
                  canEditProject
                "
                class="preview-delete-image"
                @click="handleDeleteImage"
                title="Remover imagem"
              >
                <font-awesome-icon icon="trash-can" />
              </button>
            </div>
          </div>
        </div>

        <input
          type="file"
          ref="imageInput"
          @change="handleImageUpload"
          accept="image/png, image/jpeg"
          style="display: none"
        />

        <div class="actions-footer">
          <button
            v-if="isEditMode && isUserAdmin"
            class="btn btn-red"
            @click="confirmDeleteProject"
            :disabled="isCreating"
          >
            Excluir projeto
          </button>

          <button class="btn" @click="$emit('cancel-new-group')">
            {{ canEditProject ? "Cancelar" : "Fechar" }}
          </button>

          <button
            v-if="canEditProject"
            class="btn btn-primary"
            @click="handleSave"
            :disabled="isCreating"
          >
            {{ saveButtonText }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmationModal
      v-model="showDeleteProjectModal"
      message="Tem certeza que deseja excluir este projeto?"
      confirm-text="Excluir"
      @confirmed="handleDeleteProject"
      @cancelled="showDeleteProjectModal = false"
    />
  </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import { mapActions, mapState } from "pinia";
import { useProjectStore } from "@/stores/projects";
import { useAuthStore } from "@/stores/auth";
import { useUtilsStore } from "@/stores/utils";
import { api } from "@/plugins/api";

import ConfirmationModal from "@/components/ConfirmationModal.vue";
import LoadingResponse from "@/components/loadingResponse.vue";

export default {
  name: "NewProject",
  components: {
    ConfirmationModal,
    LoadingResponse,
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
      projectImageBase64: defaultProjectImage,
      memberEmail: "",
      isCreating: false,
      showDeleteProjectModal: false,
      newlyAddedEmails: [],
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useUtilsStore, ["connection"]),

    // Computed para unificar a exibição
    displayList() {
      const list = [];

      // 1. Membros confirmados (objetos)
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

      // 2. Convites pendentes (strings ou objetos parciais)
      if (this.project.invites && Array.isArray(this.project.invites)) {
        this.project.invites.forEach((email) => {
          // Evita duplicatas visuais se o email já estiver na lista de membros (ex: convite aceito mas lista não limpa)
          const exists = list.some(
            (item) => item.data.email === email || item.displayName === email
          );

          if (!exists) {
            list.push({
              type: "invite",
              data: email, // Aqui é a string do email
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
        : "Criar grupo";
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.memberEmail)) return;

      const existsInMembers = this.project.members.some(
        (m) => m.email === this.memberEmail
      );
      const existsInInvites = this.project.invites.some(
        (email) => email === this.memberEmail
      );

      if (existsInMembers || existsInInvites) {
        this.memberEmail = "";
        return;
      }

      this.project.invites.push(this.memberEmail);

      if (this.isEditMode) {
        this.newlyAddedEmails.push(this.memberEmail);
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
      if (this.isCreating || !this.project.name) return;
      this.isCreating = true;

      try {
        await this.createProject(this.project);
        this.$emit("cancel-new-group");
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

        if (Object.keys(changes).length > 0) {
          await this.updateProject(this.originalProject, changes);
        }

        if (this.newlyAddedEmails.length > 0 && this.connection.connected) {
          await api.post(`/projects/${this.originalProject.id}/invite/batch`, {
            emails: this.newlyAddedEmails,
          });
        }

        this.$emit("cancel-new-group");
      } catch (error) {
        console.error("Falha ao atualizar projeto:", error);
      } finally {
        this.isCreating = false;
        this.newlyAddedEmails = [];
      }
    },
    triggerImageUpload() {
      if (this.canEditProject) {
        this.$refs.imageInput.click();
      }
    },

    handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!["image/png", "image/jpeg"].includes(file.type)) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.project.image = e.target.result;
        this.projectImageBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
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
        this.$emit("cancel-new-group");
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
}

.modal-overlay {
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
  color: var(--white);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.badge-active {
  background-color: var(--deep-blue);
}

.badge-pending {
  background-color: var(--gray-300);
  color: var(--black);
  border: 1px solid var(--gray-100);
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

@media (max-width: 1100px) {
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
