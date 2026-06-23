import { db, runDbOperation } from "../../db";

export const medalRepository = {
  async getLocalMedals() {
    return runDbOperation(() => db.medals.toArray(), {
      userMessage: "Não foi possível ler as medalhas salvas neste navegador.",
    });
  },
  async setLocalMedals(medalsArray) {
    return runDbOperation(async () => {
      await db.medals.clear();
      return db.medals.bulkPut(medalsArray);
    }, {
      userMessage: "Não foi possível salvar as medalhas no armazenamento local.",
    });
  },
  async clearLocalMedals() {
    return runDbOperation(() => db.medals.clear(), {
      userMessage: "Não foi possível limpar as medalhas locais deste navegador.",
    });
  },
};
