/**
 * Checkout page loading skeleton.
 */

import * as React from 'react'

export default function CheckoutLoading(): React.ReactElement {
  return (
    <div
      style={{
        maxWidth: 840,
        margin: '40px auto',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 32,
      }}
    >
      {/* Form skeleton */}
      <div>
        <div
          style={{
            height: 36,
            width: 200,
            background: 'var(--sand)',
            marginBottom: 32,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 14,
            width: 140,
            background: 'var(--sand)',
            marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            height: 100,
            background: 'var(--sand)',
            marginBottom: 24,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 48,
            background: 'var(--sand)',
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
      </div>

      {/* Summary sidebar skeleton */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: 20,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              background: 'var(--pearl)',
              marginBottom: 12,
              animation: 'pulse 1.5s ease-in-out infinite',
              borderRadius: 3,
            }}
          />
        ))}
        <div
          style={{
            height: 24,
            background: 'var(--pearl)',
            marginTop: 20,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}
