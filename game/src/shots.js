// The screenshot scenes behind ?shot=start|play|surge|dawn. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// an autopilot that chases motes, keeps clear of wisps and flares when one gets
// too close — so every frame is what a real game looks like, and the same seed
// always gives the same frame.
import { STEP, VIEW } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const SURGE_SECONDS = 96;
const DAWN_LIMIT_SECONDS = 260;

function steer(state) {
  const moth = state.moth;
  // Nearest mote pulls; every close wisp pushes twice as hard.
  let ax = 0;
  let ay = 0;
  let nearest = null;
  let nearestDist = Infinity;
  for (const mote of state.motes) {
    const d = Math.hypot(mote.x - moth.x, mote.y - moth.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = mote;
    }
  }
  if (nearest) {
    ax += (nearest.x - moth.x) / (nearestDist || 1);
    ay += (nearest.y - moth.y) / (nearestDist || 1);
  }
  let flare = false;
  for (const wisp of state.wisps) {
    const dx = moth.x - wisp.x;
    const dy = moth.y - wisp.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 100) flare = true;
    if (d < 190) {
      const push = (190 - d) / 190 * 2.2;
      ax += (dx / d) * push;
      ay += (dy / d) * push;
    }
  }
  // Stay inside the field.
  if (moth.x < 120) ax += 0.8;
  if (moth.x > VIEW.width - 120) ax -= 0.8;
  if (moth.y < 130) ay += 0.8;
  if (moth.y > VIEW.height - 130) ay -= 0.8;
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len, pointer: false, flare };
}

function simulate(world, seconds, pilot) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const events = world.step(STEP, pilot(world.state), false);
    if (events & (EVENT_OVER | EVENT_WIN)) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the
 * best score to show, and whether the moth should be mid-flare in the frame.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'surge' && name !== 'dawn') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0, pointer: false, flare: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 1240, flare: false };
  }
  if (name === 'play') {
    simulate(world, PLAY_SECONDS, steer);
    return { screen: SCREEN_PLAY, best: 1240, flare: false };
  }
  if (name === 'surge') {
    simulate(world, SURGE_SECONDS, steer);
    // Fire one last flare so the frame catches the ring mid-burst.
    world.triggerFlare();
    world.step(STEP, { x: 0, y: 0, pointer: false, flare: false }, false);
    return { screen: SCREEN_PLAY, best: 1240, flare: true };
  }
  // dawn: play all five nights for real. A cautious pilot usually makes it;
  // a fresh seed is tried when it does not, and the victory screen still shows
  // the run's own score and stats either way.
  let events = simulate(world, DAWN_LIMIT_SECONDS, steer);
  if (!(events & EVENT_WIN)) {
    world.reset();
    events = simulate(world, DAWN_LIMIT_SECONDS, (state) => {
      const control = steer(state);
      control.flare = control.flare || state.light > 60;
      return control;
    });
  }
  if (events & EVENT_WIN) {
    return { screen: SCREEN_WIN, best: Math.max(1240, world.state.score), flare: false };
  }
  return { screen: SCREEN_OVER, best: 1240, flare: false };
}
