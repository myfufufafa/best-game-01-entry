// The rules of Lumen Moth, and nothing else. A world holds the lantern light,
// the moth, the motes, the wisps, the power-ups and the five nights; step()
// advances it one fixed 1/60 s slice and reports what happened as event bits,
// so the main loop can answer each one with a sound or a screen change.
//
// The loop, in one sentence: light always drains, motes feed it and score,
// wisps hunt the moth, a flare spends light to banish wisps, and surviving all
// five nights until dawn wins.
import {
  FLARE, LIGHT, MOTE, MOTH, NIGHTS, NIGHT_SECONDS, PETALS, POWERUP, VIEW, WISP,
} from './config.js';

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
    wispTimer: 4.0,
    powerupTimer: POWERUP.spawnEverySeconds,
    stats: { motes: 0, wisps: 0, flares: 0, hits: 0 },
    stars: [],
    flowers: [],
  };

  function scatterSky() {
    state.stars = [];
    for (let i = 0; i < 130; i += 1) {
      state.stars.push({
        x: random.range(0, VIEW.width),
        y: random.range(0, VIEW.height * 0.75),
        size: random.range(0.6, 2.2),
        twinkle: random.range(0, Math.PI * 2),
        layer: random.pick([0.35, 0.6, 1]),
      });
    }
    state.flowers = [];
    for (let i = 0; i < 14; i += 1) {
      state.flowers.push({
        x: random.range(30, VIEW.width - 30),
        y: random.range(VIEW.height - 70, VIEW.height - 8),
        sway: random.range(0, Math.PI * 2),
        hue: random.pick(['#ff7fb0', '#ffd76a', '#9be8ff', '#c9b8ff']),
      });
    }
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
    });
  }

  function spawnWisp() {
    const edge = random.int(0, 3);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = random.range(0, VIEW.width); y = -24; }
    else if (edge === 1) { x = VIEW.width + 24; y = random.range(0, VIEW.height); }
    else if (edge === 2) { x = random.range(0, VIEW.width); y = VIEW.height + 24; }
    else { x = -24; y = random.range(0, VIEW.height); }
    state.wisps.push({
      x, y,
      vx: 0, vy: 0,
      speed: WISP.baseSpeed + state.night * WISP.speedPerNight + random.range(-12, 12),
      wobble: random.range(0, Math.PI * 2),
      wobbleSpeed: random.range(1.4, 2.6),
      kind: KIND_WISP,
    });
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

  function stepMotes(dt) {
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const mote = state.motes[i];
      mote.phase += dt * 2;
      const pull = state.magnetTimer > 0
        ? distance(mote.x, mote.y, state.moth.x, state.moth.y) < 260 : false;
      if (pull) {
        const dx = state.moth.x - mote.x;
        const dy = state.moth.y - mote.y;
        const dist = Math.hypot(dx, dy) || 1;
        mote.x += (dx / dist) * 300 * dt;
        mote.y += (dy / dist) * 300 * dt;
      } else {
        mote.x += Math.sin(mote.phase * 0.7) * mote.drift * dt;
        mote.y += Math.cos(mote.phase * 0.5) * mote.drift * 0.6 * dt;
      }
      if (distance(mote.x, mote.y, state.moth.x, state.moth.y) < MOTE.radius + MOTH.radius) {
        state.motes.splice(i, 1);
        state.combo = Math.min(state.combo + 1, MOTE.maxCombo);
        state.comboTimer = MOTE.comboWindowSeconds;
        const gained = MOTE.score * state.combo;
        state.score += gained;
        state.light = Math.min(LIGHT.max, state.light + LIGHT.moteRestore);
        state.stats.motes += 1;
        particles.burst(mote.x, mote.y, '#ffd76a', 12, 180);
        particles.text(mote.x, mote.y - 14, `+${gained}`, '#ffe9a8');
      }
    }
  }

  function stepWisps(dt) {
    const frozen = state.freezeTimer > 0;
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const wisp = state.wisps[i];
      wisp.wobble += dt * wisp.wobbleSpeed;
      if (!frozen) {
        const dx = state.moth.x - wisp.x;
        const dy = state.moth.y - wisp.y;
        const dist = Math.hypot(dx, dy) || 1;
        const px = -dy / dist;
        const py = dx / dist;
        const wob = Math.sin(wisp.wobble) * 0.45;
        wisp.vx = (dx / dist + px * wob) * wisp.speed;
        wisp.vy = (dy / dist + py * wob) * wisp.speed;
        wisp.x += wisp.vx * dt;
        wisp.y += wisp.vy * dt;
      }
      const d = distance(wisp.x, wisp.y, state.moth.x, state.moth.y);
      if (state.flare.active && d < state.flare.radius + WISP.radius) {
        state.wisps.splice(i, 1);
        state.score += FLARE.scorePerWisp;
        state.stats.wisps += 1;
        particles.burst(wisp.x, wisp.y, '#c9b8ff', 16, 220);
        particles.text(wisp.x, wisp.y - 12, `+${FLARE.scorePerWisp}`, '#d9ccff');
        continue;
      }
      if (d < WISP.radius + MOTH.radius - 4 && state.moth.invuln <= 0) {
        if (state.shieldTimer > 0) {
          state.wisps.splice(i, 1);
          state.score += FLARE.scorePerWisp;
          state.stats.wisps += 1;
          particles.burst(wisp.x, wisp.y, '#9be8ff', 16, 220);
          continue;
        }
        state.light = Math.max(0, state.light - LIGHT.hitLoss);
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
    state.wispTimer -= dt;
    const wispInterval = WISP.spawnEverySeconds * (1 - state.night * WISP.spawnSpeedUpPerNight * 0.2);
    if (state.wispTimer <= 0 && state.wisps.length < Math.min(WISP.maxOnField, 2 + state.night * 2)) {
      spawnWisp();
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
    state.wispTimer = 4.0;
    state.powerupTimer = POWERUP.spawnEverySeconds;
    state.stats = { motes: 0, wisps: 0, flares: 0, hits: 0 };
    scatterSky();
    for (let i = 0; i < 6; i += 1) spawnMote();
    particles.clear();
  }

  scatterSky();
  for (let i = 0; i < 6; i += 1) spawnMote();

  return { state, step, reset, triggerFlare };
}
