<template>
  <div class="task-detail-modal" @click="handle_global_click">
    <header class="modal-header">
      <div class="header-content">
        <span class="project-name">{{ projectName }}</span>
        <div class="title-row">
          <h3 class="task-id">#{{ task_display_id }}</h3>
          <span v-if="is_dirty" class="dirty-badge">Alterações não salvas</span>
        </div>
      </div>
      <div class="header-actions">
        <transition name="scale-btn">
          <button v-if="is_dirty" class="action-btn check" @click="handle_save" title="Salvar" type="button">
            <font-awesome-icon icon="check" />
          </button>
        </transition>
        <button class="action-btn delete" @click="$emit('delete', editable_task)" title="Excluir" type="button">
          <font-awesome-icon icon="trash-can" />
        </button>
        <button class="action-btn close" @click="$emit('close')" title="Fechar" type="button">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>
    </header>

    <nav class="task-tabs" aria-label="Secoes da tarefa">
      <button type="button" class="tab-btn" :class="{ active: active_tab === 'details' }"
        @click="active_tab = 'details'">
        Detalhes
      </button>
      <button type="button" class="tab-btn" :class="{ active: active_tab === 'attachments' }"
        @click="active_tab = 'attachments'">
        Anexos
        <span class="tab-count">{{ attachment_count }}</span>
      </button>
      <button type="button" class="tab-btn" :class="{ active: active_tab === 'comments' }"
        @click="active_tab = 'comments'">
        Comentários
        <span class="tab-count">{{ comment_count }}</span>
      </button>
    </nav>

    <main class="modal-body">
      <form :style="active_tab === 'comments' ? 'height: fit-content !important;' : ''"
        v-show="active_tab === 'details'" class="tab-panel details-panel" @submit.prevent="handle_save">
        <section class="description-card">
          <label for="task-description">Descricao</label>
          <textarea id="task-description" v-model="editable_task.description" rows="7"
            class="description-input"></textarea>
        </section>

        <section class="field-grid">
          <div class="form-group">
            <label>Responsável</label>
            <CustomDropdown v-model="selected_responsible_wrapper" :options="responsible_options"
              placeholder="Selecionar responsável">
              <template #trigger="{ selected }">
                <div class="dropdown-row" v-if="selected">
                  <img v-if="selected.avatar" :src="selected.avatar" class="avatar avatar-xs" />
                  <div v-else class="avatar-placeholder" :class="selected.iconClass">
                    <font-awesome-icon :icon="selected.icon" />
                  </div>
                  <span>{{ selected.name }}</span>
                </div>
                <span v-else class="placeholder-text">Nao atribuido</span>
              </template>
              <template #option="{ option }">
                <div class="dropdown-row">
                  <img v-if="option.avatar" :src="option.avatar" class="avatar avatar-xs" />
                  <div v-else class="avatar-placeholder" :class="option.iconClass">
                    <font-awesome-icon :icon="option.icon" />
                  </div>
                  <span>{{ option.name }}</span>
                </div>
              </template>
            </CustomDropdown>
          </div>

          <div class="form-group">
            <label>Prioridade</label>
            <CustomDropdown v-model="editable_task.priority" :options="priority_options">
              <template #trigger="{ selected }">
                <div class="dropdown-row">
                  <span class="priority-dot" :class="get_priority_color(selected)"></span>
                  <span :class="get_priority_text_color(selected)">{{ selected }}</span>
                </div>
              </template>
              <template #option="{ option }">
                <div class="dropdown-row">
                  <span class="priority-dot" :class="get_priority_color(option)"></span>
                  <span :class="get_priority_text_color(option)">{{ option }}</span>
                </div>
              </template>
            </CustomDropdown>
          </div>

          <div class="form-group">
            <label>Tamanho</label>
            <CustomDropdown v-model="editable_task.size" :options="size_options" />
          </div>
        </section>

        <footer class="meta-info">
          <span>Tarefa aberta por <strong>{{ task_creator_name }}</strong></span>
          <span>{{ created_time_ago }}</span>
        </footer>
      </form>

      <section v-show="active_tab === 'attachments'" class="tab-panel attachments-panel">
        <div class="section-toolbar">
          <div>
            <h4>Anexos</h4>
            <p>{{ attachment_count }} arquivo{{ attachment_count === 1 ? "" : "s" }}</p>
          </div>
          <button type="button" class="btn-attach" @click="$refs.attachmentInput?.click()" title="Anexar arquivo">
            <font-awesome-icon icon="cloud-arrow-up" />
            <span>Anexar</span>
          </button>
          <input ref="attachmentInput" type="file" class="hidden-file-input" @change="handle_attachment_selected" />
        </div>

        <p v-if="attachment_error" class="attachment-error">{{ attachment_error }}</p>

        <div v-if="editable_task.attachments?.length" class="attachment-list custom-scrollbar">
          <div v-for="attachment in editable_task.attachments" :key="attachment.local_id || attachment.id"
            class="attachment-item" role="button" tabindex="0" @click="open_attachment(attachment)"
            @keydown.enter.prevent="open_attachment(attachment)">
            <div class="attachment-icon">
              <font-awesome-icon :icon="attachment_icon(attachment)" />
            </div>
            <div class="attachment-main">
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">{{ format_file_size(attachment.size_bytes) }}</span>
            </div>
            <span v-if="attachment.upload_status !== 'synced'" class="attachment-status">
              <font-awesome-icon icon="spinner" spin />
              Sincronizando
            </span>
            <button type="button" class="btn-attachment-delete" @click.stop="remove_attachment(attachment)"
              title="Excluir anexo">
              <font-awesome-icon icon="trash-can" />
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <font-awesome-icon icon="cloud-arrow-up" />
          <p>Nenhum anexo nesta tarefa.</p>
        </div>
      </section>

      <section v-show="active_tab === 'comments'" class="tab-panel comments-panel">
        <div class="comments-header">
          <h4>Comentários</h4>
          <span>{{ comment_count }}</span>
        </div>

        <div class="comment-list custom-scrollbar" v-if="editable_task.comments && editable_task.comments.length"
          ref="commentList">
          <div v-for="comment in editable_task.comments" :key="comment.local_id" class="comment-item">
            <div class="comment-header">
              <img :src="comment.author.avatar || default_account_image" class="avatar avatar-sm" />
              <div class="comment-meta">
                <span class="comment-author">{{ comment.author.name }}</span>
                <span class="comment-time" :title="format_full_date(comment.timestamp || comment.created_at)">
                  {{ format_time_ago(comment.timestamp || comment.created_at) }}
                </span>
              </div>

              <div class="comment-options" v-if="is_current_user(comment.author.id)">
                <button class="btn-icon-small" @click.stop="toggle_comment_menu(comment.local_id)" type="button"
                  title="Opcoes">
                  <font-awesome-icon icon="ellipsis-vertical" />
                </button>
                <transition name="fade-switch">
                  <div v-if="open_comment_menu === comment.local_id" class="comment-menu glass"
                    v-click-outside="close_comment_menu">
                    <button type="button" @click="edit_comment(comment)">
                      <font-awesome-icon icon="pencil" /> Editar
                    </button>
                    <button type="button" class="danger" @click="delete_comment(comment)">
                      <font-awesome-icon icon="trash-can" /> Excluir
                    </button>
                  </div>
                </transition>
              </div>
            </div>

            <div class="comment-content-wrapper">
              <div v-if="editing_comment_id === comment.local_id" class="comment-edit-box">
                <textarea v-model="editing_comment_content" rows="2"></textarea>
                <div class="edit-actions">
                  <button class="btn-small btn-cancel" @click="cancel_edit_comment" type="button">
                    Cancelar
                  </button>
                  <button class="btn-small btn-save" @click="save_edit_comment(comment)" type="button">
                    Salvar
                  </button>
                </div>
              </div>
              <div v-else class="comment-bubble">
                <p>{{ comment.content }}</p>
              </div>

              <div class="comment-actions-bar">
                <button class="btn-like" :class="{ liked: comment.liked_by_me }" @click="toggle_like(comment)"
                  title="Curtir" type="button">
                  <font-awesome-icon :icon="['fas', 'thumbs-up']" />
                  <span>{{ comment.likes_count || 0 }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="comment-list-placeholder" v-else>
          <p>Nenhum comentario ainda.</p>
        </div>

        <div class="new-comment-area">
          <img :src="user?.avatar || default_account_image" class="avatar avatar-sm" />
          <div class="new-comment-box">
            <textarea v-model="new_comment_text" placeholder="Escreva um comentario..." rows="1"
              @keydown.enter.exact.prevent="submit_comment" ref="commentInput"></textarea>
            <button class="btn-send" :class="{ active: new_comment_text.trim() }" @click="submit_comment" title="Enviar"
              type="button">
              <font-awesome-icon icon="paper-plane" />
            </button>
          </div>
        </div>
      </section>
    </main>

    <teleport to="body">
      <div v-if="preview_attachment" class="attachment-preview-overlay" @click.self="close_attachment_preview">
        <div class="attachment-preview-modal">
          <header class="attachment-preview-header">
            <strong>{{ preview_attachment.name }}</strong>
            <div class="preview-actions">
              <a v-if="preview_url" class="preview-action" :href="preview_url" :download="preview_attachment.name"
                target="_blank" rel="noopener" title="Baixar">
                <font-awesome-icon icon="download" />
              </a>
              <button type="button" class="preview-action" @click="close_attachment_preview" title="Fechar">
                <font-awesome-icon icon="xmark" />
              </button>
            </div>
          </header>

          <div class="attachment-preview-body">
            <img v-if="preview_kind === 'image'" :src="preview_url" :alt="preview_attachment.name" />
            <video v-else-if="preview_kind === 'video'" :src="preview_url" controls></video>
            <iframe v-else-if="preview_kind === 'html'" :src="preview_url" sandbox></iframe>
            <pre v-else-if="preview_kind === 'text'">{{ preview_text }}</pre>
            <div v-else class="unsupported-preview">
              <font-awesome-icon icon="download" />
              <p>Este tipo de arquivo pode ser baixado.</p>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useKanbanStore } from "@/stores/kanban";
