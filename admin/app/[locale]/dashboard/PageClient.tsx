'use client'

import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import RevenueChart from '@/components/RevenueChart'
import {
  KPI_ITEMS,
  RECENT_TRANSACTIONS,
  TOP_BOATS,
  type Transaction,
  type TopBoat,
} from '@/lib/mockData'
import { adminGet } from '@/lib/api'
import type { PaginatedKYC } from '../kyc/PageClient'

/** Minimal fetcher — used as placeholder until admin analytics API exists. */
const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DashboardClientProps {
  locale: string
}

// ── Transaction status pill ──────────────────────────

function TxStatusPill({ status }: { status: Transaction['status'] }) {
  const labels: Record<Transaction['status'], string> = {
    ok: '✓ CONFIRMED',
    warn: '⚠ REVIEW',
    pending: '⏱ PENDING',
  }
  return <span className={`pill-status ${status}`}>{labels[status]}</span>
}

// ── Boat status pill ─────────────────────────────────

function BoatStatusPill({ status }: { status: TopBoat['status'] }) {
  const labels: Record<TopBoat['status'], string> = {
    live: '● LIVE',
    ok: '✓ OK',
    pending: 'PENDING',
  }
  return <span className={`pill-status ${status}`}>{labels[status]}</span>
}

// ── KPI Grid ─────────────────────────────────────────

function KpiGrid() {
  return (
    <div className="kpi-grid" role="list" aria-label="Platform KPIs">
      {KPI_ITEMS.map((item) => (
        <div key={item.labelEn} className="kpi" role="listitem">
          <div className="l">{`${item.labelEn} · ${item.labelAr}`}</div>
          <div className="v num">
            {item.value}
            {item.unit && <span className="unit">{item.unit}</span>}
          </div>
          <div className={`delta ${item.direction}`}>
            {item.direction === 'up' ? '▲' : '▼'} {item.delta}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KYC Queue Card ────────────────────────────────────

interface KycQueueCardProps {
  pendingCount: number
  locale: string
  isLoading: boolean
}

function KycQueueCard({ pendingCount, locale, isLoading }: KycQueueCardProps) {
  const countLabel = isLoading ? '—' : String(pendingCount)
  return (
    <div className="dash-card">
      <h3>تحقق KYC · قيد المراجعة</h3>
      <div className="sub">{isLoading ? 'LOADING...' : `${countLabel} PENDING · REVIEW QUEUE`}</div>

      <div
        style={{
          padding: '24px 0 8px',
          textAlign: 'center',
          fontFamily: 'var(--ff-mono)',
          fontSize: 40,
          fontWeight: 700,
          color: pendingCount > 0 ? 'var(--sea)' : 'var(--muted)',
          letterSpacing: '-0.02em',
        }}
      >
        {countLabel}
      </div>
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          marginBottom: 20,
        }}
      >
        SUBMITTED PROFILES AWAITING REVIEW
      </div>

      <a
        href={`/${locale}/kyc`}
        className="btn btn-primary"
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        عرض القائمة كاملة ({countLabel})
      </a>
    </div>
  )
}

// ── Transactions Table ────────────────────────────────

function TransactionsTable({ rows }: { rows: Transaction[] }) {
  return (
    <div className="dash-card" style={{ marginBottom: 32 }}>
      <h3>أحدث المعاملات</h3>
      <div className="sub">RECENT TRANSACTIONS · LIVE</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dash-table" aria-label="Recent transactions">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">العميل</th>
              <th scope="col">القارب</th>
              <th scope="col">المبلغ</th>
              <th scope="col">الدفع</th>
              <th scope="col">الحالة</th>
              <th scope="col">الوقت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {tx.id}
                </td>
                <td>{tx.user}</td>
                <td>{tx.boat}</td>
                <td className="num">{tx.amount.toLocaleString('en')} EGP</td>
                <td className="num">{tx.method}</td>
                <td>
                  <TxStatusPill status={tx.status} />
                </td>
                <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {tx.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Top Boats Table ───────────────────────────────────

function TopBoatsTable({ boats }: { boats: TopBoat[] }) {
  return (
    <div className="dash-card">
      <h3>أفضل القوارب أداءً</h3>
      <div className="sub">TOP PERFORMING VESSELS · LAST 30 DAYS</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dash-table" aria-label="Top performing boats">
          <thead>
            <tr>
              <th scope="col">القارب</th>
              <th scope="col">الربان</th>
              <th scope="col">المنطقة</th>
              <th scope="col">الحجوزات</th>
              <th scope="col">GTV</th>
              <th scope="col">التقييم</th>
              <th scope="col">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {boats.map((boat) => (
              <tr key={boat.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="boat-thumb"
                      style={{ backgroundImage: `url(${boat.imgUrl})` }}
                      role="img"
                      aria-label={boat.name}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--ff-display)',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {boat.name}
                    </span>
                  </div>
                </td>
                <td>{boat.captainName}</td>
                <td className="num">{boat.region}</td>
                <td className="num">{boat.bookings}</td>
                <td className="num">{boat.gtv} EGP</td>
                <td className="num">★ {boat.rating.toFixed(2)}</td>
                <td>
                  <BoatStatusPill status={boat.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Dashboard Client Component ──────────────────

/**
 * AdminDashboardClient — client component for the admin overview page.
 * Mirrors AdminDash from Design/dashboards.jsx with full TypeScript types,
 * i18n keys, and SWR health check placeholder.
 */
export default function AdminDashboardClient({ locale }: DashboardClientProps) {
  const t = useTranslations('admin.dashboard')

  // Health ping — fire-and-forget; keeps the backend connection warm.
  useSWR(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'}/health/`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: () => {
        // Non-fatal — admin works with mock data for non-KYC sections during development
      },
    },
  )

  // Read token client-side only (localStorage unavailable during SSR)
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') ?? '') : ''

  // Real KYC pending count from the Django API
  const { data: kycData, isLoading: kycLoading } = useSWR<PaginatedKYC>(
    token ? (['/admin/kyc/', token] as const) : null,
    ([path, tok]: readonly [string, string]) => adminGet<PaginatedKYC>(path, tok),
    { revalidateOnFocus: false },
  )

  const pendingCount = kycData?.results.length ?? 0

  return (
    <div className="dash-layout" dir="rtl">
      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · PLATFORM OVERVIEW · APR 2026</div>
            <h1>
              لوحة <em>الإدارة</em>
            </h1>
          </div>
          <div className="head-actions">
            <button type="button" className="btn btn-ghost">
              تصدير تقرير
            </button>
            <button type="button" className="btn btn-primary">
              إعدادات المنصة
            </button>
          </div>
        </header>

        {/* KPI cards */}
        <KpiGrid />

        {/* Revenue chart + KYC queue */}
        <div className="dash-row">
          <div className="dash-card">
            <h3>الإيرادات · آخر ١٢ شهر</h3>
            <div className="sub">REVENUE · LAST 12 MONTHS · EGP</div>
            <RevenueChart />
          </div>

          <KycQueueCard
            pendingCount={pendingCount}
            locale={locale}
            isLoading={kycLoading}
          />
        </div>

        {/* Recent transactions */}
        <TransactionsTable rows={RECENT_TRANSACTIONS} />

        {/* Top boats */}
        <TopBoatsTable boats={TOP_BOATS} />
      </div>
    </div>
  )
}
