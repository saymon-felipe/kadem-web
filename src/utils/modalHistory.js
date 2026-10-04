/**
 * Uma entrada de histórico para as camadas visíveis da interface. Compartilhar
 * essa entrada evita voltas atrasadas e entradas órfãs ao alternar abas/janelas.
 */
const HISTORY_KEY = "kademNavigation";
const modalStack = [];
const navigationStack = [];
let registrationId = 0;
let listenerAttached = false;
let guardArmed = false;
let guardUrl = "";
let pendingBack = false;
let syncScheduled = false;
let handlingBack = false;

function currentUrl() {
  return window.location?.href || "";
}

function needsHistory() {
  return modalStack.some((entry) => entry.handleHistory) || navigationStack.length > 0;
}

function syncHistory() {
  if (typeof window === "undefined" || !window.history || pendingBack || handlingBack) return;
  if (guardArmed && guardUrl !== currentUrl()) {
    guardArmed = false;
    return; // Uma navegação real de rota não deve receber o histórico da tela anterior.
  }

  if (needsHistory()) {
    if (guardArmed) return;
    try {
      // Preserva position/back/current/forward e scroll usados pelo Vue Router.
      if (!window.history.state?.[HISTORY_KEY]) {
        window.history.pushState({ ...window.history.state, [HISTORY_KEY]: true }, "");
      }
      guardArmed = true;
      guardUrl = currentUrl();
    } catch {
      // Histórico indisponível em ambientes restritos.
    }
  } else if (guardArmed) {
    guardArmed = false;
    if (!window.history.state?.[HISTORY_KEY]) return;
    pendingBack = true;
    try {
      window.history.back();
    } catch {
      pendingBack = false;
    }
  }
}

function scheduleHistorySync() {
  if (syncScheduled) return;
  syncScheduled = true;
  queueMicrotask(() => {
    syncScheduled = false;
    syncHistory();
  });
}

function updateBodyScrollLock() {
  if (typeof document === "undefined") return;
  if (modalStack.length) document.body.classList.add("modal-open-scroll-locked");
  else document.body.classList.remove("modal-open-scroll-locked");
}

/** Fecha só a camada superior; na raiz da janela, o handler a minimiza. */
export function navigateBack() {
  const modal = modalStack.at(-1);
  const navigation = navigationStack.reduce((top, entry) =>
    !top || entry.priority > top.priority ||
      (entry.priority === top.priority && entry.id > top.id) ? entry : top, null);
  if (modal && (!navigation || navigation.priority <= 100 || navigation.id < modal.id)) {
    // Modais de segurança/ operações em curso podem impedir o fechamento.
    if (!modal.handleHistory) return true;
    modalStack.pop();
    updateBodyScrollLock();
    try {
      modal.closeCallback({ fromBackGesture: true });
    } finally {
      scheduleHistorySync();
    }
    return true;
  }

  if (!navigation) return false;
  try {
    navigation.closeCallback({ fromBackGesture: true });
  } finally {
    scheduleHistorySync();
  }
  return true;
}

function handlePopState() {
  if (pendingBack) {
    pendingBack = false;
    // Uma camada aberta enquanto history.back() estava em curso precisa
    // recuperar a proteção, sem consumir esse retorno como ação do usuário.
    if (guardUrl === currentUrl()) scheduleHistorySync();
    return;
  }
  if (window.history.state?.[HISTORY_KEY]) {
    guardArmed = true; // Avançar ou restaurar uma entrada existente.
    guardUrl = currentUrl();
    return;
  }
  if (!guardArmed) return;
  guardArmed = false;
  if (guardUrl !== currentUrl()) return;

  handlingBack = true;
  try {
    navigateBack();
  } finally {
    handlingBack = false;
    scheduleHistorySync();
  }
}

function register(stack, closeCallback, options) {
  if (typeof window !== "undefined" && !listenerAttached) {
    window.addEventListener("popstate", handlePopState);
    listenerAttached = true;
  }
  const entry = { id: ++registrationId, closeCallback, ...options };
  stack.push(entry);
  updateBodyScrollLock();
  syncHistory();

  const unregister = () => {
    const index = stack.findIndex((item) => item.id === entry.id);
    if (index !== -1) stack.splice(index, 1);
    updateBodyScrollLock();
    scheduleHistorySync();
  };
  unregister.id = entry.id;
  unregister.unregister = unregister;
  return unregister;
}

export function registerModal(closeCallback, options = {}) {
  return register(modalStack, closeCallback, { handleHistory: options.handleHistory ?? true });
}

/** Prioridades: janela 0, tela interna 10, navegação aninhada 20, menus 30+. */
export function registerNavigation(closeCallback, { priority = 10 } = {}) {
  return register(navigationStack, closeCallback, { priority });
}

export function hasOpenModals() {
  return modalStack.length > 0;
}

export function isTopModal(registration) {
  return Boolean(registration && modalStack.at(-1)?.id === registration.id);
}
