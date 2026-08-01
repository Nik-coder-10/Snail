import { useStore } from '../store/useStore';

type SoundName =
  | 'squish'
  | 'chirp'
  | 'sparkle'
  | 'munch'
  | 'crunch'
  | 'softMunch'
  | 'gulp'
  | 'sigh'
  | 'burp'
  | 'sniff';

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = 0.35;
      master.connect(audioCtx.destination);
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function soundEnabled(): boolean {
  try {
    return useStore.getState().preferences.soundEnabled;
  } catch {
    return true;
  }
}

interface ToneOpts {
  freqEnd?: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  attack?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  const c = ctx();
  if (!c || !master) return;
  const {
    freqEnd = freq,
    type = 'sine',
    vol = 0.12,
    delay = 0,
    attack = 0.005,
  } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, opts: ToneOpts = {}): void {
  const c = ctx();
  if (!c || !master) return;
  const { vol = 0.08, delay = 0 } = opts;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

function play(name: SoundName): void {
  try {
    if (!soundEnabled()) return;
    switch (name) {
      case 'squish':
        noise(0.14, { vol: 0.06 });
        tone(160, 0.12, { freqEnd: 90, vol: 0.05 });
        break;
      case 'chirp':
        tone(620, 0.07, { freqEnd: 860, vol: 0.05, delay: 0 });
        tone(880, 0.09, { freqEnd: 1200, vol: 0.045, delay: 0.07 });
        break;
      case 'sparkle':
        tone(1568, 0.1, { vol: 0.035, delay: 0 });
        tone(2093, 0.1, { vol: 0.03, delay: 0.06 });
        tone(2637, 0.16, { vol: 0.025, delay: 0.12 });
        break;
      case 'munch':
        noise(0.06, { vol: 0.07 });
        tone(120, 0.05, { freqEnd: 80, vol: 0.05, delay: 0.01 });
        break;
      case 'crunch':
        noise(0.05, { vol: 0.1, delay: 0 });
        noise(0.05, { vol: 0.07, delay: 0.05 });
        tone(240, 0.03, { freqEnd: 140, vol: 0.04 });
        break;
      case 'softMunch':
        noise(0.08, { vol: 0.045 });
        tone(150, 0.07, { freqEnd: 100, vol: 0.035 });
        break;
      case 'gulp':
        tone(320, 0.12, { freqEnd: 180, vol: 0.06 });
        break;
      case 'sigh':
        tone(340, 0.45, { freqEnd: 200, vol: 0.04, type: 'sine' });
        noise(0.35, { vol: 0.02 });
        break;
      case 'burp':
        tone(150, 0.14, { freqEnd: 110, vol: 0.06, type: 'triangle' });
        tone(120, 0.1, { freqEnd: 140, vol: 0.04, type: 'triangle', delay: 0.14 });
        break;
      case 'sniff':
        noise(0.12, { vol: 0.05 });
        tone(420, 0.09, { freqEnd: 260, vol: 0.04 });
        break;
    }
  } catch {
    // audio is best-effort; never let it break the animation loop
  }
}

export const interactionSounds = { play };
