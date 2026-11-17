// The rules of Lumen Moth, and nothing else. A world holds the lantern light,
// the moth, the motes, the wisps, the power-ups and the five nights; step()
// advances it one fixed 1/60 s slice and reports what happened as event bits,
// so the main loop can answer each one with a sound or a screen change.
//
// The loop, in one sentence: light always drains, motes feed it and score,
// wisps hunt the moth, a flare spends light to banish wisps, and surviving all
// five nights until dawn wins.
//
// v2 depth: golden blooms (clusters worth 3x, often parked beside a wisp),
// mote trails (arcs worth extra), four wisp kinds introduced night by night,
// a night-4 gale that shoves the moth and the motes, and the Wisp King on
// night 5. The night director (nights.js) names each night; wisps.js owns
// how each kind moves.
import {
  BLOOM, FLARE, LIGHT, MOTE, MOTH, NIGHTS, NIGHT_SECONDS, PETALS, POWERUP,
  TRAIL, VIEW, WIND, WISP,
} from './config.js';
import { nightPlan, pickNightKind, startNight } from './nights.js';
import { spawnMiniWisps, spawnWispKing, spawnWispOfKind, stepWisp } from './wisps.js';

export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_FLARE = 16;
export const EVENT_NIGHT = 32;
export const EVENT_POWERUP = 64;

