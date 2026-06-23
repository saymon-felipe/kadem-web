import { db, runDbOperation } from "../../db";
import { syncQueueRepository } from "./syncQueueRepository";

export const occupationRepository = {
  async getLocalUserOccupations() {
    return runDbOperation(() => db.user_occupations.toArray(), {
      userMessage: "Não foi possível ler as ocupações salvas neste navegador.",
    });
  },
  async addLocalUserOccupation(occupationData) {
    return runDbOperation(() => db.user_occupations.add(occupationData), {
      userMessage: "Não foi possível salvar a ocupação no armazenamento local.",
    });
  },
  async deleteLocalUserOccupation(localId) {
    return runDbOperation(() => db.user_occupations.delete(localId), {
      userMessage: "Não foi possível remover a ocupação do armazenamento local.",
    });
  },
  async clearLocalUserOccupations() {
    return runDbOperation(() => db.user_occupations.clear(), {
      userMessage: "Não foi possível limpar as ocupações locais deste navegador.",
    });
  },
  async mergeApiOccupations(apiOccupations) {
    const pendingCreates = await syncQueueRepository.getPendingTasksByType("CREATE_OCCUPATION");
    const localOnlyOccupations = pendingCreates.map((task) => task.payload);

    const pendingDeletes = await syncQueueRepository.getPendingTasksByType("DELETE_OCCUPATION");
    const deleteIds = new Set(pendingDeletes.map((task) => task.payload.id));

    const finalApiOccupations = apiOccupations.filter((apiOcc) => !deleteIds.has(apiOcc.id));

    return runDbOperation(
      () => db.transaction("rw", db.user_occupations, async () => {
        await db.user_occupations.clear();
        await db.user_occupations.bulkAdd(finalApiOccupations);
        await db.user_occupations.bulkAdd(localOnlyOccupations);
      }),
      {
        userMessage: "Não foi possível sincronizar as ocupações no armazenamento local.",
      },
    );
  },
};
