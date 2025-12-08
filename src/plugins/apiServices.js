/**
 * src/plugins/services.js
 * Centraliza as URLs dos microsserviços do ecossistema Kadem.
 */

// Configuração de Ambientes para o Kadem Media Engine (Microservice)
const media_dev = "http://localhost:3001/api/v1";
const media_test = "";
const media_prod = "";

let current_ambient = 0;

if (window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168")) {
  current_ambient = 0;
} else if (window.location.hostname.includes("dev")) {
  current_ambient = 1;
} else {
  current_ambient = 2;
}

let media_engine_url = "";

switch (current_ambient) {
  case 0:
    media_engine_url = media_dev;
    break;
  case 1:
    media_engine_url = media_test;
    break;
  case 2:
    media_engine_url = media_prod;
    break;
}

export const apiServices = {
  MEDIA_ENGINE: media_engine_url
};
