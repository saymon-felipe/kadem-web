<template>
  <a
    class="link-chip"
    :class="`is-${chip.kind}`"
    :href="chip.href"
    target="_blank"
    rel="noopener noreferrer"
    :title="`Abrir ${chip.href}`"
  >
    <font-awesome-icon :icon="chip.kind === 'maps' ? 'map-location-dot' : 'link'" class="chip-icon" />
    <span class="chip-text">
      <strong class="chip-label">{{ chip.label }}</strong>
      <span class="chip-detail">{{ chip.detail }}</span>
    </span>
    <font-awesome-icon icon="arrow-up-right-from-square" class="chip-open" />
  </a>
</template>

<script>
export default {
  name: "AgendaLinkChip",
  props: {
    // { kind: "maps" | "link", href, label, detail } — montado por utils/agendaLinks.js
    chip: { type: Object, required: true },
  },
};
</script>

<style scoped>
.link-chip {
  --chip: #3b82f6;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--chip) 30%, transparent);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--chip) 10%, transparent);
  color: var(--text-primary);
  text-decoration: none;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  box-sizing: border-box;
}

.link-chip.is-maps {
  --chip: #ea4335;
}

.link-chip:hover,
.link-chip:focus-visible {
  background: color-mix(in srgb, var(--chip) 18%, transparent);
  border-color: var(--chip);
  outline: none;
  transform: translateY(-1px);
}

.chip-icon {
  flex-shrink: 0;
  font-size: 0.95rem;
  color: var(--chip);
}

.chip-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.chip-label {
  font-size: 0.76rem;
  font-weight: 700;
}

.chip-detail {
  overflow: hidden;
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-open {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>
