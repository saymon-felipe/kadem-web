import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

import homeView from "../views/homeView.vue";
import authView from "../views/authView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: homeView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/auth",
    name: "Auth",
    component: authView,
    meta: {
      requiresGuest: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'Auth' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  await authStore.checkAuthStatus();

  const isAuthenticated = authStore.isLoggedIn;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Auth' });
  }

  else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'Home' });
  }

  else {
    next();
  }
});

export default router;
