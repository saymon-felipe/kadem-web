import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_PRESETS, default_audio_settings, sanitize_audio_settings, audio_headroom_db } from '../src/services/audio/audioSettings.js';

test('preferências de áudio descartam dados inválidos e limitam ganho/balanço', () => {
  assert.deepEqual(sanitize_audio_settings(null), default_audio_settings());
  const sanitized = sanitize_audio_settings({enabled:true,preset:'unknown',bands:{bass:999,mid:NaN,treble:-999},balance:5,mono:'true',night_mode:true,unknown:[1,2]});
  assert.deepEqual(sanitized,{enabled:true,preset:'flat',bands:{bass:12,mid:0,treble:-12},balance:1,mono:false,night_mode:true});
  for(const preset of AUDIO_PRESETS) assert.ok(Number.isFinite(audio_headroom_db(sanitize_audio_settings({...preset,enabled:true}))));
});

test('margem do mix cobre os ganhos positivos e a soma de canais do panner', () => {
  const flat=default_audio_settings();
  assert.equal(audio_headroom_db(flat),0);
  assert.equal(audio_headroom_db({...flat,bands:{bass:12,mid:12,treble:12}}),-36);
  assert.ok(Math.abs(audio_headroom_db({...flat,balance:1}) + 6.020599913) < 1e-6);
  assert.equal(audio_headroom_db({...flat,balance:-1}),audio_headroom_db({...flat,balance:1}));
  for(let index=0;index<200;index++) {
    const settings=sanitize_audio_settings({bands:{bass:index%25-12,mid:index%19-9,treble:index%13-6},balance:index/100-1});
    const amplitude=10**(audio_headroom_db(settings)/20);
    const max_filters=10**(Object.values(settings.bands).reduce((total,gain)=>total+Math.max(0,gain),0)/20);
    const pan_sum=1+Math.sin(Math.abs(settings.balance)*Math.PI/2);
    assert.ok(amplitude*max_filters*pan_sum <= 1+1e-12,'processing cannot exceed its conservative peak budget');
  }
});
