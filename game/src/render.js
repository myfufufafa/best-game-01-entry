// Everything the player sees, painted on one canvas: the night sky, the
// lantern's pool of light, the moth, the motes and the wisps, the particles,
// the HUD, and the five screens (title, play, paused, game over, dawn).
// The renderer never changes the rules — it only shows the state it is given.
import { LIGHT, PALETTE, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || VIEW.width;
    const h = canvas.clientHeight || VIEW.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const ox = (canvas.width - VIEW.width * scale) / 2;
    const oy = (canvas.height - VIEW.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale, ox, oy };
  }

  function drawSky(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Aurora ribbons, slowly breathing.
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let band = 0; band < 3; band += 1) {
      const baseY = 90 + band * 55;
      const color = [PALETTE.auroraA, PALETTE.auroraB, PALETTE.auroraC][band];
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= VIEW.width; x += 40) {
        const wave = Math.sin(x / 260 + state.time * 0.25 + band * 2.1) * 26
          + Math.sin(x / 110 - state.time * 0.4 + band) * 10;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(VIEW.width, baseY + 46);
      ctx.lineTo(0, baseY + 46);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 46);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.16 + 0.06 * Math.sin(state.time * 0.5 + band);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();

    // Stars, twinkling by their own phase and depth layer.
    for (const star of state.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 0.9 + star.twinkle));
      ctx.globalAlpha = tw * star.layer;
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Rolling hills and a meadow of glowing flowers along the bottom.
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.lineTo(x, VIEW.height - 96 - Math.sin(x / 300 + 1.2) * 22);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.lineTo(x, VIEW.height - 52 - Math.sin(x / 210 + 4) * 14);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();

    for (const flower of state.flowers) {
      const sway = Math.sin(state.time * 1.1 + flower.sway) * 4;
      ctx.strokeStyle = PALETTE.flowerStem;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(flower.x, flower.y);
      ctx.quadraticCurveTo(flower.x + sway, flower.y - 14, flower.x + sway * 1.6, flower.y - 26);
      ctx.stroke();
      ctx.fillStyle = flower.hue;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(flower.x + sway * 1.6 + Math.cos(a) * 5, flower.y - 26 + Math.sin(a) * 5, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(flower.x + sway * 1.6, flower.y - 26, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      const pulse = 0.75 + 0.25 * Math.sin(mote.phase * 2.4);
      glowCircle(ctx, mote.x, mote.y, 34 * pulse, 'rgba(255, 215, 106, 0.55)', 0.8);
      ctx.fillStyle = PALETTE.moteCore;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 6.5 * pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.moteGlow;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 11 * pulse, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPowerups(state) {
    for (const power of state.powerups) {
      const bob = Math.sin(power.phase) * 4;
      const y = power.y + bob;
      glowCircle(ctx, power.x, y, 30, 'rgba(155, 232, 255, 0.5)', 0.7);
      ctx.save();
      ctx.translate(power.x, y);
      if (power.kind === 'dewdrop') {
        ctx.fillStyle = '#7fd4ff';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.quadraticCurveTo(11, 2, 11, 7);
        ctx.quadraticCurveTo(11, 14, 0, 14);
        ctx.quadraticCurveTo(-11, 14, -11, 7);
        ctx.quadraticCurveTo(-11, 2, 0, -13);
        ctx.fill();
        ctx.fillStyle = '#eaf9ff';
        ctx.beginPath();
        ctx.arc(-3.5, 4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (power.kind === 'sunpetal') {
        ctx.fillStyle = '#ffd76a';
        for (let p = 0; p < 6; p += 1) {
          const a = (p / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 6, 3.4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ff9d5c';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#9be8ff';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawWisps(state) {
    for (const wisp of state.wisps) {
      const wob = Math.sin(wisp.wobble * 2) * 3;
      ctx.save();
      ctx.translate(wisp.x, wisp.y);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = PALETTE.wispBody;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.35) {
        const r = 17 + Math.sin(a * 3 + wisp.wobble) * 3.5 + wob;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r * 0.9;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 160, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Two eyes, always watching the moth.
      const look = Math.atan2(state.moth.y - wisp.y, state.moth.x - wisp.x);
      const ex = Math.cos(look) * 3;
      const ey = Math.sin(look) * 3;
      ctx.fillStyle = PALETTE.wispEye;
      ctx.beginPath();
      ctx.arc(-6 + ex, -3 + ey, 3.4, 0, Math.PI * 2);
      ctx.arc(6 + ex, -3 + ey, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241d4d';
      ctx.beginPath();
      ctx.arc(-6 + ex * 1.6, -3 + ey * 1.6, 1.6, 0, Math.PI * 2);
      ctx.arc(6 + ex * 1.6, -3 + ey * 1.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMoth(state) {
    const moth = state.moth;
    const blink = moth.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(moth.x, moth.y);
    // Halo of lantern light carried on the moth's back.
    glowCircle(ctx, 0, 0, 74, 'rgba(255, 215, 106, 0.35)', 0.9);
    if (state.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(moth.angle + Math.PI / 2);
    ctx.globalAlpha = blink ? 0.35 : 1;
    const flap = Math.sin(moth.flap) * 0.55;
    // Wings: two ellipses that fold with the flap.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * (1 - flap * 0.45), 1);
      const wingGrad = ctx.createLinearGradient(0, -26, 0, 6);
      wingGrad.addColorStop(0, PALETTE.mothWing);
      wingGrad.addColorStop(1, PALETTE.mothWingEdge);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-13, -8, 13, 20, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-11, 12, 9, 12, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(-15, -14, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body and head.
    ctx.fillStyle = PALETTE.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -16, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Antennae.
    ctx.strokeStyle = '#2a1f14';
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 3, -19);
      ctx.quadraticCurveTo(side * 9, -28, side * 12, -33);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(side * 12, -33, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(-2.4, -17, 1.6, 0, Math.PI * 2);
    ctx.arc(2.4, -17, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLightPool(state) {
    const moth = state.moth;
    const lightFrac = state.light / LIGHT.max;
    const radius = 150 + lightFrac * 260;
    // Warm pool around the moth, then the dark that closes in as light falls.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, moth.x, moth.y, radius, 'rgba(255, 205, 100, 0.20)', 0.85);
    ctx.restore();
    const dark = ctx.createRadialGradient(
      moth.x, moth.y, radius * 0.45, moth.x, moth.y, radius * 1.5,
    );
    dark.addColorStop(0, 'rgba(4, 6, 20, 0)');
    dark.addColorStop(1, `rgba(4, 6, 20, ${0.55 - lightFrac * 0.28})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (state.light < LIGHT.lowWarning) {
      const pulse = 0.1 + 0.08 * Math.sin(state.time * 6);
      ctx.fillStyle = `rgba(255, 60, 60, ${pulse})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('SCORE', 28, 34);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(String(state.score), 28, 68);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 28, 94);
    if (state.combo >= 2) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, 28, 126);
    }
    // Night, top centre, with its progress bar.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(`NIGHT ${state.night} / 5`, VIEW.width / 2, 40);
    ctx.fillStyle = 'rgba(244, 236, 216, 0.25)';
    roundRect(ctx, VIEW.width / 2 - 110, 50, 220, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, VIEW.width / 2 - 110, 50, 220 * (state.nightTime / 40), 8, 4);
    ctx.fill();
    // Lantern light meter, top right.
    const meterX = VIEW.width - 268;
    ctx.textAlign = 'left';
    ctx.fillStyle = state.light < LIGHT.lowWarning ? PALETTE.danger : PALETTE.hudDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(state.light < LIGHT.lowWarning ? 'LIGHT LOW!' : 'LANTERN', meterX, 34);
    ctx.fillStyle = 'rgba(244, 236, 216, 0.25)';
    roundRect(ctx, meterX, 44, 200, 16, 8);
    ctx.fill();
    const frac = Math.max(0, state.light / LIGHT.max);
    const meterGrad = ctx.createLinearGradient(meterX, 0, meterX + 200, 0);
    meterGrad.addColorStop(0, '#ff9d5c');
    meterGrad.addColorStop(1, '#ffd76a');
    ctx.fillStyle = meterGrad;
    roundRect(ctx, meterX, 44, 200 * frac, 16, 8);
    ctx.fill();
    // Petals (lives) under the meter.
    for (let i = 0; i < 3; i += 1) {
      const px = meterX + 14 + i * 30;
      const py = 82;
      ctx.fillStyle = i < state.petals ? '#ff7fb0' : 'rgba(244, 236, 216, 0.22)';
      ctx.beginPath();
      ctx.moveTo(px, py - 9);
      ctx.quadraticCurveTo(px + 9, py, px, py + 9);
      ctx.quadraticCurveTo(px - 9, py, px, py - 9);
      ctx.fill();
    }
    // Active effect timers, under the petals.
    ctx.font = '700 15px system-ui, sans-serif';
    let ty = 112;
    if (state.shieldTimer > 0) {
      ctx.fillStyle = '#7fd4ff';
      ctx.fillText(`SHIELD ${Math.ceil(state.shieldTimer)}s`, meterX, ty);
      ty += 20;
    }
    if (state.magnetTimer > 0) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(`MAGNET ${Math.ceil(state.magnetTimer)}s`, meterX, ty);
      ty += 20;
    }
    if (state.freezeTimer > 0) {
      ctx.fillStyle = '#9be8ff';
      ctx.fillText(`FREEZE ${Math.ceil(state.freezeTimer)}s`, meterX, ty);
    }
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(7, 10, 36, 0.82)';
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 20, 0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '600 24px Georgia, serif';
    ctx.fillText('A GAME OF LIGHT', VIEW.width / 2, 128);
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 92px Georgia, serif';
    ctx.fillText('LUMEN MOTH', VIEW.width / 2, 226);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText('Keep the lantern lit. Outlast the dark.', VIEW.width / 2, 272);
    panel(VIEW.width / 2 - 330, 316, 660, 190);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText('Move with MOUSE or WASD / ARROWS', VIEW.width / 2, 356);
    ctx.fillText('Gather golden motes to feed your lantern', VIEW.width / 2, 390);
    ctx.fillText('Dodge the shadow wisps — 3 petals, then the dark wins', VIEW.width / 2, 424);
    ctx.fillText('SPACE or CLICK: Flare burst (spends light, banishes wisps)', VIEW.width / 2, 458);
    ctx.fillText('Survive all 5 nights to see the dawn', VIEW.width / 2, 492);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 24px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${best}`, VIEW.width / 2, 556);
    }
    const blink = 0.6 + 0.4 * Math.sin(state.time * 3);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS SPACE TO BEGIN', VIEW.width / 2, 616);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 64px Georgia, serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 330);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText('Press P or SPACE to keep flying', VIEW.width / 2, 384);
    ctx.restore();
  }

  function drawResults(state, best, won) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(VIEW.width / 2 - 360, 128, 720, 440);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 68px Georgia, serif';
      ctx.fillText('DAWN BREAKS', VIEW.width / 2, 216);
      ctx.fillStyle = '#fff8e2';
      ctx.font = 'italic 25px Georgia, serif';
      ctx.fillText('Five nights survived — the lantern never went out.', VIEW.width / 2, 258);
    } else {
      ctx.fillStyle = '#c9b8ff';
      ctx.font = '800 68px Georgia, serif';
      ctx.fillText('THE DARK WINS', VIEW.width / 2, 216);
      ctx.fillStyle = '#fff8e2';
      ctx.font = 'italic 25px Georgia, serif';
      ctx.fillText('The lantern faded on night ' + state.night + ' of 5.', VIEW.width / 2, 258);
    }
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, VIEW.width / 2, 330);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 21px system-ui, sans-serif';
    const bestLine = state.score >= best && state.score > 0 ? `NEW BEST!  ${state.score}` : `BEST  ${best}`;
    ctx.fillText(bestLine, VIEW.width / 2, 368);
    ctx.fillText(
      `Motes ${state.stats.motes}   •   Wisps banished ${state.stats.wisps}   •   Flares ${state.stats.flares}`,
      VIEW.width / 2, 408,
    );
    ctx.fillText(
      `Nights survived ${won ? 5 : state.night - 1} of 5   •   Petals left ${state.petals}`,
      VIEW.width / 2, 442,
    );
    const blink = 0.6 + 0.4 * Math.sin(state.time * 3);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 522);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return {
    draw(state, screen, best, particles) {
      fit();
      ctx.save();
      if (state.shake > 0) {
        // Deterministic wobble from the clock, so a seeded scene shakes the
        // same way every time it is rendered.
        ctx.translate(
          Math.sin(state.time * 91.7) * state.shake,
          Math.cos(state.time * 113.3) * state.shake,
        );
      }
      drawSky(state);
      drawMotes(state);
      drawPowerups(state);
      drawWisps(state);
      drawMoth(state);
      particles.draw(ctx);
      drawLightPool(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawResults(state, best, false);
      else if (screen === SCREEN_WIN) drawResults(state, best, true);
      ctx.restore();
    },
  };
}
