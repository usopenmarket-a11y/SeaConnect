/**
 * Admin portal mock data — mirrors Design/dashboards.jsx AdminDash fixtures.
 * Replace with real API fetches once admin analytics endpoints are available.
 */

export interface KpiItem {
  labelEn: string
  labelAr: string
  value: string
  unit: string
  delta: string
  direction: 'up' | 'dn'
}

export interface Transaction {
  id: string
  user: string
  boat: string
  amount: number
  method: string
  status: 'ok' | 'warn' | 'pending'
  time: string
}

export interface TopBoat {
  id: string
  name: string
  captainName: string
  region: string
  bookings: number
  gtv: string
  rating: number
  status: 'live' | 'ok' | 'pending'
  imgUrl: string
}

export interface KycQueueItem {
  id: string
  name: string
  submittedAgo: string
  location: string
  type: 'boat' | 'vendor'
  documents: string[]
  ownerName: string
  ownerNationalId: string
  licenseNumber: string
}

export const KPI_ITEMS: KpiItem[] = [
  {
    labelEn: 'GTV · TOTAL VALUE',
    labelAr: 'القيمة الإجمالية',
    value: '2.84',
    unit: 'M EGP',
    delta: '+18.2% MoM',
    direction: 'up',
  },
  {
    labelEn: 'REVENUE',
    labelAr: 'الإيرادات',
    value: '347',
    unit: 'K EGP',
    delta: '+12.4% MoM',
    direction: 'up',
  },
  {
    labelEn: 'BOOKINGS',
    labelAr: 'الحجوزات',
    value: '1,284',
    unit: '',
    delta: '+9.1% MoM',
    direction: 'up',
  },
  {
    labelEn: 'TAKE RATE',
    labelAr: 'نسبة الأخذ',
    value: '12.2',
    unit: '%',
    delta: '−0.3pp',
    direction: 'dn',
  },
]

export const RECENT_TRANSACTIONS: Transaction[] = [
  { id: 'TX-4821', user: 'نور حسن', boat: 'البحر الأحمر', amount: 5480, method: 'FAWRY', status: 'ok', time: '12 MIN AGO' },
  { id: 'TX-4820', user: 'Liam Carter', boat: 'أطلانتس', amount: 12100, method: 'VISA', status: 'ok', time: '34 MIN AGO' },
  { id: 'TX-4819', user: 'منى صبري', boat: 'نور الشاطئ', amount: 2610, method: 'VDF', status: 'ok', time: '1 HR AGO' },
  { id: 'TX-4818', user: 'أحمد لطفي', boat: 'ريح البحر', amount: 6380, method: 'INSTAPAY', status: 'warn', time: '2 HR AGO' },
  { id: 'TX-4817', user: 'Sara Klein', boat: 'صياد الصبح', amount: 1740, method: 'VISA', status: 'ok', time: '3 HR AGO' },
  { id: 'TX-4816', user: 'حسن مجدي', boat: 'فلوكة النيل', amount: 1380, method: 'FAWRY', status: 'pending', time: '5 HR AGO' },
]

export const TOP_BOATS: TopBoat[] = [
  {
    id: 'b1',
    name: 'البحر الأحمر',
    captainName: 'Mahmoud Seif',
    region: 'HURGHADA',
    bookings: 12,
    gtv: '52,416',
    rating: 4.92,
    status: 'live',
    imgUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=80&h=80&fit=crop',
  },
  {
    id: 'b2',
    name: 'أطلانتس',
    captainName: 'Sherif Nour',
    region: 'SHARM',
    bookings: 10,
    gtv: '44,800',
    rating: 4.87,
    status: 'ok',
    imgUrl: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=80&h=80&fit=crop',
  },
  {
    id: 'b3',
    name: 'نور الشاطئ',
    captainName: 'Karim Hamed',
    region: 'ALEX',
    bookings: 8,
    gtv: '31,248',
    rating: 4.75,
    status: 'ok',
    imgUrl: 'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=80&h=80&fit=crop',
  },
  {
    id: 'b4',
    name: 'ريح البحر',
    captainName: 'Hassan Gamal',
    region: 'HURGHADA',
    bookings: 6,
    gtv: '27,132',
    rating: 4.68,
    status: 'ok',
    imgUrl: 'https://images.unsplash.com/photo-1530939027401-cca9c1098bbe?w=80&h=80&fit=crop',
  },
  {
    id: 'b5',
    name: 'صياد الصبح',
    captainName: 'Omar Fares',
    region: 'SHARM',
    bookings: 4,
    gtv: '18,096',
    rating: 4.61,
    status: 'pending',
    imgUrl: 'https://images.unsplash.com/photo-1524055988636-436cfa46e59e?w=80&h=80&fit=crop',
  },
]

export const KYC_QUEUE: KycQueueItem[] = [
  {
    id: 'kyc-001',
    name: 'قارب "النسيم"',
    submittedAgo: '2H',
    location: 'HURGHADA',
    type: 'boat',
    ownerName: 'محمود نصر الدين',
    ownerNationalId: '29801XXXXXXX',
    licenseNumber: 'HRG-2026-0184',
    documents: ['boat_license.pdf', 'owner_id.jpg', 'insurance_cert.pdf'],
  },
  {
    id: 'kyc-002',
    name: 'يخت "الدلفين"',
    submittedAgo: '5H',
    location: 'SHARM',
    type: 'boat',
    ownerName: 'شريف نور',
    ownerNationalId: '28703XXXXXXX',
    licenseNumber: 'SSH-2026-0091',
    documents: ['boat_license.pdf', 'owner_id.jpg'],
  },
  {
    id: 'kyc-003',
    name: 'بائع BaitPro Alex',
    submittedAgo: '1D',
    location: 'ALEX',
    type: 'vendor',
    ownerName: 'Alex Petridis',
    ownerNationalId: 'PASSPORT-GR12345',
    licenseNumber: 'ALX-VND-2026-0043',
    documents: ['trade_license.pdf', 'passport_copy.jpg', 'tax_card.pdf'],
  },
]

/** Revenue chart data — 12 months May 2025 → Apr 2026 */
export const REVENUE_MONTHS = ['MAY', 'JUL', 'SEP', 'NOV', 'JAN', 'MAR', 'APR'] as const

/** SVG path data for revenue line chart (viewBox 0 0 600 180) */
export const REVENUE_PATH = {
  area: 'M0 150 L50 140 L100 130 L150 115 L200 118 L250 100 L300 92 L350 82 L400 70 L450 58 L500 48 L550 32 L600 20 L600 180 L0 180 Z',
  line: 'M0 150 L50 140 L100 130 L150 115 L200 118 L250 100 L300 92 L350 82 L400 70 L450 58 L500 48 L550 32 L600 20',
  dots: [[0, 150], [100, 130], [200, 118], [300, 92], [400, 70], [500, 48], [600, 20]] as [number, number][],
}
