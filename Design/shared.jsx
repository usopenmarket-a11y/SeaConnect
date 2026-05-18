/* global React, useTilt, useT, T */

// ── Top strip — pure single-language, switches with lang ──
function TopStrip() {
  const { t, n } = useT();
  return (
    <div className="top-strip">
      <div className="strip-group">
        <span>{t('estd')}</span>
        <span>{t('cityHQ')}</span>
        <span>{t('coastsList')}</span>
      </div>
      <div className="strip-group">
        <span>{t('wind')} {n(12)} {t('knots')} · NE</span>
        <span>{t('swell')} {n('0.8')} {t('metres')}</span>
        <span>{t('air')} {n(27)} {t('degrees')}</span>
        <span>{t('liveBoats')} · {n(183)}</span>
      </div>
    </div>
  );
}

function ScrollProgress() {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    let frame;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const h = document.documentElement;
        const scrollable = h.scrollHeight - h.clientHeight;
        setP(scrollable > 0 ? h.scrollTop / scrollable : 0);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return (
    <div className="scroll-progress">
      <div className="bar" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

// ── Language switch ──
function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button
        className={`lang-opt ${lang === 'ar' ? 'on' : ''}`}
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
      >ع</button>
      <span className="lang-sep" aria-hidden>·</span>
      <button
        className={`lang-opt ${lang === 'en' ? 'on' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >EN</button>
    </div>
  );
}

function Nav({ currentPage, onNavigate }) {
  const { t } = useT();
  const links = [
    { id: 'home',   k: 'nav_home' },
    { id: 'boats',  k: 'nav_boats' },
    { id: 'market', k: 'nav_market' },
    { id: 'comps',  k: 'nav_comps' },
    { id: 'profile',k: 'nav_account' },
  ];
  const isActive = (id) => (
    currentPage === id
    || (id === 'boats' && ['detail', 'book', 'confirm', 'search'].includes(currentPage))
    || (id === 'market' && ['cart', 'gear-checkout', 'gear-confirm'].includes(currentPage))
    || (id === 'comps' && ['comp-detail', 'comp-enter', 'catch-log'].includes(currentPage))
  );

  return (
    <div className="nav">
      <div className="nav-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
        <span className="mark">{t('brandMark')}</span>
        <span className="brand-word">{t('brand')}</span>
      </div>
      <div className="nav-links">
        {links.map(l => (
          <button
            key={l.id}
            className={`nav-link ${isActive(l.id) ? 'active' : ''}`}
            onClick={() => onNavigate(l.id)}
          >
            {t(l.k)}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <LangSwitch />
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('owner-listing')}>{t('nav_listYourBoat')}</button>
        {window.NotificationsBell && <window.NotificationsBell onOpenInbox={() => onNavigate('inbox')} />}
        <button className="nav-cart" onClick={() => onNavigate('cart')} aria-label={t('cart')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6 H6 L8 16 H18 L20 8 H7" />
            <circle cx="9" cy="20" r="1.2" />
            <circle cx="17" cy="20" r="1.2" />
          </svg>
          <span className="badge num">4</span>
        </button>
        <div className="avatar" onClick={() => onNavigate('profile')} style={{ cursor: 'pointer' }}>
          {t('brandMark') === 'س' ? 'ن' : 'N'}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const { t } = useT();
  return (
    <div className="footer">
      <div className="top">
        <div>
          <div className="brand">{t('brand')}</div>
          <div className="tagline">{t('tagline')}</div>
          <div className="cities-line">{t('footer_citiesLine')}</div>
        </div>
        <div>
          <h5>{t('footer_platform')}</h5>
          <ul>
            <li><a href="#">{t('footer_explore')}</a></li>
            <li><a href="#">{t('footer_gear')}</a></li>
            <li><a href="#">{t('footer_comps')}</a></li>
            <li><a href="#">{t('footer_becomeOwner')}</a></li>
            <li><a href="#">{t('footer_becomeVendor')}</a></li>
          </ul>
        </div>
        <div>
          <h5>{t('footer_company')}</h5>
          <ul>
            <li><a href="#">{t('footer_about')}</a></li>
            <li><a href="#">{t('footer_press')}</a></li>
            <li><a href="#">{t('footer_careers')}</a></li>
            <li><a href="#">{t('footer_contact')}</a></li>
          </ul>
        </div>
        <div>
          <h5>{t('footer_trust')}</h5>
          <ul>
            <li><a href="#">{t('footer_guarantee')}</a></li>
            <li><a href="#">{t('footer_terms')}</a></li>
            <li><a href="#">{t('footer_privacy')}</a></li>
            <li><a href="#">{t('footer_refund')}</a></li>
          </ul>
        </div>
      </div>
      <div className="bottom">
        <span>{t('footer_copyright')}</span>
        <span>{t('footer_pay')}</span>
      </div>
    </div>
  );
}

function TweaksPanel({ density, setDensity }) {
  const [visible, setVisible] = React.useState(false);
  const { lang, setLang } = useT();

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setD = (val) => {
    setDensity(val);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { density: val } }, '*');
  };
  const setL = (val) => {
    setLang(val);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { language: val } }, '*');
  };

  if (!visible) return null;
  return (
    <div className="tweaks-panel" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h4>Tweaks</h4>

      <div className="tweak-label">Language</div>
      <div className="opt-row">
        <button className={`opt ${lang === 'ar' ? 'active' : ''}`} onClick={() => setL('ar')}>عربي</button>
        <button className={`opt ${lang === 'en' ? 'active' : ''}`} onClick={() => setL('en')}>English</button>
      </div>

      <div className="tweak-label">Density</div>
      <div className="opt-row">
        <button className={`opt ${density === 'cozy' ? 'active' : ''}`} onClick={() => setD('cozy')}>Cozy</button>
        <button className={`opt ${density === 'compact' ? 'active' : ''}`} onClick={() => setD('compact')}>Compact</button>
      </div>
    </div>
  );
}

// ── Boat card — uses lang-aware data fields ──────────────
function BoatCard({ boat, onClick }) {
  const tilt = window.useTilt(5);
  const { t, lang, p } = useT();
  const name   = lang === 'ar' ? boat.name    : (boat.nameEn || boat.name);
  const type   = lang === 'ar' ? boat.type    : (boat.typeEn || boat.type);
  const region = lang === 'ar' ? boat.region  : (boat.regionEn || boat.region);
  const capt   = lang === 'ar' ? boat.capt    : (boat.captEn || boat.capt);
  const tagKey = (boat.tagEn || '').toUpperCase();
  const tagLabel = (
    tagKey === 'VERIFIED' ? t('verified')
    : tagKey === 'TOP BOOKED' ? t('topBooked')
    : tagKey === 'NEW' ? t('newTag')
    : tagKey === 'FEATURED' ? t('featured')
    : tagKey === 'NILE' ? t('nileTag')
    : (lang === 'ar' ? boat.tag : boat.tagEn)
  );

  return (
    <div className="boat-card-wrap" ref={tilt.ref} style={tilt.style}>
      <div className="boat-card" onClick={() => onClick(boat)}>
        <div className="media">
          <div className="media-img" style={{ backgroundImage: `url(${boat.img})` }} />
          <div
            className="card-glare"
            style={{
              opacity: tilt.hover ? 1 : 0,
              background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, oklch(1 0 0 / 0.32), transparent 55%)`,
            }}
          />
          <span className="badge">{tagLabel}</span>
          <span className="verified" dir="ltr">✓ {boat.coords}</span>
        </div>
        <div className="body">
          <div className="meta-row">
            <span>{type}</span>
            <span>{region}</span>
          </div>
          <div className="name">{name}</div>
          <div className="capt">{t('withCapt')} <em>{capt}</em></div>
          <div className="specs">
            <span>{boat.length} {t('ft')}</span>
            <span aria-hidden>·</span>
            <span>{boat.pax} {t('pax')}</span>
            <span aria-hidden>·</span>
            <span>{boat.year}</span>
          </div>
          <div className="foot">
            <div className="price">
              <span className="num">{p(boat.price)}</span>
              <span className="unit"> {t('egp')} {t('perDay')}</span>
            </div>
            <div className="rating" dir="ltr">
              <span className="star">★</span>
              <span>{boat.rating.toFixed(2)}</span>
              <span style={{ opacity: 0.5 }}>({boat.reviews})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lottie ──
function Lottie({ src, width = '100%', height = '100%', speed = 1, loop = true, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const player = document.createElement('dotlottie-player');
    player.setAttribute('src', src);
    player.setAttribute('background', 'transparent');
    player.setAttribute('speed', String(speed));
    if (loop) player.setAttribute('loop', '');
    player.setAttribute('autoplay', '');
    player.style.width = '100%';
    player.style.height = '100%';
    ref.current.appendChild(player);
  }, [src, speed, loop]);
  return <div ref={ref} style={{ width, height, ...style }} />;
}

// ── Role switcher ──
function RoleSwitcher({ role, setRole }) {
  const { lang } = useT();
  const labels = {
    customer: { ar: 'عميل',       en: 'Customer' },
    seller:   { ar: 'مالك قارب',   en: 'Boat owner' },
    vendor:   { ar: 'بائع عُدّة',   en: 'Gear vendor' },
    admin:    { ar: 'مشرف',        en: 'Admin' },
  };
  const labelTitle = { ar: 'العرض حسب الدور', en: 'Preview as role' };
  const order = ['customer', 'seller', 'vendor', 'admin'];
  return (
    <div className="role-switcher">
      <div className="role-switcher-label">{labelTitle[lang]}</div>
      <div className="role-switcher-row">
        {order.map(id => (
          <button
            key={id}
            className={`role-btn ${role === id ? 'active' : ''}`}
            onClick={() => setRole(id)}
          >
            <span className="role-ar">{labels[id][lang]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { TopStrip, Nav, Footer, TweaksPanel, BoatCard, Lottie, RoleSwitcher, ScrollProgress, LangSwitch });
