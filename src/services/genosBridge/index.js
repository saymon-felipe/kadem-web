import {
  BRIDGE_ERRORS,
  BRIDGE_PROTOCOL,
  bridge_error_result,
  bridge_fail,
  bridge_ok,
  bridge_op_info,
} from "@/utils/genos_bridge";
import { createAgendaOps } from "./agenda";
import { createHealthOps } from "./health";
import { createNexoOps } from "./nexo";

/**
 * Executa os pedidos do Genos nos dados locais do Kadem (Dexie). Tudo funciona sem internet: o que é gravado entra na
 * fila de sincronização normal e o Kadem a envia quando houver rede. Pedidos que alteram dados só rodam com
 * `confirmed: true` (a pessoa confirmou por voz no Genos); o Nexo não tem nenhuma operação de escrita.
 *
 * `stores`: { agenda, health, auth } são funções que devolvem as stores (Pinia só existe depois do app montado).
 */
export function createGenosBridge({ stores, finance, physical, sync, online = () => true, now = () => new Date() }) {
  function handlers() {
    const agenda = createAgendaOps({ agenda: stores.agenda(), health: stores.health(), now });
    const health = createHealthOps({ health: stores.health(), now });
    const nexo = createNexoOps({ finance, physical, online, now });
    return {
      "agenda.list": agenda.list,
      "agenda.find": agenda.find,
      "agenda.create": agenda.create,
      "agenda.update": agenda.update,
      "agenda.delete": agenda.delete,
      "health.list": health.list,
      "health.find": health.find,
      "health.object.create": health.create,
      "health.object.update": health.update,
      "health.object.delete": health.delete,
      "health.supply.entry": health.entry,
      "health.supply.use": health.use,
      "nexo.summary": nexo.summary,
      "nexo.transactions": nexo.transactions,
      "nexo.investments": nexo.investments,
      "nexo.wealth": nexo.wealth,
      "nexo.cards": nexo.cards,
      "nexo.budget": nexo.budget,
    };
  }

  return {
    /** Nunca lança: devolve { ok: true, data } ou { ok: false, code, message }. */
    async execute({ op, args = {}, confirmed = false }) {
      const info = bridge_op_info(op);
      if (!info) return bridge_fail(BRIDGE_ERRORS.BAD_REQUEST, "Pedido desconhecido.");
      if (info.write && confirmed !== true) {
        return bridge_fail(BRIDGE_ERRORS.CONFIRMATION_REQUIRED, "Esta alteração precisa da sua confirmação.");
      }
      if (op === "ping") return bridge_ok({ pong: true, protocol: BRIDGE_PROTOCOL, at: now().toISOString() });
      if (!stores.auth()?.user?.id) {
        return bridge_fail(BRIDGE_ERRORS.UNAVAILABLE, "Entre na sua conta do Kadem para usar essa função.");
      }
      try {
        const run = handlers()[op];
        // Escritas respondem assim que gravam no aparelho; a sincronização com o servidor segue em segundo plano.
        const data = info.write ? await sync.runDeferred(() => run(args)) : await run(args);
        return bridge_ok(data);
      } catch (error) {
        if (!(error?.name === "BridgeError")) console.warn("[Genos] Falha na ponte.", { op, name: error?.name, message: error?.message });
        return bridge_error_result(error);
      }
    },
  };
}
