// The shadow wisps: four kinds plus the Wisp King, each with its own body,
// speed and hunting style. This module owns what a wisp IS and how it MOVES;
// the world owns what happens when one is banished or touches the moth.
//
//   drifter — slow, wanders in lazy curves, the night-1 teacher.
//   hunter  — steers straight at the moth with a weaving wobble.
//   splitter — a hunter that bursts into two fast minis when banished.
//   dasher  — stalks, flashes red to telegraph, then lunges.
//   mini    — a splitter's twin: small, fast, fragile.
//   king    — the night-5 boss: huge, slow, worth 500, and hard to shake.
import { KING, VIEW, WISP } from './config.js';

export const WISP_KINDS = {
  drifter: { radius: 20, speed: 52, score: 25, eye: '#c9b8ff' },
  hunter: { radius: 23, speed: 80, score: 30, eye: '#ffb3c9' },
  splitter: { radius: 24, speed: 64, score: 40, eye: '#b8ffce' },
  dasher: { radius: 21, speed: 72, score: 40, eye: '#ffd76a' },
  mini: { radius: 13, speed: 122, score: 15, eye: '#e8d8ff' },
  king: { radius: KING.radius, speed: KING.speed, score: KING.score, eye: '#ff5c5c' },
};

function edgePoint(random) {
  const edge = random.int(0, 3);
  if (edge === 0) return { x: random.range(0, VIEW.width), y: -30 };
  if (edge === 1) return { x: VIEW.width + 30, y: random.range(0, VIEW.height) };
  if (edge === 2) return { x: random.range(0, VIEW.width), y: VIEW.height + 30 };
  return { x: -30, y: random.range(0, VIEW.height) };
}

export function makeWisp(random, kind, x, y, night) {
  const spec = WISP_KINDS[kind];
  const speed = spec.speed + (night - 1) * WISP.speedPerNight * 0.45 + random.range(-10, 10);
  return {
    kind,
    x, y,
    vx: 0, vy: 0,
    radius: spec.radius,
    speed: Math.max(30, speed),
    score: spec.score,
    wobble: random.range(0, Math.PI * 2),
    wobbleSpeed: random.range(1.4, 2.6),
    // Dasher state machine: stalk -> telegraph -> lunge -> recover.
    mode: 'stalk',
    modeTimer: random.range(1.2, 2.4),
    lungeX: 0, lungeY: 0,
  };
}

function spawnAtEdge(random, state, kind) {
  const p = edgePoint(random);
  const wisp = makeWisp(random, kind, p.x, p.y, state.night);
  state.wisps.push(wisp);
  return wisp;
}

export function spawnDrifterWisp(random, state) {
  return spawnAtEdge(random, state, 'drifter');
}

export function spawnHunterWisp(random, state) {
  return spawnAtEdge(random, state, 'hunter');
}

export function spawnSplitterWisp(random, state) {
  return spawnAtEdge(random, state, 'splitter');
}

export function spawnDasherWisp(random, state) {
  return spawnAtEdge(random, state, 'dasher');
}

export function spawnWispOfKind(random, state, kind) {
  return spawnAtEdge(random, state, kind);
}

/** Two fast minis burst out of a banished splitter, left and right of it. */
export function spawnMiniWisps(random, state, wisp) {
  for (const side of [-1, 1]) {
    const mini = makeWisp(random, 'mini', wisp.x + side * 26, wisp.y, state.night);
    mini.vx = side * 90;
    state.wisps.push(mini);
  }
}

/** The night-5 boss, dropped in from the top centre of the field. */
export function spawnWispKing(random, state) {
  const king = makeWisp(random, 'king', VIEW.width / 2, -60, state.night);
  state.wisps.push(king);
  return king;
}

/**
 * Advance one wisp one step. The moth's position steers every kind; dashers
 * run their stalk-telegraph-lunge loop, drifters wander, hunters chase.
 * Frozen wisps (Dawn Shard) do not move at all — the caller checks that.
 */
export function stepWisp(wisp, state, dt) {
  const moth = state.moth;
  const dx = moth.x - wisp.x;
  const dy = moth.y - wisp.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  wisp.wobble += dt * wisp.wobbleSpeed;

  if (wisp.kind === 'drifter') {
    // Lazy curves: mostly chase, but the perpendicular wander dominates.
    const wob = Math.sin(wisp.wobble) * 0.9;
    const px = -uy;
    const py = ux;
    wisp.vx = (ux * 0.55 + px * wob) * wisp.speed;
    wisp.vy = (uy * 0.55 + py * wob) * wisp.speed;
  } else if (wisp.kind === 'dasher') {
    wisp.modeTimer -= dt;
    if (wisp.mode === 'stalk') {
      wisp.vx = ux * wisp.speed * 0.7;
      wisp.vy = uy * wisp.speed * 0.7;
      if (wisp.modeTimer <= 0 && dist < 420) {
        wisp.mode = 'telegraph';
        wisp.modeTimer = 0.7;
      } else if (wisp.modeTimer <= 0) {
        wisp.modeTimer = 0.8;
      }
    } else if (wisp.mode === 'telegraph') {
      // Shiver in place, flashing — the fair warning before the lunge.
      wisp.vx = Math.sin(wisp.wobble * 9) * 26;
      wisp.vy = Math.cos(wisp.wobble * 9) * 26;
      if (wisp.modeTimer <= 0) {
        wisp.mode = 'lunge';
        wisp.modeTimer = 0.5;
        wisp.lungeX = ux;
        wisp.lungeY = uy;
      }
    } else if (wisp.mode === 'lunge') {
      wisp.vx = wisp.lungeX * wisp.speed * 4.2;
      wisp.vy = wisp.lungeY * wisp.speed * 4.2;
      if (wisp.modeTimer <= 0) {
        wisp.mode = 'recover';
        wisp.modeTimer = 0.9;
      }
    } else {
      wisp.vx *= 0.92;
      wisp.vy *= 0.92;
      if (wisp.modeTimer <= 0) {
        wisp.mode = 'stalk';
        wisp.modeTimer = 1.6;
      }
    }
  } else {
    // Hunter, splitter, mini and king: direct chase with a weaving wobble.
    const px = -uy;
    const py = ux;
    const wob = Math.sin(wisp.wobble) * (wisp.kind === 'mini' ? 0.25 : 0.45);
    wisp.vx = (ux + px * wob) * wisp.speed;
    wisp.vy = (uy + py * wob) * wisp.speed;
  }
  wisp.x += wisp.vx * dt;
  wisp.y += wisp.vy * dt;
}
