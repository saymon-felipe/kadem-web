<template>
  <BaseModal
    :model-value="modelValue"
    title="Suas músicas"
    size="xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Header customizado com ícone e subtítulo -->
    <template #title>
      <div class="insights-modal-header">
        <div class="header-icon-badge" aria-hidden="true">
          <font-awesome-icon icon="chart-simple" />
        </div>
        <div class="header-text-group">
          <h3 class="header-title">Estatísticas &amp; Suas Músicas</h3>
          <span class="header-subtitle">Histórico de reproduções e suas avaliações no rádio</span>
        </div>
      </div>
    </template>

    <div class="insights-content-wrapper">
      <!-- Toolbar superior: Input Date para escolher o ano + Ação de Sincronização -->
      <div class="insights-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-label">Ano</span>
          <div class="year-stepper">
            <button
              type="button"
              class="stepper-btn"
              :disabled="year <= 2020 || store.loading"
              title="Ano anterior"
              aria-label="Ano anterior"
              @click="changeYear(-1)"
            >
              <font-awesome-icon icon="chevron-left" />
            </button>
            <div class="year-date-wrapper" title="Escolha uma data para definir o ano">
              <input
                type="date"
                :value="dateInputValue"
                min="2020-01-01"
                :max="`${currentYear}-12-31`"
                class="year-date-input"
                :disabled="store.loading"
                aria-label="Escolher data do ano"
                @change="onDateChange"
              />
            </div>
            <button
              type="button"
              class="stepper-btn"
              :disabled="year >= currentYear || store.loading"
              title="Próximo ano"
              aria-label="Próximo ano"
              @click="changeYear(1)"
            >
              <font-awesome-icon icon="chevron-right" />
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <span
            v-if="formattedFetchDate && !store.loading"
            class="sync-time-badge"
            :title="`Última atualização: ${formattedFetchDate}`"
          >
            <font-awesome-icon icon="cloud-arrow-up" class="sync-icon" aria-hidden="true" />
            <span>Sincronizado {{ formattedFetchDate }}</span>
          </span>
          <button
            type="button"
            class="btn-refresh"
            :disabled="store.loading"
            title="Atualizar estatísticas e sincronizar dados"
            @click="refresh"
          >
            <font-awesome-icon :icon="store.loading ? 'spinner' : 'arrows-rotate'" :spin="store.loading" />
            <span>{{ store.loading ? 'Atualizando…' : 'Atualizar' }}</span>
          </button>
        </div>
      </div>

      <!-- Banners de status (Offline / Erro) -->
      <div v-if="!connected" class="insights-banner banner-offline" role="status">
        <font-awesome-icon icon="wifi" class="banner-icon" aria-hidden="true" />
        <div class="banner-content">
          <strong>Modo offline</strong> · Avaliações salvas localmente e exibindo o último resumo sincronizado.
        </div>
      </div>

      <div v-if="store.error" class="insights-banner banner-error" role="status">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" aria-hidden="true" />
        <div class="banner-content">
          {{ store.error }}
        </div>
      </div>

      <!-- Cards de estatísticas anuais -->
      <div v-if="store.statistics" class="insights-summary">
        <div class="stat-card stat-plays">
          <div class="stat-header">
            <span class="stat-label">Reproduções</span>
            <div class="stat-icon" aria-hidden="true">
              <font-awesome-icon icon="play" />
            </div>
          </div>
          <div class="stat-value">{{ formatNumber(totals.play_count || 0) }}</div>
          <span class="stat-sublabel">execuções em {{ year }}</span>
        </div>

        <div class="stat-card stat-time">
          <div class="stat-header">
            <span class="stat-label">Tempo Ouvido</span>
            <div class="stat-icon" aria-hidden="true">
              <font-awesome-icon icon="clock" />
            </div>
          </div>
          <div class="stat-value">{{ listeningTime(totals.listened_ms) }}</div>
          <span class="stat-sublabel">com áudio ativo</span>
        </div>

        <div class="stat-card stat-songs">
          <div class="stat-header">
            <span class="stat-label">Músicas Únicas</span>
            <div class="stat-icon" aria-hidden="true">
              <font-awesome-icon icon="music" />
            </div>
          </div>
          <div class="stat-value">{{ formatNumber(totals.unique_songs || 0) }}</div>
          <span class="stat-sublabel">faixas distintas</span>
        </div>

        <div class="stat-card stat-completed">
          <div class="stat-header">
            <span class="stat-label">Concluídas</span>
            <div class="stat-icon" aria-hidden="true">
              <font-awesome-icon icon="circle-check" />
            </div>
          </div>
          <div class="stat-value">{{ formatNumber(totals.completed_count || 0) }}</div>
          <span class="stat-sublabel">ouvidas até o fim</span>
        </div>
      </div>

      <!-- Segmented Tabs (Curtidas, Não gostei, Mais ouvidas) -->
      <div class="insights-tabs" role="group" aria-label="Filtrar suas músicas">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :aria-pressed="selected === tab.id"
          :class="{ active: selected === tab.id, [`tab-${tab.id}`]: true }"
          @click="selected = tab.id"
        >
          <font-awesome-icon :icon="tab.icon" class="tab-icon" aria-hidden="true" />
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.count !== undefined" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Dica contextual da aba selecionada -->
      <div class="insights-note-card">
        <font-awesome-icon icon="circle-info" class="note-icon" aria-hidden="true" />
        <span class="note-text">{{ tabDescription }}</span>
      </div>

      <!-- Empty State -->
      <div v-if="!items.length" class="insights-empty" role="status">
        <div class="empty-icon-circle" :class="{ 'is-loading': store.loading }" aria-hidden="true">
          <font-awesome-icon :icon="store.loading ? 'spinner' : emptyStateIcon" :spin="store.loading" />
        </div>
        <h4 class="empty-title">{{ store.loading ? 'Carregando suas músicas…' : emptyStateTitle }}</h4>
        <p class="empty-subtitle">{{ store.loading ? 'Sincronizando estatísticas e avaliações.' : emptyStateSubtitle }}</p>
      </div>

      <!-- Lista de músicas estilizada (fluxo estável sem oscilação de altura) -->
      <div v-else class="insights-list">
        <div
          v-for="(track, index) in items"
          :key="track.youtube_id"
          class="insights-track"
          :class="{
            'is-playing': isCurrentPlaying(track),
            'is-current': isTrackPlaying(track),
            'is-disabled': !canPlay(track),
          }"
        >
          <!-- Rank badge quando na aba 'Mais ouvidas' -->
          <div v-if="selected === 'played'" class="track-rank" :class="getRankClass(index)" :title="`Posição #${index + 1}`">
            <font-awesome-icon v-if="index === 0" icon="crown" class="crown-icon" aria-hidden="true" />
            <span>{{ index === 0 ? '' : '#' }}{{ index === 0 ? '1' : index + 1 }}</span>
          </div>

          <!-- Thumbnail com Overlay de Play / Equalizador -->
          <div
            class="track-thumb"
            :title="canPlay(track) ? (isCurrentPlaying(track) ? 'Pausar música' : 'Reproduzir música') : 'Upload removido das suas playlists'"
            @click="handlePlay(track)"
          >
            <img
              :src="getThumbnail(track)"
              :alt="decode_html_entities(track.title) || 'Capa da música'"
              loading="lazy"
              decoding="async"
              @error="onThumbError"
            />
            <div class="play-overlay" :class="{ visible: isTrackPlaying(track) }">
              <font-awesome-icon :icon="isCurrentPlaying(track) ? 'pause' : 'play'" />
            </div>
            <div v-if="isCurrentPlaying(track)" class="equalizer-bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <!-- Metadados da Música -->
          <div class="track-meta" @click="handlePlay(track)">
            <strong class="track-title" :title="decode_html_entities(track.title) || 'Música sem título'">
              {{ decode_html_entities(track.title) || 'Música sem título' }}
            </strong>
            <small class="track-artist">
              {{ decode_html_entities(track.channel) || 'Artista desconhecido' }}
            </small>

            <div v-if="selected === 'played'" class="track-stats">
              <span class="track-stat-pill" title="Número de reproduções">
                <font-awesome-icon icon="play" /> {{ track.play_count }} {{ track.play_count === 1 ? 'play' : 'plays' }}
              </span>
              <span class="track-stat-pill" title="Tempo total ouvido">
                <font-awesome-icon icon="clock" /> {{ listeningTime(track.listened_ms) }}
              </span>
              <span v-if="track.skipped_count > 0" class="track-stat-pill skip-pill" title="Número de vezes pulada">
                {{ track.skipped_count }} {{ track.skipped_count === 1 ? 'pulada' : 'puladas' }}
              </span>
            </div>
          </div>

          <!-- Botões de Reação (Curtida / Dislike) -->
          <div class="track-reaction-container">
            <TrackReaction :track="track" />
          </div>
        </div>
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
import kadem_default_music from '@/assets/images/kadem-default-music.jpg';

