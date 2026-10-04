import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { setImmediate } from 'node:timers';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createPinia, setActivePinia, disposePinia } from 'pinia';
import { createApp, nextTick } from 'vue';
import { selectivePersistence } from '../src/plugins/selectivePersistence.js';

class Media extends EventTarget {
  constructor() { super(); this.currentTime=0; this.duration=30; this.volume=1; this.paused=false; this.readyState=4; this.src='blob:test'; }
  play() { this.paused=false; return Promise.resolve(); }
  pause() { this.paused=true; }
  removeAttribute() { this.src=''; }
}
class Parameter { value=1; cancelScheduledValues() {} setTargetAtTime(value) { this.value=value; } }
class Node {
  gain=new Parameter(); threshold=new Parameter(); ratio=new Parameter(); attack=new Parameter(); release=new Parameter(); knee=new Parameter();
  frequency=new Parameter(); Q=new Parameter(); pan=new Parameter();
  connect(node) { return node; } disconnect() {}
}
class Context {
  state='running'; currentTime=0; sampleRate=48000; destination={}; captures=0;
  filters=0; panners=0;
  audioWorklet={addModule:async()=>{}};
  resume() { this.state='running'; return Promise.resolve(); }
  close() { this.state='closed'; return Promise.resolve(); }
  createMediaElementSource() { this.captures++; return new Node(); }
  createGain() { return new Node(); } createDynamicsCompressor() { return new Node(); }
  createBiquadFilter() { this.filters++;return new Node(); } createStereoPanner() { this.panners++;return new Node(); }
  createAnalyser() { const node=new Node(); node.getFloatTimeDomainData=(samples)=>samples.fill(0); return node; }
}
class Worklet extends Node {
  port={postMessage(){},close(){},onmessage:null};
}
const settled = async () => { await new Promise((resolve)=>setImmediate(resolve)); await nextTick(); };
const wait_for = async (condition) => {
  const limit=Date.now()+2000;
  while(!condition() && Date.now()<limit) await new Promise((resolve)=>setTimeout(resolve,5));
  assert.ok(condition(),'condition must settle');
};

