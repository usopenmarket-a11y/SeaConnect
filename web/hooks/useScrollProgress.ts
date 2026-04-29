'use client'

import { useRef, useState, useEffect } from 'react'

interface UseScrollProgressReturn {
  ref: React.RefObject<HTMLElement>
  progress: number
}

/**
 * useScrollProgress — 0..1 progress of element through viewport.
 * 0 = top of element entering viewport bottom.
 * 1 = bottom of element leaving viewport top.
 * Converted from Design/scroll.jsx useScrollProgress().
 */
export function useScrollProgress(): UseScrollProgressReturn {
  const ref = useRef<HTMLElement>(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame: number
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const total = r.height + vh
        const passed = vh - r.top
        const np = Math.max(0, Math.min(1, passed / total))
        setP(np)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return { ref, progress: p }
}
