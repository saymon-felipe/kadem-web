const media_dev = import.meta.env.MEDIA_DEV;
const media_homolog = import.meta.env.MEDIA_HOMOLOG;
const media_prod = import.meta.env.MEDIA_PROD;

let current_ambient = 2;

const hostname = window.location.hostname;

if (hostname.includes("localhost") || hostname.includes("192.168")) {
  current_ambient = 0; // Local
} else if (hostname.includes("dev") || hostname.includes("homolog") || hostname.includes("staging")) {
  current_ambient = 1; // Homologação
} else {
  current_ambient = 2; // Produção
}

let media_engine_url = "";

switch (current_ambient) {
  case 0:
    media_engine_url = media_dev || "http://localhost:3001/api/v1";
    break;
  case 1:
    media_engine_url = media_homolog;
    break;
  case 2:
    media_engine_url = media_prod;
    break;
}

if (!media_engine_url && current_ambient !== 0) {
  console.error("[Kadem Critical] URL do Media Engine não definida para este ambiente!");
}

export const apiServices = {
  MEDIA_ENGINE: media_engine_url
};
