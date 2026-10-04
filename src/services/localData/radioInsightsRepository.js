import { db } from '../../db';
import { syncQueueRepository } from './syncQueueRepository';
import { compactSong } from '../../utils/radioSong.js';
export { compactSong } from '../../utils/radioSong.js';

export const LISTENING_COUNTERS = ['play_count', 'completed_count', 'skipped_count', 'pause_count', 'seek_count', 'listened_ms', 'offline_ms'];
export const isRadioInsightsTask = (task) => ['RADIO_REACTION', 'RADIO_LISTENING'].includes(task.type);

export const radioInsightsRepository = {
  async getReactions(user_id) {
    return db.radio_reactions.where('user_id').equals(user_id).toArray();
  },

  async setReaction(user_id, track, reaction) {
    const song = compactSong(track);
    return db.transaction('rw', db.radio_reactions, db.syncQueue, async () => {
      const key = [user_id, song.youtube_id];
      const previous = await db.radio_reactions.get(key);
      const updated_at = new Date(Math.max(Date.now(), new Date(previous?.updated_at || 0).getTime() + 1)).toISOString();
      const row = { ...song, user_id, reaction, updated_at, pending_sync: true };
      await db.radio_reactions.put(row);
      await syncQueueRepository.addSyncQueueTask({
        type: 'RADIO_REACTION', payload: { user_id, song, reaction, updated_at },
        compact_key: `radio-reaction:${user_id}:${song.youtube_id}`,
      });
      return row;
    });
  },

  async mergeReactions(user_id, items) {
    await db.transaction('rw', db.radio_reactions, async () => {
      for (const item of items) {
        const key = [user_id, item.youtube_id];
        const local = await db.radio_reactions.get(key);
        if (local?.pending_sync || (local && new Date(local.updated_at) > new Date(item.updated_at))) continue;
        await db.radio_reactions.put({ ...compactSong(item), user_id, reaction: item.reaction, updated_at: item.updated_at, pending_sync: false });
      }
    });
  },

  async acknowledgeReaction(user_id, sent, remote) {
    await db.transaction('rw', db.radio_reactions, async () => {
      const local = await db.radio_reactions.get([user_id, sent.song.youtube_id]);
      if (local?.updated_at !== sent.updated_at) return;
      await db.radio_reactions.put({ ...compactSong(remote), user_id, reaction: remote.reaction, updated_at: remote.updated_at, pending_sync: false });
    });
  },

  async addListening(user_id, deltas) {
    return db.transaction('rw', db.radio_clients, db.radio_listening_daily, db.syncQueue, async () => {
      let client = await db.radio_clients.get(user_id);
      if (!client) {
        client = { user_id, client_id: crypto.randomUUID() };
        await db.radio_clients.put(client);
      }
      for (const delta of deltas) {
        const key = [user_id, delta.event_date, delta.song.youtube_id];
        const previous = await db.radio_listening_daily.get(key);
        const row = { user_id, client_id: client.client_id, event_date: delta.event_date,
          youtube_id: delta.song.youtube_id, song: delta.song, last_played_at: delta.last_played_at,
          revision: (previous?.revision || 0) + 1 };
        for (const field of LISTENING_COUNTERS) {
          const maximum = field.endsWith('_ms') ? 86400000 : 100000;
          row[field] = Math.min(maximum, (previous?.[field] || 0) + (delta[field] || 0));
        }
        if (previous?.last_played_at > row.last_played_at) row.last_played_at = previous.last_played_at;
        await db.radio_listening_daily.put(row);
        await syncQueueRepository.addSyncQueueTask({
          type: 'RADIO_LISTENING', payload: row,
          compact_key: `radio-listening:${user_id}:${row.event_date}:${row.youtube_id}`,
        });
      }
    });
  },

  // Compact tasks can change while an HTTP request is in flight. Delete only
  // the snapshot that was actually acknowledged, preserving the newer write.
  async deleteAcknowledgedTask(task) {
    await db.transaction('rw', db.syncQueue, async () => {
      const current = await db.syncQueue.get(task.id);
      if (!current) return;
      const marker = task.type === 'RADIO_REACTION' ? 'updated_at' : 'revision';
      if (current.payload[marker] === task.payload[marker]) await db.syncQueue.delete(task.id);
    });
  },

  async getStatistics(user_id, year) {
    return db.radio_statistics.get([user_id, year]);
  },
  async saveStatistics(user_id, data) {
    await db.radio_statistics.put({ ...data, user_id, fetched_at: new Date().toISOString() });
  },
};
