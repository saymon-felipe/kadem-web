import { db, runDbOperation } from "../../db";

export const userRepository = {
  async getLocalUserProfile() {
    return runDbOperation(() => db.users.limit(1).first(), {
      userMessage: "Não foi possível abrir o perfil salvo neste navegador.",
    });
  },
  async saveLocalUserProfile(userObject) {
    return runDbOperation(() => db.users.put(userObject), {
      userMessage:
        "Seu login foi aceito, mas o perfil não pôde ser salvo no armazenamento local deste navegador.",
    });
  },
  async clearLocalProfile() {
    return runDbOperation(() => db.users.clear(), {
      userMessage: "Não foi possível limpar o perfil local deste navegador.",
    });
  },
};
