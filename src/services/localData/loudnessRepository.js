import { db } from '../../db';
import { PROFILE_VERSION } from '../audio/loudness';

export const loudnessRepository = {
  async get(key) {
    const profile = await db.radio_loudness_profiles.get(key);
    return profile?.version === PROFILE_VERSION ? profile : null;
  },
  async save(key, user_id, profile) {
    if (!Number.isFinite(profile?.lufs) || !Number.isFinite(profile?.peak_dbfs)) return;
    await db.transaction('rw', db.radio_loudness_profiles, async () => {
      const previous = await this.get(key);
      if (previous?.complete && !profile.complete) return;
      if (!profile.complete && previous && !previous.approximate &&
        (profile.approximate || previous.measured_seconds > profile.measured_seconds)) return;
      await db.radio_loudness_profiles.put({ key, user_id, version: PROFILE_VERSION,
        lufs: profile.lufs, peak_dbfs: profile.peak_dbfs,
        measured_seconds: profile.measured_seconds || 0, complete: !!profile.complete,
        approximate: !!profile.approximate, updated_at: Date.now() });
    });
  },
  async getYoutube(key) {
    const profile = await db.radio_loudness_profiles.get(key);
    return profile?.version === PROFILE_VERSION && profile.expires_at > Date.now() ? profile : null;
  },
  async saveYoutube(key, user_id, profile) {
    if (!Number.isFinite(profile?.gain_db)) return;
    await db.radio_loudness_profiles.put({ key, user_id, version: PROFILE_VERSION,
      gain_db: profile.gain_db, expires_at: Date.now() + 30 * 86400000, updated_at: Date.now() });
  },
};
