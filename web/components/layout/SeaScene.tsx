'use client'

/**
 * SeaScene — scroll-driven animated sea canvas.
 *
 * Fixed full-viewport canvas that sits behind ALL page content (z-index: 0).
 * Sky, sun/moon arc, wave layers, birds, fish, and sea-bed all react to scroll.
 * Ported 1-to-1 from Design/sea-scene.jsx — same colour stops, same wave math.
 *
 * Mounted once in app/layout.tsx so it persists across route transitions.
 * Dashboard pages overlay it with their own opaque .dash-layout background.
 */

import * as React from 'react'

interface ColorStop { at: number; c: [number, number, number] }

const SKY_TOP: ColorStop[] = [
  { at: 0,    c: [210, 70, 88] },
  { at: 0.30, c: [205, 75, 82] },
  { at: 0.55, c: [35,  88, 80] },
  { at: 0.78, c: [18,  78, 64] },
  { at: 1,    c: [240, 50, 18] },
]
const SKY_BOT: ColorStop[] = [
  { at: 0,    c: [200, 80, 92] },
  { at: 0.30, c: [200, 80, 88] },
  { at: 0.55, c: [30,  92, 86] },
  { at: 0.78, c: [12,  85, 72] },
  { at: 1,    c: [220, 65, 26] },
]
const SEA_C: ColorStop[] = [
  { at: 0,    c: [205, 60, 56] },
  { at: 0.30, c: [208, 62, 46] },
  { at: 0.55, c: [210, 60, 38] },
  { at: 0.78, c: [222, 60, 26] },
  { at: 1,    c: [228, 65, 14] },
]

const WAVE_LAYERS = [
  { amp0: 6,  amp1: 22, freq: 0.018, speed: 0.55, opacity: 0.30, hueShift: -8, yFrac: 0.55 },
  { amp0: 9,  amp1: 28, freq: 0.013, speed: 0.40, opacity: 0.50, hueShift: -4, yFrac: 0.60 },
  { amp0: 12, amp1: 36, freq: 0.009, speed: 0.30, opacity: 0.75, hueShift: 0,  yFrac: 0.66 },
  { amp0: 16, amp1: 48, freq: 0.006, speed: 0.20, opacity: 1.00, hueShift: 4,  yFrac: 0.74 },
]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function sample(stops: ColorStop[], p: number): [number, number, number] {
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].at && p <= stops[i + 1].at) {
      const span = stops[i + 1].at - stops[i].at || 1
      const t = (p - stops[i].at) / span
      return [
        lerp(stops[i].c[0], stops[i + 1].c[0], t),
        lerp(stops[i].c[1], stops[i + 1].c[1], t),
        lerp(stops[i].c[2], stops[i + 1].c[2], t),
      ]
    }
  }
  return stops[stops.length - 1].c
}

