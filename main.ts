// Lumen Moth — the hand-in program (Node 22, standard library only).
//
// The game itself is the plain static files under game/ (game/index.html plus
// its ES modules, no library and no network request). This program copies
// game/ and screenshots/ from beside this file into the output directory and
// writes output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; inside the
// grader it is /output already, so the fallback below only matters there.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGame() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  const shots = join(repoRoot, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(outputDir, 'screenshots'), { recursive: true });
}

function writeDossier() {
  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
  // bytes; the rest refuse an entry the scorer would refuse — more than 4
  // screenshots or one over 256 KiB, more than 993 files in game/ or 48 MiB of
  // game files in all, or a path under game/ over 1000 bytes.
  writeFileSync(
    join(outputDir, 'dossier.json'),
    buildDossier(outputDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );
}

copyGame();
writeDossier();
