/**
 * Gerenciador de histórico e pilha de modais para o Kadem.
 * Permite que o gesto/botão de voltar do celular feche o modal aberto
 * sem sair da rota atual ou deslogar o usuário.
 */

let modalIdCounter = 0;
const modalStack = [];
let isHandlingPopstate = false;
let isListenerAttached = false;

function handlePopState() {
  if (modalStack.length === 0) return;

  // Pega o modal do topo da pilha
  const topModal = modalStack.pop();
  if (topModal && typeof topModal.closeCallback === "function") {
    isHandlingPopstate = true;
    try {
      topModal.closeCallback({ fromBackGesture: true });
    } finally {
      isHandlingPopstate = false;
    }
  }

  updateBodyScrollLock();
}

function ensureListener() {
  if (typeof window === "undefined" || isListenerAttached) return;
  window.addEventListener("popstate", handlePopState);
  isListenerAttached = true;
}

function updateBodyScrollLock() {
  if (typeof document === "undefined") return;
  if (modalStack.length > 0) {
    document.body.classList.add("modal-open-scroll-locked");
  } else {
    document.body.classList.remove("modal-open-scroll-locked");
  }
}

/**
 * Registra a abertura de um modal.
 * @param {Function} closeCallback Função chamada quando o botão voltar for acionado.
 * @param {Object} options Opções de registro (ex: handleHistory).
 * @returns {Object} Instância com métodos para fechar ou desregistrar.
 */
export function registerModal(closeCallback, options = { handleHistory: true }) {
  ensureListener();
  const id = ++modalIdCounter;
  let hasPushed = false;

  if (options.handleHistory && typeof window !== "undefined" && window.history) {
    try {
      window.history.pushState({ kademModalId: id }, "");
      hasPushed = true;
    } catch {
      // Ignora falhas raras em ambientes de teste/restritos
    }
  }

  const modalEntry = {
    id,
    closeCallback,
    hasPushed,
  };

  modalStack.push(modalEntry);
  updateBodyScrollLock();

  const unregister = () => {
    const index = modalStack.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [removed] = modalStack.splice(index, 1);
      if (removed && removed.hasPushed && !isHandlingPopstate) {
        try {
          window.history.back();
        } catch {
          // Ignora falhas caso o histórico já tenha mudado
        }
      }
    }
    updateBodyScrollLock();
  };

  unregister.id = id;
  unregister.unregister = unregister;

  return unregister;
}

/**
 * Retorna se há algum modal aberto.
 */
export function hasOpenModals() {
  return modalStack.length > 0;
}
