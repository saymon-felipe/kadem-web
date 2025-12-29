import axios from 'axios';
import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';

const dev_environment = "http://localhost:3000/api";
const homolog_environment = "https://coretest-kadem-d8b86a10b9e8.herokuapp.com/api";
const prod_environment = "https://core-kadem-a06ada9519bc.herokuapp.com/api";

let url_api;

let ambient = 2;

const hostname = window.location.hostname;

if (hostname.includes("localhost") || hostname.includes("192.168")) {
  ambient = 0; // Local
} else if (hostname.includes("dev") || hostname.includes("homolog") || hostname.includes("staging")) {
  ambient = 1; // Homologação
} else {
  ambient = 2; // Produção
}

switch (ambient) {
  case 0:
    url_api = dev_environment || "http://localhost:3000/api";
    console.log("[Kadem] Ambiente: Desenvolvimento (Local)");
    break;
  case 1:
    url_api = homolog_environment;
    console.log("[Kadem] Ambiente: Homologação");
    break;
  case 2:
    url_api = prod_environment;
    console.log("[Kadem] Ambiente: Produção");
    break;
}

if (!url_api) {
  console.error("[Kadem Critical] URL da API não definida para este ambiente!");
}

const api = axios.create({
  baseURL: url_api,
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 403) {

      let problematic_project_id = null;

      const url_parts = originalRequest.url.split('/');
      const projects_index = url_parts.indexOf('projects');
      if (projects_index !== -1 && url_parts[projects_index + 1]) {
        problematic_project_id = url_parts[projects_index + 1];
      }

      if (!problematic_project_id && originalRequest.data) {
        try {
          const data = JSON.parse(originalRequest.data);
          if (data.project_id) problematic_project_id = data.project_id;
        } catch (e) { /* ignore parse error */ }
      }

      if (!problematic_project_id && originalRequest.headers['X-Target-Project-ID']) {
        problematic_project_id = originalRequest.headers['X-Target-Project-ID'];
      }

      if (problematic_project_id) {
        const project_store = useProjectStore();
        project_store.forceLocalProjectRemoval(problematic_project_id);
      }
    } else if (error.response && error.response.status === 401) {
      const auth_store = useAuthStore();
      auth_store.logout();
    }

    return Promise.reject(error);
  }
);

/**
 * @description Função para verificar a saúde (liveness) do Kadem Core API.
 * @returns {Promise<boolean>} Retorna true se a API estiver acessível e responder com sucesso (2xx);
 */
const check_system_health = async () => {
  try {
    const response = await api.get('/system');
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
};

export { api, check_system_health };

export default {
  install(app) {
    app.config.globalProperties.api = api;
  }
};
