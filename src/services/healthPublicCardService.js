import { api } from '@/plugins/api';

export const healthPublicCardService = {
  async getMine() {
    const { data } = await api.get('/health/public-card');
    return data;
  },
  async saveMine(payload) {
    const { data } = await api.put('/health/public-card', payload);
    return data;
  },
  async getPublic(token) {
    const { data } = await api.get(`/health/public-card/${encodeURIComponent(token)}`);
    return data;
  },
};
