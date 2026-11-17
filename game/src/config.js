// Lumen Moth v2 — tuning and art direction in one place.
// Every number the game balances on lives here, so a tweak never means hunting
// through the world or the renderer. The palette is one night sky: indigo water,
// aurora green, lantern gold, and the violet of the shadow wisps.
//
// v2: the field is far denser and brighter than v1 — a bigger moth with a real
// lantern glow, many more motes at once, golden blooms and mote trails worth
// chasing, and four wisp kinds plus the Wisp King on night 5.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-moth-best';

export const NIGHTS = 5;
export const NIGHT_SECONDS = 40;
export const PETALS = 3;

export const LIGHT = {
  max: 100,
  drainPerSecond: 1.05,
  drainPerNight: 0.09,
  moteRestore: 8,
  bloomRestore: 16,
  flareCost: 12,
  hitLoss: 10,
  lowWarning: 30,
};

export const MOTH = {
  radius: 24,
  accel: 2600,
  maxSpeed: 360,
  drag: 0.9,
  flapHz: 11,
};

export const MOTE = {
  radius: 12,
  score: 10,
  comboWindowSeconds: 3.5,
  maxCombo: 5,
  targetOnField: 16,
  spawnEverySeconds: 0.55,
};

// A golden bloom: a tight cluster of motes worth 3x each, often placed close
// to a wisp — the risk-reward heart of v2.
export const BLOOM = {
  motes: 4,
  value: 3,
  spawnEverySeconds: 9,
  nearWispChance: 0.7,
};

// A mote trail: an arc of motes worth extra, laid out so following the curve
// feels like flying a racing line.
export const TRAIL = {
  motes: 5,
  score: 15,
  spawnEverySeconds: 12,
};

export const WISP = {
  baseSpeed: 56,
  speedPerNight: 14,
  spawnEverySeconds: 2.6,
  spawnSpeedUpPerNight: 0.22,
  maxOnField: 14,
  touchScore: 0,
};

export const KING = {
  radius: 48,
  speed: 58,
  score: 500,
};

export const FLARE = {
  radius: 170,
  scorePerWisp: 25,
  cooldownSeconds: 1.2,
};

export const POWERUP = {
  spawnEverySeconds: 14,
  shieldSeconds: 8,
  magnetSeconds: 10,
  freezeSeconds: 4,
  kinds: ['dewdrop', 'sunpetal', 'dawnshard'],
};

// Night 4 gale: gusts that shove the moth and the motes sideways.
export const WIND = {
  gustSeconds: 3.0,
  calmSeconds: 5.0,
  strength: 95,
};

export const PALETTE = {
  skyTop: '#0b1034',
  skyMid: '#1c2560',
  skyLow: '#3a4a94',
  auroraA: '#37e6a0',
  auroraB: '#3ec6e0',
  auroraC: '#b678f0',
  hillFar: '#141c44',
  hillNear: '#0d1332',
  flowerStem: '#2a7a4c',
  flowerPetal: '#ff7fb0',
  moteCore: '#fff3c4',
  moteGlow: '#ffd76a',
  mothBody: '#3a2a1c',
  mothWing: '#ffd76a',
  mothWingEdge: '#ff9d5c',
  wispBody: '#241d4d',
  wispEye: '#c9b8ff',
  hudInk: '#f4ecd8',
  hudDim: '#a9b4d8',
  danger: '#ff6b6b',
  gold: '#ffd76a',
};

// Pentatonic ladder the pickup chime climbs as the combo grows.
export const CHIME_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

// One short motif root per night, for the night-change fanfare.
export const NIGHT_MOTIFS = [261.63, 293.66, 329.63, 311.13, 392.0];
