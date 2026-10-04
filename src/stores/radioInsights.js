import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useUtilsStore } from './utils';
import { api } from '../plugins/api';
import { syncService } from '../services/syncService';
import { radioInsightsRepository as repository } from '../services/localData/radioInsightsRepository';

export const useRadioInsightsStore = defineStore('radioInsights', {
  state: () => ({ reactions: {}, statistics: null, loading: false, error: '', owner_id: null, request_id: 0 }),
  getters: {
    reactionFor: (state) => (track) => state.owner_id === useAuthStore().user?.id ? state.reactions[track?.youtube_id]?.reaction || 0 : 0,
  },
  actions: {
    async loadLocal() {
      const user_id = useAuthStore().user?.id;
      if (!user_id) return;
      if (this.owner_id !== user_id) this.$reset();
      this.owner_id = user_id;
      const items = await repository.getReactions(user_id);
      if (useAuthStore().user?.id === user_id) this.reactions = Object.fromEntries(items.map(item => [item.youtube_id, item]));
    },
    async setReaction(track, reaction) {
      const user_id = useAuthStore().user?.id;
      if (!user_id || !track?.youtube_id || ![-1, 0, 1].includes(reaction)) return;
      try {
        const row = await repository.setReaction(user_id, track, reaction);
        if (useAuthStore().user?.id !== user_id) return;
        this.owner_id = user_id;
        this.reactions[track.youtube_id] = row;
        this.error = '';
        void syncService.processSyncQueue();
      } catch (error) { this.error = 'Não foi possível salvar sua avaliação neste dispositivo.'; console.error(error); }
    },
    toggleReaction(track, reaction) {
      return this.setReaction(track, this.reactionFor(track) === reaction ? 0 : reaction);
    },
    async pullReactions() {
      await this.loadLocal();
      const user_id = useAuthStore().user?.id;
      if (!user_id || !useUtilsStore().connection.connected) return;
      for (let offset = 0; ; offset += 500) {
        const { data } = await api.get('/radio/insights/reactions', { params: { offset, limit: 500 } });
        if (useAuthStore().user?.id !== user_id) return;
        await repository.mergeReactions(user_id, data);
        if (data.length < 500) break;
      }
      await this.loadLocal();
    },
    async refresh(year = new Date().getFullYear()) {
      await this.loadLocal();
      const user_id = useAuthStore().user?.id;
      if (!user_id) return;
      const request_id = ++this.request_id;
      this.statistics = await repository.getStatistics(user_id, year) || null;
      this.error = '';
      if (!useUtilsStore().connection.connected) return;
      this.loading = true;
      try {
        await syncService.processSyncQueue();
        await this.pullReactions();
        if (useAuthStore().user?.id !== user_id) return;
        const { data } = await api.get('/radio/insights/statistics', { params: { year } });
        await repository.saveStatistics(user_id, data);
        if (useAuthStore().user?.id === user_id && this.request_id === request_id) this.statistics = data;
      } catch (error) {
        if (useAuthStore().user?.id === user_id && this.request_id === request_id) this.error = 'Não foi possível atualizar agora. Suas avaliações salvas continuam disponíveis.';
        console.warn('[Radio Flow] Atualização das estatísticas:', error);
      } finally { if (this.request_id === request_id) this.loading = false; }
    },
  },
});