import { useAuthStore } from "@/stores/auth";
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";
import CustomDropdown from "../ui/CustomDropdown.vue";

import moment from "moment/min/moment-with-locales";

moment.locale("pt-br");

export default {
  name: "TaskDetailForm",
  components: { CustomDropdown },
  props: {
    task: { type: Object, required: true },
    projectName: { type: String, default: "Projeto" },
    members: { type: Array, default: () => [] },
  },
  emits: ["close", "delete", "delete-comment"],

  directives: {
    "click-outside": {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },

  data() {
    return {
      active_tab: "details",
      editable_task: {},
      original_snapshot: "",
      default_account_image: defaultAccountImage,
      priority_options: ["Normal", "Importante", "Urgente"],
      size_options: ["P - Pequeno", "M - M\u00e9dio", "G - Grande"],
      selected_responsible_wrapper: null,
      attachment_error: "",
      preview_attachment: null,
      preview_url: "",
      preview_kind: "",
      preview_text: "",
      preview_object_url: "",

      new_comment_text: "",
      open_comment_menu: null,
      editing_comment_id: null,
      editing_comment_content: "",

      showConfirmModal: false,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    task_display_id() {
      return this.task.id || this.task.local_id;
    },

    is_dirty() {
      if (!this.original_snapshot) return false;
      const current = this.get_clean_task_data(this.editable_task);
      const original = this.get_clean_task_data(JSON.parse(this.original_snapshot));
      return JSON.stringify(current) !== JSON.stringify(original);
    },

    attachment_count() {
      return this.editable_task.attachments?.length || 0;
    },

    comment_count() {
      return this.editable_task.comments?.length || 0;
    },

    task_creator_name() {
      if (this.task.creator && this.task.creator.name) {
        return this.task.creator.name;
      }
      return "Desconhecido";
    },

    created_time_ago() {
      if (!this.task.created_at) return "algum tempo";

      return moment(this.task.created_at).locale("pt-br").fromNow();
    },

    responsible_options() {
      const base = [
        {
          id: "all",
          name: "Todos",
          icon: "users",
          iconClass: "all-icon",
          type: "special",
        },
        {
          id: "any",
          name: "Qualquer",
          icon: "dice",
          iconClass: "any-icon",
          type: "special",
        },
      ];
      const members = this.members.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar || this.default_account_image,
        originalData: m,
        type: "user",
        icon: "user",
        iconClass: "bg-gray",
      }));
      return [...base, ...members];
    },
  },
  created() {
    moment.locale("pt-br");
  },
  methods: {
    ...mapActions(useKanbanStore, [
      "updateTask",
      "addCommentToTask",
      "toggleCommentLike",
      "editTaskComment",
      "deleteTaskComment",
      "addTaskAttachment",
      "deleteTaskAttachment",
    ]),

    get_clean_task_data(task) {
      const clone = JSON.parse(JSON.stringify(task));
      delete clone.comments;
      delete clone.attachments;
      return clone;
    },

    snapshot_task() {
      this.editable_task = JSON.parse(JSON.stringify(this.task));

      if (!this.editable_task.comments) {
        this.editable_task.comments = [];
      }
      if (!this.editable_task.attachments) {
        this.editable_task.attachments = [];
      }
      if (!this.editable_task.priority) this.editable_task.priority = "Importante";
      if (!this.editable_task.size) this.editable_task.size = "M - M\u00e9dio";

      this.sync_responsible_wrapper();

      this.apply_responsible_change(this.selected_responsible_wrapper);

      this.original_snapshot = JSON.stringify(this.editable_task);
    },

    sync_responsible_wrapper() {
      const current = this.editable_task.responsible;
      if (!current) {
        this.selected_responsible_wrapper = null;
        return;
      }

      if (current === "all" || current.type === "all") {
        this.selected_responsible_wrapper = this.responsible_options.find(
          (o) => o.id === "all"
        );
      } else if (current === "any" || current.type === "any") {
        this.selected_responsible_wrapper = this.responsible_options.find(
          (o) => o.id === "any"
        );
      } else if (typeof current === "object") {
        const found = this.responsible_options.find((o) => o.id === current.id);
        this.selected_responsible_wrapper = found || {
          id: current.id,
          name: current.name,
          avatar: current.avatar || this.default_account_image,
          type: "user",
          icon: "user",
          iconClass: "bg-gray",
        };
      }
    },

    async handle_save() {
      if (this.is_dirty) {
        await this.updateTask(this.editable_task);
        this.snapshot_task();
        this.$emit("close");
      }
    },

    is_current_user(authorId) {
      return this.user && this.user.id === authorId;
    },

    format_full_date(timestamp) {
      if (!timestamp) return "";
      return moment(timestamp).locale("pt-br").format("LLLL");
    },

    format_time_ago(timestamp) {
      if (!timestamp) return "";
      return moment(timestamp).locale("pt-br").fromNow();
    },

    toggle_comment_menu(commentLocalId) {
      this.open_comment_menu =
        this.open_comment_menu === commentLocalId ? null : commentLocalId;
    },

    close_comment_menu() {
      this.open_comment_menu = null;
    },
    handle_global_click(event) {
      if (this.open_comment_menu !== null) {
        const menuEl = this.$el.querySelector(".comment-menu");
        if (menuEl && !menuEl.contains(event.target)) {
          this.close_comment_menu();
        }
      }
    },

    async toggle_like(comment) {
      const isLiked = !comment.liked_by_me;

      comment.liked_by_me = isLiked;

      const likes_count = parseInt(comment.likes_count);

      comment.likes_count = isLiked ? (likes_count || 0) + 1 : (likes_count || 0) - 1;

      try {
        await this.toggleCommentLike(this.editable_task, comment);
      } catch (error) {
        console.error("Erro ao persistir like:", error);
        comment.liked_by_me = !isLiked;
        comment.likes_count = isLiked ? likes_count - 1 : likes_count + 1;
      }
    },

    edit_comment(comment) {
      this.editing_comment_id = comment.local_id;
      this.editing_comment_content = comment.content;
      this.close_comment_menu();
    },

    cancel_edit_comment() {
      this.editing_comment_id = null;
      this.editing_comment_content = "";
    },

    async save_edit_comment(comment) {
      if (!this.editing_comment_content.trim()) return;

      comment.content = this.editing_comment_content;

      try {
        await this.editTaskComment(
          this.editable_task,
          comment,
          this.editing_comment_content
        );
      } catch (error) {
        console.error("Erro ao editar:", error);
      }

      this.cancel_edit_comment();
    },

    delete_comment(comment) {
      this.$emit("delete-comment", { task: this.editable_task, comment: comment });
      this.close_comment_menu();
    },

    async submit_comment() {
      if (!this.new_comment_text.trim()) return;

      try {
        const newComment = await this.addCommentToTask(
          this.editable_task,
          this.new_comment_text
        );

        if (!this.editable_task.comments) this.editable_task.comments = [];

        if (newComment) {
          const exists = this.editable_task.comments.find(
            (c) => c.local_id === newComment.local_id
          );
          if (!exists) this.editable_task.comments.push(newComment);
        }

        this.new_comment_text = "";

        this.$nextTick(() => {
          const container = this.$refs.commentList;
          if (container) container.scrollTop = container.scrollHeight;
        });
      } catch (error) {
        console.error("Erro ao enviar comentario:", error);
      }
    },

    async handle_attachment_selected(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      this.attachment_error = "";
      if (!file) return;

      try {
        const attachment = await this.addTaskAttachment(this.editable_task, file);
        if (!this.editable_task.attachments) this.editable_task.attachments = [];

        const idx = this.editable_task.attachments.findIndex(
          (item) => item.local_id === attachment.local_id
        );
        if (idx === -1) {
          this.editable_task.attachments.push(attachment);
        } else {
          this.editable_task.attachments[idx] = attachment;
        }
      } catch (error) {
        this.attachment_error =
          error?.response?.data?.message || error.message || "Nao foi possivel anexar.";
      }
    },

    async remove_attachment(attachment) {
      await this.deleteTaskAttachment(this.editable_task, attachment);
      this.editable_task.attachments = (this.editable_task.attachments || []).filter(
        (item) => item.local_id !== attachment.local_id
      );
    },

    attachment_icon(attachment) {
      const kind = this.get_attachment_kind(attachment);
      if (kind === "image") return "image";
      if (kind === "video") return "circle-play";
      if (kind === "text" || kind === "html") return "list";
      return "clipboard";
    },

    get_attachment_kind(attachment) {
      const mime = attachment.mime_type || "";
      const name = (attachment.name || "").toLowerCase();
      if (mime.startsWith("image/")) return "image";
      if (mime.startsWith("video/")) return "video";
      if (mime.includes("html") || name.endsWith(".html") || name.endsWith(".htm")) return "html";
      if (
        mime.startsWith("text/") ||
        [".sql", ".json", ".xml", ".csv", ".log", ".md", ".js", ".ts", ".css"].some((ext) =>
          name.endsWith(ext)
        )
      ) {
        return "text";
      }
      return "download";
    },

    async open_attachment(attachment) {
      this.close_attachment_preview();
      this.preview_attachment = attachment;
      this.preview_kind = this.get_attachment_kind(attachment);
      this.preview_text = "";

      if (attachment.blob) {
        this.preview_object_url = URL.createObjectURL(attachment.blob);
        this.preview_url = this.preview_object_url;
      } else {
        this.preview_url = attachment.url;
      }

      if (this.preview_kind === "text") {
        try {
          this.preview_text = attachment.blob
            ? await attachment.blob.text()
            : await (await fetch(attachment.url)).text();
        } catch (error) {
          this.preview_text = "Nao foi possivel carregar a previa deste arquivo.";
        }
      }

      if (this.preview_kind === "download" && this.preview_url) {
        window.open(this.preview_url, "_blank", "noopener");
      }
    },

    close_attachment_preview() {
      if (this.preview_object_url) {
        URL.revokeObjectURL(this.preview_object_url);
      }
      this.preview_attachment = null;
      this.preview_url = "";
      this.preview_kind = "";
      this.preview_text = "";
      this.preview_object_url = "";
    },

    format_file_size(bytes) {
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      const value = bytes / Math.pow(1024, index);
      return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
    },

    get_priority_color(val) {
      const map = { Normal: "bg-gray", Importante: "bg-orange", Urgente: "bg-red" };
      return map[val] || "bg-gray";
    },
    get_priority_text_color(val) {
      const map = { Normal: "text-gray", Importante: "text-orange", Urgente: "text-red" };
      return map[val] || "text-gray";
    },
    apply_responsible_change(wrapper) {
      if (!this.editable_task) return;

      if (wrapper) {
        if (wrapper.type === "special") {
          this.editable_task.responsible = {
            type: wrapper.id,
          };
        } else {
          this.editable_task.responsible = {
            type: "user",
            id: wrapper.id,
            name: wrapper.name,
            avatar: wrapper.avatar,
          };
        }
      } else {
        this.editable_task.responsible = null;
      }
    },
  },
  watch: {
    "task.local_id": {
      handler() {
        this.active_tab = "details";
        this.snapshot_task();
      },
      immediate: true,
    },
    "task.comments": {
      handler(newComments) {
        if (!newComments) return;
        if (!this.editable_task.comments) this.editable_task.comments = [];

        newComments.forEach((serverComment) => {
          const exists = this.editable_task.comments.find(
            (local) => local.local_id === serverComment.local_id
          );
          if (!exists) {
            this.editable_task.comments.push(JSON.parse(JSON.stringify(serverComment)));
          } else {
            if (this.editing_comment_id !== serverComment.local_id) {
              exists.likes = serverComment.likes;
              exists.liked_by_me = serverComment.liked_by_me;
            }
          }
        });
      },
      deep: true,
    },
    "task.attachments": {
      handler(newAttachments) {
        if (!newAttachments) return;
        if (!this.editable_task.attachments) this.editable_task.attachments = [];

        newAttachments.forEach((attachment) => {
          const index = this.editable_task.attachments.findIndex(
            (local) => local.local_id === attachment.local_id
          );
          if (index === -1) {
            this.editable_task.attachments.push({ ...attachment });
          } else {
            this.editable_task.attachments[index] = {
              ...this.editable_task.attachments[index],
              ...attachment,
            };
          }
        });
      },
      deep: true,
    },
    selected_responsible_wrapper: {
      handler(newVal) {
        this.apply_responsible_change(newVal);
      },
      deep: true,
    },
  },
  beforeUnmount() {
    this.close_attachment_preview();
  },
};
</script>

