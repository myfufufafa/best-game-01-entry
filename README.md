# Lumen Moth — Keep the Lantern Lit

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/myfufufafa/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/myfufufafa/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01)

An entry for [best-game-01 — Make the best game](https://make.fun/bounty/best-game-01) ($1,000).

## The game

You are **Luma**, a firefly moth carrying the last lantern through a dark
meadow. The lantern's light is your life: it always burns down, and only
golden motes can feed it. Shadow wisps drift in from the dark and hunt you —
one touch costs a petal, and three petals lost ends the run. Survive all
**five nights** and the dawn breaks.

- **Move** with the mouse or WASD / arrow keys — the moth follows your cursor.
- **Gather motes** to feed the lantern (+light) and score. Chain them quickly
  for a combo multiplier up to ×5 — the combo meter shows how long you have.
- **Golden blooms** — tight clusters of motes worth 3× each, usually parked
  close to a wisp. **Mote trails** arc across the field, worth extra each.
- **Flare burst** (hold Space or the mouse button): spends light to banish
  every wisp in a wide ring. Worth it when the dark closes in.
- **Four wisp kinds**, one per night: drifters wander, hunters chase,
  splitters burst into two fast minis when banished, dashers flash red and
  lunge. Night 4 brings a gale that shoves you sideways; night 5 brings the
  **Wisp King** — huge, crowned, worth 500.
- **Power-ups**: Dewdrop (shield), Sunpetal (magnet), Dawn Shard (freeze).
- **Win** by surviving night 5; **lose** by losing all 3 petals or letting
  the lantern go out three times.

Everything is original and procedural: the night sky, aurora, flowers, moth,
wisps and music are all drawn and synthesised in code. No images, fonts or
sounds are loaded from anywhere — the game runs fully offline.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static file server. Keyboard and mouse;
`P` pauses, `R` restarts after a run ends, `M` mutes.

## Structure

- `game/src/config.js` — tuning and palette
- `game/src/random.js` — seeded generator (reproducible fields)
- `game/src/world.js` — the rules: light, motes, blooms, trails, nights, scoring
- `game/src/nights.js` — the night director: each night's name, palette, wisp mix, wind
- `game/src/wisps.js` — the wisp kinds and their hunting styles (drifter, hunter, splitter, dasher, mini, King)
- `game/src/render.js` — sky, lantern light, moth, HUD and screens
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/audio.js` — WebAudio synthesis: chimes, flare, generative pad
- `game/src/particles.js` — sparks, rings and floating score text
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=`)
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` and
  writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's library, unchanged

Screenshots in `screenshots/` are real renders of the game's own code
(`?shot=surge|start|play|dawn&seed=7`), never edited — the night-4 surge
mid-flare first (the cover), then the title, live play, and the dawn.

## v3 — what changed from v2

- **Cover first:** the first screenshot is now the densest action frame
  (surge, moth mid-flare), not the title screen — the title is second.
- **Title screen rebuilt:** a hero moth ~3× life size with a glowing
  lantern, a 4-kind wisp roster with icons, a content count line
  (5 nights • 4 wisp kinds • 3 gifts • 1 boss), a one-line control strip,
  and a real gold BEGIN THE NIGHT button. The full how-to moved to the
  pause screen.
- **Readable wisps:** each kind has its own bright outline colour
  (violet / pink / green / red) and eyes ~26% of body width, so the four
  kinds stay apart even at thumbnail size.
- **Bigger moments:** motes ~1.5× with stronger glow, golden blooms
  ringed 3× a plain mote, and big centre texts — FLARE!, BLOOM x3!,
  COMBO x5! — with dark outlines; pickup scores are white/gold and bold.
- ** fuller sky:** hanging lanterns and ~70% more fireflies fill the
  middle of the field; the moon is golden with a warm halo.
- **HUD shows the systems:** an INCOMING panel (wisps left, by kind) and
  gift pills (SHIELD / MAGNET / FREEZE) at the edges, centre kept clear.
- **Dawn is dawn:** the win screen has its own rose-and-gold sunrise sky
  with a visible sun, under a thinner overlay.
- Mechanics are unchanged: moth + lantern + motes + wisps + 5 nights +
  Wisp King + 3 gifts, all deterministic (seed 7).

## License

MIT — see [LICENSE](LICENSE).
