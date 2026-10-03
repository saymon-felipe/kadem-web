export const PROFILE_VERSION = 1;
export const TARGET_LUFS = -18;
export const MAX_GAIN_DB = 12;
export const db_to_gain = (db) => 10 ** (db / 20);
export const gain_to_db = (gain) => 20 * Math.log10(Math.max(gain, 1e-12));

export function normalization_gain(profile) {
  if (!Number.isFinite(profile?.lufs) || !Number.isFinite(profile?.peak_dbfs)) return 0;
  // Sample peaks leave 3 dB for inter-sample/codec peaks; do not compress a
  // quiet but dynamic recording just to force it to the loudness target.
  return Math.max(-30, Math.min(MAX_GAIN_DB, TARGET_LUFS - profile.lufs, -3 - profile.peak_dbfs));
}

function coefficients(rate) {
  const k = Math.tan(Math.PI * 1681.974450955533 / rate);
  const q = 0.7071752369554196;
  const vh = 10 ** (3.999843853973347 / 20);
  const vb = vh ** 0.4996667741545416;
  const d = 1 + k / q + k * k;
  const shelf = [(vh + vb * k / q + k * k) / d, 2 * (k * k - vh) / d,
    (vh - vb * k / q + k * k) / d, 2 * (k * k - 1) / d, (1 - k / q + k * k) / d];
  const h = Math.tan(Math.PI * 38.13547087602444 / rate);
  const hd = 1 + h / 0.5003270373238773 + h * h;
  return [shelf, [1, -2, 1, 2 * (h * h - 1) / hd, (1 - h / 0.5003270373238773 + h * h) / hd]];
}

function filter(sample, c, s) {
  const out = c[0] * sample + s[0];
  s[0] = c[1] * sample - c[3] * out + s[1];
  s[1] = c[2] * sample - c[4] * out;
  return out;
}

// BS.1770 K-weighting, 400 ms windows at 100 ms intervals, absolute and
// relative gating. A 0.1 LU histogram bounds memory independently of duration.
export class LoudnessMeter {
  constructor(rate = 48000) {
    this.rate = rate;
    this.coefficients = coefficients(rate);
    this.filters = Array.from({ length: 2 }, () => [new Float64Array(2), new Float64Array(2)]);
    this.energy_bins = new Float64Array(901);
    this.count_bins = new Uint32Array(901);
    this.windows = new Float64Array(4);
    this.block_frames = Math.round(rate / 10);
    this.frames = 0;
    this.total_frames = 0;
    this.energy = 0;
    this.window_index = 0;
    this.window_count = 0;
    this.peak = 0;
  }

  process(channels, manual_volume = 1) {
    if (!channels.length || manual_volume < 0.0001) return;
    const count = Math.min(channels.length, 2);
    const length = channels[0].length;
    for (let frame = 0; frame < length; frame++) {
      let energy = 0;
      for (let ch = 0; ch < count; ch++) {
        const sample = channels[ch][frame] / manual_volume;
        this.peak = Math.max(this.peak, Math.abs(sample));
        const weighted = filter(filter(sample, this.coefficients[0], this.filters[ch][0]), this.coefficients[1], this.filters[ch][1]);
        energy += weighted * weighted;
      }
      this.energy += count === 1 ? energy * 2 : energy;
      this.frames++;
      this.total_frames++;
      if (this.frames === this.block_frames) this.finish_block();
    }
  }

  finish_block() {
    this.windows[this.window_index] = this.energy / this.frames;
    this.window_index = (this.window_index + 1) % 4;
    this.window_count++;
    if (this.window_count >= 4) {
      const energy = (this.windows[0] + this.windows[1] + this.windows[2] + this.windows[3]) / 4;
      const lufs = -0.691 + 10 * Math.log10(Math.max(energy, 1e-20));
      if (lufs >= -70) {
        const bin = Math.max(0, Math.min(900, Math.round((lufs + 70) * 10)));
        this.energy_bins[bin] += energy;
        this.count_bins[bin]++;
      }
    }
    this.frames = 0;
    this.energy = 0;
  }

  snapshot() {
    let sum = 0;
    let count = 0;
    for (let bin = 0; bin < 901; bin++) {
      sum += this.energy_bins[bin];
      count += this.count_bins[bin];
    }
    if (!count) return null;
    const relative_gate = -0.691 + 10 * Math.log10(sum / count) - 10;
    const first = Math.max(0, Math.ceil((relative_gate + 70) * 10));
    sum = 0;
    count = 0;
    for (let bin = first; bin < 901; bin++) {
      sum += this.energy_bins[bin];
      count += this.count_bins[bin];
    }
    if (!count || this.total_frames / this.rate < 3) return null;
    return { lufs: -0.691 + 10 * Math.log10(sum / count), peak_dbfs: gain_to_db(this.peak),
      measured_seconds: this.total_frames / this.rate };
  }
}

export function profile_key(user_id, track, source) {
  const identity = track?.youtube_id || track?.upload_id || track?.id || track?.local_id;
  const asset = source instanceof Blob ? `${source.type}:${source.size}` : String(source || '');
  return `${user_id}:v${PROFILE_VERSION}:${identity}:${asset}`;
}
