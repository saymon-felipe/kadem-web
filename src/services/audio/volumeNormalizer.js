import worklet_url from './normalization_worklet.js?worker&url';
import { LoudnessMeter, normalization_gain, db_to_gain } from './loudness';
import { AUDIO_BANDS, default_audio_settings, sanitize_audio_settings, audio_headroom_db } from './audioSettings';

export class VolumeNormalizer {
  constructor({ repository, onState, onFailure, onAudioState }) {
    this.repository = repository;
    this.onState = onState;
    this.onFailure = onFailure;
    this.onAudioState = onAudioState;
    this.audio_settings = default_audio_settings();
    this.context = null;
    this.graphs = new Map();
    this.active = null;
    this.worklet_ready = null;
  }

  warmup() {
    try {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return;
      if (!this.context || this.context.state === 'closed') this.context = new Context();
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
    } catch { /* Native playback remains available without Web Audio. */ }
  }

  async start(element, { key, user_id, remote = false, start_position = 0, initial_profile = null, normalize = true }) {
    this.stop();
    this.warmup();
    const entry = { element, key, user_id, normalize, controller: new AbortController(), profile: null,
      continuous: start_position < 0.25 && element.currentTime < 0.25,
      approximate: false, last_save: 0, cleanups: [] };
    this.active = entry;
    const track_event = (event, handler) => {
      element.addEventListener(event, handler);
      entry.cleanups.push(() => element.removeEventListener(event, handler));
    };
    // Register coverage guards before asynchronous cache/CORS/worklet loading.
    // Seeking during setup must never turn a partial profile into a full one.
    track_event('seeking', () => { entry.continuous = false; });
    track_event('ended', () => this.save(entry, true));
    track_event('volumechange', () => {
      if (element.muted || element.volume < 0.0001) entry.continuous = false;
    });
    const activity = () => this.update_activity();
    for (const event of ['play', 'pause', 'volumechange', 'waiting', 'playing']) track_event(event, activity);
    this.context?.addEventListener?.('statechange', activity);
    entry.cleanups.push(() => this.context?.removeEventListener?.('statechange', activity));
    this.emit(normalize ? 'measuring' : 'disabled', 0, normalize);
    try {
      if (!this.context) throw new Error('Este navegador não oferece processamento de áudio.');
      if (remote) {
        if (element.crossOrigin !== 'anonymous') throw new Error('O upload não permite análise de áudio nesta conexão.');
        const timeout = setTimeout(() => entry.controller.abort(), 5000);
        try {
          const response = await fetch(element.src, { method: 'HEAD', mode: 'cors', signal: entry.controller.signal });
          if (!response.ok || response.type === 'opaque') throw new Error('O upload não permite análise de áudio nesta conexão.');
        } finally { clearTimeout(timeout); }
      }
      const saved = normalize ? await this.repository.get(key).catch(() => null) : null;
      if (this.active !== entry) return;
      // Creating a MediaElementSource is irreversible for that element. Only
      // attach after CORS and context readiness have succeeded.
      if (this.context.state !== 'running') {
        await Promise.race([this.context.resume(), new Promise((_, reject) => {
          entry.ready_timeout = setTimeout(() => reject(new Error('O navegador suspendeu o processamento de áudio.')), 3000);
        })]);
        clearTimeout(entry.ready_timeout);
      }
      if (this.active !== entry) return;
      let graph = this.graphs.get(element);
      if (!graph) {
        const gain = this.context.createGain();
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -1;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0;
        limiter.release.value = 0.1;
        const source = this.context.createMediaElementSource(element);
        graph = { source, gain, limiter };
        this.graphs.set(element, graph);
        // Record capture before connecting so a connection failure can always
        // restore playback using an uncaptured media element.
        source.connect(gain).connect(limiter).connect(this.context.destination);
      }
      entry.graph = graph;
      this.apply_audio_settings(graph, normalize);
      this.onAudioState?.(this.audio_settings.enabled ? 'active' : 'disabled', '');
      if (saved) {
        entry.profile = saved;
        this.apply(entry, saved);
      } else if (normalize && initial_profile) {
        // Offline video contains the same recording. Carry the audible gain
        // over while measuring its own encoding; never persist this hint.
        this.apply(entry, { ...initial_profile, complete: false });
      }
      // Complete profiles need no further measurement. Partial/fallback
      // estimates can be improved on subsequent continuous playback.
      if (normalize && (!saved?.complete || saved.approximate)) await this.start_meter(entry);
      if (this.active === entry) this.update_activity();
    } catch (error) {
      if (this.active !== entry) return;
      const attached = this.graphs.has(element);
      this.stop();
      if (attached) {
        this.release(element);
        this.onFailure?.(element);
      }
      this.emit(normalize ? 'unavailable' : 'disabled', 0, false, normalize ? error.message : '');
      this.onAudioState?.('unavailable', error.message);
    }
  }