<style scoped>
.task-detail-modal {
  height: 100%;
  min-height: 0;
  width: 100%;
  min-width: 0;
  background-color: var(--surface-1);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;

  & main {
    height: 100% !important;
    width: 100% !important;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-6) var(--space-7) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
}

.header-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 700;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.task-id {
  font-size: var(--fontsize-md);
  font-weight: 900;
  color: var(--text-primary);
  margin: 0;
  user-select: auto;
}

.dirty-badge {
  border-radius: 999px;
  background: var(--amber-high);
  color: var(--amber);
  font-size: 0.74rem;
  font-weight: 800;
  padding: 4px 9px;
  animation: pulse-sutil 2s infinite ease-in-out;
}

@keyframes pulse-sutil {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

.header-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.action-btn,
.btn-icon-small,
.preview-action,
.btn-attachment-delete,
.btn-send {
  display: grid;
  place-items: center;
}

.action-btn {
  width: 34px;
  height: 34px;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: var(--fontsize-xs);
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  transition: color var(--transition-fast), transform var(--transition-fast), background var(--transition-fast);
}

.action-btn:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  border-color: var(--glass-border);
}

.action-btn.check {
  color: var(--color-income);
}

.action-btn.check:hover {
  transform: scale(1.06);
}

.action-btn.delete:hover {
  color: var(--color-expense);
}

