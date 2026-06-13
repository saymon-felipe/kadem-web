<template>
  <div class="user-badge-wrapper">
    <div
      class="avatar-container clickable-avatar"
      :style="progressRingStyle"
      title="Clique para alterar foto de perfil"
      @click="trigger_avatar_upload"
    >
      <img :src="getAvatar()" :alt="user.name" class="avatar-image" />
      <div class="avatar-overlay">
        <font-awesome-icon icon="camera" />
      </div>
      <div class="level-badge">{{ user.level }}</div>
    </div>
    <div class="info-container">
      <span class="connected-as">Conectado como</span>
      <h2 class="user-name">{{ user.name }}</h2>
 
      <div class="medals-container" v-if="user.medals && user.medals.length">
        <img
          v-for="medal in user.medals.slice(0, 3)"
          :key="medal.id"
          :src="medal.image"
          :title="medal.name"
          class="medal-image"
        />
      </div>
    </div>

    <ImageCropperModal
      v-model="is_crop_modal_open"
      title="Alterar Foto de Perfil"
      :aspect-ratio="1"
      @close="is_crop_modal_open = false"
      @save="handle_avatar_save"
    />
  </div>
</template>

<script>
import ImageCropperModal from "./ImageCropperModal.vue";
import { mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";

export default {
  name: "avatarComponent",
  components: {
    ImageCropperModal,
  },
  props: {
    user: {
      type: Object,
      required: true,
      default: () => ({
        avatar: "",
        name: "Usuário",
        level: 1,
        level_progress: 0,
        medals: [],
      }),
    },
  },
  data() {
    return {
      is_crop_modal_open: false,
    };
  },
  computed: {
    progressRingStyle() {
      const progressDegrees = (this.user.level_progress / 100) * 360;

      return {
        "--progress-value-deg": `${progressDegrees}deg`,
      };
    },
    percentToNextLevel() {
      return Math.floor(this.user.level_progress);
    },
  },
  methods: {
    ...mapActions(useAuthStore, ["updateUserAvatar"]),
    getAvatar() {
      if (this.user.avatar) return this.user.avatar;

      const initials = this.user.name ? this.user.name.substring(0, 1) : "?";
      return `https://placehold.co/100x100/3B5998/FFFFFF?text=${initials}`;
    },
    trigger_avatar_upload() {
      this.is_crop_modal_open = true;
    },
    async handle_avatar_save(base64_image) {
      await this.updateUserAvatar(base64_image);
      this.is_crop_modal_open = false;
    },
  },
};
</script>

<style scoped>
.user-badge-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.avatar-container {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: var(--radius-full);
  background-image: conic-gradient(
    var(--deep-blue) var(--progress-value-deg),
    var(--gray-700) 0
  );
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.clickable-avatar {
  cursor: pointer;
  transition: transform var(--transition-fast, 0.15s) ease;
}

.clickable-avatar:hover {
  transform: scale(1.04);
}

.clickable-avatar:active {
  transform: scale(0.96);
}

.avatar-overlay {
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;
}

.clickable-avatar:hover .avatar-overlay {
  opacity: 1;
}

.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  object-fit: cover;
  z-index: 1;
}

@media (max-width: 1100px) {
  .avatar-container {
    width: 70px;
    height: 70px;
  }

  .avatar-image {
    width: 60px;
    height: 60px;
  }

  .avatar-overlay {
    top: 5px;
    left: 5px;
    right: 5px;
    bottom: 5px;
    font-size: 1rem;
  }
}

.level-badge {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-image: var(--deep-blue-gradient);
  color: var(--white);
  font-size: var(--fontsize-xs);
  font-weight: bold;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-md);
  border: 2px solid var(--white);
  z-index: 3;
}

.info-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.connected-as {
  font-size: var(--fontsize-xs);
  color: var(--gray-100);
  font-weight: 500;
}

.user-name {
  font-size: var(--fontsize-md);
  font-weight: 700;
  color: var(--deep-blue);
  margin: 0;
  padding: 0;
}

.medals-container {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.medal-image {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
</style>
