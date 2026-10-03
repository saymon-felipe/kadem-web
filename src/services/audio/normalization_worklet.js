import { LoudnessMeter } from './loudness.js';

class RadioLoudnessProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.meter = new LoudnessMeter(sampleRate);
    this.active = false;
    this.volume = 1;
    this.next_report = sampleRate;
    this.port.onmessage = ({ data }) => {
      if (data.reset) this.meter = new LoudnessMeter(sampleRate);
      this.active = !!data.active;
      this.volume = data.volume ?? 1;
    };
  }
  process(inputs) {
    if (this.active && inputs[0]?.length) {
      this.meter.process(inputs[0], this.volume);
      this.next_report -= inputs[0][0].length;
      if (this.next_report <= 0) {
        this.next_report += sampleRate;
        const profile = this.meter.snapshot();
        if (profile) this.port.postMessage(profile);
      }
    }
    return true;
  }
}
registerProcessor('radio-loudness-meter', RadioLoudnessProcessor);