.task-tabs {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  padding: 0 var(--space-7);
  height: 48px;
  border-bottom: 1px solid var(--glass-border);
  overflow-y: hidden;
  position: relative;
}

.tab-btn {
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: color var(--transition-fast);
  position: relative;
  padding: 0 var(--space-1);
}

.tab-btn:hover {
  background: transparent;
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--color-info);
  background: transparent;
  border: none;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-info);
  border-radius: 3px 3px 0 0;
  opacity: 0;
  transform: scaleX(0.5);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.tab-btn.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.tab-count {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-primary);
  font-size: 0.72rem;
  border: 1px solid var(--glass-border);
}

.modal-body {
  min-height: 0;
  min-width: 0;
  padding: var(--space-6) var(--space-7) var(--space-7);
}

.tab-panel {
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.details-panel {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: var(--space-5);
  align-content: start;
  overflow: hidden;
}

.description-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
}

.description-card label,
.form-group label {
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 800;
  position: static;
  transform: none;
}

.description-input {
  height: clamp(150px, 32vh, 240px);
  min-height: 150px;
  max-height: 240px;
  resize: none;
  overflow: auto;
  background-color: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
  font-size: var(--fontsize-sm);
  line-height: 1.45;
  color: var(--text-primary);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.description-input:focus {
  outline: 3px solid var(--color-info);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: var(--space-4);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
}

.form-group {
  gap: 7px;
  margin: 0 !important;
  min-width: 0;
  max-width: 100%;
}

.form-group :deep(.custom-dropdown),
.form-group :deep(.dropdown-trigger),
.form-group :deep(.trigger-content) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.dropdown-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.dropdown-row span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.placeholder-text {
  color: var(--text-muted);
}

.priority-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bg-orange {
  background-color: var(--orange);
}

.bg-red {
  background-color: var(--red);
}

.bg-gray {
  background-color: var(--text-muted);
}

.text-orange {
  color: var(--orange);
  font-weight: 700;
}

.text-red {
  color: var(--red);
  font-weight: 700;
}

.text-gray {
  color: var(--text-secondary);
}

.avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--white);
  flex-shrink: 0;
}