  set_audio_settings(settings) {
    this.audio_settings = sanitize_audio_settings(settings);
    let failed = false;
    for (const [element, graph] of this.graphs) {
      try {
        this.apply_audio_settings(graph, this.active?.graph === graph && this.active.normalize);
      } catch {
        failed = true;
        this.release(element);
        this.onFailure?.(element);
        this.onAudioState?.('unavailable', 'Não foi possível aplicar os ajustes. Reprodução original mantida.');
      }
    }
    if (!failed && this.active?.graph) this.onAudioState?.(this.audio_settings.enabled ? 'active' : 'disabled', '');
  }

  apply_audio_settings(graph, normalize = false) {
    const settings = this.audio_settings;
    if (settings.enabled && !graph.effects) {
      const nodes = [];
      const create = (method) => { const node = this.context[method](); nodes.push(node); return node; };
      try {
        const preamp = create('createGain');
        const filters = AUDIO_BANDS.map((band) => {
          const filter = create('createBiquadFilter');
          filter.type = band.type;
          filter.frequency.value = band.frequency;
          filter.Q.value = 0.7;
          return filter;
        });
        const panner = create('createStereoPanner');
        const dynamics = create('createDynamicsCompressor');
        // Restore dual-mono before panning, preserving centered mono levels.
        filters[0].channelCount = 2;
        filters[0].channelCountMode = 'explicit';
        preamp.connect(filters[0]);
        filters[0].connect(filters[1]).connect(filters[2]).connect(panner).connect(dynamics).connect(graph.limiter);
        graph.effects = { preamp, filters, panner, dynamics };
      } catch (error) {
        nodes.forEach((node) => node.disconnect());
        throw error;
      }
    }
    if (graph.effects && graph.effects_connected !== settings.enabled) {
      graph.gain.disconnect();
      graph.gain.connect(settings.enabled ? graph.effects.preamp : graph.limiter);
      graph.effects_connected = settings.enabled;
    }
    const now = this.context.currentTime;
    const ramp = (parameter, value) => {
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, 0.04);
    };
    if (settings.enabled) {
      const { preamp, filters, panner, dynamics } = graph.effects;
      preamp.channelCount = settings.mono ? 1 : 2;
      preamp.channelCountMode = settings.mono ? 'explicit' : 'clamped-max';
      ramp(preamp.gain, db_to_gain(audio_headroom_db(settings)));
      AUDIO_BANDS.forEach(({ id }, index) => ramp(filters[index].gain, settings.bands[id]));
      ramp(panner.pan, settings.balance);
      ramp(dynamics.threshold, settings.night_mode ? -24 : 0);
      ramp(dynamics.knee, settings.night_mode ? 16 : 0);
      ramp(dynamics.ratio, settings.night_mode ? 4 : 1);
      ramp(dynamics.attack, 0.003);
      ramp(dynamics.release, 0.25);
    }
    this.configure_limiter(graph, normalize);
  }

  configure_limiter(graph, normalize) {
    const settings = this.audio_settings;
    const enabled = settings.enabled && graph.effects_connected;
    const now = this.context.currentTime;
    const ramp = (parameter, value) => {
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, 0.04);
    };
    ramp(graph.limiter.threshold, normalize || enabled ? -1 : 0);
    ramp(graph.limiter.knee, 0);
    ramp(graph.limiter.ratio, normalize || enabled ? 20 : 1);
    ramp(graph.limiter.attack, 0);
    ramp(graph.limiter.release, 0.1);
  }

  async start_meter(entry) {
    if (!entry.force_fallback && this.context.audioWorklet && globalThis.AudioWorkletNode) {
      try {
        this.worklet_ready ||= this.context.audioWorklet.addModule(worklet_url);
        await this.worklet_ready;
        if (this.active !== entry) return;
        const meter = new AudioWorkletNode(this.context, 'radio-loudness-meter', {
          numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'clamped-max',
        });
        entry.meter = meter;
        meter.port.onmessage = ({ data }) => this.receive(entry, data);
        entry.graph.source.connect(meter);
        meter.onprocessorerror = () => {
          if (this.active !== entry) return;
          meter.onprocessorerror = null;
          meter.port.onmessage = null;
          meter.port.close();
          entry.graph.source.disconnect(meter);
          meter.disconnect();
          entry.meter = null;
          entry.force_fallback = true;
          void this.start_meter(entry);
        };
      } catch {
        this.worklet_ready = null;
      }
    }
    if (this.active !== entry) return;
    if (!entry.meter) {
      entry.approximate = true;
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 2048;
      const samples = new Float32Array(analyser.fftSize);
      const meter = new LoudnessMeter(this.context.sampleRate);
      meter.block_frames = samples.length;
      entry.analyser = analyser;
      entry.graph.source.connect(analyser);
      let reads = 0;
      entry.interval = setInterval(() => {
        if (entry.element.paused || entry.element.muted || entry.element.readyState < 3 || entry.element.volume < 0.0001) return;
        analyser.getFloatTimeDomainData(samples);
        meter.process([samples], entry.element.volume);
        meter.total_frames += Math.max(0, Math.round(this.context.sampleRate / 4) - samples.length);
        if (++reads % 4 === 0) this.receive(entry, meter.snapshot());
      }, 250);
    }
    this.update_activity();
  }

  update_activity() {
    const entry = this.active;
    if (!entry) return;
    const element = entry.element;
    entry.meter?.port.postMessage({ active: !element.paused && !element.muted && element.readyState >= 3,
      volume: element.volume });
    if (!element.paused && this.context && this.context.state !== 'running' && !entry.resuming) {
      entry.resuming = true;
      Promise.race([this.context.resume(), new Promise((_, reject) => {
        entry.resume_timeout = setTimeout(() => reject(new Error('Processamento de áudio suspenso.')), 3000);
      })]).then(() => {
        clearTimeout(entry.resume_timeout);
        entry.resuming = false;
        if (this.context?.state !== 'running' && this.active === entry) throw new Error('Processamento de áudio suspenso.');
      }).catch(() => {
        if (this.active !== entry) return;
        this.stop();
        const captured = [...this.graphs.keys()];
        for (const media of captured) this.release(media);
        for (const media of captured) this.onFailure?.(media);
        const detail = 'Processamento suspenso. Reprodução original mantida.';
        this.emit(entry.normalize ? 'unavailable' : 'disabled', 0, false, entry.normalize ? detail : '');
        this.onAudioState?.('unavailable', detail);
      });
    }
  }

  receive(entry, profile) {
    if (this.active !== entry || !entry.normalize || !profile || !Number.isFinite(profile.lufs)) return;
    entry.profile = { ...profile, approximate: entry.approximate, complete: false };
    this.apply(entry, entry.profile);
    if (profile.measured_seconds >= 5 && Date.now() - entry.last_save > 30000) this.save(entry);
  }

  apply(entry, profile) {
    const gain_db = normalization_gain(profile);
    const parameter = entry.graph.gain.gain;
    parameter.cancelScheduledValues(this.context.currentTime);
    parameter.setTargetAtTime(db_to_gain(gain_db), this.context.currentTime, gain_db < 0 ? 0.2 : 0.8);
    const limited = profile.approximate || !profile.complete || gain_db < -18 - profile.lufs - 0.5;
    this.emit(limited ? 'limited' : 'active', gain_db, !profile.complete || profile.approximate,
      profile.approximate ? 'Medição aproximada neste navegador.' : limited ? 'Ajuste estimado ou limitado para preservar os picos.' : '');
  }

  save(entry, ended = false) {
    if (!entry.profile || entry.profile.measured_seconds < 3) return;
    const complete = ended && entry.continuous && !entry.approximate &&
      Number.isFinite(entry.element.duration) && entry.profile.measured_seconds >= entry.element.duration - 1.5;
    entry.last_save = Date.now();
    void this.repository.save(entry.key, entry.user_id, { ...entry.profile, complete }).catch(() => {});
  }

  emit(status, gain_db, estimated, detail = '') {
    this.onState({ status, gain_db, estimated: !!estimated, detail });
  }

  stop() {
    const entry = this.active;
    this.active = null;
    if (entry) {
      entry.controller.abort();
      clearTimeout(entry.ready_timeout);
      clearTimeout(entry.resume_timeout);
      clearInterval(entry.interval);
      this.save(entry);
      entry.cleanups.forEach((cleanup) => cleanup());
      if (entry.meter) {
        entry.meter.onprocessorerror = null;
        entry.meter.port.onmessage = null;
        entry.meter.port.close();
        entry.graph.source.disconnect(entry.meter);
        entry.meter.disconnect();
      }
      if (entry.analyser) {
        entry.graph.source.disconnect(entry.analyser);
        entry.analyser.disconnect();
      }
    }
    // Bypass remains connected: closing a context whose media source has
    // already been captured would silence native playback.
    for (const graph of this.graphs.values()) {
      graph.gain.gain.cancelScheduledValues(this.context.currentTime);
      graph.gain.gain.setTargetAtTime(1, this.context.currentTime, 0.05);
      this.configure_limiter(graph, false);
    }
  }

  release(element) {
    if (this.active?.element === element) this.stop();
    const graph = this.graphs.get(element);
    if (!graph) return;
    graph.source.disconnect();
    graph.gain.disconnect();
    graph.limiter.disconnect();
    if (graph.effects) {
      graph.effects.preamp.disconnect();
      graph.effects.filters.forEach((filter) => filter.disconnect());
      graph.effects.panner.disconnect();
      graph.effects.dynamics.disconnect();
    }
    this.graphs.delete(element);
  }

  dispose() {
    this.stop();
    for (const element of this.graphs.keys()) this.release(element);
    this.context?.close().catch(() => {});
    this.context = null;
    this.worklet_ready = null;
  }
}
