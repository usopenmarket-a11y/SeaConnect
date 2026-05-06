'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import type { Competition } from '@/app/[locale]/competitions/page'

interface Props {
  competitions: Competition[]
}

function formatDate(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  return {
    day: String(d.getDate()),
    month: months[d.getMonth()] ?? '',
  }
}

function formatPrize(amount: string): string {
  const n = Number(amount)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en')
}

export function CompetitionsPage({ competitions }: Props): React.ReactElement {
  const t = useTranslations('competitions')

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
          § TOURNAMENTS · FISHING CALENDAR 2026
        </div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}>
          {t('title')} <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>والأحداث</em>.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: '52ch', marginTop: 14 }}>
          {t('subtitle')}
        </p>
      </div>

      {/* Competition list */}
      <div className="section" style={{ background: 'var(--foam)' }}>
        {competitions.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted-2)' }}>
            <div className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('empty')}</div>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.1em' }}>{t('emptyHint')}</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rule)' }}>
            {competitions.map((c) => {
              const { day, month } = formatDate(c.start_date)
              return (
                <div key={c.id} className="comp-row">
                  <div className="date">
                    <div className="d num">{day}</div>
                    <div className="m">{month} 2026</div>
                  </div>
                  <div className="title">
                    <div className="t">{c.title}</div>
                    <div className="sub">{c.title_en} · {c.region_name.toUpperCase()}</div>
                  </div>
                  <div className="meta">
                    <span className="n num">{c.entry_count}</span>
                    <span className="l">{t('participants')}</span>
                  </div>
                  <div className="meta">
                    <span className="n num">{formatPrize(c.prize_pool)}</span>
                    <span className="l">{t('prizes')}</span>
                  </div>
                  <button className="cta">
                    {t('register')} · {Number(c.entry_fee).toLocaleString('en')} EGP
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
