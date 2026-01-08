import { createRouter, createWebHistory } from 'vue-router';

import homeView from "../views/homeView.vue";
import authView from "../views/authView.vue";
import logoutView from '../views/logoutView.vue';
import resetPasswordView from "../views/resetPasswordView.vue";
import inviteLandindView from "../views/InviteLanding.vue";

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
    path: '/logout',
    name: 'Logout',
    component: logoutView,
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
    path: "/reset_password",
    name: "ResetPassword",
    component: resetPasswordView,
    meta: {
      public: true
    }
  },
  {
    path: '/invite/landing',
    name: 'invite-landing',
    component: inviteLandindView,
    meta: {
      public: true
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
  if (to.meta.public) {
    next();
    return;
  }

  const { useAuthStore } = await import('../stores/auth.js');
  const authStore = useAuthStore();

  if (authStore.isAuthenticated === null) {
    await authStore.checkAuthStatus();
  }

  const is_authenticated = authStore.isLoggedIn;

  if (to.meta.requiresAuth && !is_authenticated) {
    next({ name: 'Auth' });
  } else if (to.meta.requiresGuest && is_authenticated) {
    next({ name: 'Home' });
  } else {
    next();
  }
});

router.onError((error) => {
  const chunkFailedMessage = /Loading chunk [\d]+ failed/;
  const dynamicImportFailedMessage = /dynamically imported module/;
  const importFailedMessage = /error loading dynamic model/;

  if (
    error.message.match(chunkFailedMessage) ||
    error.message.match(dynamicImportFailedMessage) ||
    error.message.match(importFailedMessage)
  ) {
    console.log('[Router] Chunk load error detected, reloading...');
    window.location.reload(true);
  }
});

export default router;
