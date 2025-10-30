import { createRouter, createWebHistory } from 'vue-router';

import homeView from "../views/homeView.vue";
import authView from "../views/authView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: homeView
  },
  {
    path: "/auth",
    name: "Autenticar",
    component: authView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'Autenticar' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router;
