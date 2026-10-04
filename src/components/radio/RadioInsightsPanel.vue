<template>
  <BaseModal :model-value="modelValue" title="Suas músicas" size="lg" @update:model-value="$emit('update:modelValue', $event)">
    <div class="insights-toolbar">
      <label>Ano <input v-model.number="year" type="number" min="2020" :max="currentYear" @change="refresh" /></label>
      <button type="button" class="btn btn-secondary" :disabled="store.loading" @click="refresh">
        <font-awesome-icon :icon="store.loading ? 'spinner' : 'arrows-rotate'" :spin="store.loading" /> Atualizar
      </button>
    </div>
    <p class="insights-note">Suas avaliações são pessoais. Clique novamente para remover uma curtida ou dislike.</p>
    <p v-if="store.error" role="status">{{ store.error }}</p>
    <p v-if="!connected" role="status">Offline · avaliações salvas neste dispositivo e último resumo sincronizado.</p>
    <p v-if="store.statistics?.fetched_at" class="insights-note">Resumo salvo em {{ new Date(store.statistics.fetched_at).toLocaleString('pt-BR') }}.</p>
    <div class="insights-summary" v-if="store.statistics">
      <div><strong>{{ totals.play_count || 0 }}</strong><span>reproduções</span></div>
      <div><strong>{{ listeningTime(totals.listened_ms) }}</strong><span>tempo ouvido</span></div>
      <div><strong>{{ totals.unique_songs || 0 }}</strong><span>músicas diferentes</span></div>
      <div><strong>{{ totals.completed_count || 0 }}</strong><span>concluídas</span></div>
    </div>
    <div class="insights-tabs" role="group" aria-label="Filtrar suas músicas">
      <button v-for="tab in tabs" :key="tab.id" type="button" :aria-pressed="selected === tab.id"
        :class="{ active: selected === tab.id }" @click="selected = tab.id">{{ tab.label }}</button>
    </div>
    <p class="insights-note">{{ selected === 'played' ? 'Até 100 músicas mais ouvidas no ano escolhido. Reproduções contam quando o áudio avança; pausas e buscas de posição não somam tempo.' : 'Avaliações de todos os anos, ordenadas pelas mais recentes.' }}</p>
    <p v-if="!items.length" class="insights-empty" role="status">{{ store.loading ? 'Carregando suas músicas…' : 'Nenhuma música nesta lista ainda.' }}</p>
    <div class="insights-list">
      <div v-for="track in items" :key="track.youtube_id" class="insights-track">
        <button class="track-play" type="button" :disabled="!canPlay(track)" :title="canPlay(track) ? 'Reproduzir música' : 'Upload removido das suas playlists'"
          :aria-label="`Reproduzir ${decode_html_entities(track.title)}`" @click="play(track)"><font-awesome-icon icon="play" /></button>
        <div class="track-meta"><strong>{{ decode_html_entities(track.title) || 'Música sem título' }}</strong><small>{{ decode_html_entities(track.channel) }}</small>
          <small v-if="selected === 'played'">{{ track.play_count }} reproduções · {{ listeningTime(track.listened_ms) }} · {{ track.skipped_count }} puladas</small>
        </div>
        <TrackReaction :track="track" />
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import BaseModal from '@/components/BaseModal.vue';
import TrackReaction from './TrackReaction.vue';
import { useRadioInsightsStore } from '@/stores/radioInsights';
import { useRadioStore } from '@/stores/radio';
import { useUtilsStore } from '@/stores/utils';
import { radioFlowApi } from '@/services/radioFlowApi';
import { usePlayerStore } from '@/stores/player';
import { decode_html_entities } from '@/utils/string_helpers';
import { radioRepository } from '@/services/localData/radioRepository';
import { compactSong } from '@/utils/radioSong';

const props = defineProps({ modelValue: Boolean });
defineEmits(['update:modelValue']);
const store = useRadioInsightsStore();
const radio = useRadioStore();
const currentYear = new Date().getFullYear();
const year = ref(currentYear);
const selected = ref('liked');
const local_uploads = ref({});
const tabs = [{ id: 'liked', label: 'Curtidas' }, { id: 'disliked', label: 'Não gostei' }, { id: 'played', label: 'Mais ouvidas' }];
const connected = computed(() => useUtilsStore().connection.connected);
const totals = computed(() => store.statistics?.totals || {});
const items = computed(() => selected.value === 'played' ? store.statistics?.tracks || []
  : Object.values(store.reactions).filter(row => row.reaction === (selected.value === 'liked' ? 1 : -1)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
const canPlay = track => radio.hasTrackAudio(track) || (connected.value && (track.source !== 'upload' || !!local_uploads.value[track.youtube_id]?.storage_key));
async function play(track) {
  const local = await radioRepository.getLocalTrackByYoutubeId(track.youtube_id);
  // Catalog song IDs are unrelated to playlist track IDs.
  return radioFlowApi.play_track(local || { ...compactSong(track), thumbnail: track.source === 'youtube' ? `https://img.youtube.com/vi/${track.youtube_id}/hqdefault.jpg` : null });
}
const listeningTime = ms => { const minutes = Math.floor((ms || 0) / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`; };
async function refresh() {
  year.value = Math.min(currentYear, Math.max(2020, Math.round(Number(year.value) || currentYear)));
  await usePlayerStore().flush_listening();
  await store.refresh(year.value);
}
watch(() => props.modelValue, value => { if (value) void refresh(); });
watch(items, async tracks => {
  const uploads = await Promise.all(tracks.filter(track => track.source === 'upload').map(async track => [track.youtube_id, await radioRepository.getLocalTrackByYoutubeId(track.youtube_id)]));
  local_uploads.value = Object.fromEntries(uploads);
});
</script>

<style scoped>
.insights-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.insights-toolbar .btn { width: auto; display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
.insights-toolbar label { display: flex; align-items: center; gap: 8px; }
.insights-toolbar input { width: 86px; padding: 7px; border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); background: var(--bg-input, transparent); }
.insights-note { color: var(--text-secondary); font-size: 12px; margin: 12px 0; }
.insights-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
.insights-summary div { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: var(--bg-hover, rgba(127,127,127,.1)); border-radius: 12px; }
.insights-summary strong { font-size: 19px; }.insights-summary span { font-size: 12px; color: var(--text-secondary); }
.insights-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.insights-tabs button { border: 1px solid var(--border-color); border-radius: 20px; padding: 8px 12px; background: transparent; color: var(--text-primary); cursor: pointer; }
.insights-tabs button.active { background: var(--color-info); color: white; }
.insights-empty { padding: 32px 0; text-align: center; color: var(--text-secondary); }
.insights-track { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
.track-meta { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }.track-meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.track-meta small { color: var(--text-secondary); }
.track-play { width: 30px; height: 30px; flex-shrink: 0; border: 0; border-radius: 50%; background: var(--bg-hover, rgba(127,127,127,.1)); color: var(--text-primary); cursor: pointer; }.track-play:disabled { opacity: .4; cursor: default; }
@media (max-width: 600px) { .insights-summary { grid-template-columns: repeat(2, 1fr); }.insights-track { gap: 8px; } }
</style>
