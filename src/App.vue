<template>
  <main class="custom-scrollbar">
    <router-view />
  </main>
</template>

<script>
import { useAppStore } from "@/stores/app";

export default {
  created() {
    const appStore = useAppStore();
    appStore.initTheme();
  },
};
</script>

<style scoped></style>
