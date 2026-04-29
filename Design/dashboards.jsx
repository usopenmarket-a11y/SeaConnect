/* global React, BOATS, GEAR, COMPETITIONS, Lottie */
const { SellerLayout, SellerListing, SellerBookings, SellerCalendar, SellerPayouts, SellerOnboard } = window;

// ── ADMIN DASHBOARD ─────────────────────────────────
function AdminDash() {
  const navItems = {
    platform: [
      ['نظرة عامة', 'OVERVIEW', 12, true],
      ['المعاملات', 'TRANSACTIONS', 847],
      ['الإيرادات', 'REVENUE', null],
      ['التقارير', 'REPORTS', null],
    ],
    marketplace: [
      ['القوارب', 'BOATS', 183],
      ['البائعون', 'VENDORS', 83],
      ['البطولات', 'COMPETITIONS', 12],
      ['العملاء', 'USERS', 2543],
    ],
    moderation: [
      ['قيد المراجعة', 'PENDING', 7],
      ['البلاغات', 'DISPUTES', 2],
      ['التحقق', 'KYC QUEUE', 14],
    ],
  };

  const topBoats = BOATS.slice(0, 5).map((b, i) => ({
    ...b,
    gtv: Math.round(b.price * (8 + i * 3) * 1.2).toLocaleString('en'),
    bookings: 12 - i * 2,
    status: i === 0 ? 'live' : i === 4 ? 'pending' : 'ok',
  }));

  const recentTx = [
    { id: 'TX-4821', user: 'نور حسن', boat: 'البحر الأحمر', amt: 5480, method: 'FAWRY', status: 'ok', time: '12 MIN AGO' },
    { id: 'TX-4820', user: 'Liam Carter', boat: 'أطلانتس', amt: 12100, method: 'VISA', status: 'ok', time: '34 MIN AGO' },
    { id: 'TX-4819', user: 'منى صبري', boat: 'نور الشاطئ', amt: 2610, method: 'VDF', status: 'ok', time: '1 HR AGO' },
    { id: 'TX-4818', user: 'أحمد لطفي', boat: 'ريح البحر', amt: 6380, method: 'INSTAPAY', status: 'warn', time: '2 HR AGO' },
    { id: 'TX-4817', user: 'Sara Klein', boat: 'صياد الصبح', amt: 1740, method: 'VISA', status: 'ok', time: '3 HR AGO' },
    { id: 'TX-4816', user: 'حسن مجدي', boat: 'فلوكة النيل', amt: 1380, method: 'FAWRY', status: 'pending', time: '5 HR AGO' },
  ];

  return (
    <div className="dash-layout" dir="rtl">
      <aside className="sidebar-dash">
        <div className="brand-mini">
          <span className="dot" />
          سي كونكت
          <span style={{ fontSize: 10, fontFamily: 'var(--ff-mono)', opacity: 0.6, letterSpacing: '0.1em', marginRight: 'auto' }}>ADMIN</span>
        </div>
        {Object.entries({ 'الإدارة': navItems.platform, 'السوق': navItems.marketplace, 'المراجعة': navItems.moderation }).map(([g, items]) => (
          <div key={g}>
            <div className="section-label">{g}</div>
            {items.map(([ar, en, n, active]) => (
              <div key={en} className={`nav-item ${active ? 'active' : ''}`}>
                <span>{ar}</span>
                {n !== null && <span className="n">{n}</span>}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div className="dash-wrap">
        <div className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · PLATFORM OVERVIEW · APR 2026</div>
            <h1>لوحة <em>الإدارة</em></h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost">تصدير تقرير</button>
            <button className="btn btn-primary">إعدادات المنصة</button>
          </div>
        </div>

        <div className="kpi-grid">
          {[
            ['GTV · القيمة الإجمالية', '2.84', 'M EGP', '+18.2% MoM', 'up'],
            ['REVENUE · الإيرادات', '347', 'K EGP', '+12.4% MoM', 'up'],
            ['BOOKINGS · الحجوزات', '1,284', '', '+9.1% MoM', 'up'],
            ['TAKE RATE · نسبة الأخذ', '12.2', '%', '−0.3pp', 'dn'],
          ].map(([l, v, u, d, dir], i) => (
            <div key={i} className="kpi">
              <div className="l">{l}</div>
              <div className="v num">{v}<span className="unit">{u}</span></div>
              <div className={`delta ${dir}`}>{dir === 'up' ? '▲' : '▼'} {d}</div>
            </div>
          ))}
        </div>

        <div className="dash-row">
          <div className="dash-card">
            <h3>الإيرادات · آخر ١٢ شهر</h3>
            <div className="sub">REVENUE · LAST 12 MONTHS · EGP</div>
            <div className="revenue-chart">
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.46 0.09 215)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="oklch(0.46 0.09 215)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 45, 90, 135].map((y, i) => (
                  <line key={i} x1="0" x2="600" y1={y} y2={y} stroke="oklch(0.84 0.015 215)" strokeDasharray="2 4" />
                ))}
                <path d="M0 150 L50 140 L100 130 L150 115 L200 118 L250 100 L300 92 L350 82 L400 70 L450 58 L500 48 L550 32 L600 20 L600 180 L0 180 Z" fill="url(#area)" />
                <path d="M0 150 L50 140 L100 130 L150 115 L200 118 L250 100 L300 92 L350 82 L400 70 L450 58 L500 48 L550 32 L600 20" fill="none" stroke="oklch(0.20 0.045 235)" strokeWidth="2" />
                {[[0, 150], [100, 130], [200, 118], [300, 92], [400, 70], [500, 48], [600, 20]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3.5" fill="var(--clay)" />
                ))}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', direction: 'ltr' }}>
                {['MAY', 'JUL', 'SEP', 'NOV', 'JAN', 'MAR', 'APR'].map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>

          <div className="dash-card">
            <h3>تحقق KYC · قيد المراجعة</h3>
            <div className="sub">14 PENDING · REVIEW QUEUE</div>
            {['قارب "النسيم"', 'يخت "الدلفين"', 'بائع BaitPro Alex'].map((n, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--rule)' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 2, direction: 'ltr' }}>
                    SUBMITTED {['2H', '5H', '1D'][i]} AGO · {['HURGHADA', 'SHARM', 'ALEX'][i]}
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>مراجعة ←</button>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>عرض القائمة كاملة (14)</button>
          </div>
        </div>

        <div className="dash-card" style={{ marginBottom: 32 }}>
          <h3>أحدث المعاملات</h3>
          <div className="sub">RECENT TRANSACTIONS · LIVE</div>
          <table className="dash-table">
            <thead>
              <tr><th>ID</th><th>العميل</th><th>القارب</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th><th>الوقت</th></tr>
            </thead>
            <tbody>
              {recentTx.map(t => (
                <tr key={t.id}>
                  <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>{t.id}</td>
                  <td>{t.user}</td>
                  <td>{t.boat}</td>
                  <td className="num">{t.amt.toLocaleString('en')} EGP</td>
                  <td className="num">{t.method}</td>
                  <td><span className={`pill-status ${t.status}`}>{t.status === 'ok' ? '✓ CONFIRMED' : t.status === 'warn' ? '⚠ REVIEW' : '⏱ PENDING'}</span></td>
                  <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>{t.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <h3>أفضل القوارب أداءً</h3>
          <div className="sub">TOP PERFORMING VESSELS · LAST 30 DAYS</div>
          <table className="dash-table">
            <thead>
              <tr><th>القارب</th><th>الربان</th><th>المنطقة</th><th>الحجوزات</th><th>GTV</th><th>التقييم</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {topBoats.map(b => (
                <tr key={b.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, backgroundImage: `url(${b.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <span style={{ fontFamily: 'var(--ff-display)', fontSize: 15, fontWeight: 600 }}>{b.name}</span>
                  </td>
                  <td>{b.captEn.replace('Capt. ', '')}</td>
                  <td className="num">{b.regionEn.toUpperCase()}</td>
                  <td className="num">{b.bookings}</td>
                  <td className="num">{b.gtv} EGP</td>
                  <td className="num">★ {b.rating.toFixed(2)}</td>
                  <td><span className={`pill-status ${b.status}`}>{b.status === 'live' ? '● LIVE' : b.status === 'pending' ? 'PENDING' : '✓ OK'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SELLER / OWNER DASHBOARD ────────────────────────
function SellerDashContent() {
  const cal = [];
  for (let i = 0; i < 35; i++) {
    const day = i - 2;
    const booked = [5, 6, 12, 13, 19, 26, 27].includes(day);
    const hold = [14, 21].includes(day);
    const today = day === 8;
    cal.push({ day: day >= 1 && day <= 30 ? day : '', booked, hold, today });
  }

  const bookings = [
    { d: '12 MAY', name: 'نور حسن', pax: 6, amt: 5480, status: 'pending', avatar: 'ن' },
    { d: '18 MAY', name: 'Liam Carter', pax: 4, amt: 3800, status: 'ok', avatar: 'L' },
    { d: '24 MAY', name: 'أحمد لطفي', pax: 8, amt: 6200, status: 'ok', avatar: 'أ' },
    { d: '02 JUN', name: 'Sara Klein', pax: 3, amt: 2900, status: 'ok', avatar: 'S' },
    { d: '08 JUN', name: 'منى صبري', pax: 10, amt: 7400, status: 'pending', avatar: 'م' },
  ];

  return (
    <>
      <div className="dash-head">
        <div>
          <div className="num-tag">§ OWNER · CAPT. MAHMOUD SEIF · HURGHADA</div>
          <h1>أهلاً <em>محمود</em></h1>
          <div style={{ marginTop: 10, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--muted)', letterSpacing: '0.05em', direction: 'ltr' }}>
            "البحر الأحمر" · 42 FT · LIVE · ★ 4.92 (148)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost">تعديل القارب</button>
          <button className="btn btn-clay">+ إضافة قارب جديد</button>
        </div>
      </div>

        <div className="kpi-grid">
          {[
            ['MONTHLY REVENUE · إيرادات الشهر', '48.6', 'K EGP', '+22% vs APR', 'up'],
            ['BOOKINGS · حجوزات', '18', '', '8 UPCOMING', 'up'],
            ['OCCUPANCY · نسبة الإشغال', '72', '%', '+8pp MoM', 'up'],
            ['RATING · التقييم', '4.92', ' / 5', '148 REVIEWS', 'up'],
          ].map(([l, v, u, d, dir], i) => (
            <div key={i} className="kpi">
              <div className="l">{l}</div>
              <div className="v num">{v}<span className="unit">{u}</span></div>
              <div className={`delta ${dir}`}>{dir === 'up' ? '▲' : '▼'} {d}</div>
            </div>
          ))}
        </div>

        <div className="dash-row">
          <div className="dash-card">
            <h3>التقويم · مايو ٢٠٢٦</h3>
            <div className="sub">CALENDAR · MAY 2026 · AVAILABILITY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
              {['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', padding: '6px 0' }}>{d}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {cal.map((c, i) => (
                <div key={i} className={`cal-day ${c.booked ? 'booked' : ''} ${c.hold ? 'hold' : ''} ${c.today ? 'today' : ''}`}>
                  {c.day}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 16, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.05em' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--ink)', marginLeft: 6, verticalAlign: 'middle' }} />محجوز</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'oklch(0.86 0.05 55)', marginLeft: 6, verticalAlign: 'middle' }} />معلّق</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid var(--clay)', marginLeft: 6, verticalAlign: 'middle' }} />اليوم</span>
            </div>
          </div>

          <div className="dash-card">
            <h3>صافي الدفع القادم</h3>
            <div className="sub">NEXT PAYOUT · 15 MAY 2026</div>
            <div className="display" style={{ fontSize: 56, lineHeight: 1, marginTop: 8 }}>
              <span className="num">38,420</span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginRight: 6 }}> EGP</span>
            </div>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
              {[
                ['إجمالي الحجوزات', '43,650', null],
                ['ضمان محتجز (٣ رحلات)', '−5,230', 'hold'],
                ['عمولة المنصة 0%', '—', 'promo'],
              ].map(([l, v, k], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                  <span style={{ color: k === 'promo' ? 'oklch(0.48 0.13 155)' : 'var(--muted-2)' }}>{l}</span>
                  <span className="num" style={{ fontFamily: 'var(--ff-mono)', color: k === 'hold' ? 'var(--clay)' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>عرض كشف الحساب</button>
          </div>
        </div>

        <div className="dash-card">
          <h3>الحجوزات القادمة</h3>
          <div className="sub">UPCOMING BOOKINGS · 8 TOTAL</div>
          <table className="dash-table">
            <thead>
              <tr><th>التاريخ</th><th>العميل</th><th>مسافرون</th><th>المبلغ</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={i}>
                  <td className="num">{b.d} 2026 · 06:00</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--clay)', color: 'var(--foam)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 700 }}>{b.avatar}</div>
                    <span>{b.name}</span>
                  </td>
                  <td className="num">{b.pax}</td>
                  <td className="num">{b.amt.toLocaleString('en')} EGP</td>
                  <td><span className={`pill-status ${b.status}`}>{b.status === 'ok' ? '✓ PAID' : '⏱ FAWRY PENDING'}</span></td>
                  <td><button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>التفاصيل ←</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-row" style={{ marginTop: 32 }}>
          <div className="dash-card">
            <h3>أحدث التقييمات</h3>
            <div className="sub">RECENT REVIEWS</div>
            {[
              { n: 'عمرو عبد الحليم', s: 5, t: 'رحلة استثنائية — الربان خبير في مواقع التونة.', d: '2D AGO' },
              { n: 'Liam Carter', s: 5, t: 'Best fishing day I’ve had in Egypt. Top gear.', d: '6D AGO' },
              { n: 'نادية الشامي', s: 4, t: 'عائلي ومريح، لكن مكيف الغرفة السفلية ضعيف.', d: '2W AGO' },
            ].map((r, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 15 }}>{r.n}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>{r.d} · {'★'.repeat(r.s)}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)', fontStyle: 'italic' }}>«{r.t}»</div>
              </div>
            ))}
          </div>

          <div className="dash-card" style={{ background: 'var(--abyss)', color: 'var(--sand)', borderColor: 'var(--abyss)' }}>
            <h3 style={{ color: 'var(--sand)' }}>نصيحة الأسبوع</h3>
            <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>INSIGHT · POWERED BY SEACONNECT</div>
            <p style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: '16px 0 12px' }}>
              ارفع سعر الخميس والجمعة بنسبة ١٥٪ — الطلب أعلى ب ٣٢٪.
            </p>
            <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
              قوارب مماثلة في الغردقة تُسعّر هذين اليومين بـ 4,370 EGP في المتوسط. زيادة قدرها 570 EGP يمكن أن تضيف ~4,500 EGP شهرياً دون خسارة حجوزات.
            </p>
            <button className="btn" style={{ background: 'var(--clay)', color: 'var(--foam)', marginTop: 16 }}>طبّق الاقتراح ←</button>
          </div>
        </div>
    </>
  );
}

function SellerDash() {
  const [sub, setSub] = useState('dash');
  let title = 'أهلاً', em = 'محمود', kicker = '§ OWNER · CAPT. MAHMOUD SEIF';
  let actions = (
    <>
      <button className="btn btn-ghost">تعديل القارب</button>
      <button className="btn btn-clay">+ إضافة قارب جديد</button>
    </>
  );
  let content = null;
  if (sub === 'dash') return <SellerLayout subPage={sub} setSubPage={setSub} title=""><SellerDashContent /></SellerLayout>;
  if (sub === 'listing') {
    title = 'تعديل قاربي'; em = '· LISTING'; kicker = '§ LISTING EDITOR';
    actions = (<><button className="btn btn-ghost">معاينة</button><button className="btn btn-clay">حفظ</button></>);
    content = <SellerListing />;
  } else if (sub === 'bookings') {
    title = 'الحجوزات'; em = ''; kicker = '§ BOOKINGS · 8 UPCOMING';
    actions = (<><button className="btn btn-ghost">تصدير CSV</button></>);
    content = <SellerBookings />;
  } else if (sub === 'calendar') {
    title = 'تقويم'; em = 'الإبحار'; kicker = '§ CALENDAR · MAY 2026';
    actions = null;
    content = <SellerCalendar />;
  } else if (sub === 'payouts') {
    title = 'المدفوعات'; em = '· PAYOUTS'; kicker = '§ EARNINGS · ESCROW · BANK';
    actions = (<><button className="btn btn-ghost">تنزيل كشف</button></>);
    content = <SellerPayouts />;
  } else if (sub === 'onboard') {
    title = 'التحقق من الحساب'; em = ''; kicker = '§ VERIFICATION · STEP 4 / 6';
    actions = null;
    content = <SellerOnboard />;
  } else {
    title = 'الإعدادات'; em = ''; content = <div className="dash-card"><h3>قريباً</h3><p style={{color:'var(--muted-2)'}}>هذه الصفحة قيد التطوير.</p></div>;
  }
  return (
    <SellerLayout subPage={sub} setSubPage={setSub} title={title} titleEm={em} kicker={kicker} actions={actions}>
      {content}
    </SellerLayout>
  );
}

const { useState } = React;

Object.assign(window, { AdminDash, SellerDash, SellerDashContent });
