import { financeService } from "@/services/financeService";
import { physicalWealthService } from "@/services/physicalWealthService";
import { syncService } from "@/services/syncService";
import { useAgendaStore } from "@/stores/agenda";
import { useAuthStore } from "@/stores/auth";
import { useHealthStore } from "@/stores/health";
import { useUtilsStore } from "@/stores/utils";
import { createGenosBridge } from "./index";

/** A ponte do Genos ligada às stores e serviços reais do app (ver services/genosBridge/index.js). */
export const genosBridge = createGenosBridge({
  stores: { agenda: useAgendaStore, health: useHealthStore, auth: useAuthStore },
  finance: financeService,
  physical: physicalWealthService,
  sync: syncService,
  online: () => useUtilsStore().connection.connected,
});
