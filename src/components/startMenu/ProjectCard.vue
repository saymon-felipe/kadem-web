<template>
  <div class="project_card" @click="handle_click">
    <img
      :src="project.image || default_project_image"
      :alt="project.name"
      loading="lazy"
    />
    <div class="card_overlay">
      <span class="project_title" :title="project.name">
        {{ project.name }}
      </span>
    </div>
  </div>
</template>

<script>
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";

export default {
  name: "ProjectCard",
  props: {
    project: {
      type: Object,
      required: true,
      validator: (value) => {
        return value && typeof value.name === "string";
      },
    },
  },
  emits: ["click_card"],
  data() {
    return {
      default_project_image: defaultProjectImage,
    };
  },
  methods: {
    handle_click() {
      this.$emit("click_card", this.project);
    },
  },
};
</script>

<style scoped>
.project_card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  background-color: var(--gray-700);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 140px;
}

.project_card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.project_card img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.card_overlay {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(
    to top,
    rgba(46, 46, 46, 0.9) 0%,
    rgba(46, 46, 46, 0.4) 70%,
    transparent 100%
  );
  display: flex;
  align-items: flex-end;
  height: 50%;
}

.project_title {
  font-weight: 500;
  color: var(--white);
  font-size: var(--fontsize-sm);
  width: 100%;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
</style>