const props = defineProps({ modelValue: Boolean });
defineEmits(['update:modelValue']);

const store = useRadioInsightsStore();
const radio = useRadioStore();
const player = usePlayerStore();
const utils = useUtilsStore();

const currentYear = new Date().getFullYear();
const year = ref(currentYear);
const selected = ref('liked');
const local_uploads = ref({});

const dateInputValue = computed(() => `${year.value}-01-01`);

function onDateChange(event) {
  const val = event?.target?.value;
  if (!val) return;
  const parsedYear = parseInt(val.split('-')[0], 10);
  if (!isNaN(parsedYear)) {
    const clamped = Math.min(currentYear, Math.max(2020, parsedYear));
    if (clamped !== year.value) {
      year.value = clamped;
      void refresh();
    }
  }
}

function changeYear(delta) {
  const target = year.value + delta;
  if (target >= 2020 && target <= currentYear) {
    year.value = target;
    void refresh();
  }
}

const likedCount = computed(() => {
  return Object.values(store.reactions).filter((row) => row.reaction === 1).length;
});

const dislikedCount = computed(() => {
  return Object.values(store.reactions).filter((row) => row.reaction === -1).length;
});

const playedCount = computed(() => {
  return store.statistics?.tracks?.length || 0;
});

const tabs = computed(() => [
  { id: 'liked', label: 'Curtidas', icon: 'thumbs-up', count: likedCount.value },
  { id: 'disliked', label: 'Não gostei', icon: 'thumbs-down', count: dislikedCount.value },
  { id: 'played', label: 'Mais ouvidas', icon: 'chart-simple', count: playedCount.value },
]);