test('migração, perfis, fachada e ciclo de vida preservam mídia e estado', {timeout:30000}, async () => {
  const previous={storage:globalThis.localStorage,audio:globalThis.Audio,context:globalThis.AudioContext,worklet:globalThis.AudioWorkletNode};
  const storage=new Map(), writes=[];
  globalThis.localStorage={getItem:(key)=>storage.get(key)??null,setItem:(key,value)=>{storage.set(key,value);writes.push(key);},removeItem:(key)=>storage.delete(key)};
  globalThis.Audio=Media;globalThis.AudioContext=Context;globalThis.AudioWorkletNode=Worklet;
  const server=await createServer({configFile:false,plugins:[{name:'test-router',enforce:'pre',resolveId(id){if((id.startsWith('@/')||id.startsWith('.'))&&/router(\/index(\.js)?)?$/.test(id))return '\0test-router';},load(id){if(id==='\0test-router')return 'export default {push(){},replace(){},currentRoute:{value:{}}};';}},vue()],root:process.cwd(),resolve:{alias:{'@':path.resolve('src')}},server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
  let db, pinia, player;
  try {
    ({db}=await server.ssrLoadModule('/src/db.js'));
    // Recreate the actual previous schema, including every unchanged table.
    const old=new Dexie('KademDB');
    old.version(21).stores(Object.fromEntries(db.tables.filter((table)=>table.name!=='radio_loudness_profiles').map((table)=>[table.name,[table.schema.primKey.src,...table.schema.indexes.map((index)=>index.src)].join(',')])));
    await old.open();
    const blob=new Blob(['legacy media'],{type:'audio/mp3'});
    await old.global_audio_cache.put({youtube_id:'abcdefghijk',audio_blob:blob});
    await old.tracks.put({id:7,title:'Download antigo',youtube_id:'abcdefghijk',audio_blob:blob});
    await old.global_video_cache.put({youtube_id:'abcdefghijk',video_blob:blob});
    old.close();await db.open();
    assert.equal(db.verno,25);
    assert.equal((await db.global_audio_cache.get('abcdefghijk')).audio_blob.size,blob.size);
    assert.equal((await db.tracks.get({id:7})).title,'Download antigo');
    assert.equal((await db.global_video_cache.get('abcdefghijk')).video_blob.size,blob.size);
    const {loudnessRepository:repository}=await server.ssrLoadModule('/src/services/localData/loudnessRepository.js');
    const profile={lufs:-24,peak_dbfs:-12,measured_seconds:30,complete:true};
    await repository.save('native',1,profile);
    await repository.save('native',1,{...profile,lufs:-30,complete:false});
    assert.equal((await repository.get('native')).lufs,-24);
    await repository.saveYoutube('youtube',1,{gain_db:2});
    assert.equal((await repository.getYoutube('youtube')).gain_db,2);
    await db.radio_loudness_profiles.update('youtube',{expires_at:0});
    assert.equal(await repository.getYoutube('youtube'),null);

    pinia=createPinia().use((context)=>{
      if(context.options.localPersist) context.options.localPersist.storage=globalThis.localStorage;
      return selectivePersistence(context);
    });createApp({}).use(pinia);setActivePinia(pinia);
    const {usePlayerStore}=await server.ssrLoadModule('/src/stores/player.js');
    const {useAuthStore}=await server.ssrLoadModule('/src/stores/auth.js');
    const {radioFlowApi}=await server.ssrLoadModule('/src/services/radioFlowApi.js');
    player=usePlayerStore();const auth=useAuthStore();auth.user={id:1};
    assert.equal(player.normalization_enabled,false);
    const normalizer=player._get_normalizer();assert.equal(normalizer,player._get_normalizer(),'Pinia action proxies must share one runtime');
    player.current_music={youtube_id:'abcdefghijk',title:'Track'};player.player_mode='native';player.queue=Array.from({length:1000},(_,id)=>({id}));
    await settled();writes.length=0;
    radioFlowApi.set_normalization_enabled(true);
    assert.equal(radioFlowApi.get_state().normalization_enabled,true);
    await player._handle_native_playback(player.current_music,blob,true);await settled();
    const media=player.native_audio_instance;
    assert.equal(normalizer.graphs.size,1);assert.ok(normalizer.active.meter);
    const entry=normalizer.active;
    normalizer.receive(entry,{lufs:-24,peak_dbfs:-12,measured_seconds:5});await settled();
    assert.equal(player.normalization_gain_db,6);
    assert.ok(!writes.includes('player'),'meter updates must not serialize the queue');
    media.currentTime=12;
    radioFlowApi.set_normalization_enabled(false);
    assert.equal(media.currentTime,12);assert.equal(media.paused,false);assert.equal(normalizer.active,null);
    assert.equal(normalizer.graphs.get(media).gain.gain.value,1);
    normalizer.receive(entry,{lufs:-5,peak_dbfs:-1,measured_seconds:7});assert.equal(player.normalization_gain_db,0,'late worklet messages are ignored');
    radioFlowApi.set_normalization_enabled(true);await settled();
    assert.equal(normalizer.graphs.size,1);assert.equal(normalizer.context.captures,1);
    assert.equal(normalizer.active.continuous,false,'starting midway cannot become complete');
    const settings_entry=normalizer.active;
    radioFlowApi.set_audio_preset('bass');
    await wait_for(()=>player.audio_settings_status==='active');
    assert.equal(player.audio_settings_status,'active');
    assert.equal(normalizer.active,settings_entry,'equalizer changes do not restart measurement');
    assert.equal(player.native_audio_instance,media);assert.equal(media.currentTime,12);
    assert.equal(normalizer.graphs.get(media).effects.filters[0].gain.value,5);
    writes.length=0;
    for(let index=0;index<60;index++) radioFlowApi.set_audio_settings({bands:{mid:index%12},balance:.25,mono:true},{persist:false});
    await settled();
    assert.ok(!writes.includes('player'),'mixing must not serialize the queue');
    assert.equal(writes.length,0,'dragging a mixing slider avoids synchronous preference writes');
    radioFlowApi.set_audio_settings({});
    assert.equal(writes.length,1);
    assert.equal(normalizer.context.filters,3);assert.equal(normalizer.context.panners,1);
    radioFlowApi.set_normalization_enabled(false);await settled();
    assert.ok(normalizer.active && !normalizer.active.meter,'equalizer works with normalization off and no analysis');
    assert.equal(media.currentTime,12);assert.equal(media.paused,false);
    radioFlowApi.set_normalization_enabled(true);await settled();
    for(let index=0;index<30;index++) { player._reset_native_player();await player._handle_native_playback(player.current_music,blob,true);await settled(); }
    assert.equal(normalizer.graphs.size,1);assert.equal(normalizer.context.captures,1);
    assert.equal(normalizer.context.filters,3,'track changes reuse the fixed equalizer graph');
    const last=normalizer.active;
    media.currentTime=0;last.continuous=true;
    media.dispatchEvent(new Event('seeking'));
    assert.equal(last.continuous,false);
    await wait_for(()=>!!last.graph);
    normalizer.receive(last,{...profile});normalizer.save(last,true);await settled();
    assert.equal((await repository.get(last.key)).complete,false,'seeked track remains an estimate');
    const video=new Media();
    player.set_video_modal_active(true);
    player.set_video_normalization_element(video,new Blob(['video'],{type:'video/mp4'}));await wait_for(()=>normalizer.active?.element===video && !!normalizer.active.graph);
    assert.equal(normalizer.active.element,video);assert.equal(player.normalization_gain_db,6,'video inherits the current recording gain');
    assert.equal(media.muted,true);
    assert.equal(normalizer.graphs.get(video).effects.panner.pan.value,.25);
    assert.equal(normalizer.graphs.get(video).effects.preamp.channelCount,1);
    player.set_video_modal_active(false);player.set_video_normalization_element(null);await settled();
    assert.equal(media.muted,false);assert.equal(normalizer.graphs.size,1);
    const {default:VideoModal}=await server.ssrLoadModule('/src/components/radio/VideoModal.vue');
    let toggles=0;
    const modal={modelValue:true,is_closing:true,is_playing:true,$refs:{video_player:new Media()},playerStore:{toggle_play(){toggles++;}}};
    VideoModal.methods.handle_video_pause.call(modal);assert.equal(toggles,0,'closing video must preserve main playback');
    modal.is_closing=false;VideoModal.methods.handle_video_pause.call(modal);assert.equal(toggles,1,'native pause control still pauses the player');
    player.set_video_modal_active(true);
    player.set_video_normalization_element(null,null,null,{unavailable:true});
    radioFlowApi.set_normalization_enabled(false);radioFlowApi.set_normalization_enabled(true);
    assert.equal(player.normalization_status,'unavailable','unprocessed video must remain unavailable after toggling');
    player.set_video_modal_active(false);player.set_video_normalization_element(null);

    const {api}=await server.ssrLoadModule('/src/plugins/api.js');
    const original_get=api.get, pending=[];let iframe_volume=50;
    api.get=(_url,options)=>new Promise((resolve)=>pending.push({resolve,signal:options.signal}));
    try {
      player._reset_native_player();player.player_mode='youtube';player.volume=.5;
      player.current_music={youtube_id:'bcdefghijkl'};
      player.register_yt_instance({setVolume(value){iframe_volume=value;},getVolume(){return iframe_volume;}});
      await wait_for(()=>pending.length===1);
      assert.equal(player.audio_settings_status,'unavailable','iframe must not advertise equalization');
      player.current_music={youtube_id:'cdefghijklm'};player._refresh_normalization();
      await wait_for(()=>pending.length===2);
      assert.equal(pending[0].signal.aborted,true);
      pending[0].resolve({data:{status:'ready',gain_db:12}});await settled();
      assert.equal(player.normalization_gain_db,0,'response for old track cannot alter the new one');
      pending[1].resolve({data:{status:'ready',gain_db:12}});
      await wait_for(()=>player.normalization_gain_db===12);
      await wait_for(()=>iframe_volume===100);
      assert.equal(iframe_volume,100,'iframe gain respects its hard volume ceiling');
      player.set_volume(.1);assert.equal(iframe_volume,40);
      radioFlowApi.set_normalization_enabled(false);
      await wait_for(()=>iframe_volume===10);
      radioFlowApi.set_normalization_enabled(true);await wait_for(()=>player.normalization_gain_db===12);
      player.current_music={youtube_id:'defghijklmn'};player._refresh_normalization();await wait_for(()=>pending.length===3);
      pending[2].resolve({data:{status:'unavailable',gain_db:0}});await wait_for(()=>player.normalization_status==='unavailable');
      assert.equal(iframe_volume,10,'missing metadata preserves manual volume');
      player.current_music={youtube_id:'efghijklmno'};player._refresh_normalization();await wait_for(()=>pending.length===4);
      player.clearState();pending[3].resolve({data:{status:'ready',gain_db:12}});await settled();
      assert.equal(player.normalization_status,'disabled','logout ignores outstanding responses');
    } finally { api.get=original_get; }
    player.clearState();assert.equal(normalizer.context,null);assert.equal(normalizer.graphs.size,0);
    auth.user={id:2};player.restore_local_normalization();assert.equal(player.normalization_enabled,false);
    player.restore_local_audio_settings();assert.equal(player.audio_settings.enabled,false,'mixing is scoped to the account');
    auth.user={id:1};player.restore_local_normalization();assert.equal(player.normalization_enabled,true);
    player.restore_local_audio_settings();assert.equal(player.audio_settings.enabled,true);assert.equal(player.audio_settings.balance,.25);
    radioFlowApi.reset_audio_settings();assert.equal(player.audio_settings.enabled,false);assert.equal(player.audio_settings.balance,0);
    player.clearState();
  } finally {
    player?.clearState();
    db?.close();await Dexie.delete('KademDB');if(pinia)disposePinia(pinia);await server.close();
    globalThis.localStorage=previous.storage;globalThis.Audio=previous.audio;globalThis.AudioContext=previous.context;globalThis.AudioWorkletNode=previous.worklet;
  }
});

test('Web Audio não captura uploads sem CORS e falhas após captura restauram áudio', {timeout:30000}, async () => {
  const previous={context:globalThis.AudioContext,worklet:globalThis.AudioWorkletNode,fetch:globalThis.fetch};
  globalThis.AudioContext=Context;globalThis.AudioWorkletNode=Worklet;
  const server=await createServer({configFile:false,server:{middlewareMode:true},logLevel:'error'});
  try {
    const {VolumeNormalizer}=await server.ssrLoadModule('/src/services/audio/volumeNormalizer.js');
    const states=[],audio_states=[],failures=[];const normalizer=new VolumeNormalizer({repository:{get:async()=>null,save:async()=>{}},onState:(state)=>states.push(state),onAudioState:(state)=>audio_states.push(state),onFailure:(media)=>failures.push(media)});
    const media=new Media();media.crossOrigin='anonymous';media.src='https://example.com/audio';
    globalThis.fetch=async()=>({ok:false});
    await normalizer.start(media,{key:'cors',user_id:1,remote:true});
    assert.equal(normalizer.context.captures,0);assert.equal(states.at(-1).status,'unavailable');assert.equal(media.paused,false);
    normalizer.context.createMediaElementSource=()=>{const source=new Node();source.connect=()=>{throw new Error('Connection failed');};return source;};
    await normalizer.start(media,{key:'connection',user_id:1});
    assert.deepEqual(failures,[media]);assert.equal(normalizer.graphs.size,0);
    normalizer.set_audio_settings({enabled:true,bands:{bass:5}});
    const captures=normalizer.context.captures;
    globalThis.fetch=async()=>({ok:false});
    await normalizer.start(media,{key:'cors-eq',user_id:1,remote:true,normalize:false});
    assert.equal(normalizer.context.captures,captures,'equalizer also validates CORS before capture');
    assert.equal(audio_states.at(-1),'unavailable');assert.equal(states.at(-1).status,'disabled');
    normalizer.context.createMediaElementSource=()=>new Node();
    normalizer.context.createBiquadFilter=()=>{throw new Error('Unsupported filter');};
    await normalizer.start(media,{key:'failed-eq',user_id:1,normalize:false});
    assert.equal(normalizer.graphs.size,0);assert.equal(normalizer.active,null);
    assert.equal(failures.length,2,'failed effects restore uncaptured playback');
    normalizer.context.createBiquadFilter=()=>new Node();
    await normalizer.start(media,{key:'suspended-eq',user_id:1,normalize:false});
    assert.ok(normalizer.active?.graph);
    normalizer.context.state='suspended';
    normalizer.context.resume=()=>Promise.reject(new Error('Resume refused'));
    normalizer.update_activity();await settled();
    assert.equal(normalizer.graphs.size,0);assert.equal(normalizer.active,null);
    assert.equal(failures.length,3,'suspended processing releases captured media for recovery');
    assert.equal(states.at(-1).status,'disabled','equalization failure leaves normalization off');
    assert.equal(audio_states.at(-1),'unavailable');
    normalizer.dispose();
  } finally {await server.close();globalThis.AudioContext=previous.context;globalThis.AudioWorkletNode=previous.worklet;globalThis.fetch=previous.fetch;}
});
