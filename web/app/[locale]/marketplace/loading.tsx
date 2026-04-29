/**
 * Marketplace listing loading skeleton — shown by Next.js during SSR streaming.
 *
 * Mirrors the gear-grid layout so the layout shift when content loads is minimal.
 * 8 placeholder gear-card divs with a pulsing sand-colored block.
 */

import * as React from 'react'

export default function MarketplaceLoading(): React.ReactElement {
  return (
    <>
      {/* Header skeleton */}
      <div
        style={{
          padding: '40px 48px 24px',
          borderBottom: '2px solid var(--rule)',
        }}
      >
        <div
          style={{
            height: 12,
            width: 200,
            background: 'var(--sand)',
            marginBottom: 16,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: 72,
            width: '60%',
            background: 'var(--sand)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Pill tabs skeleton */}
      <div
        className="pill-tabs"
        style={{ display: 'flex', gap: 6, padding: '12px 48px' }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 32,
              width: 80 + i * 10,
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      {/* Gear grid skeleton */}
      <div className="section">
        <div className="gear-grid" aria-busy="true" aria-label="جارٍ تحميل المنتجات">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gear-card">
              {/* Image placeholder */}
              <div
                className="img"
                style={{
                  background: 'var(--sand)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              {/* Brand line */}
              <div
                style={{
                  height: 10,
                  width: '50%',
                  background: 'var(--sand)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              {/* Title line */}
              <div
                style={{
                  height: 14,
                  width: '80%',
                  background: 'var(--sand)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              {/* Price line */}
              <div
                style={{
                  height: 20,
                  width: '40%',
                  background: 'var(--sand)',
                  marginTop: 'auto',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
