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
      can_download_offline_video: true,
      max_offline_video_height: 480,
      max_task_attachment_size_bytes: 5 * 1024 * 1024,
      finance_open_finance_enabled: false,
      finance_ai_monthly_credits: 0,
      finance_max_connected_items: 0,
      finance_auto_sync_frequency: null,
    },
    features: [
      "Limite de 3 Projetos",
      "Até 3 membros/projeto",
      "Radio Flow online",
      "Vídeos offline em até 480p",
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
      can_download_offline_video: true,
      max_offline_video_height: 720,
      max_task_attachment_size_bytes: 50 * 1024 * 1024,
      finance_open_finance_enabled: true,
      finance_ai_monthly_credits: 300,
      finance_max_connected_items: 3,
      finance_auto_sync_frequency: "daily",
    },
    features: [
      "Até 7 Projetos",
      "Até 5 membros/projeto",
      "Radio Flow (Online/Offline)",
      "Vídeos offline em até 720p",
      "Sync Prioritário",
    ],
  },
  enterprise: {
    name: "Kadem Enterprise",
    value: 159.9,
    cycle: "MONTHLY",
    description: "Assinatura Kadem Enterprise - Para equipes e colaboração avançada.",
    limits: {
      max_projects: 999,
      max_members_by_project: 999,
      can_use_offline_radio: true,
      can_download_offline_video: true,
      max_offline_video_height: 1080,
      max_task_attachment_size_bytes: 1024 * 1024 * 1024,
      finance_open_finance_enabled: true,
      finance_ai_monthly_credits: 1500,
      finance_max_connected_items: 15,
      finance_auto_sync_frequency: "hourly",
    },
    features: [
      "Projetos Ilimitados",
      "Membros Ilimitados",
      "Acesso Total Offline",
      "Vídeos offline em até 1080p",
      "Suporte Prioritário 24/7",
    ],
  },
};

export const getPlanLimits = (planTier) => {
  const plan = SUBSCRIPTION_PLANS[planTier] || SUBSCRIPTION_PLANS["free"];
  return plan.limits;
};

const VIDEO_RESOLUTIONS = [360, 480, 720, 1080];

export const getOfflineVideoQualities = (planTier) => {
  const limits = getPlanLimits(planTier);
  if (!limits.can_download_offline_video) return [];

  return VIDEO_RESOLUTIONS
    .filter((height) => height <= limits.max_offline_video_height)
    .map((height) => ({ height, label: `${height}p` }));
};