const connected = computed(() => utils.connection.connected);
const totals = computed(() => store.statistics?.totals || {});

const items = computed(() =>
  selected.value === 'played'
    ? store.statistics?.tracks || []
    : Object.values(store.reactions)
        .filter((row) => row.reaction === (selected.value === 'liked' ? 1 : -1))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);

const canPlay = (track) =>
  radio.hasTrackAudio(track) ||
  (connected.value && (track.source !== 'upload' || !!local_uploads.value[track.youtube_id]?.storage_key));

const isTrackPlaying = (track) => {
  if (!player.current_music) return false;
  return Boolean(track.youtube_id && track.youtube_id === player.current_music.youtube_id);
};

const isCurrentPlaying = (track) => isTrackPlaying(track) && player.is_playing;

async function play(track) {
  const local = await radioRepository.getLocalTrackByYoutubeId(track.youtube_id);
  // Catalog song IDs are unrelated to playlist track IDs.
  return radioFlowApi.play_track(
    local || {
      ...compactSong(track),
      thumbnail:
        track.thumbnail ||
        (track.source === 'youtube'
          ? `https://img.youtube.com/vi/${track.youtube_id}/hqdefault.jpg`
          : null),
    }
  );
}

async function handlePlay(track) {
  if (!canPlay(track)) return;
  if (isTrackPlaying(track)) {
    await player.toggle_play();
    return;
  }
  return play(track);
}

const getThumbnail = (track) => {
  if (track.thumbnail) return track.thumbnail;
  if (track.source === 'youtube' && track.youtube_id) {
    return `https://img.youtube.com/vi/${track.youtube_id}/mqdefault.jpg`;
  }
  return kadem_default_music;
};

const onThumbError = (event) => {
  if (event?.target) {
    event.target.src = kadem_default_music;
  }
};

const formatNumber = (num) => new Intl.NumberFormat('pt-BR').format(num || 0);

const listeningTime = (ms) => {
  const minutes = Math.floor((ms || 0) / 60000);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
    : `${minutes} min`;
};

