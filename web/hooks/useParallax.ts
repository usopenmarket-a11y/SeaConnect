'use client'

import { useRef, useState, useEffect, CSSProperties } from 'react'

interface UseParallaxReturn {
  ref: React.RefObject<HTMLElement>
  style: CSSProperties
  t: number
}

/**
 * useParallax — scroll-driven CSS transform.
 * progress: -1 (entering) → 0 (centered) → 1 (leaving)
 * offset = -progress * speed * 100
 * Converted from Design/scroll.jsx useParallax().
 */
export function useParallax(speed = 0.3, axis: 'x' | 'y' = 'y'): UseParallaxReturn {
  const ref = useRef<HTMLElement>(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame: number
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        // -1 (entering) → 0 (centered) → 1 (leaving)
        const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)
        setT(progress)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const offset = -t * speed * 100
  const transform =
    axis === 'y'
      ? `translate3d(0, ${offset}px, 0)`
      : `translate3d(${offset}px, 0, 0)`

  return { ref, style: { transform, willChange: 'transform' }, t }
}
