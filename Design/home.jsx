/* global React, BOATS, REGIONS, GEAR, COMPETITIONS, BoatCard */
const { useState: useStateH } = React;

function Home({ onNavigate, onOpenBoat }) {
  const [activeRegion, setActiveRegion] = useStateH(0);

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div
          className="hero-img"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80)' }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="dot" />
            <span>ISSUE 01 · SPRING 2026</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>EGYPT'S MARITIME LEISURE PLATFORM</span>
          </div>
          <h1 className="hero-title">
            البحر أقرب<br />
            مما <em>تتخيّل</em>.
          </h1>
          <p className="hero-sub">
            احجز قارب صيد أو يخت فاخر على طول ساحل مصر، اقتن أدواتك من بائعين معتمدين، وسجّل في البطولات — كل ذلك في مكان واحد موثوق.
          </p>

          {/* Search bar */}
          <div className="search-bar">
            <div className="field">
              <label>الوجهة</label>
              <select defaultValue="hurghada">
                <option value="hurghada">الغردقة · البحر الأحمر</option>
                <option value="alex">الإسكندرية · المتوسط</option>
                <option value="sharm">شرم الشيخ</option>
                <option value="luxor">الأقصر · النيل</option>
              </select>
            </div>
            <div className="field">
              <label>التاريخ</label>
              <input defaultValue="12 مايو 2026" />
            </div>
            <div className="field">
              <label>المدة</label>
              <select defaultValue="full">
                <option value="half">نصف يوم · 6 س</option>
                <option value="full">يوم كامل · 10 س</option>
                <option value="multi">أيام متعددة</option>
              </select>
            </div>
            <div className="field">
              <label>المسافرون</label>
              <select defaultValue="6">
                <option>2 أشخاص</option>
                <option>4 أشخاص</option>
                <option>6 أشخاص</option>
                <option>10 أشخاص</option>
              </select>
            </div>
            <button className="search-btn" onClick={() => onNavigate('boats')}>
              ابحث ←
            </button>
          </div>
        </div>
      </div>

      {/* Regions strip */}
      <div className="region-strip">
        {REGIONS.map((r, i) => (
          <button
            key={i}
            className={`region-chip ${activeRegion === i ? 'active' : ''}`}
            onClick={() => setActiveRegion(i)}
          >
            <span>{r.ar}</span>
            <span className="count">{r.count}</span>
          </button>
        ))}
      </div>

      {/* Featured boats */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="num-tag">§ 01 · FEATURED VESSELS</div>
            <h2>قوارب <em>مختارة</em> لهذا الأسبوع</h2>
          </div>
          <button className="right-link" onClick={() => onNavigate('boats')}>
            شاهد الكل (183) ←
          </button>
        </div>
        <div className="boat-grid">
          {BOATS.slice(0, 6).map(b => (
            <BoatCard key={b.id} boat={b} onClick={onOpenBoat} />
          ))}
        </div>
      </div>

      {/* Editorial block */}
      <div className="editorial">
        <div className="img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516408292011-63dbc7e6e9d8?auto=format&fit=crop&w=1400&q=80)' }} />
        <div className="text">
          <div className="kicker">§ 02 · TRUST & VERIFICATION</div>
          <h3>كل قارب، <em>مُعتمد</em>.<br />كل رحلة، مؤمّنة.</h3>
          <p>
            فريقنا يتفقّد كل قارب شخصياً — يتحقق من رخصة خفر السواحل، ومعدات السلامة، وحالة المحرك — قبل أن يظهر على المنصة. دفعك محفوظ في ضمان حتى ٢٤ ساعة بعد انتهاء الرحلة. إذا حدث خلل، نعيد أموالك كاملة.
          </p>
          <div className="stats">
            <div className="stat">
              <div className="n num">183</div>
              <div className="l">قارب معتمد</div>
            </div>
            <div className="stat">
              <div className="n num">4.9</div>
              <div className="l">متوسط التقييم</div>
            </div>
            <div className="stat">
              <div className="n num">24H</div>
              <div className="l">حماية الضمان</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gear marketplace teaser */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="num-tag">§ 03 · GEAR MARKETPLACE</div>
            <h2>عدّة الصيد — <em>من خبراء</em> إلى خبراء</h2>
          </div>
          <button className="right-link" onClick={() => onNavigate('market')}>
            المتجر كاملاً ←
          </button>
        </div>
        <div className="gear-grid">
          {GEAR.slice(0, 8).map((g, i) => (
            <div key={i} className="gear-card">
              <div className="img" style={{ backgroundImage: `url(${g.img})` }} />
              <div className="brand">{g.brand}</div>
              <div className="title">{g.title}</div>
              <div className="price">
                <span className="num">{g.price.toLocaleString('en')}</span>
                <span className="unit"> EGP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitions */}
      <div className="section" style={{ background: 'var(--sand-2)' }}>
        <div className="section-head">
          <div>
            <div className="num-tag">§ 04 · TOURNAMENTS & EVENTS</div>
            <h2>بطولات <em>قادمة</em></h2>
          </div>
          <button className="right-link" onClick={() => onNavigate('comps')}>
            التقويم الكامل ←
          </button>
        </div>
        <div style={{ background: 'var(--foam)', border: '1px solid var(--rule)' }}>
          {COMPETITIONS.map((c, i) => (
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

      {/* Closing CTA */}
      <div className="section" style={{ paddingTop: 20, paddingBottom: 60 }}>
        <div style={{
          background: 'var(--clay)',
          color: 'var(--foam)',
          padding: '56px 48px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 40,
          alignItems: 'center',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', opacity: 0.85, marginBottom: 16 }}>§ 05 · FOR BOAT OWNERS</div>
            <h3 className="display" style={{ fontSize: 52, lineHeight: 1, marginBottom: 16 }}>
              قاربك <em style={{ fontStyle: 'italic' }}>يعمل</em> لصالحك.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.95, maxWidth: '48ch' }}>
              أدرج قاربك مجاناً. 0% عمولة في الأشهر الثلاثة الأولى. إدارة حجوزات، مواعيد، ومدفوعات — من لوحة تحكم واحدة.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-lg" style={{ background: 'var(--ink)', color: 'var(--sand)' }}>
              ابدأ الإدراج مجاناً ←
            </button>
            <button className="btn btn-lg" style={{ background: 'transparent', color: 'var(--foam)', border: '1px solid var(--foam)' }}>
              كيف تعمل المنصة؟
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Home });
