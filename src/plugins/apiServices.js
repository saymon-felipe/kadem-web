const isDevelopment = import.meta.env.DEV;

const resolveRequiredUrl = (value, fallback, name) => {
  if (value) return value;
  if (isDevelopment && fallback) return fallback;

  throw new Error(`[Kadem] Variável ${name} não definida.`);
};

export const apiServices = {
  MEDIA_ENGINE: resolveRequiredUrl(
    import.meta.env.VITE_MEDIA_ENGINE_URL,
    "http://localhost:3001/api/v1",
    "VITE_MEDIA_ENGINE_URL",
  ),
};
