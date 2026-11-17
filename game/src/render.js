// Everything the player sees, painted on one canvas: the night sky, the
// lantern's pool of light, the moth, the motes and the wisps, the particles,
// the HUD, and the five screens (title, play, paused, game over, dawn).
// The renderer never changes the rules — it only shows the state it is given.
//
// v3: the scene is layered and bright enough to read at contact-sheet size —
// a golden moon with a halo, hanging lanterns and fireflies filling the
// middle sky, a much bigger moth carrying a visible lantern, and wisps with
// bright per-kind outlines and big eyes. The night's own palette tints the
// sky, and the win screen gets its own dawn sky.
import { DAWN_PALETTE, LIGHT, PALETTE, VIEW } from './config.js';
import { WISP_KINDS } from './wisps.js';

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

function paletteFor(state) {
  return state.nightPalette || PALETTE;
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

  function drawSky(state, screen) {
    const dawn = screen === SCREEN_WIN;
    const pal = dawn ? DAWN_PALETTE : paletteFor(state);
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(0.55, pal.skyMid);
    sky.addColorStop(1, pal.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    if (dawn) {
      // Sunrise at the right horizon, clear of the results panel: the win
      // screen's own light, so the dawn reads as dawn.
      glowCircle(ctx, 1130, 500, 260, 'rgba(255, 157, 92, 0.55)', 0.95);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(1130, 500, 66, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(1130, 500, 46, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // The moon, right side below the HUD: golden now, with a wide warm
      // halo and craters — a light, not a grey smudge.
      glowCircle(ctx, 1090, 230, 170, 'rgba(255, 205, 100, 0.45)', 0.9);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(1090, 230, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 150, 60, 0.55)';
      ctx.beginPath();
      ctx.arc(1074, 218, 9, 0, Math.PI * 2);
      ctx.arc(1104, 244, 11, 0, Math.PI * 2);
      ctx.arc(1092, 210, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aurora ribbons, breathing — stronger than v1, a real band of colour.
    // (Not at dawn: the sunrise owns that sky.)
    if (!dawn) {
    ctx.save();
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
      ctx.globalAlpha = (pal.aurora || 0.3) + 0.08 * Math.sin(state.time * 0.5 + band);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
    }

    // Stars, twinkling by their own phase and depth layer (faint at dawn).
    for (const star of state.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 0.9 + star.twinkle));
      ctx.globalAlpha = tw * star.layer * (dawn ? 0.15 : 1);
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Drifting fireflies and spores — the air itself glows.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spore of state.spores) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(spore.phase * 1.4));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = spore.hue;
      ctx.beginPath();
      ctx.arc(spore.x, spore.y, spore.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Hanging lanterns in the far distance: warm lights strung across the
    // middle sky, swaying gently — the second background layer.
    if (!dawn) {
      for (const lamp of state.lanterns || []) {
        const sway = Math.sin(state.time * 0.8 + lamp.sway) * 6;
        const lx = lamp.x + sway;
        const ly = lamp.y;
        const s = lamp.size;
        ctx.strokeStyle = 'rgba(20, 24, 48, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 46 * s);
        ctx.lineTo(lx, ly - 12 * s);
        ctx.stroke();
        glowCircle(ctx, lx, ly, 34 * s, 'rgba(255, 205, 100, 0.5)', 0.8);
        ctx.fillStyle = lamp.hue;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 10 * s, 13 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(lx, ly, 4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rolling hills, pine silhouettes on the far ridge, and a meadow of
    // glowing flowers along the bottom.
    ctx.fillStyle = pal.hillFar || PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.lineTo(x, VIEW.height - 96 - Math.sin(x / 300 + 1.2) * 22);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();
    // Pines on the far ridge.
    ctx.fillStyle = 'rgba(6, 10, 30, 0.85)';
    for (let x = 40; x < VIEW.width; x += 86) {
      const baseY = VIEW.height - 96 - Math.sin(x / 300 + 1.2) * 22;
      const h = 34 + ((x * 7) % 23);
      ctx.beginPath();
      ctx.moveTo(x, baseY - h);
      ctx.lineTo(x - 13, baseY);
      ctx.lineTo(x + 13, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = pal.hillNear || PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.lineTo(x, VIEW.height - 52 - Math.sin(x / 210 + 4) * 14);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();

    for (const flower of state.flowers) {
      const s = flower.size || 1;
      const sway = Math.sin(state.time * 1.1 + flower.sway) * 5;
      ctx.strokeStyle = PALETTE.flowerStem;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(flower.x, flower.y);
      ctx.quadraticCurveTo(flower.x + sway, flower.y - 18, flower.x + sway * 1.6, flower.y - 34 * s);
      ctx.stroke();
      ctx.fillStyle = flower.hue;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(flower.x + sway * 1.6 + Math.cos(a) * 6.5 * s, flower.y - 34 * s + Math.sin(a) * 6.5 * s, 4.4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(flower.x + sway * 1.6, flower.y - 34 * s, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      const pulse = 0.75 + 0.25 * Math.sin(mote.phase * 2.4);
      // v3: motes ~1.5x v2, with a stronger glow — the fuel reads at a glance.
      const glowR = mote.bloom ? 84 : 62;
      glowCircle(ctx, mote.x, mote.y, glowR * pulse, 'rgba(255, 205, 100, 0.65)', 0.85);
      if (mote.bloom) {
        // Bloom motes wear a big golden ring, 3x a plain mote across, so the
        // 3x cluster reads at a glance.
        ctx.strokeStyle = 'rgba(255, 215, 106, 0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, 26 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 233, 168, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, 33 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (mote.trail) {
        ctx.strokeStyle = 'rgba(155, 232, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, 20 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.moteCore;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 11 * pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.moteGlow;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 18 * pulse, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPowerups(state) {
    for (const power of state.powerups) {
      const bob = Math.sin(power.phase) * 4;
      const y = power.y + bob;
      glowCircle(ctx, power.x, y, 36, 'rgba(155, 232, 255, 0.55)', 0.75);
      ctx.save();
      ctx.translate(power.x, y);
      if (power.kind === 'dewdrop') {
        ctx.fillStyle = '#7fd4ff';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.quadraticCurveTo(13, 2, 13, 8);
        ctx.quadraticCurveTo(13, 16, 0, 16);
        ctx.quadraticCurveTo(-13, 16, -13, 8);
        ctx.quadraticCurveTo(-13, 2, 0, -15);
        ctx.fill();
        ctx.fillStyle = '#eaf9ff';
        ctx.beginPath();
        ctx.arc(-4, 5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (power.kind === 'sunpetal') {
        ctx.fillStyle = '#ffd76a';
        for (let p = 0; p < 6; p += 1) {
          const a = (p / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 10, Math.sin(a) * 10, 7, 4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ff9d5c';
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#9be8ff';
        ctx.beginPath();
        ctx.moveTo(0, -17);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 17);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawWisps(state) {
    for (const wisp of state.wisps) {
      const spec = WISP_KINDS[wisp.kind] || WISP_KINDS.drifter;
      const r = wisp.radius;
      const wob = Math.sin(wisp.wobble * 2) * 3;
      const telegraph = wisp.kind === 'dasher' && wisp.mode === 'telegraph';
      const outline = telegraph ? '#ff5c5c' : (spec.outline || 'rgba(180, 160, 255, 0.55)');
      ctx.save();
      ctx.translate(wisp.x, wisp.y);
      // A bright aura in the kind's own colour, so the wisp reads as a
      // threat against the sky instead of a dark blot on it.
      glowCircle(ctx, 0, 0, r * 2.4, telegraph ? 'rgba(255, 92, 92, 0.55)' : 'rgba(120, 90, 220, 0.45)', 0.85);
      glowCircle(ctx, 0, 0, r * 1.3, outline, 0.28);
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = wisp.kind === 'king' ? '#1a1038' : PALETTE.wispBody;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.35) {
        const rr = r + Math.sin(a * 3 + wisp.wobble) * r * 0.18 + wob;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr * 0.9;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // Bright per-kind outline, 3px: the four kinds stay apart at 256 px.
      ctx.strokeStyle = outline;
      ctx.lineWidth = telegraph ? 4 : 3;
      ctx.stroke();
      if (wisp.kind === 'king') {
        // Crown spikes on the boss.
        ctx.fillStyle = '#ffd76a';
        for (let s = -1; s <= 1; s += 1) {
          ctx.beginPath();
          ctx.moveTo(s * 16 - 7, -r * 0.72);
          ctx.lineTo(s * 16, -r * 1.18);
          ctx.lineTo(s * 16 + 7, -r * 0.72);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (wisp.kind === 'splitter') {
        // A pale seam down the middle: this one comes apart.
        ctx.strokeStyle = 'rgba(184, 255, 206, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(0, r * 0.7);
        ctx.stroke();
      }
      // Eyes, always watching the moth — v3: diameter ~26% of the body
      // width, so they read even in a small screenshot.
      const look = Math.atan2(state.moth.y - wisp.y, state.moth.x - wisp.x);
      const ex = Math.cos(look) * 3;
      const ey = Math.sin(look) * 3;
      const eyeR = Math.max(4.5, r * 0.26);
      const eyeGap = Math.max(7, r * 0.34);
      ctx.fillStyle = telegraph ? '#ff5c5c' : spec.eye;
      ctx.beginPath();
      ctx.arc(-eyeGap + ex, -r * 0.16 + ey, eyeR, 0, Math.PI * 2);
      ctx.arc(eyeGap + ex, -r * 0.16 + ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241d4d';
      ctx.beginPath();
      ctx.arc(-eyeGap + ex * 1.6, -r * 0.16 + ey * 1.6, eyeR * 0.45, 0, Math.PI * 2);
      ctx.arc(eyeGap + ex * 1.6, -r * 0.16 + ey * 1.6, eyeR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMoth(state) {
    const moth = state.moth;
    const blink = moth.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    const lightFrac = state.light / LIGHT.max;
    // The lantern's glow breathes with the light level.
    const haloR = 130 + lightFrac * 90 + Math.sin(state.time * 2.2) * 8;
    ctx.save();
    ctx.translate(moth.x, moth.y);
    glowCircle(ctx, 0, 0, haloR, 'rgba(255, 205, 100, 0.5)', 0.95);
    if (state.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 52 + Math.sin(state.time * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(moth.angle + Math.PI / 2);
    ctx.globalAlpha = blink ? 0.35 : 1;
    const flap = Math.sin(moth.flap) * 0.55;
    // Wings, 1.7x v1: two big ellipses that fold with the flap.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * (1 - flap * 0.45), 1);
      const wingGrad = ctx.createLinearGradient(0, -44, 0, 10);
      wingGrad.addColorStop(0, PALETTE.mothWing);
      wingGrad.addColorStop(1, PALETTE.mothWingEdge);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-22, -14, 22, 34, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-19, 20, 15, 20, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(-26, -24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-20, 26, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body and head.
    ctx.fillStyle = PALETTE.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -27, 9.5, 0, Math.PI * 2);
    ctx.fill();
    // Antennae.
    ctx.strokeStyle = '#2a1f14';
    ctx.lineWidth = 2.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 5, -32);
      ctx.quadraticCurveTo(side * 15, -46, side * 20, -55);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(side * 20, -55, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(-4, -28, 2.6, 0, Math.PI * 2);
    ctx.arc(4, -28, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // The lantern itself: a little golden orb slung under the body, glowing.
    ctx.globalAlpha = blink ? 0.35 : 1;
    glowCircle(ctx, 0, 34, 26, 'rgba(255, 215, 106, 0.8)', 0.9);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(0, 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9d5c';
    ctx.beginPath();
    ctx.arc(0, 34, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLightPool(state) {
    const moth = state.moth;
    const lightFrac = state.light / LIGHT.max;
    const radius = 200 + lightFrac * 320;
    // Warm pool around the moth, then the dark that closes in as light falls.
    // v2 keeps the dark thinner so the field stays readable.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, moth.x, moth.y, radius, 'rgba(255, 205, 100, 0.22)', 0.9);
    ctx.restore();
    const dark = ctx.createRadialGradient(
      moth.x, moth.y, radius * 0.45, moth.x, moth.y, radius * 1.5,
    );
    dark.addColorStop(0, 'rgba(4, 6, 20, 0)');
    dark.addColorStop(1, `rgba(4, 6, 20, ${0.42 - lightFrac * 0.22})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (state.light < LIGHT.lowWarning) {
      const pulse = 0.1 + 0.08 * Math.sin(state.time * 6);
      ctx.fillStyle = `rgba(255, 60, 60, ${pulse})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  function drawNightBanner(state) {
    if (!state.banner || state.banner.timer <= 0) return;
    const fade = Math.min(1, state.banner.timer / 0.8, (2.8 - state.banner.timer) / 0.4 + 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '800 52px Georgia, serif';
    ctx.fillText(state.banner.title, VIEW.width / 2, 300);
    ctx.fillStyle = '#fff8e2';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(state.banner.subtitle, VIEW.width / 2, 342);
    ctx.restore();
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score, top left — bigger than v1.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('SCORE', 28, 34);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText(String(state.score), 28, 74);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 28, 100);
    if (state.combo >= 2) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, 28, 134);
      // The combo meter: it visibly drains, so chaining feels urgent.
      ctx.fillStyle = 'rgba(244, 236, 216, 0.25)';
      roundRect(ctx, 28, 144, 130, 8, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      roundRect(ctx, 28, 144, 130 * (state.comboTimer / 3.5), 8, 4);
      ctx.fill();
    }
    // INCOMING: what is still hunting you, by kind — the depth on show.
    if (state.wisps.length > 0) {
      const counts = {};
      for (const wisp of state.wisps) counts[wisp.kind] = (counts[wisp.kind] || 0) + 1;
      const kinds = Object.keys(counts).sort();
      const panelH = 30 + kinds.length * 20;
      ctx.fillStyle = 'rgba(7, 10, 36, 0.62)';
      roundRect(ctx, 28, 168, 196, panelH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText(`INCOMING  ${state.wisps.length}`, 42, 190);
      ctx.font = '700 15px system-ui, sans-serif';
      kinds.forEach((kind, i) => {
        const spec = WISP_KINDS[kind] || WISP_KINDS.drifter;
        ctx.fillStyle = spec.outline || '#c9b8ff';
        ctx.beginPath();
        ctx.arc(48, 204 + i * 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.hudInk;
        ctx.fillText(`${spec.name || kind.toUpperCase()} x${counts[kind]}`, 62, 209 + i * 20);
      });
    }
    // Night, top centre, with its progress bar and the night's name.
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
    if (state.windGusting) {
      ctx.fillStyle = '#9be8ff';
      ctx.font = '800 18px system-ui, sans-serif';
      ctx.fillText(state.windX > 0 ? 'GALE!  >>>' : '<<<  GALE!', VIEW.width / 2, 86);
    }
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
    // Active effect timers, under the petals — as pills, so they read.
    ctx.font = '700 15px system-ui, sans-serif';
    let ty = 112;
    const pill = (label, color) => {
      ctx.fillStyle = 'rgba(7, 10, 36, 0.65)';
      roundRect(ctx, meterX, ty - 17, 150, 23, 11);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(label, meterX + 10, ty);
      ty += 28;
    };
    if (state.shieldTimer > 0) pill(`SHIELD ${Math.ceil(state.shieldTimer)}s`, '#7fd4ff');
    if (state.magnetTimer > 0) pill(`MAGNET ${Math.ceil(state.magnetTimer)}s`, '#ffd76a');
    if (state.freezeTimer > 0) pill(`FREEZE ${Math.ceil(state.freezeTimer)}s`, '#9be8ff');
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

  // One wisp, small, for the title screen's roster: body, bright outline,
  // big eyes — the same read as the field, at icon size.
  function drawWispIcon(x, y, r, kind) {
    const spec = WISP_KINDS[kind] || WISP_KINDS.drifter;
    ctx.save();
    ctx.translate(x, y);
    glowCircle(ctx, 0, 0, r * 2, spec.outline, 0.3);
    ctx.fillStyle = PALETTE.wispBody;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spec.outline;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    const eyeR = Math.max(2.5, r * 0.26);
    const gap = r * 0.34;
    ctx.fillStyle = spec.eye;
    ctx.beginPath();
    ctx.arc(-gap, -r * 0.16, eyeR, 0, Math.PI * 2);
    ctx.arc(gap, -r * 0.16, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The hero moth for the title screen: the same moth as the field, drawn
  // ~3x life size (wingspan ~265 px, over 20% of the frame) with a big
  // lantern glow, so the cover shows its hero at a glance.
  function drawHeroMoth(x, y, scale, time) {
    ctx.save();
    glowCircle(ctx, x, y, 230, 'rgba(255, 205, 100, 0.55)', 0.95);
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(-0.12);
    const flap = Math.sin(time * 2.4) * 0.5;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * (1 - flap * 0.45), 1);
      const wingGrad = ctx.createLinearGradient(0, -44, 0, 10);
      wingGrad.addColorStop(0, PALETTE.mothWing);
      wingGrad.addColorStop(1, PALETTE.mothWingEdge);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-22, -14, 22, 34, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-19, 20, 15, 20, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(-26, -24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-20, 26, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -27, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1f14';
    ctx.lineWidth = 2.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 5, -32);
      ctx.quadraticCurveTo(side * 15, -46, side * 20, -55);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(side * 20, -55, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(-4, -28, 2.6, 0, Math.PI * 2);
    ctx.arc(4, -28, 2.6, 0, Math.PI * 2);
    ctx.fill();
    glowCircle(ctx, 0, 34, 20, 'rgba(255, 215, 106, 0.8)', 0.9);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(0, 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9d5c';
    ctx.beginPath();
    ctx.arc(0, 34, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTitle(state, best) {
    ctx.save();
    // v3: a light dim, so the live world (motes, lanterns, flowers) shows
    // through behind the title instead of a dark wall.
    ctx.fillStyle = 'rgba(4, 6, 20, 0.28)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (best > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.fillText(`BEST  ${best}`, VIEW.width - 28, 44);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '600 24px Georgia, serif';
    ctx.fillText('A GAME OF LIGHT', VIEW.width / 2, 92);
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 92px Georgia, serif';
    ctx.fillText('LUMEN MOTH', VIEW.width / 2, 186);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText('Keep the lantern lit. Outlast the dark.', VIEW.width / 2, 228);

    // The hero, big, in front of the world: Luma with her lantern.
    // Placed high enough that her lantern's glow clears the control strip.
    drawHeroMoth(300, 385, 3.0, state.time);

    // Proof of contents: the four wisp kinds as an icon roster, then the
    // count of what the game holds — no paragraph to read.
    panel(620, 280, 600, 260);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText('THE SHADOW WISPS', 920, 316);
    const roster = ['drifter', 'hunter', 'splitter', 'dasher'];
    roster.forEach((kind, i) => {
      const spec = WISP_KINDS[kind];
      const y = 352 + i * 38;
      drawWispIcon(662, y - 6, 15, kind);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.hudInk;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(`${spec.name}  —  ${spec.verb}`, 692, y);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText('SURVIVE 5 NIGHTS  •  4 WISP KINDS  •  3 GIFTS  •  1 BOSS', 920, 508);

    // One strip of controls — the full how-to lives on the pause screen.
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('MOVE — mouse / WASD      •      GATHER — golden motes      •      FLARE — space / click', VIEW.width / 2, 566);

    // A real button, gold on navy, a quarter of the frame wide.
    const btnGrad = ctx.createLinearGradient(440, 0, 840, 0);
    btnGrad.addColorStop(0, '#ffcf4d');
    btnGrad.addColorStop(1, '#ff9d2e');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, 440, 600, 400, 66, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#241a08';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText('BEGIN THE NIGHT', VIEW.width / 2, 645);
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 64px Georgia, serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 300);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText('Press P or SPACE to keep flying', VIEW.width / 2, 352);
    // The full how-to lives here, off the cover.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('HOW TO PLAY', VIEW.width / 2, 412);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('Move with MOUSE or WASD / ARROWS', VIEW.width / 2, 452);
    ctx.fillText('Gather golden motes to feed your lantern', VIEW.width / 2, 484);
    ctx.fillText('Golden blooms pay 3x — if you dare fly close to the wisps', VIEW.width / 2, 516);
    ctx.fillText('Dodge the shadow wisps — 3 petals, then the dark wins', VIEW.width / 2, 548);
    ctx.fillText('SPACE or CLICK: flare burst (spends light, banishes wisps)', VIEW.width / 2, 580);
    ctx.fillText('Survive all 5 nights — and the Wisp King — to see the dawn', VIEW.width / 2, 612);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('DEWDROP SHIELD  •  SUNPETAL MAGNET  •  DAWN SHARD FREEZE', VIEW.width / 2, 652);
    ctx.restore();
  }

  function drawResults(state, best, won) {
    ctx.save();
    // At dawn the overlay stays thin, so the sunrise shows around the panel.
    ctx.fillStyle = won ? 'rgba(4, 6, 20, 0.28)' : 'rgba(4, 6, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(VIEW.width / 2 - 360, 118, 720, 470);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '800 68px Georgia, serif';
      ctx.fillText('DAWN BREAKS', VIEW.width / 2, 206);
      ctx.fillStyle = '#fff8e2';
      ctx.font = 'italic 25px Georgia, serif';
      ctx.fillText('Five nights survived — the lantern never went out.', VIEW.width / 2, 248);
    } else {
      ctx.fillStyle = '#c9b8ff';
      ctx.font = '800 68px Georgia, serif';
      ctx.fillText('THE DARK WINS', VIEW.width / 2, 206);
      ctx.fillStyle = '#fff8e2';
      ctx.font = 'italic 25px Georgia, serif';
      ctx.fillText('The lantern faded on night ' + state.night + ' of 5.', VIEW.width / 2, 248);
    }
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, VIEW.width / 2, 320);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 21px system-ui, sans-serif';
    const bestLine = state.score >= best && state.score > 0 ? `NEW BEST!  ${state.score}` : `BEST  ${best}`;
    ctx.fillText(bestLine, VIEW.width / 2, 358);
    ctx.fillText(
      `Motes ${state.stats.motes}   •   Blooms ${state.stats.blooms}   •   Wisps banished ${state.stats.wisps}`,
      VIEW.width / 2, 398,
    );
    ctx.fillText(
      `Flares ${state.stats.flares}   •   Nights survived ${won ? 5 : state.night - 1} of 5   •   Petals left ${state.petals}`,
      VIEW.width / 2, 432,
    );
    if (state.stats.king > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '700 21px system-ui, sans-serif';
      ctx.fillText('THE WISP KING WAS BANISHED', VIEW.width / 2, 466);
    }
    const blink = 0.8 + 0.2 * Math.sin(state.time * 3);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#fff8e2';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 532);
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
      drawSky(state, screen);
      drawMotes(state);
      drawPowerups(state);
      drawWisps(state);
      drawMoth(state);
      particles.draw(ctx);
      drawLightPool(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
      if (screen === SCREEN_PLAY) drawNightBanner(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawResults(state, best, false);
      else if (screen === SCREEN_WIN) drawResults(state, best, true);
      ctx.restore();
    },
  };
}
