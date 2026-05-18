/* global React, BOATS, REGIONS, GEAR, COMPETITIONS, BoatCard, Reveal, useReveal, useParallax, useScrollProgress, useT */

// ── Sticky storytelling block (Trust & Verification) ───
function StickyStory() {
  const { ref, progress } = useScrollProgress();
  const { t } = useT();
  const steps = [
    {
      img: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80',
      tag: t('trust_step01_tag'),
      h1: t('trust_step01_h1'),
      h2: t('trust_step01_h2'),
      em: t('trust_step01_em'),
      p: t('trust_step01_p'),
    },
    {
      img: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=1600&q=80',
      tag: t('trust_step02_tag'),
      h1: t('trust_step02_h1'),
      h2: t('trust_step02_h2'),
      em: t('trust_step02_em'),
      p: t('trust_step02_p'),
    },
    {
      img: 'https://images.unsplash.com/photo-1606251801-3e21d6e3a8b6?auto=format&fit=crop&w=1600&q=80',
      tag: t('trust_step03_tag'),
      h1: t('trust_step03_h1'),
      h2: t('trust_step03_h2'),
      em: t('trust_step03_em'),
      p: t('trust_step03_p'),
    },
  ];
  const active = progress < 0.40 ? 0 : progress < 0.65 ? 1 : 2;

  // Render h2 with the em-word highlighted (inline italic accent)
  const renderHeadline = (h1, h2, em) => {
    if (!em || !h2.includes(em)) {
      return (<><span>{h1}</span><br /><span>{h2}</span></>);
    }
    const [before, after] = h2.split(em);
    return (
      <>
        <span>{h1}</span><br />
        <span>{before}<em>{em}</em>{after}</span>
      </>
    );
  };

  return (
    <section className="sticky-story" ref={ref}>
      <div className="sticky-story-track">
        <div className="sticky-story-stage">
          <div className="sticky-img-stack">
            {steps.map((s, i) => (
              <div key={i} className={`pane ${i === active ? 'on' : ''}`}
                style={{ backgroundImage: `url(${s.img})`, transform: i === active ? 'scale(1.04)' : 'scale(1)' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, oklch(0.14 0.04 240 / 0.55), oklch(0.14 0.04 240 / 0.15))' }} />
          </div>
          <div className="sticky-text-stack">
            {steps.map((s, i) => (
              <div key={i} className={`sticky-step ${i === active ? 'on' : ''}`}>
                <div className="num-tag">{s.tag}</div>
                <h2>{renderHeadline(s.h1, s.h2, s.em)}</h2>
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

// ── Marquee number band ───────────────────────────────
function MarqueeBand() {
  const { t, n } = useT();
  const items = [
    [n(183),    t('m_vessels')],
    [n(12),     t('m_regions')],
    [n('4.92'), t('m_ratingAvg')],
    [n(24) + 'h', t('m_escrowHrs')],
    [n(100) + 'k', t('m_insurance')],
    [n(12),     t('m_tournaments')],
    [n(0) + '%', t('m_commission')],
    [n('8,400') + '+', t('m_seaHours')],
  ];
  const all = [...items, ...items];
  return (
    <div className="marquee-band">
      <div className="marquee-viewport">
        <div className="marquee-track">
          {all.map(([num, label], i) => (
            <span key={i} className="item">
              <span className="n num">{num}</span>
              <span className="label">{label}</span>
              <span className="sep" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────
function Hero({ onNavigate }) {
  const { ref, style } = useParallax(0.18);
  const { t } = useT();
  return (
    <div className="hero" ref={ref}>
      <div className="hero-content" style={style}>
        <Reveal>
          <div className="hero-kicker">
            <span className="dot" />
            <span>{t('hero_issue')}</span>
            <span style={{ opacity: 0.5 }} aria-hidden>·</span>
            <span>{t('hero_position')}</span>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="hero-title">
            {t('hero_title1')}<br />
            <em>{t('hero_title2')}</em>
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p className="hero-sub">{t('hero_sub')}</p>
        </Reveal>

        <Reveal delay={360}>
          <div className="search-bar">
            <div className="field">
              <label>{t('search_dest')}</label>
              <select defaultValue="hurghada">
                <option value="hurghada">{t('region_hurghada')}</option>
                <option value="alex">{t('region_alex')}</option>
                <option value="sharm">{t('region_sharm')}</option>
                <option value="luxor">{t('region_luxor')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('search_date')}</label>
              <input defaultValue={t('search_dateValue') || ''} placeholder="—" />
            </div>
            <div className="field">
              <label>{t('search_duration')}</label>
              <select defaultValue="full">
                <option value="half">{t('dur_half')}</option>
                <option value="full">{t('dur_full')}</option>
                <option value="multi">{t('dur_multi')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('search_party')}</label>
              <select defaultValue="6">
                <option>2 {t('people')}</option>
                <option>4 {t('people')}</option>
                <option>6 {t('people')}</option>
                <option>10 {t('people')}</option>
              </select>
            </div>
            <button className="search-btn cta-shimmer" onClick={() => onNavigate('search')}>
              {t('search_btn')} <span aria-hidden className="arrow">→</span>
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ── Renders e.g. "قوارب مختارة" with the em-word italic ──
function HeadingEm({ full, em }) {
  if (!em || !full.includes(em)) return <span>{full}</span>;
  const [before, after] = full.split(em);
  return <><span>{before}</span><em>{em}</em><span>{after}</span></>;
}

function Home({ onNavigate, onOpenBoat }) {
  const [activeRegion, setActiveRegion] = React.useState(0);
  const { t, p } = useT();

  // localized region list (re-derived on lang change)
  const regionKeys = ['region_all', 'region_hurghada', 'region_alex', 'region_sharm', 'region_dahab', 'region_portsaid', 'region_luxor', 'region_aswan'];

  return (
    <>
      <Hero onNavigate={onNavigate} />

      {/* Regions strip */}
      <div className="region-strip">
        {regionKeys.map((k, i) => (
          <button
            key={i}
            className={`region-chip ${activeRegion === i ? 'active' : ''}`}
            onClick={() => setActiveRegion(i)}
          >
            <span>{t(k)}</span>
            <span className="count">{REGIONS[i]?.count ?? ''}</span>
          </button>
        ))}
      </div>

      <MarqueeBand />

      {/* Featured boats */}
      <div className="section">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="num-tag">§ 01</div>
              <h2><HeadingEm full={t('sec_featured')} em={t('sec_featured_em')} /></h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('boats')}>
              {t('sec_seeAll')} ({REGIONS[0].count}) <span aria-hidden className="arrow">→</span>
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
              <div className="num-tag">§ 02</div>
              <h2><HeadingEm full={t('sec_gear')} em={t('sec_gear_em')} /></h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('market')}>
              {t('sec_gear_link')} <span aria-hidden className="arrow">→</span>
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
                  <span className="num">{p(g.price)}</span>
                  <span className="unit"> {t('egp')}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Competitions */}
      <div className="section section-tinted">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="num-tag">§ 03</div>
              <h2><HeadingEm full={t('sec_comps')} em={t('sec_comps_em')} /></h2>
            </div>
            <button className="right-link" onClick={() => onNavigate('comps')}>
              {t('sec_comps_link')} <span aria-hidden className="arrow">→</span>
            </button>
          </div>
        </Reveal>
        <div className="comp-list-wrap">
          {COMPETITIONS.map((c, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="comp-row" onClick={() => onNavigate('comps')}>
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
                  <span className="l">{t('comp_participants')}</span>
                </div>
                <div className="meta">
                  <span className="n num">{c.prize}</span>
                  <span className="l">{t('comp_prize')} {t('egp')}</span>
                </div>
                <button className="cta">{t('comp_register')} · {c.fee} {t('egp')}</button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Closing CTA — boat owners */}
      <div className="section section-cta-wrap">
        <Reveal>
          <div className="owner-cta">
            <div className="owner-cta-text">
              <div className="kicker">§ 04 · {t('owner_tag')}</div>
              <h3><HeadingEm full={t('owner_h')} em={t('owner_em')} /></h3>
              <p>{t('owner_p')}</p>
            </div>
            <div className="owner-cta-actions">
              <button className="btn btn-lg btn-dark" onClick={() => onNavigate('owner-listing')}>
                {t('owner_cta1')} <span aria-hidden className="arrow">→</span>
              </button>
              <button className="btn btn-lg btn-outline-light">
                {t('owner_cta2')}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}

Object.assign(window, { Home, HeadingEm });
