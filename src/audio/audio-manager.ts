import { StorageService } from '../platform/storage';

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private reverbInput: GainNode | null = null;
  private dryInput: GainNode | null = null;
  private isBgmPlaying = false;
  private bgmInterval: any = null;
  private bgmStep = 0;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupReverb();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupReverb(): void {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const duration = 1.4;
    const decay = 2.2;
    const length = Math.round(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.exp(-t * decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;

    this.dryInput = this.ctx.createGain();
    const wet = this.ctx.createGain();
    this.reverbInput = this.ctx.createGain();

    this.dryInput.gain.value = 0.85;
    wet.gain.value = 0.35;

    this.reverbInput.connect(convolver);
    convolver.connect(wet);
    wet.connect(this.ctx.destination);
    this.dryInput.connect(this.ctx.destination);
  }

  private route(sourceNode: AudioNode, reverbLevel = 0.3): void {
    if (!this.ctx || !this.dryInput || !this.reverbInput) return;
    sourceNode.connect(this.dryInput);
    if (reverbLevel > 0) {
      const send = this.ctx.createGain();
      send.gain.value = reverbLevel;
      sourceNode.connect(send);
      send.connect(this.reverbInput);
    }
  }

  private getSFXVolume(): number {
    return StorageService.load().settings.soundVolume;
  }

  private getBGMVolume(): number {
    return StorageService.load().settings.bgmVolume;
  }

  // 物理撥弦合成 (Karplus-Strong - 烏克麗麗)
  private playPluck(freq: number, time: number, vol = 0.15, damping = 0.495, useSfxScale = true): void {
    const ac = this.init();
    const rate = ac.sampleRate;
    const period = Math.max(2, Math.round(rate / freq));
    const buffer = ac.createBuffer(1, Math.round(rate * 0.9), rate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < period; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    let prev = 0;
    for (let i = period; i < data.length; i++) {
      const cur = data[i - period];
      const val = (cur + prev) * damping;
      prev = val;
      data[i] = val;
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;

    const scale = useSfxScale ? this.getSFXVolume() : 1;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol * scale, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.85);

    src.connect(gain);
    this.route(gain, 0.25);
    src.start(time);
  }

  // 木琴物理泛音共振 (木棒敲擊 + 3組不和諧泛音)
  private playMarimba(freq: number, time: number, vol = 0.2, useSfxScale = true): void {
    const ac = this.init();
    const scale = useSfxScale ? this.getSFXVolume() : 1;

    // 敲擊瞬態木質聲
    const noiseLen = Math.round(ac.sampleRate * 0.02);
    const noiseBuf = ac.createBuffer(1, noiseLen, ac.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.005));
    }
    const noiseSrc = ac.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.value = 3;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.7 * scale, time);
    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    this.route(noiseGain, 0.15);
    noiseSrc.start(time);

    // 木琴物理非整數泛音 (1.0, 3.98, 9.2)
    const partials = [
      { mult: 1.00, gain: 1.0, dur: 0.35 },
      { mult: 3.98, gain: 0.4, dur: 0.12 },
      { mult: 9.20, gain: 0.15, dur: 0.05 }
    ];

    partials.forEach(p => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.mult, time);
      gain.gain.setValueAtTime(vol * p.gain * scale, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + p.dur);
      osc.connect(gain);
      this.route(gain, 0.4);
      osc.start(time);
      osc.stop(time + p.dur);
    });
  }

  // 木箱鼓敲擊
  private playCajon(time: number, isBass = true): void {
    const ac = this.init();
    const vol = this.getBGMVolume();

    if (isBass) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.09);
      gain.gain.setValueAtTime(0.35 * vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      this.route(gain, 0.1);
      osc.start(time);
      osc.stop(time + 0.12);
    } else {
      const dur = 0.06;
      const b = ac.createBuffer(1, Math.round(ac.sampleRate * dur), ac.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.015));
      }
      const src = ac.createBufferSource();
      src.buffer = b;
      const f = ac.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.setValueAtTime(1500, time);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.2 * vol, time);
      src.connect(f);
      f.connect(g);
      this.route(g, 0.2);
      src.start(time);
    }
  }

  // 1. 移動 (果凍液體泡泡)
  public playMove(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.018);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

    gain.gain.setValueAtTime(0.25 * this.getSFXVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    this.route(gain, 0.35);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 2. 旋轉 (Q 彈多層滑音)
  public playRotate(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const sfxVol = this.getSFXVolume();

    [500, 750, 1000].forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.015);
      osc.frequency.exponentialRampToValueAtTime(f * 1.6, now + idx * 0.015 + 0.07);

      gain.gain.setValueAtTime((0.18 / (idx + 1)) * sfxVol, now + idx * 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.015 + 0.07);

      osc.connect(gain);
      this.route(gain, 0.4);
      osc.start(now + idx * 0.015);
      osc.stop(now + idx * 0.015 + 0.07);
    });
  }

  // 3. 瞬間硬降 (星星撞擊爆破)
  public playHardDrop(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.5 * this.getSFXVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    this.route(gain, 0.2);
    osc.start(now);
    osc.stop(now + 0.15);

    [1567.98, 2093.00, 2637.02].forEach((f, i) => {
      this.playMarimba(f, now + 0.03 + i * 0.03, 0.12);
    });
  }

  // 4. 消行 (迪士尼木琴琶音)
  public playLineClear(linesCount: number = 1): void {
    const ac = this.init();
    const now = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const playCount = Math.min(4, Math.max(1, linesCount));

    for (let idx = 0; idx < playCount; idx++) {
      this.playMarimba(notes[idx], now + idx * 0.05, 0.24);
    }
  }

  // 5. 4 行 Tetris 消除 (嘉年華大和弦)
  public playTetris(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const fanfare = [
      { f: 523.25, t: 0.00 }, // C5
      { f: 659.25, t: 0.05 }, // E5
      { f: 783.99, t: 0.10 }, // G5
      { f: 1046.50, t: 0.15 }, // C6
      { f: 1318.51, t: 0.22 }, // E6
      { f: 1567.98, t: 0.28 }, // G6
      { f: 2093.00, t: 0.35 }  // C7
    ];
    fanfare.forEach(item => {
      this.playMarimba(item.f, now + item.t, 0.25);
      this.playPluck(item.f / 2, now + item.t, 0.2);
    });
  }

  // 6. 關卡過關 (勝利號角)
  public playLevelUp(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const melody = [
      { f: 523.25, d: 0.08 },
      { f: 523.25, d: 0.08 },
      { f: 523.25, d: 0.08 },
      { f: 659.25, d: 0.25 },
      { f: 587.33, d: 0.12 },
      { f: 783.99, d: 0.35 }
    ];
    let t = 0;
    melody.forEach(m => {
      this.playMarimba(m.f, now + t, 0.24);
      this.playPluck(m.f / 2, now + t, 0.18);
      t += m.d;
    });
  }

  // 7. 遊戲結束
  public playGameOver(): void {
    const ac = this.init();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
    gain.gain.setValueAtTime(0.3 * this.getSFXVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    this.route(gain, 0.4);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 現代樂團 BGM 控制
  public startBgm(): void {
    if (this.isBgmPlaying) return;
    this.init();
    this.isBgmPlaying = true;
    this.bgmStep = 0;
    this.bgmTick();
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearTimeout(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying;
  }

  public toggleBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopBgm();
      StorageService.updateSettings({ bgmVolume: 0 });
      return false;
    } else {
      const s = StorageService.load().settings;
      if (s.bgmVolume <= 0) {
        StorageService.updateSettings({ bgmVolume: 0.5 });
      }
      this.startBgm();
      return true;
    }
  }

  private bgmTick(): void {
    if (!this.isBgmPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const tempo = 120;
    const stepMs = (60 / tempo) / 4 * 1000;

    const chords = [
      { bass: 130.81, notes: [261.63, 329.63, 392.00, 523.25] }, // C
      { bass: 98.00,  notes: [246.94, 293.66, 392.00, 493.88] }, // G
      { bass: 110.00, notes: [220.00, 261.63, 329.63, 440.00] }, // Am
      { bass: 87.31,  notes: [261.63, 349.23, 392.00, 523.25] }  // F
    ];

    const melody = [
      { f: 523.25, s: 0 }, { f: 659.25, s: 2 }, { f: 783.99, s: 4 }, { f: 659.25, s: 6 },
      { f: 587.33, s: 8 }, { f: 783.99, s: 10 }, { f: 880.00, s: 12 }, { f: 783.99, s: 14 },
      { f: 880.00, s: 16 }, { f: 1046.50, s: 18 }, { f: 880.00, s: 20 }, { f: 783.99, s: 22 },
      { f: 659.25, s: 24 }, { f: 587.33, s: 26 }, { f: 523.25, s: 28 }, { f: 587.33, s: 30 }
    ];

    const chordIdx = Math.floor((this.bgmStep % 32) / 8);
    const chord = chords[chordIdx];
    const sub = this.bgmStep % 8;
    const bgmVol = this.getBGMVolume();

    if (bgmVol > 0) {
      if (sub === 0 || sub === 3 || sub === 4 || sub === 6) {
        chord.notes.forEach((freq, i) => {
          this.playPluck(freq, now + i * 0.012, 0.12 * bgmVol, 0.495, false);
        });
      }

      if (sub === 0 || sub === 4) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(chord.bass, now);
        bassGain.gain.setValueAtTime(0.22 * bgmVol, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        bassOsc.connect(bassGain);
        this.route(bassGain, 0.2);
        bassOsc.start(now);
        bassOsc.stop(now + 0.35);
      }

      if (sub === 0 || sub === 4) {
        this.playCajon(now, true);
      } else if (sub === 2 || sub === 6) {
        this.playCajon(now, false);
      }

      const mHit = melody.find(m => m.s === (this.bgmStep % 32));
      if (mHit) {
        this.playMarimba(mHit.f, now, 0.2 * bgmVol, false);
      }
    }

    this.bgmStep = (this.bgmStep + 1) % 32;
    this.bgmInterval = setTimeout(() => this.bgmTick(), stepMs);
  }
}
