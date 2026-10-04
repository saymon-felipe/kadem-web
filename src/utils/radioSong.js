export function compactSong(track) {
  return {
    youtube_id: track.youtube_id,
    source: track.source === 'upload' || track.youtube_id?.startsWith('upload:') ? 'upload' : 'youtube',
    title: String(track.title || '').slice(0, 255),
    channel: String(track.channel || '').slice(0, 255),
    duration_seconds: Math.min(86400, Math.max(0, Math.round(Number(track.duration_seconds) || 0))),
  };
}
