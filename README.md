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
  for a combo multiplier up to ×5.
- **Flare burst** (hold Space or the mouse button): spends light to banish
  every wisp in a wide ring. Worth it when the dark closes in.
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
- `game/src/world.js` — the rules: light, motes, wisps, nights, scoring
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
(`?shot=start|play|surge|dawn&seed=7`), never edited.

## License

MIT — see [LICENSE](LICENSE).