.all-icon {
  background-color: var(--color-info);
}

.any-icon {
  background-color: var(--orange);
}

.meta-info {
  min-height: 42px;
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 var(--space-4);
}

.attachments-panel,
.comments-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  position: relative;
}

.attachments-panel {
  display: flex;
  flex-direction: column;
}

.section-toolbar,
.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.section-toolbar h4,
.comments-header h4 {
  font-size: var(--fontsize-sm);
  color: var(--text-primary);
  margin: 0;
}

.section-toolbar p,
.comments-header span {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
}

.btn-attach {
  height: 38px;
  border: none;
  background: #1F274C;
  color: #ffffff;
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0 var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 800;
  transition: background var(--transition-fast);
}

.btn-attach:hover {
  background: #344079;
}

[data-theme="dark"] .btn-attach {
  background: var(--color-info);
  color: #ffffff;
}

[data-theme="dark"] .btn-attach:hover {
  background: #355AFD;
}

.hidden-file-input {
  display: none;
}

.attachment-error {
  color: var(--color-expense);
  font-size: var(--fontsize-xs);
  margin: 0;
}

.attachment-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-right: 2px;
}

.attachment-item {
  min-height: 54px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.attachment-item:hover {
  border-color: var(--color-info);
  background: var(--surface-3);
}

.attachment-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-primary);
}

