/* global React, BOATS, REGIONS, GEAR, COMPETITIONS, BoatCard, Reveal, useReveal, useParallax, useScrollProgress */
const { useState: useStateH, useEffect: useEffectH, useRef: useRefH } = React;

// ── Sticky storytelling block (Trust & Verification) ───────────────
function StickyStory() {
  const { ref, progress } = useScrollProgress();
  // map progress [0..1] across 3 steps; ignore the entry/exit padding
  const steps = [
    {
      img: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80',
      tag: '§ TRUST · STEP 01 — INSPECTION',
      h: <>كل قارب،<br /><em>مُعاين</em> شخصياً.</>,
      p: 'فريقنا يصعد على متن كل سفينة قبل اعتمادها. نتحقق من رخصة خفر السواحل، ومعدات السلامة، وحالة المحرك، وعدد سترات النجاة. لا نوافق على أي قارب لا يستوفي ٢٧ نقطة فحص.',
    },
    {
      img: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=1600&q=80',
      tag: '§ TRUST · STEP 02 — ESCROW',
      h: <>دفعك في <em>ضمان</em>،<br />حتى الإبحار.</>,
      p: 'مدفوعاتك محفوظة في حساب ضمان موثوق. لا تذهب للربان إلا بعد ٢٤ ساعة من انتهاء الرحلة. إذا حدث أي خلل — إلغاء، أعطال، عدم مطابقة — تُعاد أموالك كاملة دون سؤال.',
    },
    {
      img: 'https://images.unsplash.com/photo-1606251801-3e21d6e3a8b6?auto=format&fit=crop&w=1600&q=80',
      tag: '§ TRUST · STEP 03 — INSURANCE',
      h: <>تأمين شامل<br /><em>على كل رحلة</em>.</>,
      p: 'كل حجز يأتي معه تأمين سفر بقيمة تصل إلى ١٠٠,٠٠٠ EGP لكل مسافر. إصابات، فقدان معدات، أو تأخير في العودة — كل ذلك مغطى. لأن الثقة لا تكفي وحدها.',
    },
  ];

  // Three windows of progress: 0.15-0.40, 0.40-0.65, 0.65-0.90
  const active = progress < 0.40 ? 0 : progress < 0.65 ? 1 : 2;

  return (
    <section className="sticky-story" ref={ref}>
      <div className="sticky-story-track">
        <div className="sticky-story-stage">
          <div className="sticky-img-stack">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`pane ${i === active ? 'on' : ''}`}
                style={{
                  backgroundImage: `url(${s.img})`,
                  transform: i === active ? 'scale(1.04)' : 'scale(1)',
                }}
              />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, oklch(0.14 0.04 240 / 0.55), oklch(0.14 0.04 240 / 0.15))' }} />
          </div>
          <div className="sticky-text-stack">
            {steps.map((s, i) => (
              <div key={i} className={`sticky-step ${i === active ? 'on' : ''}`}>
                <div className="num-tag">{s.tag}</div>
                <h2>{s.h}</h2>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div className="sticky-progress">
            {steps.map((_, i) => (
              <div key={i} className={`dot ${i === active ? 'on' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Marquee number band ──────────────────────────────
function MarqueeBand() {
  const items = [
    ['183', 'قارب معتمد · VESSELS'],
    ['12', 'منطقة بحرية · REGIONS'],
    ['4.92', 'متوسط التقييم · RATING'],
    ['24H', 'حماية الضمان · ESCROW'],
    ['100K', 'EGP تأمين لكل مسافر'],
    ['12', 'بطولات هذا الموسم · TOURNAMENTS'],
    ['0%', 'عمولة · أول ٣ شهور'],
    ['8,400+', 'ساعة إبحار · LOGGED'],
  ];
  const all = [...items, ...items];
  return (
    <div className="marquee-band">
      <div className="marquee-viewport">
        <div className="marquee-track">
          {all.map(([n, l], i) => (
            <span key={i} className="item">
              <span className="n num">{n}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--ff-mono)', letterSpacing: '0.1em', color: 'oklch(0.78 0.02 220)', textTransform: 'uppercase' }}>{l}</span>
              <span className="sep" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hero with parallax image ─────────────────────────
function Hero({ onNavigate }) {
  const { ref, style } = useParallax(0.35);
  return (
    <div className="hero" ref={ref}>
      <div
        className="hero-img-parallax"
        style={{ ...style, backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80)' }}
      />
      <div className="hero-overlay" />
      <div className="hero-content">
        <Reveal>
          <div className="hero-kicker">
            <span className="dot" />
            <span>ISSUE 01 · SPRING 2026</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>EGYPT'S MARITIME LEISURE PLATFORM</span>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="hero-title">
            البحر أقرب<br />
            مما <em>تتخيّل</em>.
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p className="hero-sub">
            احجز قارب صيد أو يخت فاخر على طول ساحل مصر، اقتن أدواتك من بائعين معتمدين، وسجّل في البطولات — كل ذلك في مكان واحد موثوق.
          </p>
        </Reveal>

        <Reveal delay={360}>
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
            <button className="search-btn cta-shimmer" onClick={() => onNavigate('boats')}>
              ابحث ←
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Home({ onNavigate, onOpenBoat }) {
  const [activeRegion, setActiveRegion] = useStateH(0);

  return (
    <>
      <Hero onNavigate={onNavigate} />

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

      <MarqueeBand />

      {/* Featured boats */}
      <div className="section">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="num-tag">§ 01 · FEATURED VESSELS</div>
              <h2>قوارب <em>مختارة</em> لهذا الأسبوع</h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('boats')}>
              شاهد الكل (183) ←
            </button>
          </div>
        </Reveal>
        <div className="boat-grid">
          {BOATS.slice(0, 6).map((b, i) => (
            <Reveal key={b.id} delay={i * 60}>
              <BoatCard boat={b} onClick={onOpenBoat} />
            </Reveal>
          ))}
        </div>
      </div>

      <StickyStory />

      {/* Gear marketplace teaser */}
      <div className="section">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="num-tag">§ 03 · GEAR MARKETPLACE</div>
              <h2>عدّة الصيد — <em>من خبراء</em> إلى خبراء</h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('market')}>
              المتجر كاملاً ←
            </button>
          </div>
        </Reveal>
        <div className="gear-grid">
          {GEAR.slice(0, 8).map((g, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className="gear-card">
                <div className="img" style={{ backgroundImage: `url(${g.img})` }} />
                <div className="brand">{g.brand}</div>
                <div className="title">{g.title}</div>
                <div className="price">
                  <span className="num">{g.price.toLocaleString('en')}</span>
                  <span className="unit"> EGP</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Competitions */}
      <div className="section" style={{ background: 'var(--sand-2)' }}>
        <Reveal>
          <div className="section-head">
            <div>
              <div className="num-tag">§ 04 · TOURNAMENTS & EVENTS</div>
              <h2>بطولات <em>قادمة</em></h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('comps')}>
              التقويم الكامل ←
            </button>
          </div>
        </Reveal>
        <div style={{ background: 'var(--foam)', border: '1px solid var(--rule)' }}>
          {COMPETITIONS.map((c, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="comp-row">
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
            </Reveal>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div className="section" style={{ paddingTop: 20, paddingBottom: 60 }}>
        <Reveal>
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
        </Reveal>
      </div>
    </>
  );
}

Object.assign(window, { Home });
