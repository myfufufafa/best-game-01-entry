// Every sound Lumen Moth makes is synthesised here with WebAudio — no audio
// files are shipped. Pickups climb a pentatonic ladder with the combo, hits thud,
// the flare whooshes, and a slow generative pad plays underneath while the game
// runs. The engine stays silent until the player first interacts (browsers
// require a gesture), and every call is safe when audio is unavailable.
//
// v2: each night opens with its own short motif, the flare gets a real whoosh,
// and banishing a wisp answers with a rising arpeggio.
import { CHIME_SCALE, NIGHT_MOTIFS } from './config.js';

const PAD_NOTES = [110.0, 130.81, 164.81, 196.0];

export function createSound() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let pluckStep = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = 0) {
    const ctx = ensure();
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function startMusic() {
    const ctx = ensure();
    if (!ctx || musicTimer !== null) return;
    // Two slow detuned pads, plus a pluck that wanders the scale every few seconds.
    for (const freq of PAD_NOTES.slice(0, 2)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = freq === PAD_NOTES[0] ? -4 : 5;
      gain.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(master);
      osc.start();
      lfo.start();
    }
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const note = CHIME_SCALE[pluckStep % CHIME_SCALE.length];
      pluckStep += 1;
      tone(note * 2, 1.4, 'sine', 0.045);
      if (pluckStep % 4 === 0) tone(note, 1.8, 'triangle', 0.03);
    }, 2600);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    pickup(combo) {
      const step = Math.min(combo - 1, CHIME_SCALE.length - 1);
      tone(CHIME_SCALE[step], 0.35, 'sine', 0.16);
      tone(CHIME_SCALE[step] * 2, 0.25, 'sine', 0.06, 0.02);
    },
    powerup() {
      tone(392, 0.18, 'triangle', 0.14);
      tone(523.25, 0.18, 'triangle', 0.14, 0.09);
      tone(659.25, 0.3, 'triangle', 0.14, 0.18);
    },
    hit() {
      tone(160, 0.28, 'sawtooth', 0.2, 0, 55);
      tone(90, 0.3, 'square', 0.1, 0, 40);
    },
    flare() {
      // A whoosh: a bright tone sliding down, with a soft high shimmer.
      tone(880, 0.5, 'sine', 0.14, 0, 220);
      tone(1320, 0.4, 'triangle', 0.07, 0.05, 330);
      tone(220, 0.45, 'sawtooth', 0.05, 0, 90);
    },
    banish() {
      // Rising arpeggio when a wisp is banished.
      const seq = [659.25, 783.99, 1046.5];
      seq.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.09, i * 0.06));
    },
    night(nightNumber) {
      // Each night opens on its own root, a short three-note motif.
      const root = NIGHT_MOTIFS[Math.max(1, Math.min(5, nightNumber || 1)) - 1];
      tone(root, 0.5, 'triangle', 0.1);
      tone(root * 1.25, 0.5, 'triangle', 0.1, 0.12);
      tone(root * 1.5, 0.7, 'triangle', 0.1, 0.24);
    },
    win() {
      const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      seq.forEach((freq, i) => tone(freq, 0.6, 'triangle', 0.13, i * 0.14));
    },
    lose() {
      const seq = [392.0, 329.63, 261.63, 196.0];
      seq.forEach((freq, i) => tone(freq, 0.55, 'sine', 0.11, i * 0.18));
    },
    startMusic,
    stopMusic,
  };
}
