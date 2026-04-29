/**
 * BoatCard — individual yacht/boat card for grid listings.
 *
 * Matches BoatCard() from Design/shared.jsx exactly.
 * Structure: .boat-card-wrap > .boat-card (Link) > .media + .body
 * Server Component — clicking handled by wrapping <a>.
 * The .open-arrow and .card-glare are CSS-hover only (no tilt in SSR).
 *
 * Accepts both API shape (name_ar, price_per_day) and mock shape (name, img, typeEn).
 */

import * as React from 'react'
import Link from 'next/link'

export interface BoatCardData {
  /** UUID from API, or mock id like 'b1' */
  id: string
  name: string
  nameEn?: string
  type?: string
  typeEn?: string
  capt?: string
  captEn?: string
  region?: string
  regionEn?: string
  coords?: string
  length?: number
  pax?: number
  capacity?: number
  year?: number
  price?: number
  price_per_day?: string
  currency?: string
  rating?: number
  reviews?: number
  img?: string
  primary_image_url?: string | null
  tag?: string
  tagEn?: string
}

interface BoatCardProps {
  boat: BoatCardData
  locale: string
}

export function BoatCard({ boat, locale }: BoatCardProps): React.ReactElement {
  const imgSrc =
    boat.img ??
    boat.primary_image_url ??
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80'

  const pax = boat.pax ?? boat.capacity ?? 0
  const priceNum =
    boat.price ?? (boat.price_per_day ? Number(boat.price_per_day) : 0)
  const currency = boat.currency ?? 'EGP'

  return (
    <div className="boat-card-wrap">
      <Link href={`/${locale}/yachts/${boat.id}`} className="boat-card">
        {/* Image area */}
        <div className="media">
          <div
            className="media-img"
            style={{ backgroundImage: `url(${imgSrc})` }}
            role="img"
            aria-label={boat.name}
          />
          {/* Glare overlay — CSS hover driven, no JS needed */}
          <div className="card-glare" aria-hidden="true" />
          {boat.tagEn && <span className="badge">{boat.tagEn}</span>}
          {boat.coords && <span className="verified">✓ {boat.coords}</span>}
          {/* Open arrow — appears on hover via CSS */}
          <div className="open-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 L17 7 M9 7 L17 7 L17 15" />
            </svg>
          </div>
        </div>

        {/* Card body */}
        <div className="body">
          <div className="meta-row">
            <span>{(boat.typeEn ?? boat.type ?? '').toUpperCase()}</span>
            <span>{(boat.regionEn ?? boat.region ?? '').toUpperCase()}</span>
          </div>
          <div className="name">{boat.name}</div>
          {boat.captEn && (
            <div className="capt">
              مع <em>{boat.captEn}</em>
            </div>
          )}
          <div className="specs">
            {boat.length != null && <span>{boat.length}FT</span>}
            {boat.length != null && pax > 0 && <span>·</span>}
            {pax > 0 && <span>{pax} PAX</span>}
            {pax > 0 && boat.year != null && <span>·</span>}
            {boat.year != null && <span>{boat.year}</span>}
          </div>
          <div className="foot">
            <div className="price">
              <span className="num">{priceNum.toLocaleString('en')}</span>
              <span className="unit"> {currency} / DAY</span>
            </div>
            {boat.rating != null && (
              <div className="rating">
                <span className="star">★</span>
                <span>{boat.rating.toFixed(2)}</span>
                {boat.reviews != null && (
                  <span style={{ opacity: 0.5 }}>({boat.reviews})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
