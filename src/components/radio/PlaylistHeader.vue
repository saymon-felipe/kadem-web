<template>
  <div class="playlist-hero" :style="hero_background">
    <img :src="playlist.cover || default_avatar" class="hero-cover" />

    <div class="hero-details">
      <div v-if="isEditing" class="edit-title-wrapper">
        <input
          ref="titleInput"
          v-model="tempName"
          @blur="save_rename"
          @keyup.enter="save_rename"
          class="title-input"
        />
      </div>
      <h1 v-else @dblclick="start_rename">{{ playlist.name }}</h1>

      <div class="meta-row">
        <span>{{
          track_count > 1
            ? track_count + " músicas"
            : track_count == 0
            ? "Nenhuma música"
            : "1 música"
        }}</span>
        <span
          v-if="total_duration_formatted && total_duration_seconds > 0"
          class="separator"
          >•</span
        >
        <span v-if="total_duration_seconds > 0">{{ total_duration_formatted }}</span>
      </div>
    </div>

    <div class="header-options">
      <button class="btn-options" @click.stop="showMenu = !showMenu">
        <font-awesome-icon icon="ellipsis-vertical" />
      </button>

      <transition name="menu-pop">
        <div v-if="showMenu" class="options-dropdown" v-click-outside="closeMenu">
          <button @click="start_rename" class="dropdown-item">
            <font-awesome-icon icon="pen" /> Renomear
          </button>
          <button @click="confirm_delete" class="dropdown-item danger">
            <font-awesome-icon icon="trash" /> Excluir
          </button>
        </div>
      </transition>
    </div>

    <ConfirmationModal
      v-model="showDeleteModal"
      message="Tem certeza que deseja excluir esta playlist?"
      confirmText="Excluir"
      @cancelled="showDeleteModal = false"
      @confirmed="execute_delete"
    />
  </div>
</template>

<script>
import ConfirmationModal from "@/components/ConfirmationModal.vue";

export default {
  components: {
    ConfirmationModal,
  },
  props: {
    playlist: {
      type: Object,
      required: true,
    },
    track_count: {
      type: Number,
      default: 0,
    },
    total_duration_seconds: {
      type: Number,
      default: 0,
    },
    default_cover: {
      type: String,
      required: true,
    },
    default_avatar: {
      type: String,
      required: true,
    },
  },
  emits: ["rename-playlist", "delete-playlist"],
  data() {
    return {
      showMenu: false,
      isEditing: false,
      tempName: "",
      showDeleteModal: false,
    };
  },
  computed: {
    hero_background() {
      const cover = this.playlist.cover || this.default_cover;
      return `background: linear-gradient(to top, rgba(255, 255, 255, 0.7), transparent), url(${cover}) no-repeat right center; background-size: cover;`;
    },
    total_duration_formatted() {
      return this.format_total_duration_verbose(this.total_duration_seconds);
    },
  },
  methods: {
    closeMenu() {
      this.showMenu = false;
    },
    start_rename() {
      this.tempName = this.playlist.name;
      this.isEditing = true;
      this.showMenu = false;
      this.$nextTick(() => {
        if (this.$refs.titleInput) this.$refs.titleInput.focus();
      });
    },
    save_rename() {
      if (this.isEditing) {
        this.isEditing = false;
        if (this.tempName.trim() && this.tempName !== this.playlist.name) {
          this.$emit("rename-playlist", this.playlist, this.tempName.trim());
        }
      }
    },
    confirm_delete() {
      this.showMenu = false;
      this.showDeleteModal = true;
    },
    execute_delete() {
      this.showDeleteModal = false;
      this.$emit("delete-playlist", this.playlist);
    },
  },
  directives: {
    "click-outside": {
      mounted(el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.body.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.body.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },
};
</script>

<style scoped>
/* Transições */
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

/* Layout Principal */
.playlist-hero {
  height: 180px;
  padding: var(--space-5);
  display: flex;
  align-items: end;
  gap: var(--space-5);
  color: var(--white);
  position: relative;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  flex-shrink: 0;
}

.hero-cover {
  width: 140px;
  height: 140px;
  box-shadow: var(--boxshadow-lg);
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.hero-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* Tipografia e Inputs */
h1 {
  margin: 0 0 var(--space-2) 0;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
  cursor: text;
}

.title-input {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--white);
  background: rgba(0, 0, 0, 0.2);
  border: none;
  border-bottom: 2px solid var(--white);
  width: 100%;
  outline: none;
  padding: 0;
  margin-bottom: var(--space-2);
}

.meta-row {
  display: flex;
  gap: var(--space-2);
  font-size: 0.9rem;
  opacity: 0.9;
  color: var(--deep-blue-2);
}

.separator {
  opacity: 0.6;
}

/* Botões e Menus */
.header-options {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
}

.btn-options {
  background: rgba(0, 0, 0, 0.3);
  border: none;
  color: var(--white);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-options:hover {
  background: rgba(0, 0, 0, 0.5);
}

.options-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  width: 150px;
  overflow: hidden;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  padding: 10px 15px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--deep-blue);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--background-gray);
}

.dropdown-item.danger {
  color: var(--red);
}
</style>