export const KIND_MOTE = 'mote';
export const KIND_WISP = 'wisp';

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random, particles) {
  const state = {
    time: 0,
    night: 1,
    nightTime: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    light: LIGHT.max,
    petals: PETALS,
    over: false,
    won: false,
    moth: {
      x: VIEW.width / 2, y: VIEW.height / 2 + 80,
      vx: 0, vy: 0, angle: -Math.PI / 2, flap: 0, invuln: 0,
    },
    motes: [],
    wisps: [],
    powerups: [],
    flare: { active: false, timer: 0, radius: 0, cooldown: 0 },
    shieldTimer: 0,
    magnetTimer: 0,
    freezeTimer: 0,
    shake: 0,
    moteTimer: 0,
    wispTimer: 5.0,
    bloomTimer: BLOOM.spawnEverySeconds,
    trailTimer: TRAIL.spawnEverySeconds,
    powerupTimer: POWERUP.spawnEverySeconds,
    stats: { motes: 0, wisps: 0, flares: 0, hits: 0, blooms: 0, trails: 0, king: 0 },
    stars: [],
    flowers: [],
    spores: [],
    lanterns: [],
    banner: null,
    nightPalette: null,
    windStrength: 0,
    windTimer: 0,
    windGusting: false,
    windX: 0,
    kingSpawned: false,
  };

  function scatterSky() {
    state.stars = [];
    for (let i = 0; i < 150; i += 1) {
      state.stars.push({
        x: random.range(0, VIEW.width),
        y: random.range(0, VIEW.height * 0.75),
        size: random.range(0.6, 2.4),
        twinkle: random.range(0, Math.PI * 2),
        layer: random.pick([0.35, 0.6, 1]),
      });
    }
    // Drifting fireflies and spores: the air itself glows, so the field never
    // reads as empty even between motes. v3: more of them, and brighter.
    state.spores = [];
    for (let i = 0; i < 72; i += 1) {
      state.spores.push({
        x: random.range(0, VIEW.width),
        y: random.range(60, VIEW.height - 60),
        size: random.range(1.4, 3.8),
        phase: random.range(0, Math.PI * 2),
        drift: random.range(4, 14),
        hue: random.pick(['#ffd76a', '#9be8ff', '#b8ffce', '#ffb3c9']),
      });
    }
    // Hanging lanterns in the far distance: a second layer of warm light
    // across the middle of the sky, so the upper field is never empty.
    state.lanterns = [];
    for (let i = 0; i < 8; i += 1) {
      state.lanterns.push({
        x: 90 + i * 150 + random.range(-40, 40),
        y: random.range(120, 250),
        sway: random.range(0, Math.PI * 2),
        size: random.range(0.8, 1.25),
        hue: random.pick(['#ffd76a', '#ff9d5c', '#9be8ff']),
      });
    }
    state.flowers = [];
    for (let i = 0; i < 26; i += 1) {
      state.flowers.push({
        x: random.range(30, VIEW.width - 30),
        y: random.range(VIEW.height - 76, VIEW.height - 8),
        sway: random.range(0, Math.PI * 2),
        size: random.range(0.8, 1.5),
        hue: random.pick(['#ff7fb0', '#ffd76a', '#9be8ff', '#c9b8ff', '#ff9d5c']),
      });
    }
  }

  function spawnMoteNear(x, y, minDist, maxDist) {
    const angle = random.range(0, Math.PI * 2);
    const dist = random.range(minDist, maxDist);
    return {
      x: Math.max(50, Math.min(VIEW.width - 50, x + Math.cos(angle) * dist)),
      y: Math.max(70, Math.min(VIEW.height - 110, y + Math.sin(angle) * dist)),
      phase: random.range(0, Math.PI * 2),
      drift: random.range(8, 22),
      kind: KIND_MOTE,
      bloom: false,
      trail: false,
    };
  }

  function spawnMote() {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      x = random.range(50, VIEW.width - 50);
      y = random.range(70, VIEW.height - 110);
      if (distance(x, y, state.moth.x, state.moth.y) > 130) break;
    }
    state.motes.push({
      x, y,
      phase: random.range(0, Math.PI * 2),
      drift: random.range(8, 22),
      kind: KIND_MOTE,
      bloom: false,
      trail: false,
    });
  }

  /** A golden bloom: 3-5 motes in a tight ring, worth 3x each. */
  function spawnBloom() {
    let cx = random.range(140, VIEW.width - 140);
    let cy = random.range(120, VIEW.height - 160);
    // Risk-reward: most blooms open close to a wisp, so the bonus is earned.
    if (state.wisps.length > 0 && random.chance(BLOOM.nearWispChance)) {
      const wisp = random.pick(state.wisps);
      cx = Math.max(140, Math.min(VIEW.width - 140, wisp.x + random.range(-120, 120)));
      cy = Math.max(120, Math.min(VIEW.height - 160, wisp.y + random.range(-90, 90)));
    }
    const count = BLOOM.motes + random.int(0, 1);
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      state.motes.push({
        x: Math.max(50, Math.min(VIEW.width - 50, cx + Math.cos(a) * 34)),
        y: Math.max(70, Math.min(VIEW.height - 110, cy + Math.sin(a) * 34)),
        phase: random.range(0, Math.PI * 2),
        drift: random.range(6, 14),
        kind: KIND_MOTE,
        bloom: true,
        trail: false,
      });
    }
    particles.ring(cx, cy, '#ffd76a', 60);
  }

  /** A mote trail: five motes along a rising arc, worth extra each. */
  function spawnTrail() {
    const x0 = random.range(160, VIEW.width - 160);
    const y0 = random.range(180, VIEW.height - 220);
    const dir = random.pick([-1, 1]);
    for (let i = 0; i < TRAIL.motes; i += 1) {
      state.motes.push({
        x: Math.max(50, Math.min(VIEW.width - 50, x0 + dir * i * 52)),
        y: Math.max(70, Math.min(VIEW.height - 110, y0 - Math.sin((i / TRAIL.motes) * Math.PI) * 70)),
        phase: random.range(0, Math.PI * 2),
        drift: random.range(6, 12),
        kind: KIND_MOTE,
        bloom: false,
        trail: true,
      });
    }
  }

  function spawnPowerup() {
    state.powerups.push({
      x: random.range(60, VIEW.width - 60),
      y: random.range(90, VIEW.height - 130),
      kind: random.pick(POWERUP.kinds),
      phase: random.range(0, Math.PI * 2),
    });
  }

  function triggerFlare() {
    const flare = state.flare;
    if (flare.cooldown > 0 || state.light <= LIGHT.flareCost + 5) return 0;
    flare.active = true;
    flare.timer = 0.35;
    flare.radius = 0;
    flare.cooldown = FLARE.cooldownSeconds;
    state.light -= LIGHT.flareCost;
    state.stats.flares += 1;
    particles.ring(state.moth.x, state.moth.y, '#ffd76a', FLARE.radius);
    // The big moment, named on screen: FLARE! in the centre, for ~1 s.
    particles.text(VIEW.width / 2, 190, 'FLARE!', '#ffd76a', 56);
    return EVENT_FLARE;
  }

  function losePetal() {
    state.petals -= 1;
    state.stats.hits += 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 14;
    state.moth.invuln = 2.0;
    particles.burst(state.moth.x, state.moth.y, '#ff6b6b', 22, 260);
    if (state.petals <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  /** A wisp is banished: score it, sparkle, and split splitters into minis. */
  function banishWisp(i, wisp) {
    state.wisps.splice(i, 1);
    state.score += wisp.score;
    state.stats.wisps += 1;
    particles.burst(wisp.x, wisp.y, '#c9b8ff', 18, 240);
    particles.text(wisp.x, wisp.y - 12, `+${wisp.score}`, '#d9ccff');
    if (wisp.kind === 'splitter') {
      spawnMiniWisps(random, state, wisp);
      particles.text(wisp.x, wisp.y - 40, 'IT SPLIT!', '#b8ffce');
    }
    if (wisp.kind === 'king') {
      state.stats.king += 1;
      particles.burst(wisp.x, wisp.y, '#ffd76a', 40, 380);
      particles.text(wisp.x, wisp.y - 52, 'KING BANISHED! +500', '#ffd76a');
    }
  }

  function stepWind(dt) {
    if (state.windStrength <= 0) {
      state.windX = 0;
      state.windGusting = false;
      return;
    }
    state.windTimer -= dt;
    if (state.windTimer <= 0) {
      state.windGusting = !state.windGusting;
      state.windTimer = state.windGusting ? WIND.gustSeconds : WIND.calmSeconds;
      state.windX = state.windGusting
        ? random.pick([-1, 1]) * WIND.strength * state.windStrength : 0;
    }
  }

  function stepMoth(dt, control) {
    const moth = state.moth;
    let wantX = 0;
    let wantY = 0;
    if (control.pointer) {
      const dx = control.x - moth.x;
      const dy = control.y - moth.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const speed = Math.min(MOTH.maxSpeed, dist * 6);
        wantX = (dx / dist) * speed;
        wantY = (dy / dist) * speed;
      }
    } else {
      wantX = control.x * MOTH.maxSpeed;
      wantY = control.y * MOTH.maxSpeed;
    }
    moth.vx += (wantX - moth.vx) * Math.min(1, (MOTH.accel / MOTH.maxSpeed) * dt);
    moth.vy += (wantY - moth.vy) * Math.min(1, (MOTH.accel / MOTH.maxSpeed) * dt);
    // The night-4 gale shoves the moth sideways while it gusts.
    moth.vx += state.windX * dt * 1.4;
    moth.x += moth.vx * dt;
    moth.y += moth.vy * dt;
    if (moth.x < 24) { moth.x = 24; moth.vx = Math.abs(moth.vx) * 0.4; }
    if (moth.x > VIEW.width - 24) { moth.x = VIEW.width - 24; moth.vx = -Math.abs(moth.vx) * 0.4; }
    if (moth.y < 56) { moth.y = 56; moth.vy = Math.abs(moth.vy) * 0.4; }
    if (moth.y > VIEW.height - 24) { moth.y = VIEW.height - 24; moth.vy = -Math.abs(moth.vy) * 0.4; }
    const speed = Math.hypot(moth.vx, moth.vy);
    if (speed > 20) moth.angle = Math.atan2(moth.vy, moth.vx);
    moth.flap += dt * MOTH.flapHz * (0.6 + speed / MOTH.maxSpeed);
    if (moth.invuln > 0) moth.invuln -= dt;
  }

  /** One mote collected: combo, score, light — blooms pay 3x, trails pay extra. */
  function awardMotePickup(mote) {
    const prevCombo = state.combo;
    state.combo = Math.min(state.combo + 1, MOTE.maxCombo);
    state.comboTimer = MOTE.comboWindowSeconds;
    const base = mote.trail ? TRAIL.score : MOTE.score;
    const value = mote.bloom ? base * BLOOM.value * state.combo : base * state.combo;
    state.score += value;
    state.light = Math.min(
      LIGHT.max,
      state.light + (mote.bloom ? LIGHT.bloomRestore : LIGHT.moteRestore),
    );
    state.stats.motes += 1;
    if (mote.bloom) {
      state.stats.blooms += 1;
      particles.burst(mote.x, mote.y, '#ffd76a', 16, 220);
      particles.text(mote.x, mote.y - 16, `BLOOM +${value}`, '#ffd76a');
      // The bloom is the 3x moment: name it big in the centre, once.
      particles.text(VIEW.width / 2, 190, 'BLOOM x3!', '#ffd76a', 54);
    } else if (mote.trail) {
      state.stats.trails += 1;
      particles.burst(mote.x, mote.y, '#9be8ff', 12, 180);
      particles.text(mote.x, mote.y - 16, `+${value}`, '#ffffff');
    } else {
      particles.burst(mote.x, mote.y, '#ffd76a', 12, 180);
      particles.text(mote.x, mote.y - 14, `+${value}`, '#ffffff');
    }
    // A full combo is worth shouting about, once when the chain tops out.
    if (state.combo >= MOTE.maxCombo && prevCombo < MOTE.maxCombo && !mote.bloom) {
      particles.text(VIEW.width / 2, 190, `COMBO x${MOTE.maxCombo}!`, '#ffd76a', 54);
    }
  }

  function stepMotes(dt) {
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const mote = state.motes[i];
      mote.phase += dt * 2;
      const pull = state.magnetTimer > 0
        ? distance(mote.x, mote.y, state.moth.x, state.moth.y) < 280 : false;
      if (pull) {
        const dx = state.moth.x - mote.x;
        const dy = state.moth.y - mote.y;
        const dist = Math.hypot(dx, dy) || 1;
        mote.x += (dx / dist) * 320 * dt;
        mote.y += (dy / dist) * 320 * dt;
      } else {
        mote.x += (Math.sin(mote.phase * 0.7) * mote.drift + state.windX * 0.25) * dt;
        mote.y += Math.cos(mote.phase * 0.5) * mote.drift * 0.6 * dt;
      }
      if (distance(mote.x, mote.y, state.moth.x, state.moth.y) < MOTE.radius + MOTH.radius) {
        state.motes.splice(i, 1);
        awardMotePickup(mote);
      }
    }
  }

  function stepWisps(dt) {
    const frozen = state.freezeTimer > 0;
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const wisp = state.wisps[i];
      if (!frozen) stepWisp(wisp, state, dt);
      const d = distance(wisp.x, wisp.y, state.moth.x, state.moth.y);
      if (state.flare.active && d < state.flare.radius + wisp.radius) {
        banishWisp(i, wisp);
        continue;
      }
      if (d < wisp.radius + MOTH.radius - 6 && state.moth.invuln <= 0) {
        if (state.shieldTimer > 0) {
          banishWisp(i, wisp);
          continue;
        }
        // The King hits harder: two petals of light, one petal of life.
        state.light = Math.max(0, state.light - (wisp.kind === 'king' ? LIGHT.hitLoss * 2 : LIGHT.hitLoss));
        const events = losePetal();
        if (events & EVENT_OVER) return events;
      }
    }
    return 0;
  }

  function stepPowerups(dt) {
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const power = state.powerups[i];
      power.phase += dt * 2;
      if (distance(power.x, power.y, state.moth.x, state.moth.y) < 26 + MOTH.radius) {
        state.powerups.splice(i, 1);
        if (power.kind === 'dewdrop') state.shieldTimer = POWERUP.shieldSeconds;
        if (power.kind === 'sunpetal') state.magnetTimer = POWERUP.magnetSeconds;
        if (power.kind === 'dawnshard') state.freezeTimer = POWERUP.freezeSeconds;
        particles.burst(power.x, power.y, '#9be8ff', 18, 200);
        particles.text(power.x, power.y - 16, power.kind === 'dewdrop' ? 'SHIELD' : power.kind === 'sunpetal' ? 'MAGNET' : 'FREEZE', '#cfeeff');
        return EVENT_POWERUP;
      }
    }
    return 0;
  }

  function step(dt, control, attract) {
    let events = 0;
    state.time += dt;
    if (state.banner && state.banner.timer > 0) state.banner.timer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
    if (state.flare.cooldown > 0) state.flare.cooldown -= dt;
    if (state.shieldTimer > 0) state.shieldTimer -= dt;
    if (state.magnetTimer > 0) state.magnetTimer -= dt;
    if (state.freezeTimer > 0) state.freezeTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.flare.active) {
      state.flare.timer -= dt;
      state.flare.radius = FLARE.radius * (1 - Math.max(0, state.flare.timer) / 0.35);
      if (state.flare.timer <= 0) state.flare.active = false;
    }
    for (const spore of state.spores) {
      spore.phase += dt;
      spore.x += Math.sin(spore.phase * 0.6) * spore.drift * dt;
      spore.y += Math.cos(spore.phase * 0.4) * spore.drift * 0.5 * dt;
    }

    if (attract) {
      // Title screen: the moth drifts in a lazy circle and motes shimmer.
      const t = state.time * 0.35;
      state.moth.x = VIEW.width / 2 + Math.cos(t) * 190;
      state.moth.y = VIEW.height / 2 + 60 + Math.sin(t * 1.3) * 46;
      state.moth.angle = Math.atan2(Math.cos(t * 1.3) * 46 * 1.3, -Math.sin(t) * 190);
      state.moth.flap += dt * MOTH.flapHz * 0.7;
      for (const mote of state.motes) mote.phase += dt * 2;
      particles.update(dt);
      return 0;
    }

    if (control.flare) events |= triggerFlare();
    stepWind(dt);
    stepMoth(dt, control);

    // The lantern always burns down; a mote is the only fuel.
    state.light -= (LIGHT.drainPerSecond + state.night * LIGHT.drainPerNight) * dt;
    if (state.light <= 0) {
      state.light = 42;
      const lost = losePetal();
      events |= lost;
      if (lost & EVENT_OVER) return events;
      particles.text(state.moth.x, state.moth.y - 34, 'LANTERN OUT', '#ff9d9d');
    }

    state.moteTimer -= dt;
    if (state.moteTimer <= 0 && state.motes.length < MOTE.targetOnField) {
      spawnMote();
      state.moteTimer = MOTE.spawnEverySeconds;
    }
    state.bloomTimer -= dt;
    if (state.bloomTimer <= 0 && state.motes.length < 30) {
      spawnBloom();
      state.bloomTimer = BLOOM.spawnEverySeconds;
    }
    state.trailTimer -= dt;
    if (state.trailTimer <= 0 && state.motes.length < 30) {
      spawnTrail();
      state.trailTimer = TRAIL.spawnEverySeconds;
    }
    state.wispTimer -= dt;
    const wispInterval = WISP.spawnEverySeconds * (1 - state.night * WISP.spawnSpeedUpPerNight * 0.2);
    const maxWisps = Math.min(WISP.maxOnField, 3 + state.night * 2);
    if (state.wispTimer <= 0 && state.wisps.length < maxWisps) {
      spawnWispOfKind(random, state, pickNightKind(random, state.night));
      state.wispTimer = Math.max(0.9, wispInterval);
    }
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      spawnPowerup();
      state.powerupTimer = POWERUP.spawnEverySeconds;
    }

    stepMotes(dt);
    events |= stepPowerups(dt);
    events |= stepWisps(dt);
    if (events & EVENT_OVER) return events;

    state.nightTime += dt;
    if (state.nightTime >= NIGHT_SECONDS) {
      if (state.night >= NIGHTS) {
        state.won = true;
        state.over = true;
        return events | EVENT_WIN;
      }
      state.night += 1;
      state.nightTime = 0;
      state.light = Math.min(LIGHT.max, state.light + 15);
      state.score += 100 * state.night;
      state.wisps.length = 0;
      startNight(state, state.night);
      if (nightPlan(state.night).king && !state.kingSpawned) {
        state.kingSpawned = true;
        spawnWispKing(random, state);
      }
      particles.text(state.moth.x, state.moth.y - 40, `NIGHT ${state.night}`, '#ffe9a8');
      events |= EVENT_NIGHT;
    }

    particles.update(dt);
    return events;
  }

  function reset() {
    state.time = 0;
    state.night = 1;
    state.nightTime = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.light = LIGHT.max;
    state.petals = PETALS;
    state.over = false;
    state.won = false;
    state.moth.x = VIEW.width / 2;
    state.moth.y = VIEW.height / 2 + 80;
    state.moth.vx = 0;
    state.moth.vy = 0;
    state.moth.invuln = 0;
    state.motes = [];
    state.wisps = [];
    state.powerups = [];
    state.flare = { active: false, timer: 0, radius: 0, cooldown: 0 };
    state.shieldTimer = 0;
    state.magnetTimer = 0;
    state.freezeTimer = 0;
    state.shake = 0;
    state.moteTimer = 0;
    state.wispTimer = 5.0;
    state.bloomTimer = BLOOM.spawnEverySeconds;
    state.trailTimer = TRAIL.spawnEverySeconds;
    state.powerupTimer = POWERUP.spawnEverySeconds;
    state.stats = { motes: 0, wisps: 0, flares: 0, hits: 0, blooms: 0, trails: 0, king: 0 };
    state.banner = null;
    state.nightPalette = nightPlan(1).palette;
    state.windStrength = 0;
    state.windTimer = 0;
    state.windGusting = false;
    state.windX = 0;
    state.kingSpawned = false;
    scatterSky();
    // Night 1 opens fun at once: motes close to the spawn, a bloom in reach,
    // and a trail arcing across the middle of the field.
    for (let i = 0; i < 7; i += 1) state.motes.push(spawnMoteNear(state.moth.x, state.moth.y, 120, 380));
    for (let i = 0; i < 5; i += 1) spawnMote();
    spawnBloom();
    spawnTrail();
    particles.clear();
  }

  /**
   * Top the field up for a staged screenshot: at least this many motes (with
   * a bloom among them), this many wisps of the current night's kinds, and a
   * power-up in view — so the frame shows the game at its densest, the way a
   * busy minute of real play looks.
   */
  function topUpForShot(minMotes, minWisps) {
    let guard = 0;
    while (state.motes.length < minMotes && guard < 24) {
      spawnMote();
      guard += 1;
    }
    if (!state.motes.some((m) => m.bloom)) spawnBloom();
    guard = 0;
    while (state.wisps.length < minWisps && guard < 12) {
      spawnWispOfKind(random, state, pickNightKind(random, state.night));
      // Pull staged wisps on-screen: edge spawns start off-field.
      const wisp = state.wisps[state.wisps.length - 1];
      if (wisp.x < 0) wisp.x = random.range(120, 500);
      if (wisp.x > VIEW.width) wisp.x = random.range(VIEW.width - 500, VIEW.width - 120);
      if (wisp.y < 0) wisp.y = random.range(120, 320);
      if (wisp.y > VIEW.height) wisp.y = random.range(VIEW.height - 320, VIEW.height - 120);
      guard += 1;
    }
    if (state.powerups.length === 0) spawnPowerup();
  }

  scatterSky();
  state.nightPalette = nightPlan(1).palette;
  for (let i = 0; i < 7; i += 1) state.motes.push(spawnMoteNear(state.moth.x, state.moth.y, 120, 380));
  for (let i = 0; i < 5; i += 1) spawnMote();
  spawnBloom();
  spawnTrail();

  return { state, step, reset, triggerFlare, spawnBloom, spawnTrail, topUpForShot };
}
