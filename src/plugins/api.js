import axios from 'axios';
import { useProjectStore } from '../stores/projects';

const resolveApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api';
  }

  throw new Error('[Kadem] Variável VITE_API_URL não definida.');
};

const url_api = resolveApiUrl();

const api = axios.create({
  baseURL: url_api,
  withCredentials: true,
});

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const CSRF_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/request_reset_password',
  '/auth/validate_reset_token',
  '/auth/reset_password',
  '/auth/csrf',
  '/alexa/token',
  '/alexa/webhook',
  '/alexa/link',
  '/subscriptions/webhook',
];

let csrfRefreshPromise = null;

const getCookie = (name) => {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length) || null;
};

const normalizePath = (url = '') => {
  try {
    return new URL(url, url_api).pathname.replace(/^\/api/, '');
  } catch {
    return String(url).split('?')[0];
  }
};

const isCsrfExempt = (url) => {
  const path = normalizePath(url);
  return CSRF_EXEMPT_PATHS.some((exemptPath) => path === exemptPath);
};

const ensureCsrfToken = async () => {
  const existingToken = getCookie(CSRF_COOKIE_NAME);
  if (existingToken) return decodeURIComponent(existingToken);

  if (!csrfRefreshPromise) {
    csrfRefreshPromise = axios.get(`${url_api}/auth/csrf`, { withCredentials: true })
      .then((response) => response.data?.csrf_token || getCookie(CSRF_COOKIE_NAME))
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }

  const token = await csrfRefreshPromise;
  return token ? decodeURIComponent(token) : null;
};

api.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase();

  if (MUTATION_METHODS.has(method) && !isCsrfExempt(config.url)) {
    const csrfToken = await ensureCsrfToken();

    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const { useAuthStore } = await import('../stores/auth');
      const authStore = useAuthStore();

      if (!window.location.pathname.includes('/auth')) {
        console.warn('[API] Sessão expirada (401). Forçando logout.');
        await authStore.logout(true);
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config || {};

    if (error.response && error.response.status === 403) {
      let problematic_project_id = null;

      const url_parts = String(originalRequest.url || '').split('/');
      const projects_index = url_parts.indexOf('projects');
      if (projects_index !== -1 && url_parts[projects_index + 1]) {
        problematic_project_id = url_parts[projects_index + 1];
      }

      if (!problematic_project_id && originalRequest.data) {
        try {
          const data = JSON.parse(originalRequest.data);
          if (data.project_id) problematic_project_id = data.project_id;
        } catch {
          // Ignora payloads que não sejam JSON.
        }
      }

      if (!problematic_project_id && originalRequest.headers?.['X-Target-Project-ID']) {
        problematic_project_id = originalRequest.headers['X-Target-Project-ID'];
      }

      if (problematic_project_id) {
        const project_store = useProjectStore();
        project_store.forceLocalProjectRemoval(problematic_project_id);
      }
    }

    return Promise.reject(error);
  },
);

const check_system_health = async () => {
  try {
    const response = await api.get('/system');
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
};

export { api, check_system_health };

export default {
  install(app) {
    app.config.globalProperties.api = api;
  },
};
