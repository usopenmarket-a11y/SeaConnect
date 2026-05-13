/**
 * Cart page loading skeleton — shown during initial client-side navigation.
 *
 * Mirrors the cart table layout so there is minimal layout shift when
 * the cart data loads via SWR.
 */

import * as React from 'react'

export default function CartLoading(): React.ReactElement {
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '40px auto',
        padding: '40px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 32,
        alignItems: 'start',
      }}
    >
      {/* Table skeleton */}
      <div>
        {/* Title */}
        <div
          style={{
            height: 36,
            width: 200,
            background: 'var(--sand)',
            marginBottom: 24,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
        {/* Table header */}
        <div
          style={{
            height: 40,
            background: 'var(--pearl)',
            border: '1px solid var(--rule)',
            marginBottom: 2,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: '4px 4px 0 0',
          }}
        />
        {/* Table rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 88,
              background: 'var(--sand)',
              borderInline: '1px solid var(--rule)',
              borderBottom: '1px solid var(--rule)',
              marginBottom: 0,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>

      {/* Summary sidebar skeleton */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: 24,
        }}
      >
        <div
          style={{
            height: 20,
            width: '60%',
            background: 'var(--pearl)',
            marginBottom: 20,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            height: 32,
            background: 'var(--pearl)',
            marginBottom: 24,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            height: 48,
            background: 'var(--pearl)',
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  )
}
