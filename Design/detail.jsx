/* global React, BOATS, REVIEWS, AvailabilityWeather, Reveal, useParallax */

function ParallaxImage({ src, speed = 0.2, ...rest }) {
  const { ref, style } = useParallax(speed);
  return (
    <div ref={ref} {...rest} style={{ ...rest.style, position: 'relative', overflow: 'hidden' }}>
      <div style={{ ...style, position: 'absolute', inset: '-15% 0', backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
    </div>
  );
}

function BoatDetail({ boat, onBook, onNavigate }) {
  if (!boat) return null;
  const gallery = [
    boat.img,
    'https://images.unsplash.com/photo-1527431016407-f63ac20ae27a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1609644124182-22ba1c0b4c43?auto=format&fit=crop&w=1200&q=80',
  ];
  return (
    <>
      <div className="detail-gallery">
        <ParallaxImage src={gallery[0]} speed={0.18} className="main" />
        <ParallaxImage src={gallery[1]} speed={0.10} />
        <ParallaxImage src={gallery[2]} speed={0.14} />
        <ParallaxImage src={gallery[3]} speed={0.08} />
        <div style={{ backgroundImage: `url(${gallery[4]})`, position: 'relative', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.22 0.04 240 / 0.55)', color: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
            + ١٤ صورة
          </div>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-left">
          <div className="crumbs">
            <span>HURGHADA</span>
            <span>›</span>
            <span>RED SEA</span>
            <span>›</span>
            <span>{boat.nameEn.toUpperCase()}</span>
          </div>

          <Reveal as="h1">{boat.name}<br /><em style={{ fontSize: '0.55em' }}>{boat.nameEn}</em></Reveal>

          <div className="detail-meta-row">
            <div className="item"><span className="l">TYPE</span><span className="v">{boat.typeEn}</span></div>
            <div className="item"><span className="l">LENGTH</span><span className="v">{boat.length} FT</span></div>
            <div className="item"><span className="l">PAX</span><span className="v">UP TO {boat.pax}</span></div>
            <div className="item"><span className="l">YEAR</span><span className="v">{boat.year}</span></div>
            <div className="item"><span className="l">COORDS</span><span className="v">{boat.coords}</span></div>
          </div>

          <div className="prose">
            <p>
              يخت {boat.name} هو واحد من أكثر القوارب حجزاً على ساحل {boat.region}. مُصمّم خصيصاً لرحلات الصيد العميق، مع أجهزة سونار Garmin حديثة، و٤ قضبان صيد Shimano احترافية، وطاقم من ثلاثة أفراد بقيادة {boat.capt} — ذو خبرة ١٨ عاماً في مياه البحر الأحمر.
            </p>
            <p>
              ينطلق القارب من مرسى الغردقة عند الشروق مباشرة، ويقصد شعاب جُفتون — واحدة من أغنى مناطق صيد التونة والكينج فيش في المنطقة. تشمل الرحلة وجبة غداء طازجة من صيد اليوم، مشروبات باردة، ومعدات صيد كاملة.
            </p>
          </div>

          <Reveal className="subhead">المواصفات التقنية</Reveal>
          <div className="spec-grid">
            <div className="cell">
              <div className="l">LENGTH OVERALL</div>
              <div className="v num">{boat.length}<span className="unit"> FT</span></div>
            </div>
            <div className="cell">
              <div className="l">ENGINE</div>
              <div className="v num">2 × 425<span className="unit"> HP</span></div>
            </div>
            <div className="cell">
              <div className="l">CRUISE SPEED</div>
              <div className="v num">22<span className="unit"> KNOTS</span></div>
            </div>
            <div className="cell">
              <div className="l">FUEL RANGE</div>
              <div className="v num">280<span className="unit"> NM</span></div>
            </div>
            <div className="cell">
              <div className="l">CABINS</div>
              <div className="v num">3<span className="unit"> SLEEPS {boat.pax}</span></div>
            </div>
            <div className="cell">
              <div className="l">BUILT</div>
              <div className="v num">{boat.year}</div>
            </div>
          </div>

          <Reveal className="subhead">ما تشمله الرحلة</Reveal>
          <div className="amen-grid">
            {[
              ['طاقم من ٣ أفراد + ربان معتمد', true],
              ['وقود للرحلة كاملة', true],
              ['معدات صيد Shimano احترافية', true],
              ['طعم طازج + علبة ثلج', true],
              ['وجبة غداء طازجة + مشروبات', true],
              ['سترات نجاة + تأمين', true],
              ['سونار Garmin + GPS + راديو VHF', true],
              ['صاج مزدوج + مشواة للأسماك', true],
              ['مظلة خلفية + ٤ كراسي صيد دوارة', true],
              ['حمام + دش بمياه عذبة', true],
            ].map(([label], i) => (
              <div key={i} className="amen-item">
                <span className="tick">✓</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <AvailabilityWeather boat={boat} region={boat.regionEn.toLowerCase()} />

          <Reveal className="subhead" id="reviews">التقييمات · {boat.rating.toFixed(2)} / 5 ({boat.reviews} تقييم)</Reveal>
          {REVIEWS.map((r, i) => (
            <div key={i} className="review">
              <div className="author">
                <div className="name">{r.name}</div>
                <div className="date">{r.date}</div>
                <div className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
              </div>
              <div className="body">
                <div className="excerpt">«{r.excerpt}»</div>
                <p>{r.body}</p>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ marginTop: 20 }}>
            عرض كل {boat.reviews} تقييم ←
          </button>

          <Reveal className="subhead">الموقع ونقطة الانطلاق</Reveal>
          <div style={{ aspectRatio: '16/7', background: 'var(--sand-2)', position: 'relative', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&w=1800&q=60)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'saturate(0.5) contrast(1.1)',
            }} />
            <div style={{ position: 'absolute', top: '40%', left: '45%', width: 18, height: 18, borderRadius: '50%', background: 'var(--clay)', border: '3px solid var(--foam)', boxShadow: '0 0 0 6px oklch(0.60 0.13 45 / 0.25)' }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'var(--foam)', padding: '10px 14px', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.08em', direction: 'ltr' }}>
              HURGHADA MARINA · BERTH 42 · {boat.coords}
            </div>
          </div>
        </div>

        {/* Booking panel */}
        <div className="booking-panel">
          <div className="price-row">
            <div className="price">
              <span className="num">{boat.price.toLocaleString('en')}</span>
              <span className="unit"> EGP / يوم</span>
            </div>
            <div className="rating">
              <div className="v">★ {boat.rating.toFixed(2)}</div>
              <div>{boat.reviews} REVIEWS</div>
            </div>
          </div>

          <div className="form-field">
            <label>تاريخ الرحلة</label>
            <input defaultValue="الخميس · 12 مايو 2026" />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>الانطلاق</label>
              <select defaultValue="6:00"><option>06:00 صباحاً</option></select>
            </div>
            <div className="form-field">
              <label>العودة</label>
              <select defaultValue="16:00"><option>04:00 مساءً</option></select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>المدة</label>
              <select><option>يوم كامل · 10 س</option></select>
            </div>
            <div className="form-field">
              <label>المسافرون</label>
              <select><option>6 أشخاص</option></select>
            </div>
          </div>

          <div className="line-items">
            <div className="row"><span className="l">{boat.price.toLocaleString('en')} EGP × 1 يوم</span><span className="v">{boat.price.toLocaleString('en')}</span></div>
            <div className="row"><span className="l">رسوم الخدمة (12%)</span><span className="v">{Math.round(boat.price * 0.12).toLocaleString('en')}</span></div>
            <div className="row"><span className="l">تأمين الرحلة</span><span className="v">180</span></div>
            <div className="row total"><span className="l">الإجمالي</span><span className="v">{(boat.price + Math.round(boat.price * 0.12) + 180).toLocaleString('en')} EGP</span></div>
          </div>

          <button className="btn btn-clay btn-lg cta-shimmer" style={{ width: '100%', marginTop: 18 }} onClick={() => onBook(boat)}>
            متابعة الحجز ←
          </button>

          <div className="guarantee">
            ✓ دفعتك محفوظة في ضمان SeaConnect حتى ٢٤ ساعة بعد انتهاء الرحلة.<br />
            ✓ إلغاء مجاني حتى ٤٨ ساعة قبل الانطلاق.<br />
            ✓ قبول Fawry · Vodafone Cash · InstaPay · Visa.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { BoatDetail });
