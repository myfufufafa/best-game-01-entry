// Sparks, rings and floating score text. The world spawns them; this module owns
// their motion and their drawing, and nothing else. Particles never affect the
// rules — they are feedback, and the game reads exactly the same without them.
// They draw from the same seeded generator as the world, so a seeded run
// (a screenshot scene, a replay) looks the same every time.
export function createParticles(random) {
  const sparks = [];
  const rings = [];
  const texts = [];

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.next() * Math.PI * 2;
      const vel = speed * (0.3 + random.next() * 0.7);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: 0.55 + random.next() * 0.35,
        age: 0,
        size: 1.5 + random.next() * 2.5,
        color,
      });
    }
  }

  return {
    burst,
    ring(x, y, color, maxRadius) {
      rings.push({ x, y, color, maxRadius, age: 0, life: 0.6 });
    },
    text(x, y, message, color) {
      texts.push({ x, y, message, color, age: 0, life: 1.1 });
    },
    clear() {
      sparks.length = 0;
      rings.length = 0;
      texts.length = 0;
    },
    count() {
      return sparks.length + rings.length + texts.length;
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const p = sparks[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.age >= p.life) sparks.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        rings[i].age += dt;
        if (rings[i].age >= rings[i].life) rings.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.age += dt;
        t.y -= 34 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of sparks) {
        const fade = 1 - p.age / p.life;
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of rings) {
        const progress = r.age / r.life;
        ctx.globalAlpha = (1 - progress) * 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 4 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.maxRadius * progress + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 22px system-ui, sans-serif';
      for (const t of texts) {
        ctx.globalAlpha = 1 - t.age / t.life;
        ctx.fillStyle = t.color;
        ctx.fillText(t.message, t.x, t.y);
      }
      ctx.restore();
    },
  };
}