const formattedFetchDate = computed(() => {
  if (!store.statistics?.fetched_at) return '';
  try {
    const d = new Date(store.statistics.fetched_at);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
});

const tabDescription = computed(() => {
  if (selected.value === 'played') {
    return `Até 100 músicas mais ouvidas em ${year.value}. Reproduções contam quando o áudio avança.`;
  }
  if (selected.value === 'liked') {
    return 'Músicas que você curtiu no rádio. Suas avaliações são salvas e pessoais neste dispositivo.';
  }
  return 'Músicas que você marcou com dislike. Clique novamente no ícone para remover a avaliação.';
});

const emptyStateIcon = computed(() => {
  if (selected.value === 'played') return 'chart-simple';
  if (selected.value === 'liked') return 'thumbs-up';
  return 'thumbs-down';
});

const emptyStateTitle = computed(() => {
  if (selected.value === 'played') return `Nenhuma reprodução em ${year.value}`;
  if (selected.value === 'liked') return 'Nenhuma música curtida ainda';
  return 'Nenhuma música com dislike';
});

const emptyStateSubtitle = computed(() => {
  if (selected.value === 'played') {
    return 'Ouça músicas pelo rádio para registrar seu histórico de reproduções neste ano.';
  }
  if (selected.value === 'liked') {
    return 'Curta faixas durante a reprodução ou nas playlists para adicioná-las aqui.';
  }
  return 'Músicas avaliadas negativamente aparecerão listadas nesta seção.';
});

function getRankClass(index) {
  if (index === 0) return 'rank-gold';
  if (index === 1) return 'rank-silver';
  if (index === 2) return 'rank-bronze';
  return 'rank-default';
}

async function refresh() {
  year.value = Math.min(currentYear, Math.max(2020, Math.round(Number(year.value) || currentYear)));
  await usePlayerStore().flush_listening();
  await store.refresh(year.value);
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) void refresh();
  }
);

watch(items, async (tracks) => {
  const uploads = await Promise.all(
    tracks
      .filter((track) => track.source === 'upload')
      .map(async (track) => [
        track.youtube_id,
        await radioRepository.getLocalTrackByYoutubeId(track.youtube_id),
      ])
  );
  local_uploads.value = Object.fromEntries(uploads);
});
</script>

<style scoped>
/* Header do Modal */
.insights-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.header-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(53, 90, 253, 0.18), rgba(124, 58, 237, 0.22));
  border: 1px solid rgba(53, 90, 253, 0.25);
  color: var(--color-info, #355AFD);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.header-text-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-title {
  font-size: 1.22rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.25;
}

.header-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.2;
}

/* Container raiz do corpo — estabiliza a medição de altura do BaseModal */
.insights-content-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  min-height: 0;
}

/* Toolbar superior (Ano com input date + Sincronizar) */
.insights-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  background: var(--surface-1, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md, 12px);
  margin-bottom: 10px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.year-stepper {
  display: inline-flex;
  align-items: center;
  background: var(--surface-2, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill, 999px);
  padding: 3px 6px;
  gap: 4px;
}

.stepper-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 11px;
  transition: all var(--transition-fast);
}

.stepper-btn:hover:not(:disabled) {
  background: var(--surface-3, rgba(255, 255, 255, 0.12));
  color: var(--text-primary);
  transform: scale(1.08);
}

.stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.year-date-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.year-date-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
  outline: none;
  font-family: inherit;
  color-scheme: light dark;
}

[data-theme="dark"] .year-date-input {
  color-scheme: dark;
}

.year-date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  filter: invert(0.6);
}

[data-theme="dark"] .year-date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.9);
}

