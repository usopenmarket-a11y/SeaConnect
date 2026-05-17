'use client'

import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import RevenueChart, { type RevenueDataPoint } from '@/components/RevenueChart'
import {
  TOP_BOATS,
  type TopBoat,
} from '@/lib/mockData'
import { adminGet, type PaginatedResponse } from '@/lib/api'
import type { PaginatedKYC } from '../kyc/PageClient'

/** Minimal fetcher — used as placeholder until admin analytics API exists. */
const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Admin stats shape (GET /api/v1/analytics/stats/) ─────────────────────────

interface AdminStats {
  gtv_total: string
  gtv_currency: string
  revenue_total: string
  bookings_total: number
  active_yachts: number
  active_vendors: number
  mom_gtv_delta: number
}

// ── Payout record shape (GET /api/v1/payments/payouts/) ──────────────────────

interface PayoutRecord {
  id: string
  owner: string
  amount: string
  currency: string
  status: string
  payment_method: string
  created_at: string
}

// ── Transaction row shape (GET /api/v1/analytics/audit-log/?event_type=payment_received) ──

interface TransactionRow {
  id: string
  actor_email: string | null
  reference_id: string
  amount: string
  currency: string
  event_type: string
  created_at: string
}

// ── GTV formatter ─────────────────────────────────────────────────────────────

