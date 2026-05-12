'use client'

/**
 * StickyStory — 3-step trust section with sticky scroll crossfade.
 *
 * Converted from Design/home.jsx StickyStory().
 * Uses useScrollProgress() to drive active step (0, 1, 2).
 * Three windows: 0-0.40 → step 0, 0.40-0.65 → step 1, 0.65+ → step 2.
 * The section has height: 320vh so it occupies enough scroll distance.
 *
 * Client Component required for useScrollProgress().
 * ADR-015: strings via useTranslations('home.trust').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useScrollProgress } from '@/hooks/useScrollProgress'

const STEP_IMAGES = [
  'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1606251801-3e21d6e3a8b6?auto=format&fit=crop&w=1600&q=80',
]

const STEP_TAGS = [
  '§ TRUST · STEP 01 — INSPECTION',
  '§ TRUST · STEP 02 — ESCROW',
  '§ TRUST · STEP 03 — INSURANCE',
]

export function StickyStory(): React.ReactElement {
  const t = useTranslations('home.trust')
  const { ref, progress } = useScrollProgress()

  // Three windows of progress: 0-0.40, 0.40-0.65, 0.65-0.90
  const active = progress < 0.40 ? 0 : progress < 0.65 ? 1 : 2

  const steps = [
    {
      tag: STEP_TAGS[0],
      h1: t('step1.line1'),
      h2em: t('step1.line2em'),
      h3: t('step1.line3'),
      p: t('step1.body'),
    },
    {
      tag: STEP_TAGS[1],
      h1: t('step2.line1'),
      h2em: t('step2.line2em'),
      h3: t('step2.line3'),
      p: t('step2.body'),
    },
    {
      tag: STEP_TAGS[2],
      h1: t('step3.line1'),
      h2em: t('step3.line2em'),
      h3: '',
      p: t('step3.body'),
    },
  ]

  return (
    <section
      className="sticky-story"
      ref={ref as React.RefObject<HTMLElement>}
      data-screen-label="sticky-story"
    >
      <div className="sticky-story-track">
        <div className="sticky-story-stage">
          {/* Image stack — crossfades between steps */}
          <div className="sticky-img-stack">
            {STEP_IMAGES.map((img, i) => (
              <div
                key={i}
                className={`pane${i === active ? ' on' : ''}`}
                style={{
                  backgroundImage: `url(${img})`,
                  transform: i === active ? 'scale(1.04)' : 'scale(1)',
                }}
              />
            ))}
            {/* Gradient overlay */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(115deg, oklch(0.14 0.04 240 / 0.55), oklch(0.14 0.04 240 / 0.15))',
              }}
            />
          </div>

          {/* Text stack — each step fades in independently */}
          <div className="sticky-text-stack">
            {steps.map((s, i) => (
              <div key={i} className={`sticky-step${i === active ? ' on' : ''}`}>
                <div className="num-tag">{s.tag}</div>
                <h2>
                  {s.h1}
                  <br />
                  <em>{s.h2em}</em>
                  {s.h3.includes('\n') ? (
                    <>
                      {s.h3.split('\n')[0]}
                      <br />
                      {s.h3.split('\n')[1]}
                    </>
                  ) : (
                    s.h3
                  )}
                </h2>
                <p>{s.p}</p>
              </div>
            ))}
          </div>

          {/* Step progress dots */}
          <div className="sticky-progress">
            {steps.map((_, i) => (
              <div key={i} className={`dot${i === active ? ' on' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
