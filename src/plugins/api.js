// api.js
import axios from 'axios';
import { useProjectStore } from '../stores/projects';

let url_api;

const dev_environment = "http://localhost:3000/api"; // Ambiente de desenvolvimento.
const test_environment = ""; // Ambiente de teste.
const prod_environment = ""; // Ambiente de produção.

// Detecta ambiente automaticamente
let ambient = (window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168")) ? 0 : 1;

if (window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168")) {
  ambient = 0;
} else if (window.location.hostname.includes("dev")) {
  ambient = 1;
} else {
  ambient = 2;
}

switch (ambient) {
  case 0:
    url_api = dev_environment;
    break;
  case 1:
    url_api = test_environment;
    break;
  case 2:
    url_api = prod_environment;
    break;
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
        project_store.force_local_project_removal(problematic_project_id);
      }
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
  };
};

export {
  api,
  check_system_health
};

export default {
  install(app) {
    app.config.globalProperties.api = api;
  }
};
