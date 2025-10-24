import { createRouter, createWebHistory } from 'vue-router'

import homeView from "../views/homeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: homeView
    }
  ],
})

export default router