.attachment-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fontsize-xs);
  font-weight: 800;
}

.attachment-size,
.attachment-status {
  font-size: 0.74rem;
  color: var(--text-secondary);
  font-weight: 700;
}

.attachment-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-attachment-delete {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.btn-attachment-delete:hover {
  color: var(--color-expense);
  background: var(--red-high);
}

.empty-state,
.comment-list-placeholder {
  min-height: 0;
  flex: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--fontsize-sm);
  text-align: center;
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
  max-height: calc(100% - 125px);
}

.empty-state svg {
  font-size: 1.6rem;
}

.comment-list {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-right: 2px;
  max-height: calc(100% - 110px);
}

.comment-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  position: relative;

  & img {
    margin: 5px;
  }
}

.comment-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex-grow: 1;
  min-width: 0;
}

.comment-author {
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.comment-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comment-options {
  position: relative;
}

.btn-icon-small {
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.btn-icon-small:hover {
  color: var(--text-primary);
  background: var(--surface-3);
}

.comment-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 4px 0;
  z-index: 10;
  min-width: 112px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border);
}

.comment-menu button {
  background: none;
  border: none;
  padding: 8px 12px;
  text-align: left;
  font-size: var(--fontsize-xs);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background var(--transition-fast);
}

.comment-menu button:hover {
  background: var(--surface-3);
}

