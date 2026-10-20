// 用本地合成声音营造海风、浪涌与钟声，不依赖外部音频文件。
export class IslandAudio {
  constructor() { this.context = null; this.enabled = false; this.volume = .55; this.lastStep = 0; }
  async setEnabled(enabled) {
    if (!this.context && enabled) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const c = this.context = new AC();
      this.master = c.createGain(); this.master.gain.value = this.volume * .3; this.master.connect(c.destination);
      const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), data = buffer.getChannelData(0);
      let previous = 0; for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = previous * 4; }
      const noise = c.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 850;
      this.surf = c.createGain(); this.surf.gain.value = .35; noise.connect(filter).connect(this.surf).connect(this.master); noise.start();
      const lfo = c.createOscillator(), amount = c.createGain(); lfo.frequency.value = .14; amount.gain.value = .12; lfo.connect(amount).connect(this.surf.gain); lfo.start();
    }
    if (!this.context) return false;
    try { enabled ? await this.context.resume() : await this.context.suspend(); this.enabled = enabled; return true; } catch { return false; }
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v * .3, this.context.currentTime, .1); }
  tone(freq = 440, duration = 1, strength = .4, delay = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const c = this.context, time = c.currentTime + delay, o = c.createOscillator(), gain = c.createGain();
    o.type = 'sine'; o.frequency.value = freq; gain.gain.setValueAtTime(.001, time); gain.gain.exponentialRampToValueAtTime(strength, time + .02); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    o.onended=()=>{o.disconnect();gain.disconnect();};o.connect(gain).connect(this.master); o.start(time); o.stop(time + duration + .05);
  }
  chime(id) { this.tone([261.63, 329.63, 392][id], 1.5, .5); }
  success() { [261.63, 329.63, 392, 523.25].forEach((f, i) => this.tone(f, 1.5, .3, i * .16)); }
  step(swimming, elapsed) { if (elapsed - this.lastStep < (swimming ? .65 : .4)) return; this.lastStep = elapsed; this.tone(swimming ? 95 : 145, .075, .1); }
  pause(value) { if (!this.context || !this.enabled) return; this.master.gain.setTargetAtTime(value ? 0 : this.volume * .3, this.context.currentTime, .1); }
}
