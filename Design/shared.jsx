/* global React */
const { useState: useStateC } = React;

// ── Small shared components ──────────────────────────

function TopStrip() {
  return (
    <div className="top-strip">
      <div className="strip-group">
        <span>EST. 2026</span>
        <span>CAIRO · EGYPT</span>
        <span>RED SEA · MEDITERRANEAN · NILE</span>
      </div>
      <div className="strip-group">
        <span>WIND 12 KTS NE</span>
        <span>SWELL 0.8 M</span>
        <span>AIR 27°C</span>
        <span>BOATS LIVE · 183</span>
      </div>
    </div>
  );
}

function Nav({ currentPage, onNavigate }) {
  const links = [
    { id: 'home', ar: 'الرئيسية', en: 'Home' },
    { id: 'boats', ar: 'القوارب واليخوت', en: 'Boats' },
    { id: 'market', ar: 'متجر العدد', en: 'Gear' },
    { id: 'comps', ar: 'البطولات', en: 'Competitions' },
    { id: 'profile', ar: 'حسابي', en: 'Account' },
  ];
  return (
    <div className="nav">
      <div className="nav-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
        <span className="mark">س</span>
        سي كونكت
        <span className="en-tag">/ SeaConnect</span>
      </div>
      <div className="nav-links">
        {links.map(l => (
          <button
            key={l.id}
            className={`nav-link ${currentPage === l.id || (currentPage === 'detail' && l.id === 'boats') || (currentPage === 'book' && l.id === 'boats') || (currentPage === 'confirm' && l.id === 'boats') ? 'active' : ''}`}
            onClick={() => onNavigate(l.id)}
          >
            {l.ar}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <span className="lang">AR / EN</span>
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>إدراج قاربك</button>
        <div className="avatar">ن</div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <div className="top">
        <div>
          <div className="brand">سي كونكت</div>
          <div className="tagline">Connecting Egypt to its coastlines — since 2026.</div>
          <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', direction: 'ltr' }}>
            CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR
          </div>
        </div>
        <div>
          <h5>المنصة</h5>
          <ul>
            <li><a href="#">استكشاف القوارب</a></li>
            <li><a href="#">متجر العدد</a></li>
            <li><a href="#">البطولات</a></li>
            <li><a href="#">كن مالك قارب</a></li>
            <li><a href="#">كن بائعاً</a></li>
          </ul>
        </div>
        <div>
          <h5>الشركة</h5>
          <ul>
            <li><a href="#">من نحن</a></li>
            <li><a href="#">الصحافة</a></li>
            <li><a href="#">وظائف</a></li>
            <li><a href="#">اتصل بنا</a></li>
          </ul>
        </div>
        <div>
          <h5>الثقة والأمان</h5>
          <ul>
            <li><a href="#">ضمان الحجز</a></li>
            <li><a href="#">شروط الاستخدام</a></li>
            <li><a href="#">الخصوصية</a></li>
            <li><a href="#">سياسة الاسترجاع</a></li>
          </ul>
        </div>
      </div>
      <div className="bottom">
        <span>© 2026 SEACONNECT LLC · REGISTERED IN CAIRO, EGYPT</span>
        <span>FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD</span>
      </div>
    </div>
  );
}

function TweaksPanel({ density, setDensity }) {
  const [visible, setVisible] = useStateC(false);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const set = (val) => {
    setDensity(val);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { density: val } }, '*');
  };

  if (!visible) return null;
  return (
    <div className="tweaks-panel" dir="rtl">
      <h4>TWEAKS · الإعدادات</h4>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>DENSITY / الكثافة</div>
      <div className="opt-row">
        <button className={`opt ${density === 'cozy' ? 'active' : ''}`} onClick={() => set('cozy')}>COZY</button>
        <button className={`opt ${density === 'compact' ? 'active' : ''}`} onClick={() => set('compact')}>COMPACT</button>
      </div>
    </div>
  );
}

// ── Boat card ────────────────────────────────────────
function BoatCard({ boat, onClick }) {
  return (
    <div className="boat-card" onClick={() => onClick(boat)}>
      <div className="media">
        <div className="media-img" style={{ backgroundImage: `url(${boat.img})` }} />
        <span className="badge">{boat.tagEn}</span>
        <span className="verified">✓ {boat.coords}</span>
      </div>
      <div className="body">
        <div className="meta-row">
          <span>{boat.typeEn.toUpperCase()}</span>
          <span>{boat.regionEn.toUpperCase()}</span>
        </div>
        <div className="name">{boat.name}</div>
        <div className="capt">مع <em>{boat.captEn}</em></div>
        <div className="specs">
          <span>{boat.length}FT</span>
          <span>·</span>
          <span>{boat.pax} PAX</span>
          <span>·</span>
          <span>{boat.year}</span>
        </div>
        <div className="foot">
          <div className="price">
            <span className="num">{boat.price.toLocaleString('en')}</span>
            <span className="unit"> EGP / DAY</span>
          </div>
          <div className="rating">
            <span className="star">★</span>
            <span>{boat.rating.toFixed(2)}</span>
            <span style={{ opacity: 0.5 }}>({boat.reviews})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lottie player ───────────────────────────────────
function Lottie({ src, width = '100%', height = '100%', speed = 1, loop = true, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const p = document.createElement('dotlottie-player');
    p.setAttribute('src', src);
    p.setAttribute('background', 'transparent');
    p.setAttribute('speed', String(speed));
    if (loop) p.setAttribute('loop', '');
    p.setAttribute('autoplay', '');
    p.style.width = '100%';
    p.style.height = '100%';
    ref.current.appendChild(p);
  }, [src, speed, loop]);
  return <div ref={ref} style={{ width, height, ...style }} />;
}

// ── Role switcher (floating top-left) ───────────────
function RoleSwitcher({ role, setRole }) {
  const roles = [
    { id: 'customer', ar: 'عميل', en: 'Customer', sub: 'BOOK' },
    { id: 'seller', ar: 'مالك / بائع', en: 'Seller & Owner', sub: 'SUPPLY' },
    { id: 'admin', ar: 'مشرف', en: 'Admin', sub: 'PLATFORM' },
  ];
  return (
    <div className="role-switcher">
      <div className="role-switcher-label">ACCESS · طريقة العرض</div>
      <div className="role-switcher-row">
        {roles.map(r => (
          <button
            key={r.id}
            className={`role-btn ${role === r.id ? 'active' : ''}`}
            onClick={() => setRole(r.id)}
          >
            <span className="role-ar">{r.ar}</span>
            <span className="role-en">{r.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { TopStrip, Nav, Footer, TweaksPanel, BoatCard, Lottie, RoleSwitcher });
