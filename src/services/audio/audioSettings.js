export const AUDIO_BANDS = [
  { id: 'bass', label: 'Graves', frequency: 125, type: 'lowshelf' },
  { id: 'mid', label: 'Médios', frequency: 1000, type: 'peaking' },
  { id: 'treble', label: 'Agudos', frequency: 8000, type: 'highshelf' },
];

export const AUDIO_PRESETS = [
  { id: 'flat', label: 'Neutro', bands: { bass: 0, mid: 0, treble: 0 }, night_mode: false },
  { id: 'bass', label: 'Mais graves', bands: { bass: 5, mid: 0, treble: -1 }, night_mode: false },
  { id: 'voice', label: 'Voz em destaque', bands: { bass: -3, mid: 4, treble: -2 }, night_mode: false },
  { id: 'bright', label: 'Mais brilho', bands: { bass: -1, mid: 0, treble: 4 }, night_mode: false },
  { id: 'night', label: 'Noturno', bands: { bass: -3, mid: 2, treble: -2 }, night_mode: true },
];

export function default_audio_settings() {
  return { enabled: false, preset: 'flat', bands: { bass: 0, mid: 0, treble: 0 }, balance: 0, mono: false, night_mode: false };
}

const bounded = (value, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;

export function sanitize_audio_settings(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled === true,
    preset: AUDIO_PRESETS.some((preset) => preset.id === input.preset) || input.preset === 'custom' ? input.preset : 'flat',
    bands: Object.fromEntries(AUDIO_BANDS.map(({ id }) => [id, bounded(input.bands?.[id], -12, 12)])),
    balance: bounded(input.balance, -1, 1), mono: input.mono === true, night_mode: input.night_mode === true,
  };
}

export function audio_headroom_db(settings) {
  // Conservative upper bound for the three filters, independent of the music.
  const boosts = AUDIO_BANDS.reduce((sum, { id }) => sum + Math.max(0, settings.bands[id]), 0);
  const pan_sum = 1 + Math.sin(Math.abs(settings.balance) * Math.PI / 2);
  return -(boosts + 20 * Math.log10(pan_sum)) || 0;
}
