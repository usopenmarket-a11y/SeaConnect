/* global React, BOATS, GEAR, COMPETITIONS */

function Profile({ onNavigate, onOpenBoat }) {
  const upcoming = [BOATS[0]];
  const past = [BOATS[1], BOATS[3], BOATS[5]];

  return (
    <>
      <div className="profile-header">
        <div className="profile-avatar" style={{ backgroundColor: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foam)', fontFamily: 'var(--ff-display)', fontSize: 56, fontWeight: 700 }}>ن</div>
        <div className="profile-info">
          <h2>نور حسن</h2>
          <div className="since">MEMBER SINCE · 2026-01 · CAIRO · EGYPT</div>
        </div>
        <div className="profile-stats">
          <div className="s"><div className="n num">7</div><div className="l">رحلات</div></div>
          <div className="s"><div className="n num">3</div><div className="l">بطولات</div></div>
          <div className="s"><div className="n num">12</div><div className="l">طلبات متجر</div></div>
          <div className="s"><div className="n num">420</div><div className="l">نقاط</div></div>
        </div>
      </div>

      <div className="pill-tabs">
        {['كل الحجوزات', 'القادمة', 'المكتملة', 'طلبات المتجر', 'البطولات', 'المفضّلة'].map((t, i) => (
          <button key={i} className={`pill ${i === 0 ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      <div className="section" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 4 }}>
          <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>قادمة</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· UPCOMING TRIPS</span>
        </div>
        {upcoming.map(b => (
          <div key={b.id} className="booking-list-item" onClick={() => onOpenBoat(b)}>
            <div className="thumb" style={{ backgroundImage: `url(${b.img})` }} />
            <div>
              <div className="name">{b.name}</div>
              <div className="sub">12 MAY 2026 · 06:00 → 16:00 · HURGHADA MARINA · 6 PAX</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--clay)', marginTop: 6, direction: 'ltr' }}>
                ✓ FAWRY CODE SENT · PAY WITHIN 48H
              </div>
            </div>
            <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700 }}>
              {((b.price + Math.round(b.price * 0.12) + 180 + 1200)).toLocaleString('en')}<span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}> EGP</span>
            </div>
            <span className="status upcoming">قادمة · 22 يوم</span>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginTop: 44, marginBottom: 4 }}>
          <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>مكتملة</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· PAST TRIPS</span>
        </div>
        {past.map((b, i) => (
          <div key={b.id} className="booking-list-item" onClick={() => onOpenBoat(b)}>
            <div className="thumb" style={{ backgroundImage: `url(${b.img})` }} />
            <div>
              <div className="name">{b.name}</div>
              <div className="sub">{['18 MAR 2026', '04 FEB 2026', '22 NOV 2025'][i]} · {b.regionEn.toUpperCase()} · {4 + i} PAX</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--clay)', marginTop: 6, direction: 'ltr' }}>
                ★ ★ ★ ★ {i === 1 ? '☆' : '★'} — "{i === 0 ? 'رحلة رائعة، الربان محترف' : i === 1 ? 'جيدة لكن التكييف ضعيف' : 'أفضل رحلة في ٢٠٢٥'}"
              </div>
            </div>
            <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700 }}>
              {b.price.toLocaleString('en')}<span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}> EGP</span>
            </div>
            <span className="status done">مكتملة</span>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginTop: 44, marginBottom: 16 }}>
          <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>طلبات المتجر</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· GEAR ORDERS</span>
        </div>
        <div style={{ background: 'var(--foam)', border: '1px solid var(--rule)' }}>
          {GEAR.slice(0, 4).map((g, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto auto', gap: 20, alignItems: 'center', padding: '18px 24px', borderBottom: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div style={{ aspectRatio: 1, backgroundImage: `url(${g.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{g.brand} · ORDER #SC-{1000 + i}</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{g.title}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {['2026-04-02', '2026-03-14', '2026-02-28', '2026-01-11'][i]}
              </div>
              <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 700 }}>{g.price.toLocaleString('en')}<span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)' }}> EGP</span></div>
              <span className="status done" style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', padding: '6px 10px', border: '1px solid var(--clay)', color: 'var(--clay)' }}>
                {i === 0 ? 'شُحن' : 'تم التسليم'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Marketplace({ onNavigate }) {
  const categories = ['كل المنتجات', 'صنارات وبكرات', 'خيوط وصنارات', 'طعوم', 'صناديق', 'ملابس', 'سلامة', 'إلكترونيات'];
  return (
    <>
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>§ GEAR MARKETPLACE · 2,200+ VENDORS</div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}>
          عدّة الصيد <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>كلها</em> في مكان واحد.
        </h1>
      </div>

      <div className="pill-tabs">
        {categories.map((c, i) => (
          <button key={i} className={`pill ${i === 0 ? 'active' : ''}`}>{c}</button>
        ))}
      </div>

      <div className="section">
        <div className="gear-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[...GEAR, ...GEAR].map((g, i) => (
            <div key={i} className="gear-card">
              <div className="img" style={{ backgroundImage: `url(${g.img})`, position: 'relative' }}>
                {i % 5 === 0 && <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--clay)', color: 'var(--foam)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', padding: '3px 7px' }}>-15%</span>}
              </div>
              <div className="brand">{g.brand}</div>
              <div className="title">{g.title}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.05em', direction: 'ltr' }}>
                ★ {(4.5 + Math.random() * 0.4).toFixed(2)} ({Math.floor(20 + Math.random() * 180)})
              </div>
              <div className="price">
                <span className="num">{g.price.toLocaleString('en')}</span>
                <span className="unit"> EGP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CompsPage() {
  return (
    <>
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>§ TOURNAMENTS · FISHING CALENDAR 2026</div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}>
          البطولات <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>والأحداث</em>.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: '52ch', marginTop: 14 }}>
          تقويم كل بطولات الصيد في مصر — من أندية الهواة إلى البطولات الاحترافية. سجّل، تابع اللوحة، اعرض صيدك.
        </p>
      </div>

      <div className="section" style={{ background: 'var(--foam)' }}>
        <div style={{ border: '1px solid var(--rule)' }}>
          {[...COMPETITIONS, ...COMPETITIONS.slice(0, 2)].map((c, i) => (
            <div key={i} className="comp-row">
              <div className="date">
                <div className="d num">{c.d}</div>
                <div className="m">{c.m} 2026</div>
              </div>
              <div className="title">
                <div className="t">{c.title}</div>
                <div className="sub">{c.sub}</div>
              </div>
              <div className="meta">
                <span className="n num">{c.participants}</span>
                <span className="l">مشارك</span>
              </div>
              <div className="meta">
                <span className="n num">{c.prize}</span>
                <span className="l">جوائز EGP</span>
              </div>
              <button className="cta">سجّل · {c.fee} EGP</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BoatsPage({ onOpenBoat }) {
  return (
    <>
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>§ ALL VESSELS · 183 VERIFIED</div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}>
          كل <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>القوارب</em>.
        </h1>
      </div>
      <div className="pill-tabs">
        {['كل الأنواع', 'يخوت فاخرة', 'قوارب صيد', 'فلوكات نيلية', 'قوارب عائلية'].map((t, i) => (
          <button key={i} className={`pill ${i === 0 ? 'active' : ''}`}>{t}</button>
        ))}
      </div>
      <div className="section">
        <div className="boat-grid">
          {[...BOATS, ...BOATS].map((b, i) => (
            <BoatCard key={i} boat={b} onClick={onOpenBoat} />
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Profile, Marketplace, CompsPage, BoatsPage });