.comment-menu button.danger {
  color: var(--color-expense);
}

.comment-content-wrapper {
  padding-left: 52px;
}

.comment-bubble {
  background-color: var(--surface-2);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.4;
  position: relative;
  border: 1px solid var(--glass-border);
}

.comment-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-actions-bar {
  margin-top: 4px;
  display: flex;
  gap: 10px;
}

.btn-like {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.btn-like.liked,
.btn-like:hover {
  color: var(--color-info);
}

.comment-edit-box textarea {
  width: 100%;
  border: 1px solid var(--color-info);
  border-radius: var(--radius-sm);
  padding: 8px;
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
  min-height: 78px;
  background: var(--surface-1);
  color: var(--text-primary);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.new-comment-area {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding-top: var(--space-6);
  border-top: 1px solid var(--glass-border);
  position: absolute;
  bottom: 0;
  width: 100%;
}

.new-comment-box {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  transition: border-color var(--transition-fast);
}

.new-comment-box:focus-within {
  border-color: var(--color-info);
}

.new-comment-box textarea {
  flex-grow: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  resize: none;
  outline: none;
  font-size: 0.9rem;
  height: 36px;
  color: var(--text-primary);
  box-shadow: none;
}

.btn-send {
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  transition: color 0.2s;
}

.btn-send.active,
.btn-send:hover {
  color: var(--color-info);
}

.attachment-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: var(--overlay-heavy);
  padding: 24px;
}

.attachment-preview-modal {
  width: min(920px, 96vw);
  height: min(720px, 88vh);
  background: var(--surface-1);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  box-shadow: var(--shadow-float);
  border: 1px solid var(--glass-border);
}

.attachment-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
}

