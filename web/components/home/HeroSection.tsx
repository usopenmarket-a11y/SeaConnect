'use client'

/**
 * HeroSection — hero with parallax background and search bar.
 *
 * Converted from Design/home.jsx Hero().
 * Uses useParallax(0.35) for background image scroll effect.
 * Uses Reveal components for staggered content entrance.
 * Client Component required for useParallax hook.
 *
 * The search bar navigates to the yachts listing on submit.
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParallax } from '@/hooks/useParallax'
import { Reveal } from '@/components/ui/Reveal'

interface HeroSectionProps {
  locale: string
  kicker: string
  line1: string
  line2em: string
  sub: string
  searchLabels: {
    destination: string
    date: string
    duration: string
    passengers: string
    btn: string
  }
}

export function HeroSection({
  locale,
  kicker,
  line1,
  line2em,
  sub,
  searchLabels,
}: HeroSectionProps): React.ReactElement {
  const { ref, style } = useParallax(0.35)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/${locale}/yachts`)
  }

  return (
    <div className="hero" data-screen-label="hero">
      {/* Parallax background image */}
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="hero-img-parallax"
        style={{
          ...style,
          backgroundImage:
            'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80)',
        }}
      />
      <div className="hero-overlay" />

      <div className="hero-content">
        {/* Kicker */}
        <Reveal>
          <div className="hero-kicker">
            <span className="dot" />
            <span>ISSUE 01 · SPRING 2026</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{kicker}</span>
          </div>
        </Reveal>

        {/* Title */}
        <Reveal delay={120}>
          <h1 className="hero-title">
            {line1}
            <br />
            مما <em>{line2em}</em>.
          </h1>
        </Reveal>

        {/* Subtitle */}
        <Reveal delay={240}>
          <p className="hero-sub">{sub}</p>
        </Reveal>

        {/* Search bar */}
        <Reveal delay={360}>
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="field">
              <label>{searchLabels.destination}</label>
              <select defaultValue="hurghada">
                <option value="hurghada">الغردقة · البحر الأحمر</option>
                <option value="alex">الإسكندرية · المتوسط</option>
                <option value="sharm">شرم الشيخ</option>
                <option value="luxor">الأقصر · النيل</option>
              </select>
            </div>
            <div className="field">
              <label>{searchLabels.date}</label>
              <input defaultValue="12 مايو 2026" readOnly />
            </div>
            <div className="field">
              <label>{searchLabels.duration}</label>
              <select defaultValue="full">
                <option value="half">نصف يوم · 6 س</option>
                <option value="full">يوم كامل · 10 س</option>
                <option value="multi">أيام متعددة</option>
              </select>
            </div>
            <div className="field">
              <label>{searchLabels.passengers}</label>
              <select defaultValue="6">
                <option>2 أشخاص</option>
                <option>4 أشخاص</option>
                <option>6 أشخاص</option>
                <option>10 أشخاص</option>
              </select>
            </div>
            <button type="submit" className="search-btn cta-shimmer">
              {searchLabels.btn} ←
            </button>
          </form>
        </Reveal>
      </div>
    </div>
  )
}
