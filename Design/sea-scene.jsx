/* global React */

// ── Scroll-driven Sea ──────────────────────────────────
// Fixed full-viewport canvas that lives BEHIND the home page content.
// Scene reacts continuously to scroll position:
//   • Sky color shifts dawn → noon → golden hour → dusk
//   • Sun arcs across, then becomes moon
//   • 4 wave layers move at different speeds (parallax)
//   • Wave amplitude grows with scroll
//   • Boats sail by at certain depths
//   • Fish/birds swim by
//   • Sea-bed reveals near the end with shells and a wreck
function SeaScene() {
  const ref = React.useRef(null);
  const stateRef = React.useRef({ scroll: 0, time: 0, w: 0, h: 0, dpr: 1 });

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;

    const resize = () => {
      st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.w = window.innerWidth;
      st.h = window.innerHeight;
      canvas.width = st.w * st.dpr;
      canvas.height = st.h * st.dpr;
      canvas.style.width = st.w + 'px';
      canvas.style.height = st.h + 'px';
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onScroll = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      st.scroll = Math.max(0, Math.min(1, window.scrollY / max));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    let raf;
    const lerp = (a, b, t) => a + (b - a) * t;
    const lerpHsl = (a, b, t) => `hsl(${lerp(a[0], b[0], t)}, ${lerp(a[1], b[1], t)}%, ${lerp(a[2], b[2], t)}%)`;

    // sky stops keyed to scroll (0 -> 1)
    // [hue, sat, lightness]
    const skyTop = [
      { at: 0,    c: [205, 60, 78] },   // morning soft blue
      { at: 0.30, c: [200, 55, 70] },   // mid morning
      { at: 0.55, c: [30,  85, 72] },   // golden hour
      { at: 0.78, c: [340, 60, 52] },   // dusk pink
      { at: 1,    c: [240, 45, 18] },   // night
    ];
    const skyBot = [
      { at: 0,    c: [195, 75, 88] },
      { at: 0.30, c: [195, 70, 82] },
      { at: 0.55, c: [25,  90, 80] },
      { at: 0.78, c: [15,  75, 60] },
      { at: 1,    c: [220, 60, 24] },
    ];
    const seaC = [
      { at: 0,    c: [200, 55, 50] },
      { at: 0.30, c: [205, 58, 42] },
      { at: 0.55, c: [205, 55, 35] },
      { at: 0.78, c: [225, 55, 25] },
      { at: 1,    c: [225, 60, 12] },
    ];

    const sample = (stops, p) => {
      for (let i = 0; i < stops.length - 1; i++) {
        if (p >= stops[i].at && p <= stops[i + 1].at) {
          const span = stops[i + 1].at - stops[i].at || 1;
          const t = (p - stops[i].at) / span;
          return [
            lerp(stops[i].c[0], stops[i + 1].c[0], t),
            lerp(stops[i].c[1], stops[i + 1].c[1], t),
            lerp(stops[i].c[2], stops[i + 1].c[2], t),
          ];
        }
      }
      return stops[stops.length - 1].c;
    };

    // pre-randomized stars and fish so they don't re-roll each frame
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      r: Math.random() * 1.2 + 0.3,
      tw: Math.random() * Math.PI * 2,
    }));
    const fishes = Array.from({ length: 8 }, (_, i) => ({
      depth: 0.55 + Math.random() * 0.35, // y as fraction of full height
      seed: i * 1.3,
      speed: 0.18 + Math.random() * 0.25,
      size: 6 + Math.random() * 8,
      hue: Math.random() < 0.5 ? 18 : 200,
    }));
    const birds = Array.from({ length: 4 }, (_, i) => ({
      depth: 0.18 + Math.random() * 0.25,
      seed: i * 1.7,
      speed: 0.12 + Math.random() * 0.1,
      size: 6 + Math.random() * 4,
    }));

    const waveLayers = [
      { amp0: 6,  amp1: 22, freq: 0.018, speed: 0.55, opacity: 0.30, hueShift: -8, yFrac: 0.55 },
      { amp0: 9,  amp1: 28, freq: 0.013, speed: 0.40, opacity: 0.50, hueShift: -4, yFrac: 0.60 },
      { amp0: 12, amp1: 36, freq: 0.009, speed: 0.30, opacity: 0.75, hueShift: 0,  yFrac: 0.66 },
      { amp0: 16, amp1: 48, freq: 0.006, speed: 0.20, opacity: 1.00, hueShift: 4,  yFrac: 0.74 },
    ];

    const draw = () => {
      st.time += 0.016;
      const W = st.w, H = st.h;
      const p = st.scroll;

      // ── SKY ──
      const top = sample(skyTop, p);
      const bot = sample(skyBot, p);
      const grad = ctx.createLinearGradient(0, 0, 0, H * 0.78);
      grad.addColorStop(0, lerpHsl(top, top, 0));
      grad.addColorStop(1, lerpHsl(bot, bot, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ── STARS (fade in after ~0.7) ──
      const starAlpha = Math.max(0, (p - 0.65) / 0.35);
      if (starAlpha > 0) {
        for (const s of stars) {
          const tw = 0.6 + 0.4 * Math.sin(st.time * 1.5 + s.tw);
          ctx.fillStyle = `rgba(255, 250, 230, ${starAlpha * tw * 0.95})`;
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H * 0.78, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── SUN / MOON ──
      const arcP = Math.min(1, p / 0.78);
      // arc across the sky
      const sx = lerp(W * 0.15, W * 0.85, arcP);
      const sy = lerp(H * 0.55, H * 0.10, Math.sin(arcP * Math.PI)) * 0.85 + H * 0.05;
      const isMoon = p > 0.78;
      const sunRadius = 38;
      const sunColor = isMoon
        ? 'rgba(245, 240, 220, 0.95)'
        : p < 0.4
          ? 'rgba(255, 240, 195, 0.95)'
          : 'rgba(255, 200, 130, 0.98)';
      const haloColor = isMoon
        ? 'rgba(220, 220, 240, 0.18)'
        : p < 0.4
          ? 'rgba(255, 240, 180, 0.28)'
          : 'rgba(255, 170, 100, 0.42)';
      // halo
      const halo = ctx.createRadialGradient(sx, sy, sunRadius * 0.6, sx, sy, sunRadius * 4);
      halo.addColorStop(0, haloColor);
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, sunRadius * 4, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(sx, sy, sunRadius, 0, Math.PI * 2);
      ctx.fill();
      if (isMoon) {
        // moon crater shadow
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.arc(sx + 12, sy - 6, 8, 0, Math.PI * 2);
        ctx.arc(sx - 8, sy + 8, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── BIRDS (early scroll only) ──
      const birdAlpha = Math.max(0, 1 - p / 0.55);
      if (birdAlpha > 0) {
        ctx.strokeStyle = `rgba(35, 40, 60, ${birdAlpha * 0.6})`;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        for (const b of birds) {
          const t = (st.time * b.speed + b.seed) % 1.4;
          const bx = (t / 1.4) * (W + 80) - 40;
          const by = b.depth * H + Math.sin(st.time * 2 + b.seed) * 6;
          const flap = Math.sin(st.time * 6 + b.seed) * b.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(bx - b.size, by + flap);
          ctx.quadraticCurveTo(bx - b.size * 0.4, by - b.size * 0.4, bx, by);
          ctx.quadraticCurveTo(bx + b.size * 0.4, by - b.size * 0.4, bx + b.size, by + flap);
          ctx.stroke();
        }
      }

      // ── BOAT silhouette (mid scroll) ──
      const boatP = Math.max(0, Math.min(1, (p - 0.18) / 0.55));
      if (boatP > 0 && boatP < 1) {
        const bx = lerp(-100, W + 100, boatP);
        const by = H * 0.56 + Math.sin(st.time * 1.2) * 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = isMoon ? 'rgba(20,30,50,0.92)' : 'rgba(40,55,80,0.9)';
        // hull
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(28, 0);
        ctx.lineTo(22, 8);
        ctx.lineTo(-26, 8);
        ctx.closePath();
        ctx.fill();
        // mast
        ctx.fillRect(-1, -34, 2, 34);
        // sail
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(0, -2);
        ctx.lineTo(20, -2);
        ctx.closePath();
        ctx.fillStyle = isMoon ? 'rgba(220,220,240,0.5)' : 'rgba(245,235,210,0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(0, -10);
        ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // second smaller distant boat
      const boat2P = Math.max(0, Math.min(1, (p - 0.05) / 0.6));
      if (boat2P > 0 && boat2P < 1) {
        const bx2 = lerp(W + 60, -60, boat2P);
        const by2 = H * 0.52;
        ctx.save();
        ctx.translate(bx2, by2);
        ctx.scale(0.55, 0.55);
        ctx.fillStyle = isMoon ? 'rgba(20,30,50,0.6)' : 'rgba(60,75,100,0.55)';
        ctx.beginPath();
        ctx.moveTo(-22, 0); ctx.lineTo(20, 0); ctx.lineTo(15, 6); ctx.lineTo(-18, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-1, -28, 2, 28);
        ctx.beginPath();
        ctx.moveTo(0, -28); ctx.lineTo(0, -2); ctx.lineTo(15, -2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── SEA HORIZON LINE ──
      const horizonY = H * 0.55;

      // ── WAVE LAYERS ──
      const seaTop = sample(seaC, p);
      const seaBotC = [seaTop[0], seaTop[1] + 4, Math.max(6, seaTop[2] - 12)];

      for (let li = 0; li < waveLayers.length; li++) {
        const L = waveLayers[li];
        const layerScroll = st.time * 30 * L.speed + p * 600 * L.speed;
        const amp = lerp(L.amp0, L.amp1, p);
        const baseY = lerp(horizonY + 6, H * L.yFrac, 1);

        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, baseY);
        for (let x = 0; x <= W; x += 4) {
          const y = baseY +
            Math.sin(x * L.freq + layerScroll * 0.02) * amp +
            Math.sin(x * L.freq * 2.3 + layerScroll * 0.03) * amp * 0.3;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();

        const wg = ctx.createLinearGradient(0, baseY, 0, H);
        const c1 = `hsla(${seaTop[0] + L.hueShift}, ${seaTop[1]}%, ${Math.max(8, seaTop[2] - li * 4)}%, ${L.opacity})`;
        const c2 = `hsla(${seaBotC[0] + L.hueShift}, ${seaBotC[1]}%, ${Math.max(4, seaBotC[2] - li * 6)}%, ${L.opacity})`;
        wg.addColorStop(0, c1);
        wg.addColorStop(1, c2);
        ctx.fillStyle = wg;
        ctx.fill();

        // shimmering highlight on top wave
        if (li === waveLayers.length - 1) {
          ctx.strokeStyle = isMoon
            ? `rgba(220, 220, 250, ${0.18 + 0.08 * Math.sin(st.time * 2)})`
            : `rgba(255, 245, 215, ${0.32 + 0.10 * Math.sin(st.time * 2)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const y = baseY +
              Math.sin(x * L.freq + layerScroll * 0.02) * amp +
              Math.sin(x * L.freq * 2.3 + layerScroll * 0.03) * amp * 0.3;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // ── FISH (deep water, only when scrolled) ──
      const fishAlpha = Math.max(0, Math.min(1, (p - 0.25) / 0.25));
      if (fishAlpha > 0) {
        for (const f of fishes) {
          const t = (st.time * f.speed + f.seed) % 1.5;
          const fx = (t / 1.5) * (W + 200) - 100;
          const fy = f.depth * H + Math.sin(st.time * 2 + f.seed) * 4;
          ctx.fillStyle = `hsla(${f.hue}, 65%, 55%, ${fishAlpha * 0.55})`;
          ctx.beginPath();
          ctx.ellipse(fx, fy, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          // tail
          ctx.beginPath();
          ctx.moveTo(fx - f.size, fy);
          ctx.lineTo(fx - f.size - f.size * 0.6, fy - f.size * 0.4);
          ctx.lineTo(fx - f.size - f.size * 0.6, fy + f.size * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }

      // ── SEA BED (reveals near end) ──
      const bedP = Math.max(0, (p - 0.72) / 0.28);
      if (bedP > 0) {
        ctx.fillStyle = `hsla(35, 25%, 22%, ${bedP * 0.85})`;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, H * 0.85);
        for (let x = 0; x <= W; x += 8) {
          const y = H * 0.85 + Math.sin(x * 0.012) * 8 + Math.sin(x * 0.04) * 3;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();

        // shells / rocks
        ctx.fillStyle = `hsla(30, 30%, 35%, ${bedP * 0.9})`;
        for (let i = 0; i < 8; i++) {
          const sx2 = (W / 8) * (i + 0.5) + Math.sin(i * 1.7) * 30;
          const sy2 = H * 0.92 + Math.sin(i * 0.7) * 6;
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, 6 + (i % 3) * 2, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="sea-scene"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

Object.assign(window, { SeaScene });
