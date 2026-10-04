import { compactSong } from '../utils/radioSong.js';

// Sampling only holds the current session and unflushed daily deltas in memory.
// Persisted counters are absolute; pauses/seeks never masquerade as listening.
export class RadioListeningTracker {
  constructor({ snapshot, persist, onError = console.error, now = Date.now }) {
    this.snapshot = snapshot;
    this.persist = persist;
    this.onError = onError;
    this.now = now;
    this.session = null;
    this.previous = null;
    this.pending = new Map();
    this.writes = Promise.resolve();
  }

  sample() {
    const state = this.snapshot();
    const now = this.now();
    const key = state.user_id && state.track?.youtube_id ? `${state.user_id}:${state.track.youtube_id}` : null;
    if (this.session?.key !== key) {
      this.finish('skipped', false);
      this.session = key ? { key, user_id: state.user_id, song: compactSong(state.track), started: false } : null;
      this.previous = null;
    }
    const previous = this.previous;
    if (this.session && previous?.playing) {
      const elapsed = Math.max(0, now - previous.time);
      const progress = (state.position - previous.position) * 1000;
      if (progress > 0 && progress <= elapsed * 1.5 + 400) {
        const listened = Math.min(progress, elapsed);
        if (listened > 0) {
          if (!this.session.started) {
            this.session.started = true;
            this.add('play_count', 1, previous.time);
          }
          // Split the measured time at UTC midnight, without another play.
          let start = now - listened;
          while (start < now) {
            const end = Math.min(now, new Date(new Date(start).toISOString().slice(0, 10)).getTime() + 86400000);
            const amount = Math.round(end - start);
            this.add('listened_ms', amount, start);
            if (previous.offline) this.add('offline_ms', amount, start);
            start = end;
          }
        }
      }
    }
    this.previous = { time: now, position: Number(state.position) || 0, playing: !!state.playing, offline: !!state.offline };
  }

  add(field, amount = 1, at = this.now()) {
    if (!this.session || !amount) return;
    const event_date = new Date(at).toISOString().slice(0, 10);
    const key = `${this.session.user_id}:${event_date}:${this.session.song.youtube_id}`;
    const row = this.pending.get(key) || { user_id: this.session.user_id, song: this.session.song, event_date };
    row[field] = (row[field] || 0) + amount;
    row.last_played_at = new Date(this.now()).toISOString();
    this.pending.set(key, row);
  }

  event(kind, position) {
    this.sample();
    if (this.session?.started) this.add(kind === 'pause' ? 'pause_count' : 'seek_count');
    if (this.previous) {
      if (kind === 'seek') this.previous.position = position;
      if (kind === 'pause') this.previous.playing = false;
    }
    return this.flush();
  }

  finish(reason = null, sample = true) {
    if (sample) this.sample();
    if (this.session?.started && reason) this.add(reason === 'completed' ? 'completed_count' : 'skipped_count');
    this.session = null;
    this.previous = null;
    return this.flush();
  }

  flush() {
    const rows = [...this.pending.values()];
    this.pending.clear();
    if (!rows.length) return this.writes;
    this.writes = this.writes.then(async () => {
      const users = [...new Set(rows.map(row => row.user_id))];
      for (const user_id of users) await this.persist(user_id, rows.filter(row => row.user_id === user_id));
    }).catch(error => {
      // Keep deltas for a later checkpoint when IndexedDB is temporarily busy.
      for (const row of rows) {
        const key = `${row.user_id}:${row.event_date}:${row.song.youtube_id}`;
        const pending = this.pending.get(key);
        if (!pending) this.pending.set(key, row);
        else for (const field of ['play_count', 'completed_count', 'skipped_count', 'pause_count', 'seek_count', 'listened_ms', 'offline_ms']) pending[field] = (pending[field] || 0) + (row[field] || 0);
      }
      this.onError(error);
    });
    return this.writes;
  }
}
