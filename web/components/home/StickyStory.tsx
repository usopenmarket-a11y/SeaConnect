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
 */

import * as React from 'react'
import { useScrollProgress } from '@/hooks/useScrollProgress'

const STEPS = [
  {
    img: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80',
    tag: '§ TRUST · STEP 01 — INSPECTION',
    h1: 'كل قارب،',
    h2em: 'مُعاين',
    h3: ' شخصياً.',
    p: 'فريقنا يصعد على متن كل سفينة قبل اعتمادها. نتحقق من رخصة خفر السواحل، ومعدات السلامة، وحالة المحرك، وعدد سترات النجاة. لا نوافق على أي قارب لا يستوفي ٢٧ نقطة فحص.',
  },
  {
    img: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=1600&q=80',
    tag: '§ TRUST · STEP 02 — ESCROW',
    h1: 'دفعك في ',
    h2em: 'ضمان',
    h3: '،\nحتى الإبحار.',
    p: 'مدفوعاتك محفوظة في حساب ضمان موثوق. لا تذهب للربان إلا بعد ٢٤ ساعة من انتهاء الرحلة. إذا حدث أي خلل — إلغاء، أعطال، عدم مطابقة — تُعاد أموالك كاملة دون سؤال.',
  },
  {
    img: 'https://images.unsplash.com/photo-1606251801-3e21d6e3a8b6?auto=format&fit=crop&w=1600&q=80',
    tag: '§ TRUST · STEP 03 — INSURANCE',
    h1: 'تأمين شامل',
    h2em: 'على كل رحلة',
    h3: '.',
    p: 'كل حجز يأتي معه تأمين سفر بقيمة تصل إلى ١٠٠,٠٠٠ EGP لكل مسافر. إصابات، فقدان معدات، أو تأخير في العودة — كل ذلك مغطى. لأن الثقة لا تكفي وحدها.',
  },
]

export function StickyStory(): React.ReactElement {
  const { ref, progress } = useScrollProgress()

  // Three windows of progress: 0-0.40, 0.40-0.65, 0.65-0.90
  const active = progress < 0.40 ? 0 : progress < 0.65 ? 1 : 2

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
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`pane${i === active ? ' on' : ''}`}
                style={{
                  backgroundImage: `url(${s.img})`,
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
            {STEPS.map((s, i) => (
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
            {STEPS.map((_, i) => (
              <div key={i} className={`dot${i === active ? ' on' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