function hsl([h, s, l]: [number, number, number], a = 1) {
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`
}

export function SeaScene(): React.ReactElement {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // mutable state — kept in a ref-like object so the RAF closure always sees fresh values
    const st = { scroll: 0, time: 0, w: 0, h: 0, dpr: 1 }

    const resize = () => {
      st.dpr = Math.min(window.devicePixelRatio || 1, 2)
      st.w = window.innerWidth
      st.h = window.innerHeight
      canvas.width = st.w * st.dpr
      canvas.height = st.h * st.dpr
      canvas.style.width = st.w + 'px'
      canvas.style.height = st.h + 'px'
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const onScroll = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1
      st.scroll = Math.max(0, Math.min(1, window.scrollY / max))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    // pre-randomised so they don't re-roll each frame
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random() * 0.55,
      r: Math.random() * 1.2 + 0.3, tw: Math.random() * Math.PI * 2,
    }))
    const fishes = Array.from({ length: 8 }, (_, i) => ({
      depth: 0.55 + Math.random() * 0.35, seed: i * 1.3,
      speed: 0.18 + Math.random() * 0.25, size: 6 + Math.random() * 8,
      hue: Math.random() < 0.5 ? 18 : 200,
    }))
    const birds = Array.from({ length: 4 }, (_, i) => ({
      depth: 0.18 + Math.random() * 0.25, seed: i * 1.7,
      speed: 0.12 + Math.random() * 0.1, size: 6 + Math.random() * 4,
    }))

    let raf: number

    const draw = () => {
      st.time += 0.016
      const { w: W, h: H, scroll: p } = st

      // SKY
      const top = sample(SKY_TOP, p)
      const bot = sample(SKY_BOT, p)
      const grad = ctx.createLinearGradient(0, 0, 0, H * 0.78)
      grad.addColorStop(0, hsl(top))
      grad.addColorStop(1, hsl(bot))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // STARS
      const starAlpha = Math.max(0, (p - 0.65) / 0.35)
      if (starAlpha > 0) {
        for (const s of stars) {
          const tw = 0.6 + 0.4 * Math.sin(st.time * 1.5 + s.tw)
          ctx.fillStyle = `rgba(255,250,230,${starAlpha * tw * 0.95})`
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H * 0.78, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // SUN / MOON
      const arcP = Math.min(1, p / 0.78)
      const sx = lerp(W * 0.15, W * 0.85, arcP)
      const sy = lerp(H * 0.55, H * 0.10, Math.sin(arcP * Math.PI)) * 0.85 + H * 0.05
      const isMoon = p > 0.78
      const sunRadius = 38
      const sunColor  = isMoon ? 'rgba(245,240,220,0.95)' : p < 0.4 ? 'rgba(255,240,195,0.95)' : 'rgba(255,200,130,0.98)'
      const haloColor = isMoon ? 'rgba(220,220,240,0.18)' : p < 0.4 ? 'rgba(255,240,180,0.28)' : 'rgba(255,170,100,0.42)'
      const halo = ctx.createRadialGradient(sx, sy, sunRadius * 0.6, sx, sy, sunRadius * 4)
      halo.addColorStop(0, haloColor)
      halo.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(sx, sy, sunRadius * 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = sunColor
      ctx.beginPath(); ctx.arc(sx, sy, sunRadius, 0, Math.PI * 2); ctx.fill()
      if (isMoon) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)'
        ctx.beginPath()
        ctx.arc(sx + 12, sy - 6, 8, 0, Math.PI * 2)
        ctx.arc(sx - 8, sy + 8, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // BIRDS (early scroll only)
      const birdAlpha = Math.max(0, 1 - p / 0.55)
      if (birdAlpha > 0) {
        ctx.strokeStyle = `rgba(35,40,60,${birdAlpha * 0.6})`
        ctx.lineWidth = 1.4; ctx.lineCap = 'round'
        for (const b of birds) {
          const t = (st.time * b.speed + b.seed) % 1.4
          const bx = (t / 1.4) * (W + 80) - 40
          const by = b.depth * H + Math.sin(st.time * 2 + b.seed) * 6
          const flap = Math.sin(st.time * 6 + b.seed) * b.size * 0.6
          ctx.beginPath()
          ctx.moveTo(bx - b.size, by + flap)
          ctx.quadraticCurveTo(bx - b.size * 0.4, by - b.size * 0.4, bx, by)
          ctx.quadraticCurveTo(bx + b.size * 0.4, by - b.size * 0.4, bx + b.size, by + flap)
          ctx.stroke()
        }
      }

      // BOAT silhouette (mid scroll)
      const boatP = Math.max(0, Math.min(1, (p - 0.18) / 0.55))
      if (boatP > 0 && boatP < 1) {
        const bx = lerp(-100, W + 100, boatP)
        const by = H * 0.56 + Math.sin(st.time * 1.2) * 4
        ctx.save(); ctx.translate(bx, by)
        ctx.fillStyle = isMoon ? 'rgba(20,30,50,0.92)' : 'rgba(40,55,80,0.9)'
        ctx.beginPath()
        ctx.moveTo(-30, 0); ctx.lineTo(28, 0); ctx.lineTo(22, 8); ctx.lineTo(-26, 8)
        ctx.closePath(); ctx.fill()
        ctx.fillRect(-1, -34, 2, 34)
        ctx.beginPath()
        ctx.moveTo(0, -34); ctx.lineTo(0, -2); ctx.lineTo(20, -2)
        ctx.closePath()
        ctx.fillStyle = isMoon ? 'rgba(220,220,240,0.5)' : 'rgba(245,235,210,0.85)'
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(0, -34); ctx.lineTo(0, -10); ctx.lineTo(-12, -10)
        ctx.closePath(); ctx.fill()
        ctx.restore()
      }

      // second smaller distant boat
      const boat2P = Math.max(0, Math.min(1, (p - 0.05) / 0.6))
      if (boat2P > 0 && boat2P < 1) {
        const bx2 = lerp(W + 60, -60, boat2P)
        const by2 = H * 0.52
        ctx.save(); ctx.translate(bx2, by2); ctx.scale(0.55, 0.55)
        ctx.fillStyle = isMoon ? 'rgba(20,30,50,0.6)' : 'rgba(60,75,100,0.55)'
        ctx.beginPath()
        ctx.moveTo(-22, 0); ctx.lineTo(20, 0); ctx.lineTo(15, 6); ctx.lineTo(-18, 6)
        ctx.closePath(); ctx.fill()
        ctx.fillRect(-1, -28, 2, 28)
        ctx.beginPath()
        ctx.moveTo(0, -28); ctx.lineTo(0, -2); ctx.lineTo(15, -2)
        ctx.closePath(); ctx.fill()
        ctx.restore()
      }

      // WAVE LAYERS
      const horizonY = H * 0.55
      const seaTop = sample(SEA_C, p)
      const seaBotC: [number, number, number] = [seaTop[0], seaTop[1] + 4, Math.max(6, seaTop[2] - 12)]

      for (let li = 0; li < WAVE_LAYERS.length; li++) {
        const L = WAVE_LAYERS[li]
        const layerScroll = st.time * 30 * L.speed + p * 600 * L.speed
        const amp = lerp(L.amp0, L.amp1, p)
        const baseY = lerp(horizonY + 6, H * L.yFrac, 1)

        ctx.beginPath()
        ctx.moveTo(0, H); ctx.lineTo(0, baseY)
        for (let x = 0; x <= W; x += 4) {
          const y = baseY
            + Math.sin(x * L.freq + layerScroll * 0.02) * amp
            + Math.sin(x * L.freq * 2.3 + layerScroll * 0.03) * amp * 0.3
          ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H); ctx.closePath()

        const wg = ctx.createLinearGradient(0, baseY, 0, H)
        wg.addColorStop(0, `hsla(${seaTop[0] + L.hueShift}, ${seaTop[1]}%, ${Math.max(8, seaTop[2] - li * 4)}%, ${L.opacity})`)
        wg.addColorStop(1, `hsla(${seaBotC[0] + L.hueShift}, ${seaBotC[1]}%, ${Math.max(4, seaBotC[2] - li * 6)}%, ${L.opacity})`)
        ctx.fillStyle = wg; ctx.fill()

        if (li === WAVE_LAYERS.length - 1) {
          ctx.strokeStyle = isMoon
            ? `rgba(220,220,250,${0.18 + 0.08 * Math.sin(st.time * 2)})`
            : `rgba(255,245,215,${0.32 + 0.10 * Math.sin(st.time * 2)})`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          for (let x = 0; x <= W; x += 4) {
            const y = baseY
              + Math.sin(x * L.freq + layerScroll * 0.02) * amp
              + Math.sin(x * L.freq * 2.3 + layerScroll * 0.03) * amp * 0.3
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      }

      // FISH (deep water)
      const fishAlpha = Math.max(0, Math.min(1, (p - 0.25) / 0.25))
      if (fishAlpha > 0) {
        for (const f of fishes) {
          const t = (st.time * f.speed + f.seed) % 1.5
          const fx = (t / 1.5) * (W + 200) - 100
          const fy = f.depth * H + Math.sin(st.time * 2 + f.seed) * 4
          ctx.fillStyle = `hsla(${f.hue}, 65%, 55%, ${fishAlpha * 0.55})`
          ctx.beginPath()
          ctx.ellipse(fx, fy, f.size, f.size * 0.45, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(fx - f.size, fy)
          ctx.lineTo(fx - f.size - f.size * 0.6, fy - f.size * 0.4)
          ctx.lineTo(fx - f.size - f.size * 0.6, fy + f.size * 0.4)
          ctx.closePath(); ctx.fill()
        }
      }

      // SEA BED (reveals near end)
      const bedP = Math.max(0, (p - 0.72) / 0.28)
      if (bedP > 0) {
        ctx.fillStyle = `hsla(35, 25%, 22%, ${bedP * 0.85})`
        ctx.beginPath()
        ctx.moveTo(0, H); ctx.lineTo(0, H * 0.85)
        for (let x = 0; x <= W; x += 8) {
          const y = H * 0.85 + Math.sin(x * 0.012) * 8 + Math.sin(x * 0.04) * 3
          ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill()

        ctx.fillStyle = `hsla(30, 30%, 35%, ${bedP * 0.9})`
        for (let i = 0; i < 8; i++) {
          const sx2 = (W / 8) * (i + 0.5) + Math.sin(i * 1.7) * 30
          const sy2 = H * 0.92 + Math.sin(i * 0.7) * 6
          ctx.beginPath()
          ctx.ellipse(sx2, sy2, 6 + (i % 3) * 2, 3, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
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
  )
}
