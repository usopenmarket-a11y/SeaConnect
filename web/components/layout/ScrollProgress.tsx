'use client'

/**
 * ScrollProgress — clay/brass gradient bar fixed at page top.
 * Converted from Design/shared.jsx ScrollProgress().
 * Uses window scroll to compute 0..1 progress of the full page.
 */

import * as React from 'react'

export function ScrollProgress(): React.ReactElement {
  const [p, setP] = React.useState(0)

  React.useEffect(() => {
    let frame: number
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h = document.documentElement
        const scrollable = h.scrollHeight - h.clientHeight
        setP(scrollable > 0 ? h.scrollTop / scrollable : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="bar" style={{ transform: `scaleX(${p})` }} />
    </div>
  )
}
