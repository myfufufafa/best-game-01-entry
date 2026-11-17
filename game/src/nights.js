// The night director: each of the five nights has its own identity, palette,
// wisp mix and weather, so the run visibly changes as it goes on. The world
// asks for the plan when a night starts; the renderer reads the palette the
// plan leaves on the state. Nothing here touches the rules — it only names
// what the night is and what it looks like.
export const NIGHT_PLANS = [
  {
    night: 1,
    name: 'FIRST LIGHT',
    subtitle: 'Drifters wander in — learn to fly, feed the lantern',
    kinds: ['drifter'],
    kindWeights: [1],
    wind: 0,
    palette: { skyTop: '#0b1034', skyMid: '#1c2560', skyLow: '#3a4a94', aurora: 0.36 },
  },
  {
    night: 2,
    name: 'THE HUNT BEGINS',
    subtitle: 'Hunters smell your lantern — keep moving',
    kinds: ['drifter', 'hunter'],
    kindWeights: [0.55, 0.45],
    wind: 0,
    palette: { skyTop: '#081230', skyMid: '#142a5c', skyLow: '#2e5a8a', aurora: 0.40 },
  },
  {
    night: 3,
    name: 'SPLITTING DARK',
    subtitle: 'Splitters burst into twins — flare them apart',
    kinds: ['drifter', 'hunter', 'splitter'],
    kindWeights: [0.35, 0.35, 0.3],
    wind: 0,
    palette: { skyTop: '#120b38', skyMid: '#241a5e', skyLow: '#453a8a', aurora: 0.42 },
  },
  {
    night: 4,
    name: 'WIND OF THORNS',
    subtitle: 'Dashers ride the gale — watch for the red flash',
    kinds: ['hunter', 'splitter', 'dasher'],
    kindWeights: [0.35, 0.3, 0.35],
    wind: 1,
    palette: { skyTop: '#071224', skyMid: '#12294e', skyLow: '#2a4a72', aurora: 0.46 },
  },
  {
    night: 5,
    name: 'THE WISP KING',
    subtitle: 'Banish the King — and see the dawn',
    kinds: ['drifter', 'hunter', 'splitter', 'dasher'],
    kindWeights: [0.2, 0.3, 0.25, 0.25],
    wind: 0.5,
    king: true,
    palette: { skyTop: '#160a30', skyMid: '#2c1448', skyLow: '#4a2a5e', aurora: 0.48 },
  },
];

/** The plan for a night number (1-5). */
export function nightPlan(night) {
  return NIGHT_PLANS[Math.max(1, Math.min(NIGHT_PLANS.length, night)) - 1];
}

/** Pick a wisp kind for this night, weighted by the plan. */
export function pickNightKind(random, night) {
  const plan = nightPlan(night);
  let roll = random.next();
  for (let i = 0; i < plan.kinds.length; i += 1) {
    roll -= plan.kindWeights[i];
    if (roll <= 0) return plan.kinds[i];
  }
  return plan.kinds[plan.kinds.length - 1];
}

/**
 * Open a night on the state: set its palette, raise its banner (the big
 * centre title the renderer shows for a few seconds), and arm its wind.
 * The caller spawns the Wisp King separately when the plan asks for one.
 */
export function startNight(state, night) {
  const plan = nightPlan(night);
  state.nightPalette = plan.palette;
  state.banner = { title: `NIGHT ${night} — ${plan.name}`, subtitle: plan.subtitle, timer: 2.8 };
  state.windStrength = plan.wind;
  state.windTimer = 0;
  state.windGusting = false;
  state.windX = 0;
  return plan;
}
