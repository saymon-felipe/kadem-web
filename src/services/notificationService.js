import { watch } from "vue";
import { db } from "@/db";
import { backgroundPull, BACKGROUND_TAG } from "./backgroundSync";
const api = Object.fromEntries(
  ["get", "post", "put", "delete"].map((method) => [
    method,
    async (...args) => (await import("@/plugins/api")).api[method](...args),
  ]),
);
const authStore = async () => (await import("@/stores/auth")).useAuthStore();
export const notificationLabels = {
  nexo_weekly: "Revisão financeira semanal",
  nexo_budget: "Orçamentos em 80% e 100%",
  nexo_review: "Lançamentos com categoria ou origem para revisar",
  nexo_monthly: "Fechamento mensal e revisão de metas",
  health_schedule: "Rotinas, consultas, exames e tratamentos",
  health_stock: "Estoque baixo de medicamentos e insumos",
  health_checkin: "Check-in diário",
  health_weekly: "Revisão semanal do Health",
  agenda_events: "Lembretes de compromissos",
};
// Antecedência dos lembretes da Agenda (minutos), igual à lista aceita pelo servidor.
export const agendaLeadOptions = [
  { value: 0, label: "Na hora de começar" },
  { value: 5, label: "5 minutos antes" },
  { value: 10, label: "10 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 dia antes" },
];
// Módulo da notificação (campo `module`) -> app da janela de Produtividade.
export const notificationModuleApps = { health: "kadem_health", agenda: "kadem_agenda", nexo: "kadem_nexo" };
export const notificationService = {
  async state() {
    return (await api.get("/notifications")).data;
  },
  async save(settings, expectedUserId) {
    const auth = await authStore();
    const owner = auth.user?.id;
    if (expectedUserId != null && String(owner) !== String(expectedUserId))
      throw new Error("A conta mudou. Reabra as configurações.");
    const data = (await api.put("/notifications/preferences", settings)).data;
    if (owner === auth.user?.id) await this.configure(data);
    return data;
  },
  async configure(settings) {
    const id = (await authStore()).user?.id;
    if (!id) return;
    const previous = await db.background_settings.get("current");
    const sameOwner = String(previous?.user_id) === String(id);
    const sameSettings = sameOwner && Object.entries(settings).every(([key, value]) => previous[key] === value);
    await db.background_settings.put({
      ...(sameOwner ? previous : {}),
      key: "current",
      user_id: id,
      api: String((await import("@/plugins/api")).api.defaults.baseURL).replace(/\/$/, ""),
      ...JSON.parse(JSON.stringify(settings)),
      generation: sameSettings ? previous.generation : crypto.randomUUID(),
    });
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    if (settings.background_sync) {
      await registration.sync?.register(BACKGROUND_TAG).catch(() => {});
      await registration.periodicSync?.register(BACKGROUND_TAG, { minInterval: 3600000 }).catch(() => {});
    } else {
      await registration.periodicSync?.unregister(BACKGROUND_TAG).catch(() => {});
    }
  },
  async activate(expectedUserId) {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window))
      throw new Error(
        "Este navegador não oferece notificações push. No iPhone/iPad, instale o Kadem na tela de início.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error("Permita as notificações nas configurações deste navegador para ativar os alertas.");
    const state = await this.state();
    if (expectedUserId != null && String(state.user_id) !== String(expectedUserId))
      throw new Error("A conta mudou. Reabra as configurações.");
    if (!state.public_key) throw new Error("O envio push precisa ser configurado no servidor.");
    const registration = await navigator.serviceWorker.ready;
    const key = Uint8Array.from(atob(state.public_key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    if (String((await authStore()).user?.id) !== String(state.user_id))
      throw new Error("A conta mudou. Reabra as configurações.");
    await api.post("/notifications/subscriptions", subscription.toJSON());
  },
  async deactivateDevice() {
    const registration = await navigator.serviceWorker?.getRegistration();
    const sub = await registration?.pushManager?.getSubscription();
    if (sub) {
      await api.delete("/notifications/subscriptions", { data: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
  },
  async reset() {
    await db.background_settings.delete("current");
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.periodicSync?.unregister(BACKGROUND_TAG).catch(() => {});
    for (const n of (await registration?.getNotifications()) || []) n.close();
  },
  async read(id) {
    await api.post(`/notifications/${id}/read`);
  },
  async open(module) {
    const { useWindowStore } = await import("@/stores/windows");
    const { usePlayerStore } = await import("@/stores/player");
    useWindowStore().openWindow({ id: "productivity", title: "Produtividade", componentId: "ProductivityWindow" });
    usePlayerStore().setActiveApp(notificationModuleApps[module] || notificationModuleApps.nexo);
  },
};
export async function initializeNotifications() {
  const { useAuthStore } = await import("@/stores/auth");
  const { useUtilsStore } = await import("@/stores/utils");
  let busy = false;
  const cycle = async () => {
    const auth = useAuthStore();
    if (busy || !auth.isLoggedIn || !navigator.onLine) return;
    busy = true;
    const id = auth.user?.id;
    try {
      const state = await notificationService.state();
      if (!auth.isLoggedIn || id !== auth.user?.id) return;
      const { useNotificationStore } = await import("@/stores/notifications");
      useNotificationStore().setState(state);
      await notificationService.configure(state.settings);
      if (state.settings.background_sync) {
        await useUtilsStore().check_kadem_api_liveness();
        await useUtilsStore().request_sync();
        if (navigator.locks) await navigator.locks.request("kadem-background", backgroundPull);
      }
    } catch (e) {
      console.warn("Sincronização pessoal temporariamente indisponível.", e.message);
    } finally {
      busy = false;
    }
  };
  watch(
    () => [useAuthStore().isLoggedIn, useAuthStore().user?.id],
    ([loggedIn]) => {
      if (loggedIn) {
        cycle();
        const module = new URL(location.href).searchParams.get("notification");
        if (module) {
          notificationService.open(module);
          const url = new URL(location.href);
          url.searchParams.delete("notification");
          history.replaceState(history.state, "", url);
        }
      }
    },
    { immediate: true },
  );
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === BACKGROUND_TAG) cycle();
    if (event.data?.type === "kadem-open-notification" && useAuthStore().isLoggedIn)
      notificationService.open(event.data.module);
  });
  window.addEventListener("online", cycle);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") cycle();
  });
  setInterval(cycle, 60000);
}