.year-date-input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
  transform: scale(1.1);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-time-badge {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sync-icon {
  font-size: 11px;
  color: var(--color-info, #355AFD);
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 16px;
  border-radius: var(--radius-pill, 999px);
  border: 1px solid var(--glass-border);
  background: var(--surface-2, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-refresh:hover:not(:disabled) {
  background: var(--surface-3, rgba(255, 255, 255, 0.14));
  border-color: var(--color-info, #355AFD);
  color: var(--color-info, #355AFD);
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* Banners Informativos */
.insights-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-md, 10px);
  font-size: 0.82rem;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.banner-offline {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--color-warning, #f59e0b);
}

.banner-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-expense, #ef4444);
}

.banner-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* Grade de Métricas Anuais */
.insights-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 10px 0 14px;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: var(--surface-1, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md, 12px);
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.stat-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.stat-plays .stat-icon {
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
}
.stat-plays:hover { border-color: rgba(56, 189, 248, 0.4); }

.stat-time .stat-icon {
  background: rgba(167, 139, 250, 0.14);
  color: #a78bfa;
}
.stat-time:hover { border-color: rgba(167, 139, 250, 0.4); }

.stat-songs .stat-icon {
  background: rgba(52, 211, 153, 0.14);
  color: #34d399;
}
.stat-songs:hover { border-color: rgba(52, 211, 153, 0.4); }

.stat-completed .stat-icon {
  background: rgba(251, 191, 36, 0.14);
  color: #fbbf24;
}
.stat-completed:hover { border-color: rgba(251, 191, 36, 0.4); }

.stat-value {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}

.stat-sublabel {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Tabs Bar */
.insights-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--surface-1, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill, 999px);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.insights-tabs button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-pill, 999px);
  padding: 9px 16px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.insights-tabs button:hover:not(.active) {
  background: var(--surface-2, rgba(255, 255, 255, 0.06));
  color: var(--text-primary);
}

.insights-tabs button.active {
  background: var(--color-info, #355AFD);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.35);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
}

.insights-tabs button:not(.active) .tab-badge {
  background: var(--surface-3, rgba(255, 255, 255, 0.08));
  color: var(--text-muted);
}

/* Card Informativo Contextual */
.insights-note-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--surface-2, rgba(255, 255, 255, 0.03));
  border-radius: var(--radius-md, 8px);
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 10px;
  line-height: 1.35;
  flex-shrink: 0;
}

.note-icon {
  font-size: 13px;
  color: var(--color-info, #355AFD);
  flex-shrink: 0;
}

/* Lista de Músicas — elemento de fluxo sem overflow conflitante */
.insights-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  flex-shrink: 0;
}

.insights-track {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-md, 10px);
  background: var(--surface-1, rgba(255, 255, 255, 0.02));
  border: 1px solid transparent;
  flex-shrink: 0;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.insights-track:hover {
  background: var(--surface-2, rgba(255, 255, 255, 0.06));
  border-color: var(--glass-border);
}

.insights-track.is-current {
  border-color: rgba(53, 90, 253, 0.4);
  background: rgba(53, 90, 253, 0.08);
}

.insights-track.is-disabled {
  opacity: 0.55;
}

/* Rank Badge para 'Mais ouvidas' */
.track-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--surface-3, rgba(255, 255, 255, 0.07));
  color: var(--text-muted);
}

.track-rank.rank-gold {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
  font-weight: 800;
}

.track-rank.rank-silver {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: #ffffff;
  font-weight: 700;
}

.track-rank.rank-bronze {
  background: linear-gradient(135deg, #d97706, #92400e);
  color: #ffffff;
  font-weight: 700;
}

.crown-icon {
  margin-right: 2px;
  font-size: 10px;
}

/* Thumbnail com Capa e Overlay */
.track-thumb {
  position: relative;
  width: 46px;
  height: 46px;
  min-width: 46px;
  min-height: 46px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: var(--surface-3, #222);
}

.track-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 13px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.track-thumb:hover .play-overlay,
.play-overlay.visible {
  opacity: 1;
}

.insights-track.is-playing .play-overlay {
  background: rgba(53, 90, 253, 0.65);
  opacity: 1;
}

/* Equalizador animado */
.equalizer-bars {
  position: absolute;
  bottom: 4px;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 10px;
  pointer-events: none;
}

.equalizer-bars span {
  width: 2.5px;
  height: 100%;
  background: #ffffff;
  border-radius: 1px;
  animation: eqBounce 0.75s ease-in-out infinite alternate;
}

.equalizer-bars span:nth-child(2) {
  animation-delay: 0.2s;
}

.equalizer-bars span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes eqBounce {
  0% { height: 25%; }
  100% { height: 100%; }
}

/* Metadados */
.track-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  cursor: pointer;
}

.track-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-artist {
  font-size: 0.78rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.track-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--surface-3, rgba(255, 255, 255, 0.05));
  padding: 1px 7px;
  border-radius: 4px;
}

.track-stat-pill svg {
  font-size: 8px;
}

.skip-pill {
  color: var(--color-warning, #f59e0b);
}

.track-reaction-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Empty State */
.insights-empty {
  padding: 30px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-shrink: 0;
}

.empty-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-2, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--glass-border);
  display: grid;
  place-items: center;
  font-size: 22px;
  color: var(--text-muted);
}

.empty-icon-circle.is-loading {
  color: var(--color-info, #355AFD);
}

.empty-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  max-width: 360px;
  line-height: 1.4;
}

/* Responsividade Mobile */
@media (max-width: 640px) {
  .insights-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .insights-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .insights-tabs {
    border-radius: 12px;
  }

  .insights-tabs button {
    padding: 7px 8px;
    font-size: 0.78rem;
    gap: 4px;
  }

  .insights-track {
    gap: 8px;
    padding: 6px 8px;
  }

  .track-thumb {
    width: 40px;
    height: 40px;
  }
}
</style>
