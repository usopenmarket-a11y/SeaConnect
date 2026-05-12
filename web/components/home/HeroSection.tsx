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
import { useTranslations } from 'next-intl'
import { useParallax } from '@/hooks/useParallax'
import { Reveal } from '@/components/ui/Reveal'

interface HeroSectionProps {
  locale: string
  kicker: string
  line1: string
  line2em: string
  line2connector: string
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
  line2connector,
  sub,
  searchLabels,
}: HeroSectionProps): React.ReactElement {
  const tSearch = useTranslations('home.search')
  const { ref, style } = useParallax(0.35)
  const router = useRouter()
  const [passengers, setPassengers] = React.useState(2)

  const todayLabel = new Date().toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (passengers > 1) params.set('capacity_min', String(passengers))
    router.push(`/${locale}/yachts${params.size ? '?' + params.toString() : ''}`)
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
            {line2connector} <em>{line2em}</em>.
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
                <option value="hurghada">{tSearch('optHurghada')}</option>
                <option value="alex">{tSearch('optAlex')}</option>
                <option value="sharm">{tSearch('optSharm')}</option>
                <option value="luxor">{tSearch('optLuxor')}</option>
              </select>
            </div>
            <div className="field">
              <label>{searchLabels.date}</label>
              <input defaultValue={todayLabel} readOnly />
            </div>
            <div className="field">
              <label>{searchLabels.duration}</label>
              <select defaultValue="full">
                <option value="half">{tSearch('optHalf')}</option>
                <option value="full">{tSearch('optFull')}</option>
                <option value="multi">{tSearch('optMulti')}</option>
              </select>
            </div>
            <div className="field">
              <label>{searchLabels.passengers}</label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
              >
                <option value={2}>{tSearch('opt2pax')}</option>
                <option value={4}>{tSearch('opt4pax')}</option>
                <option value={6}>{tSearch('opt6pax')}</option>
                <option value={10}>{tSearch('opt10pax')}</option>
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
