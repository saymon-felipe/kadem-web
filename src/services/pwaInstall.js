let deferredInstallPrompt = null;

const isStandalone = () => (
  window.matchMedia?.("(display-mode: standalone)").matches
  || window.navigator.standalone === true
);

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });
}

export function isPwaInstalled() {
  return typeof window !== "undefined" && isStandalone();
}

export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export function getPwaInstallUnavailableMessage() {
  const localHosts = ["localhost", "127.0.0.1", "::1"];

  if (window.location.protocol !== "https:" && !localHosts.includes(window.location.hostname)) {
    return "A instalação exige uma URL segura (HTTPS).";
  }

  if (import.meta.env.DEV) {
    return "A instalação não fica disponível no servidor de desenvolvimento. Teste a versão publicada em HTTPS.";
  }

  return "A instalação ainda não está disponível neste navegador. Aguarde alguns segundos e tente novamente.";
}

export async function requestPwaInstall() {
  if (!deferredInstallPrompt) return "unavailable";

  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  return result.outcome;
}
