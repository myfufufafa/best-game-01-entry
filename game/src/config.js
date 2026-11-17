// Lumen Moth — tuning and art direction in one place.
// Every number the game balances on lives here, so a tweak never means hunting
// through the world or the renderer. The palette is one night sky: indigo water,
// aurora green, lantern gold, and the violet of the shadow wisps.
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
  moteRestore: 7,
  flareCost: 12,
  hitLoss: 10,
  lowWarning: 30,
};

export const MOTH = {
  radius: 16,
  accel: 2600,
  maxSpeed: 340,
  drag: 0.9,
  flapHz: 11,
};

export const MOTE = {
  radius: 11,
  score: 10,
  comboWindowSeconds: 3,
  maxCombo: 5,
  targetOnField: 9,
  spawnEverySeconds: 0.9,
};

export const WISP = {
  radius: 17,
  baseSpeed: 56,
  speedPerNight: 14,
  spawnEverySeconds: 3.0,
  spawnSpeedUpPerNight: 0.22,
  maxOnField: 12,
  touchScore: 0,
};

export const FLARE = {
  radius: 150,
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

export const PALETTE = {
  skyTop: '#070a24',
  skyMid: '#131a4a',
  skyLow: '#27336e',
  auroraA: '#37e6a0',
  auroraB: '#3ec6e0',
  auroraC: '#b678f0',
  hillFar: '#101736',
  hillNear: '#0b1029',
  flowerStem: '#1d5c3a',
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
