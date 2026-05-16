/* global React */

// ── Map View ─────────────────────────────────────────
function MapView({ onNavigate, onOpenBoat }) {
  const { useState, useRef, useEffect } = React;
  const [activePin, setActivePin] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);

  // Egypt coastal map pins — [x%, y%] within the SVG viewBox
  const pins = [
    // Red Sea
    { id: 1,  city: 'الغردقة',     cityEn: 'Hurghada',         x: 66, y: 50, count: 34, type: 'motor',    color: 'oklch(0.38 0.08 220)' },
    { id: 2,  city: 'شرم الشيخ',   cityEn: 'Sharm el Sheikh',  x: 73, y: 66, count: 28, type: 'sail',     color: 'oklch(0.42 0.14 150)' },
    { id: 3,  city: 'دهب',         cityEn: 'Dahab',             x: 77, y: 63, count: 12, type: 'fishing',  color: 'oklch(0.62 0.18 60)'  },
    { id: 4,  city: 'مرسى علم',    cityEn: 'Marsa Alam',        x: 71, y: 63, count: 9,  type: 'motor',    color: 'oklch(0.38 0.08 220)' },
    { id: 5,  city: 'سفاجا',       cityEn: 'Safaga',            x: 68, y: 55, count: 6,  type: 'fishing',  color: 'oklch(0.62 0.18 60)'  },
    { id: 6,  city: 'العقبة',      cityEn: 'Aqaba (EG side)',   x: 76, y: 69, count: 4,  type: 'sail',     color: 'oklch(0.42 0.14 150)' },
    // Mediterranean
    { id: 7,  city: 'الإسكندرية',  cityEn: 'Alexandria',        x: 40, y: 10, count: 22, type: 'motor',    color: 'oklch(0.38 0.08 220)' },
    { id: 8,  city: 'بورسعيد',     cityEn: 'Port Said',         x: 61, y: 11, count: 11, type: 'fishing',  color: 'oklch(0.62 0.18 60)'  },
    { id: 9,  city: 'مطروح',       cityEn: 'Marsa Matrouh',     x: 26, y: 10, count: 8,  type: 'motor',    color: 'oklch(0.38 0.08 220)' },
    { id: 10, city: 'دمياط',       cityEn: 'Damietta',          x: 56, y: 13, count: 5,  type: 'fishing',  color: 'oklch(0.62 0.18 60)'  },
    // Nile
    { id: 11, city: 'الأقصر',      cityEn: 'Luxor',             x: 56, y: 70, count: 14, type: 'nile',     color: 'oklch(0.55 0.12 270)' },
    { id: 12, city: 'أسوان',       cityEn: 'Aswan',             x: 56, y: 80, count: 10, type: 'nile',     color: 'oklch(0.55 0.12 270)' },
    { id: 13, city: 'سوهاج',       cityEn: 'Sohag',             x: 54, y: 60, count: 4,  type: 'nile',     color: 'oklch(0.55 0.12 270)' },
  ];

  const filters = [
    { id: 'all',     ar: 'الكل',         en: 'All',        color: 'var(--sea)' },
    { id: 'motor',   ar: 'لنشات',        en: 'Motor',      color: 'oklch(0.38 0.08 220)' },
    { id: 'sail',    ar: 'شراعي',        en: 'Sailing',    color: 'oklch(0.42 0.14 150)' },
    { id: 'fishing', ar: 'صيد',          en: 'Fishing',    color: 'oklch(0.62 0.18 60)'  },
    { id: 'nile',    ar: 'نيل',          en: 'Nile',       color: 'oklch(0.55 0.12 270)' },
  ];

  const filteredPins = activeFilter === 'all' ? pins : pins.filter(p => p.type === activeFilter);
  const activeBoat = BOATS ? BOATS[Math.floor(Math.random() * BOATS.length)] : null;

  // Pan handlers
  const onMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setMapOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const pinForBoat = (pinId) => {
    if (!BOATS) return null;
    return BOATS[pinId % BOATS.length];
  };

  return (
    <div className="map-layout">
      {/* Map header */}
      <div className="map-header">
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>LIVE MAP · الخريطة الحية</div>
          <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 24, margin: 0 }}>قوارب متاحة الآن</h2>
        </div>
        <div className="map-boat-count">
          <span className="live-dot" />
          <span className="mono" style={{ fontSize: 13 }}>183 قارب مباشر</span>
        </div>
        <button className="btn btn-ghost" onClick={() => onNavigate('boats')}>
          عرض القائمة
        </button>
      </div>

      {/* Filter strip */}
      <div className="map-filters">
        {filters.map(f => (
          <button
            key={f.id}
            className={`map-filter-btn ${activeFilter === f.id ? 'active' : ''}`}
            style={activeFilter === f.id ? { borderColor: f.color, color: f.color, background: f.color.replace(')', ' / 0.08)').replace('oklch(', 'oklch(') } : {}}
            onClick={() => setActiveFilter(f.id)}
          >
            <span className="map-filter-dot" style={{ background: f.color }} />
            {f.ar} · <span className="mono" style={{ fontSize: 11 }}>{f.en}</span>
          </button>
        ))}
      </div>

      <div className="map-body">
        {/* The map */}
        <div
          className="map-canvas"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          {/* Zoom controls */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}>+</button>
            <div className="zoom-level mono" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>−</button>
            <button className="zoom-btn" style={{ fontSize: 10 }} onClick={() => { setZoom(1); setMapOffset({ x: 0, y: 0 }); }}>⌂</button>
          </div>

          <div style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`, transformOrigin: '50% 50%', transition: dragging ? 'none' : 'transform 0.1s' }}>
            <svg
              ref={svgRef}
              viewBox="0 0 900 700"
              width="100%"
              height="100%"
              style={{ display: 'block' }}
            >
              {/* Egypt outline — simplified polygon */}
              <defs>
                <filter id="mapShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="oklch(0 0 0 / 0.15)"/>
                </filter>
                <linearGradient id="seaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.62 0.08 220)" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="oklch(0.45 0.10 240)" stopOpacity="0.15"/>
                </linearGradient>
                <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.95 0.015 85)"/>
                  <stop offset="100%" stopColor="oklch(0.90 0.02 80)"/>
                </linearGradient>
                <pattern id="dotGrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.8" fill="oklch(0.70 0.04 220 / 0.4)"/>
                </pattern>
              </defs>

              {/* Sea background */}
              <rect width="900" height="700" fill="url(#dotGrid)" rx="12"/>
              <rect width="900" height="700" fill="url(#seaGrad)" rx="12"/>

              {/* Mediterranean label */}
              <text x="320" y="45" fontFamily="var(--ff-mono)" fontSize="11" fill="oklch(0.38 0.08 220)" opacity="0.7" textAnchor="middle" letterSpacing="2">
                MEDITERRANEAN · البحر المتوسط
              </text>

              {/* Red Sea label */}
              <text x="730" y="400" fontFamily="var(--ff-mono)" fontSize="11" fill="oklch(0.38 0.08 220)" opacity="0.7" textAnchor="middle" letterSpacing="2" transform="rotate(-80, 730, 400)">
                RED SEA · البحر الأحمر
              </text>

              {/* Egypt land mass — simplified */}
              <polygon
                points="
                  200,70 250,65 300,60 360,58 420,56 480,56 540,56 600,58 620,62 650,68
                  670,80 680,100 680,130 690,160 695,200 690,230 685,260 680,290 700,320
                  720,350 730,380 720,420 700,450 680,470 670,490 660,510
                  640,520 620,530 600,540 580,550 570,570 560,590 550,610 545,640
                  530,650 510,650 490,640 480,620 470,610 440,590 410,570
                  380,560 360,560 340,550 310,540 280,520 260,500 240,480
                  220,450 200,420 190,380 185,340 185,300 185,260 185,220
                  185,180 185,140 190,110 195,85
                "
                fill="url(#landGrad)"
                stroke="oklch(0.75 0.04 85)"
                strokeWidth="1.5"
                filter="url(#mapShadow)"
              />

              {/* Sinai peninsula */}
              <polygon
                points="
                  650,68 670,80 690,100 700,130 710,160 720,190
                  740,220 760,240 780,250 790,270 780,290 760,310
                  740,330 720,350 700,320 685,260 680,230 690,200
                  695,160 680,130 665,100
                "
                fill="url(#landGrad)"
                stroke="oklch(0.75 0.04 85)"
                strokeWidth="1.5"
              />

              {/* Suez canal */}
              <line x1="650" y1="68" x2="650" y2="130" stroke="oklch(0.38 0.08 220)" strokeWidth="3" strokeDasharray="4 2" opacity="0.5"/>
              <text x="658" y="100" fontFamily="var(--ff-mono)" fontSize="8" fill="oklch(0.38 0.08 220)" opacity="0.7">SUEZ</text>

              {/* Nile river — stylized path */}
              <path
                d="M 540 56 C 545 100, 548 150, 545 200 C 542 250, 548 300, 546 350 C 544 400, 548 450, 546 500 C 544 550, 546 590, 540 640"
                fill="none"
                stroke="oklch(0.55 0.12 210)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />
              {/* Nile delta */}
              <path
                d="M 540 56 C 500 50, 470 52, 440 62 C 480 56, 510 54, 540 56 C 570 54, 600 58, 620 62"
                fill="none"
                stroke="oklch(0.55 0.12 210)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.5"
              />
              <text x="530" y="44" fontFamily="var(--ff-mono)" fontSize="8" fill="oklch(0.45 0.10 210)" textAnchor="middle" opacity="0.8">NILE DELTA</text>

              {/* Cairo label */}
              <circle cx="555" cy="100" r="4" fill="oklch(0.35 0.08 220)" opacity="0.6"/>
              <text x="565" y="104" fontFamily="var(--ff-mono)" fontSize="9" fill="oklch(0.30 0.05 220)" opacity="0.8">CAIRO · القاهرة</text>

              {/* Pins */}
              {filteredPins.map(pin => {
                const px = (pin.x / 100) * 900;
                const py = (pin.y / 100) * 700;
                const isActive = activePin === pin.id;
                return (
                  <g
                    key={pin.id}
                    onClick={(e) => { e.stopPropagation(); setActivePin(isActive ? null : pin.id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulse ring for active */}
                    {isActive && (
                      <circle cx={px} cy={py} r="22" fill={pin.color} opacity="0.15" style={{ animation: 'pulse 1.5s infinite' }}/>
                    )}
                    {/* Pin body */}
                    <circle
                      cx={px}
                      cy={py}
                      r={isActive ? 16 : 13}
                      fill={pin.color}
                      opacity={isActive ? 1 : 0.85}
                      stroke="oklch(1 0 0 / 0.8)"
                      strokeWidth="2"
                      style={{ transition: 'r 0.15s, opacity 0.15s' }}
                    />
                    {/* Count label */}
                    <text
                      x={px}
                      y={py + 4}
                      textAnchor="middle"
                      fontFamily="var(--ff-mono)"
                      fontSize={isActive ? 10 : 9}
                      fontWeight="700"
                      fill="white"
                    >
                      {pin.count}
                    </text>
                    {/* City label */}
                    <text
                      x={px}
                      y={py + 26}
                      textAnchor="middle"
                      fontFamily="var(--ff-sans)"
                      fontSize="9"
                      fill="oklch(0.20 0.04 220)"
                      fontWeight={isActive ? '700' : '400'}
                      opacity={isActive ? 1 : 0.75}
                    >
                      {pin.cityEn}
                    </text>
                  </g>
                );
              })}

              {/* Click to deselect */}
              <rect width="900" height="700" fill="transparent" onClick={() => setActivePin(null)} style={{ pointerEvents: activePin ? 'all' : 'none' }} rx="12"/>
            </svg>
          </div>
        </div>

        {/* Side panel */}
        <div className="map-side">
          {activePin ? (
            (() => {
              const pin = pins.find(p => p.id === activePin);
              const boat = pinForBoat(activePin);
              return (
                <div className="map-popup-panel">
                  <div className="map-popup-header">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{pin.city}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{pin.cityEn}</div>
                    </div>
                    <span
                      className="map-type-badge"
                      style={{ background: pin.color + ' / 0.12)', color: pin.color }}
                    >
                      {pin.count} قارب
                    </span>
                  </div>
                  {boat && (
                    <div className="map-boat-card" onClick={() => onOpenBoat && onOpenBoat(boat)}>
                      <div className="map-boat-img" style={{ backgroundImage: `url(${boat.img})` }} />
                      <div className="map-boat-body">
                        <div className="map-boat-name">{boat.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{boat.typeEn} · {boat.length}ft · {boat.pax} pax</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                          <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{boat.price.toLocaleString('en')} <span style={{ fontSize: 10, fontWeight: 400 }}>EGP/DAY</span></div>
                          <div style={{ fontSize: 12 }}>⭐ {boat.rating.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => onNavigate('boats')}
                  >
                    عرض كل قوارب {pin.city}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%' }}
                    onClick={() => setActivePin(null)}
                  >
                    إغلاق
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="map-legend-panel">
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>MAP LEGEND · دليل الخريطة</div>
              {filters.filter(f => f.id !== 'all').map(f => (
                <div className="legend-item" key={f.id}>
                  <span className="legend-dot" style={{ background: f.color }} />
                  <span>{f.ar}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 'auto' }}>
                    {pins.filter(p => p.type === f.id).reduce((a, p) => a + p.count, 0)} قارب
                  </span>
                </div>
              ))}
              <div className="map-legend-divider" />
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>REGIONS</div>
              {[
                { label: 'البحر الأحمر · Red Sea', count: pins.filter(p => [1,2,3,4,5,6].includes(p.id)).reduce((a,p)=>a+p.count,0) },
                { label: 'المتوسط · Mediterranean', count: pins.filter(p => [7,8,9,10].includes(p.id)).reduce((a,p)=>a+p.count,0) },
                { label: 'النيل · Nile River', count: pins.filter(p => [11,12,13].includes(p.id)).reduce((a,p)=>a+p.count,0) },
              ].map((r, i) => (
                <div className="legend-region" key={i}>
                  <span style={{ fontSize: 13 }}>{r.label}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sea)' }}>{r.count}</span>
                </div>
              ))}
              <div className="map-legend-divider" />
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                انقر على أي دبوس على الخريطة لاستعراض القوارب المتاحة في تلك المنطقة.
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => onNavigate('boats')}>
                استعراض كل القوارب
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapView });
