import { api } from "@/plugins/api";

export const healthAiService = {
  async explainInsight(pattern) {
    const payload = {
      predictor: pattern.predictor,
      exposure: String(pattern.exposure),
      outcome: pattern.outcome,
      outcome_value: String(pattern.outcome_value),
      window_hours: pattern.window_hours,
      period_days: pattern.period_days,
      exposed_count: pattern.exposed_count,
      exposed_matches: pattern.exposed_matches,
      unexposed_count: pattern.unexposed_count,
      unexposed_matches: pattern.unexposed_matches,
    };
    const response = await api.post("/health/insights/explain", payload);
    return response.data;
  },

  async getAiUsage() {
    const response = await api.get("/health/ai/usage");
    return response.data;
  },
};
