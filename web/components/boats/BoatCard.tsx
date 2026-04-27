import * as React from 'react'

/**
 * BoatCard — individual yacht/boat card for grid listings.
 *
 * Matches BoatCard() from Design/shared.jsx exactly.
 * Server Component (no client interactivity — clicking is handled by wrapping
 * anchor). The card itself is an <a> tag via next/link so it works in Server
 * Component context and is keyboard accessible.
 *
 * Props accept either the mock-data shape (from Design/data.jsx) or the API
 * shape so the component can be used in both fallback and live modes.
 */

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
  // Normalise fields: API uses snake_case, mock data uses camelCase
  const imgSrc =
    boat.img ??
    boat.primary_image_url ??
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80'

  const pax = boat.pax ?? boat.capacity ?? 0
  const priceNum =
    boat.price ?? (boat.price_per_day ? Number(boat.price_per_day) : 0)
  const currency = boat.currency ?? 'EGP'

  return (
    <Link href={`/${locale}/yachts/${boat.id}`} className="boat-card">
      {/* Image */}
      <div className="media">
        <div
          className="media-img"
          style={{ backgroundImage: `url(${imgSrc})` }}
          role="img"
          aria-label={boat.name}
        />
        {boat.tagEn && <span className="badge">{boat.tagEn}</span>}
        {boat.coords && <span className="verified">✓ {boat.coords}</span>}
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
          {boat.length && <span>{boat.length}FT</span>}
          {boat.length && pax > 0 && <span>·</span>}
          {pax > 0 && <span>{pax} PAX</span>}
          {pax > 0 && boat.year && <span>·</span>}
          {boat.year && <span>{boat.year}</span>}
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
  )
}
