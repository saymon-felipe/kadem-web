export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Kadem Free",
    value: 0,
    cycle: "MONTHLY",
    description: "Assinatura Kadem Free - Bom para iniciantes.",
    limits: {
      max_projects: 3,
      max_members_by_project: 3,
      can_use_offline_radio: false,
    },
    features: [
      "Limite de 3 Projetos",
      "Até 3 membros/projeto",
      "Radio Flow (Online apenas)",
    ],
  },
  pro: {
    name: "Kadem Pro",
    value: 29.9,
    cycle: "MONTHLY",
    description: "Assinatura Kadem Pro - Acesso expandido a projetos e ferramentas.",
    limits: {
      max_projects: 7,
      max_members_by_project: 7,
      can_use_offline_radio: true,
    },
    features: [
      "Até 7 Projetos",
      "Até 5 membros/projeto",
      "Radio Flow (Online/Offline)",
      "Sync Prioritário",
    ],
  },
  enterprise: {
    name: "Kadem Enterprise",
    value: 149.9,
    cycle: "MONTHLY",
    description: "Assinatura Kadem Enterprise - Para equipes e colaboração avançada.",
    limits: {
      max_projects: 20,
      max_members_by_project: 20,
      can_use_offline_radio: true,
    },
    features: [
      "Projetos Ilimitados",
      "Membros Ilimitados",
      "Acesso Total Offline",
      "Suporte Prioritário 24/7",
    ],
  },
};

export const getPlanLimits = (planTier) => {
  const plan = SUBSCRIPTION_PLANS[planTier] || SUBSCRIPTION_PLANS["free"];
  return plan.limits;
};