.attachment-preview-header strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-action {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-decoration: none;
}

.attachment-preview-body {
  min-height: 0;
  display: grid;
  place-items: center;
  background: var(--surface-2);
}

.attachment-preview-body img,
.attachment-preview-body video,
.attachment-preview-body iframe {
  width: 100%;
  height: 100%;
  border: none;
  object-fit: contain;
  background: var(--surface-1);
}

.attachment-preview-body pre {
  width: 100%;
  height: 100%;
  overflow: auto;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
  background: #101820;
  color: #f5f7fb;
  font-size: 0.85rem;
}

.unsupported-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
}

@media (max-width: 760px) {

  .modal-header,
  .task-tabs,
  .modal-body {
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }

  .modal-header {
    align-items: center;
  }

  .task-tabs {
    overflow-x: auto;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .details-panel {
    grid-template-rows: auto auto auto;
    gap: var(--space-4);
  }

  .description-input {
    height: clamp(130px, 28vh, 190px);
    min-height: 130px;
    max-height: 190px;
  }

  .attachment-item {
    grid-template-columns: 34px minmax(0, 1fr) 30px;
  }

  .attachment-status {
    grid-column: 2;
  }

  .comment-content-wrapper {
    padding-left: 0;
  }

  .meta-info {
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    padding: var(--space-3) var(--space-4);
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding-top: var(--space-5);
    gap: var(--space-3);
  }

  .header-actions {
    gap: 3px;
  }

  .action-btn {
    width: 31px;
    height: 31px;
  }

  .tab-btn {
    padding: 0 var(--space-3);
  }

  .new-comment-area>.avatar {
    display: none;
  }
}
</style>
