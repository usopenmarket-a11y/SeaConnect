/* global React */

// ── Weather Page ─────────────────────────────────────
function WeatherPage({ onNavigate }) {
  const { useState } = React;
  const [activeLocation, setActiveLocation] = useState('hurghada');
  const [activeTab, setActiveTab] = useState('today');

  const locations = [
    { id: 'hurghada',   ar: 'الغردقة',      en: 'Hurghada'        },
    { id: 'sharm',      ar: 'شرم الشيخ',    en: 'Sharm el Sheikh' },
    { id: 'dahab',      ar: 'دهب',          en: 'Dahab'           },
    { id: 'alexandria', ar: 'الإسكندرية',   en: 'Alexandria'      },
    { id: 'portsaid',   ar: 'بورسعيد',      en: 'Port Said'       },
    { id: 'luxor',      ar: 'الأقصر',       en: 'Luxor (Nile)'    },
  ];

  const weatherData = {
    hurghada:   { temp: 31, feel: 34, wind: 14, windDir: 'NE', gust: 22, wave: 0.9, swell: 'NW', period: 6, vis: 18, uv: 9, humid: 48, pressure: 1014, status: 'مشمس · صالح للإبحار', statusEn: 'Sunny · Safe to Sail', icon: '☀️', safe: true  },
    sharm:      { temp: 29, feel: 32, wind: 18, windDir: 'N',  gust: 28, wave: 1.2, swell: 'N',  period: 7, vis: 15, uv: 10, humid: 52, pressure: 1012, status: 'رياح معتدلة · توخِّ الحذر', statusEn: 'Moderate Wind · Caution', icon: '🌤️', safe: true  },
    dahab:      { temp: 28, feel: 30, wind: 22, windDir: 'N',  gust: 35, wave: 1.8, swell: 'N',  period: 8, vis: 12, uv: 9,  humid: 55, pressure: 1010, status: 'رياح قوية · غير موصى به', statusEn: 'Strong Wind · Not Advised', icon: '💨', safe: false },
    alexandria: { temp: 24, feel: 26, wind: 16, windDir: 'NW', gust: 24, wave: 1.4, swell: 'NW', period: 7, vis: 14, uv: 6,  humid: 70, pressure: 1016, status: 'غائم جزئياً · مقبول', statusEn: 'Partly Cloudy · Acceptable', icon: '🌥️', safe: true  },
    portsaid:   { temp: 23, feel: 25, wind: 12, windDir: 'NE', gust: 18, wave: 0.7, swell: 'NE', period: 5, vis: 20, uv: 5,  humid: 72, pressure: 1017, status: 'هادئ · مثالي', statusEn: 'Calm · Ideal', icon: '⛅', safe: true  },
    luxor:      { temp: 38, feel: 40, wind: 8,  windDir: 'S',  gust: 12, wave: 0.2, swell: '—',  period: 0, vis: 25, uv: 11, humid: 18, pressure: 1008, status: 'حار جداً · نيل هادئ', statusEn: 'Very Hot · Calm Nile', icon: '🌡️', safe: true  },
  };

  const forecast = [
    { day: 'الجمعة',   dayEn: 'Fri', icon: '☀️',  high: 32, low: 24, wind: 12, wave: 0.7, safe: true  },
    { day: 'السبت',    dayEn: 'Sat', icon: '☀️',  high: 33, low: 25, wind: 10, wave: 0.6, safe: true  },
    { day: 'الأحد',    dayEn: 'Sun', icon: '🌤️', high: 30, low: 23, wind: 16, wave: 1.0, safe: true  },
    { day: 'الاثنين',  dayEn: 'Mon', icon: '🌥️', high: 28, low: 22, wind: 20, wave: 1.4, safe: true  },
    { day: 'الثلاثاء', dayEn: 'Tue', icon: '💨', high: 27, low: 21, wind: 28, wave: 2.1, safe: false },
    { day: 'الأربعاء', dayEn: 'Wed', icon: '⛈️', high: 25, low: 20, wind: 32, wave: 2.8, safe: false },
    { day: 'الخميس',   dayEn: 'Thu', icon: '🌤️', high: 29, low: 22, wind: 15, wave: 1.1, safe: true  },
  ];

  const hourly = [
    { h: '06:00', icon: '🌅', temp: 24, wind: 8  },
    { h: '09:00', icon: '☀️',  temp: 27, wind: 10 },
    { h: '12:00', icon: '☀️',  temp: 31, wind: 14 },
    { h: '15:00', icon: '☀️',  temp: 33, wind: 16 },
    { h: '18:00', icon: '🌅', temp: 30, wind: 12 },
    { h: '21:00', icon: '🌙', temp: 27, wind: 9  },
    { h: '00:00', icon: '🌙', temp: 25, wind: 7  },
  ];

  const w = weatherData[activeLocation];
  const loc = locations.find(l => l.id === activeLocation);

  return (
    <div className="weather-layout">
      {/* Page header */}
      <div className="weather-header">
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>MARITIME WEATHER · الطقس البحري</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, margin: 0, color: 'var(--ink)' }}>حالة الطقس البحري</h1>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>مصدر البيانات: Open-Meteo Marine API · يُحدَّث كل ساعة</div>
        </div>
        <button
          onClick={() => onNavigate('fishing-guide')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🎣</span>
          دليل الصيد
        </button>
      </div>

      {/* Location tabs */}
      <div className="location-tabs">
        {locations.map(l => (
          <button
            key={l.id}
            className={`loc-tab ${activeLocation === l.id ? 'active' : ''}`}
            onClick={() => setActiveLocation(l.id)}
          >
            <span className="loc-tab-ar">{l.ar}</span>
            <span className="loc-tab-en">{l.en}</span>
          </button>
        ))}
      </div>

      {/* Main weather card */}
      <div className={`weather-main-card ${w.safe ? 'safe' : 'unsafe'}`}>
        <div className="weather-main-left">
          <div className="weather-icon-big">{w.icon}</div>
          <div className="weather-temp-big">{w.temp}°<span style={{ fontSize: 24, fontWeight: 400 }}>C</span></div>
          <div className="weather-status-badge" style={{ background: w.safe ? 'oklch(0.42 0.14 150 / 0.12)' : 'oklch(0.45 0.18 25 / 0.12)', color: w.safe ? 'oklch(0.35 0.14 150)' : 'oklch(0.4 0.18 25)', border: `1px solid ${w.safe ? 'oklch(0.42 0.14 150 / 0.3)' : 'oklch(0.45 0.18 25 / 0.3)'}` }}>
            {w.safe ? '✓' : '⚠'} {w.status}
          </div>
          <div className="weather-location-label">{loc.ar} · {loc.en}</div>
        </div>
        <div className="weather-main-grid">
          <div className="wstat">
            <div className="wstat-icon">💨</div>
            <div className="wstat-val">{w.wind} <span className="wstat-unit">KTS</span></div>
            <div className="wstat-label">الرياح · {w.windDir}</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">🌊</div>
            <div className="wstat-val">{w.wave} <span className="wstat-unit">M</span></div>
            <div className="wstat-label">ارتفاع الموج</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">⚡</div>
            <div className="wstat-val">{w.gust} <span className="wstat-unit">KTS</span></div>
            <div className="wstat-label">هبوب الرياح</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">👁️</div>
            <div className="wstat-val">{w.vis} <span className="wstat-unit">KM</span></div>
            <div className="wstat-label">الرؤية</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">🌡️</div>
            <div className="wstat-val">{w.feel}°</div>
            <div className="wstat-label">الحرارة المحسوسة</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">💧</div>
            <div className="wstat-val">{w.humid}<span className="wstat-unit">%</span></div>
            <div className="wstat-label">الرطوبة</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">☀️</div>
            <div className="wstat-val">{w.uv}</div>
            <div className="wstat-label">مؤشر الأشعة فوق البنفسجية</div>
          </div>
          <div className="wstat">
            <div className="wstat-icon">🔵</div>
            <div className="wstat-val">{w.pressure}</div>
            <div className="wstat-label">الضغط · hPa</div>
          </div>
        </div>
      </div>

      {/* Tabs: Today / 7-Day / Hourly */}
      <div className="forecast-tabs">
        {[
          { id: 'today',  ar: 'اليوم بالساعة',  en: 'Hourly Today' },
          { id: '7day',   ar: 'توقعات ٧ أيام', en: '7-Day Forecast' },
        ].map(t => (
          <button
            key={t.id}
            className={`forecast-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >{t.ar} · {t.en}</button>
        ))}
      </div>

      {/* Forecast content */}
      {activeTab === 'today' && (
        <div className="hourly-strip">
          {hourly.map((h, i) => (
            <div className="hourly-item" key={i}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{h.h}</div>
              <div style={{ fontSize: 22 }}>{h.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{h.temp}°</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{h.wind} KTS</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === '7day' && (
        <div className="forecast-list">
          {forecast.map((f, i) => (
            <div className={`forecast-row ${!f.safe ? 'unsafe-row' : ''}`} key={i}>
              <div className="forecast-day">
                <span className="forecast-day-ar">{f.day}</span>
                <span className="forecast-day-en mono">{f.dayEn}</span>
              </div>
              <div className="forecast-icon">{f.icon}</div>
              <div className="forecast-temps">
                <span className="high">{f.high}°</span>
                <span className="low" style={{ color: 'var(--muted)' }}>{f.low}°</span>
              </div>
              <div className="forecast-wind">
                <span className="mono">{f.wind} KTS</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>رياح</span>
              </div>
              <div className="forecast-wave">
                <span className="mono">{f.wave}M</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>موج</span>
              </div>
              <div className={`forecast-safe-badge ${f.safe ? 'safe' : 'unsafe'}`}>
                {f.safe ? '✓ صالح' : '⚠ تجنب'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marine advisory */}
      <div className="marine-advisory">
        <div className="advisory-header">
          <span style={{ fontSize: 20 }}>⚓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>التنبيه البحري اليومي · Daily Marine Advisory</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>صادر عن SeaConnect · Open-Meteo · 15 مايو 2026 · 06:00 UTC</div>
          </div>
        </div>
        <div className="advisory-body">
          الطقس البحري على ساحل البحر الأحمر مناسب للإبحار خلال الساعات المبكرة من اليوم. يُتوقع تصاعد الرياح الشمالية الشرقية في فترة ما بعد الظهر لتصل إلى 20 عقدة في منطقة دهب. يُنصح ربابنة القوارب الصغيرة بالالتزام بالساحل وتجنب الرحلات الطويلة بعد الساعة الثالثة مساءً.
          <br /><br />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Marine conditions on the Red Sea coast are suitable for sailing in the early hours. Northeasterly winds are expected to pick up in the afternoon, reaching 20 knots near Dahab. Small vessel captains are advised to stay close to shore and avoid extended trips after 15:00.</span>
        </div>
      </div>
    </div>
  );
}

// ── Fishing Guide Page ───────────────────────────────
function FishingGuidePage({ onNavigate }) {
  const { useState } = React;
  const [activeMonth, setActiveMonth] = useState(4); // 0-indexed, May = 4
  const [activeRegion, setActiveRegion] = useState('red-sea');

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const monthsEn = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const regions = [
    { id: 'red-sea',    ar: 'البحر الأحمر',    en: 'Red Sea'        },
    { id: 'med',        ar: 'البحر المتوسط',   en: 'Mediterranean'  },
    { id: 'nile',       ar: 'نهر النيل',       en: 'Nile River'     },
  ];

  // months array: which months the species is in peak season (0-indexed)
  const species = {
    'red-sea': [
      { name: 'حمور',       nameEn: 'Grouper',         icon: '🐟', peak: [0,1,2,9,10,11], good: [3,4,8],  best: 'نوفمبر – مارس', method: 'قاعي · طُعم حي', size: '2–8 كجم', depth: '15–60م', difficulty: 'متوسط' },
      { name: 'كنعد',       nameEn: 'King Mackerel',   icon: '🐠', peak: [2,3,4,5,9,10],  good: [1,6,8],  best: 'مارس – يونيو',  method: 'سطحي · قصبة', size: '1–4 كجم', depth: '5–30م',  difficulty: 'سهل'   },
      { name: 'قاروص',      nameEn: 'Sea Bass',        icon: '🐡', peak: [0,1,10,11],     good: [2,9],    best: 'ديسمبر – فبراير', method: 'قاعي · إطار', size: '0.5–2 كجم', depth: '10–40م', difficulty: 'متوسط' },
      { name: 'سلطان إبراهيم', nameEn: 'Red Mullet',  icon: '🦈', peak: [3,4,5,6],       good: [2,7],    best: 'أبريل – يوليو', method: 'قاعي · شبكة', size: '0.3–0.8 كجم', depth: '10–30م', difficulty: 'سهل'   },
      { name: 'ثعلب البحر', nameEn: 'Thresher Shark',  icon: '🦈', peak: [5,6,7,8],       good: [4,9],    best: 'يونيو – سبتمبر', method: 'عميق · طُعم', size: '50–200 كجم', depth: '100+م', difficulty: 'صعب'   },
      { name: 'تونة',       nameEn: 'Tuna',            icon: '🐟', peak: [4,5,6,7],       good: [3,8],    best: 'مايو – أغسطس',  method: 'trolling · عميق', size: '5–50 كجم', depth: '50–200م', difficulty: 'صعب'   },
      { name: 'دنيس',       nameEn: 'Dorade/Sea Bream',icon: '🐠', peak: [1,2,3,9,10],    good: [0,4,8],  best: 'فبراير – أبريل', method: 'قاعي · طُعم', size: '0.5–2 كجم', depth: '10–50م', difficulty: 'سهل'   },
      { name: 'ببغاء البحر',nameEn: 'Parrotfish',      icon: '🐡', peak: [5,6,7,8,9],     good: [4,10],   best: 'مايو – أكتوبر',  method: 'الغطس · يدوي', size: '0.5–3 كجم', depth: '2–20م',  difficulty: 'متوسط' },
    ],
    'med': [
      { name: 'سمك السيف',  nameEn: 'Swordfish',       icon: '🐟', peak: [4,5,6,7],       good: [3,8],    best: 'مايو – أغسطس',  method: 'trolling · عميق', size: '50–300 كجم', depth: '200+م', difficulty: 'صعب'   },
      { name: 'قاروص',      nameEn: 'European Sea Bass',icon: '🐠', peak: [8,9,10,11],     good: [0,1,7],  best: 'سبتمبر – ديسمبر', method: 'سطحي · spinning', size: '1–5 كجم', depth: '5–30م', difficulty: 'متوسط' },
      { name: 'عقربة',      nameEn: 'Red Scorpionfish', icon: '🐡', peak: [2,3,4,9,10,11], good: [1,5,8],  best: 'مارس – مايو',    method: 'قاعي · إطار', size: '0.5–1.5 كجم', depth: '20–80م', difficulty: 'متوسط' },
      { name: 'بلطي بحري',  nameEn: 'Gilthead Bream',  icon: '🐟', peak: [0,1,2,3,10,11], good: [4,9],    best: 'أكتوبر – مارس', method: 'قاعي · طُعم', size: '0.5–2 كجم', depth: '5–30م', difficulty: 'سهل'   },
      { name: 'ماكريل',     nameEn: 'Atlantic Mackerel',icon: '🐠', peak: [2,3,4,5],       good: [1,6],    best: 'مارس – يونيو',  method: 'سطحي · feather', size: '0.3–1 كجم', depth: '0–20م', difficulty: 'سهل'   },
    ],
    'nile': [
      { name: 'بياض',       nameEn: 'Nile Catfish',    icon: '🐟', peak: [3,4,5,6,7],     good: [2,8],    best: 'أبريل – أغسطس', method: 'قاعي · طُعم طازج', size: '1–10 كجم', depth: '2–8م', difficulty: 'سهل'  },
      { name: 'بلطي نيلي',  nameEn: 'Nile Tilapia',    icon: '🐡', peak: [0,1,2,3,4,5,6,7,8,9,10,11], good: [], best: 'طوال العام', method: 'عموم · كل الطرق', size: '0.3–2 كجم', depth: '1–5م', difficulty: 'سهل' },
      { name: 'قرموط',      nameEn: 'Vundu Catfish',   icon: '🐠', peak: [5,6,7,8,9],     good: [4,10],   best: 'يونيو – أكتوبر', method: 'ليلي · طُعم', size: '5–30 كجم', depth: '3–10م', difficulty: 'متوسط' },
      { name: 'مبروك',      nameEn: 'Common Carp',     icon: '🐟', peak: [2,3,4,9,10],    good: [1,5,8],  best: 'مارس – مايو',   method: 'قاعي · عجين', size: '1–8 كجم', depth: '2–6م', difficulty: 'سهل'   },
    ],
  };

  const tips = [
    { icon: '🌅', ar: 'أفضل وقت للصيد في الساعات الأولى بعد الشروق وقبيل الغروب.', en: 'Best fishing is in the first hours after sunrise and just before sunset.' },
    { icon: '🌊', ar: 'تجنب الصيد عند ارتفاع موج يتجاوز 1.5 متر للقوارب الصغيرة.', en: 'Avoid fishing when wave height exceeds 1.5m for small boats.' },
    { icon: '🌙', ar: 'الصيد الليلي في البحر الأحمر ممتاز خلال أشهر الصيف.', en: 'Night fishing on the Red Sea is excellent during summer months.' },
    { icon: '🎯', ar: 'الشعاب المرجانية تجذب أسماكاً متنوعة — ابقَ على مسافة آمنة.', en: 'Coral reefs attract diverse fish — maintain a safe distance.' },
    { icon: '📋', ar: 'احرص على الحصول على تصريح الصيد من هيئة الثروة السمكية.', en: 'Ensure you have a fishing permit from the General Authority for Fisheries.' },
  ];

  const currentSpecies = species[activeRegion] || [];
  const isInSeason = (sp) => sp.peak.includes(activeMonth) || sp.good.includes(activeMonth);
  const isPeak = (sp) => sp.peak.includes(activeMonth);

  return (
    <div className="fishing-guide-layout">
      {/* Header */}
      <div className="fishing-guide-header">
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>FISHING GUIDE · دليل الصيد</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, margin: 0 }}>دليل الصيد في مصر</h1>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>مواسم الأسماك · أساليب الصيد · الإرشادات البحرية</div>
        </div>
        <button
          onClick={() => onNavigate('weather')}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🌤️</span>
          حالة الطقس
        </button>
      </div>

      {/* Region selector */}
      <div className="region-selector">
        {regions.map(r => (
          <button
            key={r.id}
            className={`region-btn ${activeRegion === r.id ? 'active' : ''}`}
            onClick={() => setActiveRegion(r.id)}
          >
            <span>{r.ar}</span>
            <span className="mono" style={{ fontSize: 10, opacity: 0.6 }}>{r.en}</span>
          </button>
        ))}
      </div>

      {/* Month strip */}
      <div className="month-strip-wrap">
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.05em' }}>اختر الشهر · SELECT MONTH</div>
        <div className="month-strip">
          {months.map((m, i) => (
            <button
              key={i}
              className={`month-btn ${activeMonth === i ? 'active' : ''}`}
              onClick={() => setActiveMonth(i)}
            >
              <span className="month-ar">{m}</span>
              <span className="month-en mono">{monthsEn[i]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Season summary */}
      <div className="season-summary">
        <div className="season-stat">
          <div className="season-num">{currentSpecies.filter(isPeak).length}</div>
          <div className="season-label">في الموسم الرئيسي</div>
        </div>
        <div className="season-divider" />
        <div className="season-stat">
          <div className="season-num">{currentSpecies.filter(s => isInSeason(s) && !isPeak(s)).length}</div>
          <div className="season-label">موسم جيد</div>
        </div>
        <div className="season-divider" />
        <div className="season-stat">
          <div className="season-num" style={{ color: 'var(--muted)' }}>{currentSpecies.filter(s => !isInSeason(s)).length}</div>
          <div className="season-label" style={{ color: 'var(--muted)' }}>خارج الموسم</div>
        </div>
        <div style={{ marginRight: 'auto', textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--ink)' }}>{months[activeMonth]}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{monthsEn[activeMonth]} 2026</div>
        </div>
      </div>

      {/* Species grid */}
      <div className="species-grid">
        {currentSpecies.map((sp, i) => {
          const peak = isPeak(sp);
          const good = isInSeason(sp) && !peak;
          const off  = !isInSeason(sp);
          return (
            <div
              key={i}
              className={`species-card ${peak ? 'peak' : good ? 'good' : 'off'}`}
            >
              <div className="species-top">
                <span className="species-icon">{sp.icon}</span>
                <div className={`species-season-badge ${peak ? 'peak' : good ? 'good' : 'off'}`}>
                  {peak ? '🔥 موسم مثالي' : good ? '✓ موسم جيد' : '— خارج الموسم'}
                </div>
              </div>
              <div className="species-name">{sp.name}</div>
              <div className="species-name-en mono">{sp.nameEn}</div>
              <div className="species-info-grid">
                <div className="sinfo">
                  <span className="sinfo-label">أفضل موسم</span>
                  <span className="sinfo-val">{sp.best}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">الأسلوب</span>
                  <span className="sinfo-val">{sp.method}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">الحجم</span>
                  <span className="sinfo-val mono">{sp.size}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">العمق</span>
                  <span className="sinfo-val mono">{sp.depth}</span>
                </div>
              </div>
              <div className={`difficulty-tag ${sp.difficulty === 'سهل' ? 'easy' : sp.difficulty === 'صعب' ? 'hard' : 'med'}`}>
                {sp.difficulty === 'سهل' ? '🟢' : sp.difficulty === 'صعب' ? '🔴' : '🟡'} {sp.difficulty}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips section */}
      <div className="fishing-tips">
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>FISHING TIPS · نصائح الصيد</div>
        {tips.map((t, i) => (
          <div className="tip-row" key={i}>
            <span className="tip-icon">{t.icon}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{t.ar}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.en}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA — book a boat */}
      <div className="fishing-cta">
        <div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>جاهز للصيد؟</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>احجز قاربك الآن واستمتع بتجربة صيد لا تُنسى</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate('boats')}
        >استكشف قوارب الصيد</button>
      </div>
    </div>
  );
}

Object.assign(window, { WeatherPage, FishingGuidePage });
