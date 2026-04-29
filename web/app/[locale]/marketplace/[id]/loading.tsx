/**
 * Marketplace product detail loading skeleton — shown by Next.js during SSR streaming.
 *
 * Mirrors the detail-body layout: hero image block + detail-left + booking-panel.
 */

import * as React from 'react'

export default function MarketplaceProductLoading(): React.ReactElement {
  return (
    <>
      {/* Hero image skeleton */}
      <div
        style={{
          aspectRatio: '16/7',
          background: 'var(--sand)',
          borderBottom: '2px solid var(--rule)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />

      {/* Body skeleton */}
      <div className="detail-body">
        {/* Left column */}
        <div className="detail-left" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Breadcrumbs */}
          <div
            style={{
              height: 12,
              width: 240,
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {/* Title */}
          <div
            style={{
              height: 48,
              width: '70%',
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 40,
                  width: 80,
                  background: 'var(--sand)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
          {/* Price */}
          <div
            style={{
              height: 40,
              width: 160,
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {/* Button */}
          <div
            style={{
              height: 48,
              width: 240,
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Right panel */}
        <div
          className="booking-panel"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div
            style={{
              height: 36,
              width: '60%',
              background: 'var(--sand)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 48,
                width: '100%',
                background: 'var(--sand)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
