<template>
  <div
    class="track-reaction"
    :class="{
      'has-reaction': currentVote !== 0,
      'is-liked': currentVote === 1,
      'is-disliked': currentVote === -1,
    }"
    role="group"
    aria-label="Sua avaliação da música"
    @click.stop
    @dblclick.stop
  >
    <button
      v-for="vote in votes"
      :key="vote.value"
      type="button"
      :disabled="!track?.youtube_id"
      :class="{
        selected: currentVote === vote.value,
        dislike: vote.value === -1,
      }"
      :aria-pressed="currentVote === vote.value"
      :aria-label="currentVote === vote.value ? vote.remove : vote.label"
      :title="currentVote === vote.value ? vote.remove : vote.label"
      @click="store.toggleReaction(track, vote.value)"
    >
      <font-awesome-icon :icon="vote.icon" />
    </button>
    <span v-if="store.error" class="reaction-error" role="status">{{ store.error }}</span>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRadioInsightsStore } from '@/stores/radioInsights';

const props = defineProps({
  track: { type: Object, default: null },
});

const store = useRadioInsightsStore();
const currentVote = computed(() => store.reactionFor(props.track));

const votes = [
  { value: 1, icon: 'thumbs-up', label: 'Curtir música', remove: 'Remover curtida' },
  { value: -1, icon: 'thumbs-down', label: 'Não gostei desta música', remove: 'Remover dislike' },
];

onMounted(() => {
  if (!store.owner_id) void store.loadLocal();
});
</script>

<style scoped>
.track-reaction {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  vertical-align: middle;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Revela ao passar o mouse perto da região (linha, coluna de título, meta ou no próprio componente) */
.track-row:hover .track-reaction,
.track-title-col:hover .track-reaction,
.title-row:hover .track-reaction,
.meta:hover .track-reaction,
.track-reaction:hover,
.track-reaction:focus-within {
  opacity: 1;
  pointer-events: auto;
}

/* Quando já possui avaliação, mantém visível */
.track-reaction.has-reaction {
  opacity: 1;
  pointer-events: auto;
}

/* Quando tem avaliação mas o mouse não está sobre a linha ou título, exibe apenas a avaliação atual */
.track-row:not(:hover) .track-reaction.has-reaction:not(:hover) button:not(.selected) {
  opacity: 0;
  width: 0;
  min-width: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
  border: none;
}

button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11.5px;
  transition: background 0.2s, color 0.2s, transform 0.15s, width 0.2s, opacity 0.2s;
}

button:hover {
  background: var(--bg-hover, rgba(127, 127, 127, 0.18));
  color: var(--text-primary);
  transform: scale(1.1);
}

button.selected {
  color: var(--color-info, #38bdf8);
}

button.selected:hover {
  background: var(--bg-hover, rgba(56, 189, 248, 0.15));
}

button.selected.dislike {
  color: var(--color-danger, #ef4444);
}

button.selected.dislike:hover {
  background: var(--bg-hover, rgba(239, 68, 68, 0.15));
}

button:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

.reaction-error {
  font-size: 11px;
  max-width: 150px;
  color: var(--danger-color, #ef4444);
}

.insights-track .track-reaction,
.player-extra-actions .track-reaction {
  opacity: 1;
  pointer-events: auto;
}

.insights-track .track-reaction button,
.player-extra-actions .track-reaction button {
  width: 30px;
  height: 30px;
  min-width: 30px;
  font-size: 13px;
}
</style>
