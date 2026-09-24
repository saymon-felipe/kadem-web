import { defineStore } from "pinia";
import { api } from "../plugins/api";
import { useAuthStore } from "./auth";
import { getPlanLimits } from "@/services/subscription_plans";

export const useAiCreditsStore = defineStore("aiCredits", {
  state: () => ({
    usage: {
      remaining_credits: null,
      total_credits: null,
      used_credits: 0,
      monthly_limit: 0,
      granted_credits: 0,
    },
    loading: false,
    lastFetchedAt: null,
  }),

  getters: {
    remainingCredits(state) {
      if (state.usage.remaining_credits !== null && state.usage.remaining_credits !== undefined) {
        return Number(state.usage.remaining_credits);
      }
      const authStore = useAuthStore();
      const planTier = authStore.user?.plan_tier || "free";
      const limits = getPlanLimits(planTier);
      return Number(limits.ai_monthly_credits || limits.finance_ai_monthly_credits || 0);
    },

    totalCredits(state) {
      if (state.usage.total_credits) {
        return Number(state.usage.total_credits);
      }
      if (state.usage.monthly_limit) {
        return Number(state.usage.monthly_limit);
      }
      const authStore = useAuthStore();
      const planTier = authStore.user?.plan_tier || "free";
      const limits = getPlanLimits(planTier);
      return Number(limits.ai_monthly_credits || limits.finance_ai_monthly_credits || 0);
    },

    usedCredits(state) {
      return Number(state.usage.used_credits || 0);
    },

    isPaidPlan() {
      const authStore = useAuthStore();
      return Boolean(authStore.user?.plan_tier && authStore.user.plan_tier !== "free");
    },

    isLoading: (state) => state.loading,
  },

  actions: {
    async fetchUsage(force = false) {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn && !authStore.user?.id) {
        this.usage = {
          remaining_credits: 0,
          total_credits: 0,
          used_credits: 0,
          monthly_limit: 0,
          granted_credits: 0,
        };
        return this.usage;
      }

      const now = Date.now();
      if (!force && this.lastFetchedAt && now - this.lastFetchedAt < 15000) {
        return this.usage;
      }

      this.loading = true;
      try {
        const response = await api.get("/finance/ai/usage");
        const data = response?.data || {};
        this.setUsage(data);
        return this.usage;
      } catch (error) {
        console.warn("[aiCredits] Falha ao carregar cota unificada:", error);
        return this.usage;
      } finally {
        this.loading = false;
      }
    },

    setUsage(data) {
      if (!data || typeof data !== "object") return;
      this.usage = {
        remaining_credits: Number(data.remaining_credits ?? data.total_credits ?? 0),
        total_credits: Number(data.total_credits ?? data.monthly_limit ?? 0),
        used_credits: Number(data.used_credits ?? 0),
        monthly_limit: Number(data.monthly_limit ?? 0),
        granted_credits: Number(data.granted_credits ?? 0),
      };
      this.lastFetchedAt = Date.now();
    },

    deductCredits(amount = 1) {
      if (this.usage.remaining_credits !== null && this.usage.remaining_credits !== undefined) {
        this.usage.remaining_credits = Math.max(0, this.usage.remaining_credits - amount);
        this.usage.used_credits = Number(this.usage.used_credits || 0) + amount;
      }
    },
  },
});