function formatGTV(val: string): string {
  const n = parseFloat(val)
  if (Number.isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  return (n / 1_000).toFixed(0) + 'K'
}

// ── MoM delta formatter — converts 0.22 → "+22%" ─────────────────────────────

function formatMomDelta(delta: number): string {
  if (!Number.isFinite(delta)) return '—'
  const pct = Math.round(delta * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

// ── Derive month labels from ISO date string (e.g. "2026-05-10T..." → "MAY") ─

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const

function isoToMonthLabel(isoDate: string): string {
  const monthIndex = new Date(isoDate).getUTCMonth()
  return MONTH_ABBR[monthIndex] ?? 'UNK'
}

// ── Group payout results into per-month revenue data ─────────────────────────

function buildRevenueData(payouts: PayoutRecord[]): RevenueDataPoint[] {
  const totals: Map<string, number> = new Map()
  for (const p of payouts) {
    const month = isoToMonthLabel(p.created_at)
    totals.set(month, (totals.get(month) ?? 0) + parseFloat(p.amount))
  }
  // Return in insertion order (payouts are ordered by created_at desc; we want asc for chart)
  const entries = Array.from(totals.entries()).reverse()
  return entries.map(([month, value]) => ({ month, value }))
}

// ── Relative time formatter ───────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} MIN AGO`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} HR AGO`
  return `${Math.floor(hrs / 24)} DAYS AGO`
}

interface DashboardClientProps {
  locale: string
}

// ── Transaction status pill (audit-log payment entries are always successful) ──

function TxStatusPill() {
  return <span className="pill-status ok">&#10003; OK</span>
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

interface KpiGridProps {
  /** Total registered users from /admin/users/ */
  usersCount: number | '—'
  /** Total active yachts from /yachts/ */
  yachtsCount: number | '—'
  /** KYC profiles currently pending review from /admin/kyc/ */
  kycPendingCount: number | '—'
  /** Formatted GTV string (e.g. "2.84M") from /analytics/stats/ */
  gtvValue: string
  /** Currency code for GTV display (e.g. "EGP") from /analytics/stats/ */
  gtvCurrency: string
  /** Total bookings count from /analytics/stats/ */
  bookingsTotal: number | '—'
  /** Formatted revenue string from /analytics/stats/ revenue_total */
  revenueValue: string
  /** Formatted MoM GTV delta (e.g. "+22%") from /analytics/stats/ mom_gtv_delta */
  momDelta: string
  /** Active vendor count from /analytics/stats/ active_vendors */
  activeVendors: number | '—'
}

interface KpiItemDef {
  labelEn: string
  labelAr: string
  value: number | string
  unit: string
}

function KpiGrid({
  usersCount,
  yachtsCount,
  kycPendingCount,
  gtvValue,
  gtvCurrency,
  bookingsTotal,
  revenueValue,
  momDelta,
  activeVendors,
}: KpiGridProps) {
  const items: KpiItemDef[] = [
    {
      labelEn: 'USERS',
      labelAr: 'المستخدمون',
      value: usersCount,
      unit: '',
    },
    {
      labelEn: 'YACHTS',
      labelAr: 'القوارب',
      value: yachtsCount,
      unit: '',
    },
    {
      labelEn: 'KYC PENDING',
      labelAr: 'KYC معلّق',
      value: kycPendingCount,
      unit: '',
    },
    {
      labelEn: 'BOOKINGS',
      labelAr: 'الحجوزات',
      value: bookingsTotal,
      unit: '',
    },
    {
      labelEn: 'GTV · TOTAL VALUE',
      labelAr: 'القيمة الإجمالية',
      value: gtvValue,
      unit: gtvCurrency,
    },
    {
      labelEn: 'REVENUE',
      labelAr: 'الإيرادات',
      value: revenueValue,
      unit: gtvCurrency,
    },
    {
      // Take rate = revenue / GTV = always 12% in the Egypt-first phase.
      labelEn: 'TAKE RATE',
      labelAr: 'نسبة الأخذ',
      value: '12',
      unit: '%',
    },
    {
      labelEn: 'MoM GTV DELTA',
      labelAr: 'نمو الشهر',
      value: momDelta,
      unit: '',
    },
    {
      labelEn: 'ACTIVE VENDORS',
      labelAr: 'البائعون النشطون',
      value: activeVendors,
      unit: '',
    },
  ]

  return (
    <div className="kpi-grid" role="list" aria-label="Platform KPIs">
      {items.map((item) => (
        <div key={item.labelEn} className="kpi" role="listitem">
          <div className="l">{`${item.labelEn} · ${item.labelAr}`}</div>
          <div className="v num">
            {item.value}
            {item.unit && <span className="unit"> {item.unit}</span>}
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

function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
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
              <th scope="col">المبلغ</th>
              <th scope="col">الحالة</th>
              <th scope="col">الوقت</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}
                >
                  لا توجد معاملات بعد
                </td>
              </tr>
            ) : (
              rows.map((tx) => (
                <tr key={tx.id}>
                  <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {tx.reference_id.slice(0, 8)}
                  </td>
                  <td>{tx.actor_email ?? '—'}</td>
                  <td className="num">
                    {tx.amount} {tx.currency}
                  </td>
                  <td>
                    <TxStatusPill />
                  </td>
                  <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {relativeTime(tx.created_at)}
                  </td>
                </tr>
              ))
            )}
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

  // Total registered users — requires admin JWT
  const { data: usersData } = useSWR<PaginatedResponse<{ id: string }>>(
    token ? (['/admin/users/', token] as const) : null,
    ([path, tok]: readonly [string, string]) =>
      adminGet<PaginatedResponse<{ id: string }>>(path, tok),
    { revalidateOnFocus: false },
  )

  // Total published yachts — public endpoint, no auth needed
  const { data: yachtsData } = useSWR<PaginatedResponse<{ id: string }>>(
    '/yachts/',
    (path: string) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'}/api/v1${path}`)
        .then((r) => r.json()) as Promise<PaginatedResponse<{ id: string }>>,
    { revalidateOnFocus: false },
  )

  // Admin platform stats (GTV, bookings) — admin-only endpoint
  const { data: statsData } = useSWR<AdminStats>(
    token ? (['/analytics/stats/', token] as const) : null,
    ([path, tok]: readonly [string, string]) => adminGet<AdminStats>(path, tok),
    { revalidateOnFocus: false },
  )

  // Payouts for revenue chart — last 12 months of payout records
  const { data: payoutsData } = useSWR<PaginatedResponse<PayoutRecord>>(
    token ? (['/payments/payouts/?ordering=-created_at', token] as const) : null,
    ([path, tok]: readonly [string, string]) =>
      adminGet<PaginatedResponse<PayoutRecord>>(path, tok),
    { revalidateOnFocus: false },
  )

  // Recent payment transactions from audit log
  const { data: txData } = useSWR<PaginatedResponse<TransactionRow>>(
    token
      ? (['/analytics/audit-log/?event_type=payment_received&ordering=-created_at', token] as const)
      : null,
    ([path, tok]: readonly [string, string]) =>
      adminGet<PaginatedResponse<TransactionRow>>(path, tok),
    { revalidateOnFocus: false },
  )

  const pendingCount = kycData?.results.length ?? 0
  // Prefer server-supplied total count when available; fall back to page length.
  const usersCount: number | '—' =
    usersData != null ? (usersData.count ?? usersData.results.length) : '—'
  const yachtsCount: number | '—' =
    yachtsData != null ? (yachtsData.count ?? yachtsData.results.length) : '—'
  const kycPendingCount: number | '—' = kycData != null ? pendingCount : '—'

  // Derive GTV display values from stats
  const gtvValue = statsData ? formatGTV(statsData.gtv_total) : '—'
  const gtvCurrency = statsData?.gtv_currency ?? 'EGP'
  const bookingsTotal: number | '—' = statsData?.bookings_total ?? '—'
  const revenueValue = statsData ? formatGTV(statsData.revenue_total) : '—'
  const momDelta = statsData != null ? formatMomDelta(statsData.mom_gtv_delta) : '—'
  const activeVendors: number | '—' = statsData?.active_vendors ?? '—'

  // Build revenue chart data from payouts
  const revenueData: RevenueDataPoint[] | undefined =
    payoutsData ? buildRevenueData(payoutsData.results) : undefined

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
        <KpiGrid
          usersCount={usersCount}
          yachtsCount={yachtsCount}
          kycPendingCount={kycPendingCount}
          gtvValue={gtvValue}
          gtvCurrency={gtvCurrency}
          bookingsTotal={bookingsTotal}
          revenueValue={revenueValue}
          momDelta={momDelta}
          activeVendors={activeVendors}
        />

        {/* Revenue chart + KYC queue */}
        <div className="dash-row">
          <div className="dash-card">
            <h3>الإيرادات · آخر ١٢ شهر</h3>
            <div className="sub">REVENUE · LAST 12 MONTHS · EGP</div>
            {/* revenueData is undefined while loading (shows mock), [] if loaded but empty (shows placeholder) */}
            <RevenueChart data={revenueData} />
          </div>

          <KycQueueCard
            pendingCount={pendingCount}
            locale={locale}
            isLoading={kycLoading}
          />
        </div>

        {/* Recent transactions — wired to audit-log API */}
        <TransactionsTable rows={txData?.results ?? []} />

        {/* Top boats */}
        <TopBoatsTable boats={TOP_BOATS} />
      </div>
    </div>
  )
}
