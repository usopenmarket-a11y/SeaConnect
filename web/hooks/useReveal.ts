'use client'

import { useRef, useState, useEffect } from 'react'

interface UseRevealOptions {
  threshold?: number
  rootMargin?: string
}

interface UseRevealReturn {
  ref: React.RefObject<HTMLElement>
  className: string
  visible: boolean
}

/**
 * useReveal — IntersectionObserver fade-and-rise reveal hook.
 * Converted from Design/scroll.jsx useReveal().
 * Returns ref + className: 'reveal' (hidden) → 'reveal in' (visible).
 */
export function useReveal(opts: UseRevealOptions = {}): UseRevealReturn {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        })
      },
      {
        threshold: opts.threshold ?? 0.15,
        rootMargin: opts.rootMargin ?? '0px 0px -10% 0px',
      }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [opts.threshold, opts.rootMargin])

  return { ref, className: `reveal${visible ? ' in' : ''}`, visible }
}
