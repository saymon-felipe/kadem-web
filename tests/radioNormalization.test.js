import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { LoudnessMeter, normalization_gain, db_to_gain, profile_key } from '../src/services/audio/loudness.js';

function tone(amplitude, { channels = 2, seconds = 5, volume = 1, rate = 48000 } = {}) {
  const meter = new LoudnessMeter(rate);
  const samples = Array.from({ length: channels }, () => new Float32Array(128));
  const count = Math.ceil(seconds * rate / 128);
  for (let chunk = 0; chunk < count; chunk++) {
    for (let sample = 0; sample < 128; sample++) {
      const value = amplitude * volume * Math.sin(2 * Math.PI * 1000 * (chunk * 128 + sample) / rate);
      for (let ch = 0; ch < channels; ch++) samples[ch][sample] = value;
    }
    meter.process(samples, volume);
  }
  return { meter, profile: meter.snapshot() };
}

test('mede loudness relativo e compensa volume manual, inclusive mono', () => {
  const quiet = tone(0.02).profile;
  const loud = tone(0.2).profile;
  const manual = tone(0.02, { volume: 0.25 }).profile;
  const mono = tone(0.02, { channels: 1 }).profile;
  assert.ok(Math.abs(loud.lufs - quiet.lufs - 20) < 0.05);
  assert.ok(Math.abs(manual.lufs - quiet.lufs) < 0.05);
  assert.ok(Math.abs(mono.lufs - quiet.lufs) < 0.05);
  assert.ok(normalization_gain(quiet) > 0);
  assert.ok(normalization_gain(loud) < 0);
});

test('silêncio, mute e dados inválidos não produzem amplificação', () => {
  assert.equal(tone(0).profile, null);
  assert.equal(tone(0.01, { volume: 0 }).profile, null);
  assert.equal(normalization_gain({ lufs: NaN, peak_dbfs: -10 }), 0);
  assert.equal(normalization_gain(null), 0);
});

test('ganho respeita referência, limite de 12 dB e margem para picos', () => {
  assert.equal(normalization_gain({ lufs: -30, peak_dbfs: -16 }), 12);
  assert.equal(normalization_gain({ lufs: -8, peak_dbfs: -1 }), -10);
  assert.equal(normalization_gain({ lufs: -32, peak_dbfs: -2 }), -1);
  assert.ok(db_to_gain(12) < 4);
});

test('cache compartilha a mesma mídia, mas separa usuário, versão e arquivos', () => {
  const blob = new Blob(['audio'], { type: 'audio/mp3' });
  const first = profile_key(1, { youtube_id: 'abcdefghijk', local_id: 2 }, blob);
  assert.equal(first, profile_key(1, { youtube_id: 'abcdefghijk', local_id: 99 }, blob));
  assert.notEqual(first, profile_key(2, { youtube_id: 'abcdefghijk' }, blob));
  assert.notEqual(first, profile_key(1, { youtube_id: 'abcdefghijk' }, new Blob(['different'], { type: 'audio/mp3' })));
});

test('medição mantém buffers fixos após reprodução longa', () => {
  const started = performance.now();
  const { meter, profile } = tone(0.05, { seconds: 120 });
  assert.ok(profile.measured_seconds >= 120);
  assert.equal(meter.energy_bins.length, 901);
  assert.equal(meter.count_bins.length, 901);
  assert.equal(meter.windows.length, 4);
  const bytes = meter.energy_bins.byteLength + meter.count_bins.byteLength + meter.windows.byteLength;
  console.log(`120s de áudio analisados em ${Math.round(performance.now() - started)}ms, buffers estatísticos: ${bytes} bytes`);
});
