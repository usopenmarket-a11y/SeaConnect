'use client'

/**
 * Reveal — fade-and-rise wrapper component.
 * Converted from Design/scroll.jsx Reveal().
 * Uses useReveal() IntersectionObserver hook.
 * Accepts: as (element tag), delay (ms), className, children.
 */

import * as React from 'react'
import { useReveal } from '@/hooks/useReveal'

type ValidTag = keyof JSX.IntrinsicElements

interface RevealProps {
  as?: ValidTag
  delay?: number
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
  id?: string
}

export function Reveal({
  as = 'div',
  delay = 0,
  className = '',
  children,
  style,
  id,
}: RevealProps): React.ReactElement {
  const { ref, className: revealClass } = useReveal()
  const Tag = as as React.ElementType

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      id={id}
      className={`${revealClass}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  )
}
