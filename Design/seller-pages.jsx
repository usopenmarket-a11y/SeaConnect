/* global React, BOATS, REVIEWS */
const { useState: useStateS, useEffect: useEffectS } = React;

// ── Shared seller layout (sidebar with subnav) ──────────
function SellerLayout({ subPage, setSubPage, children, title, titleEm, kicker, actions }) {
  const navGroups = {
    'الإدارة': [
      ['لوحة التحكم', 'DASHBOARD', 'dash', null],
      ['التقويم', 'CALENDAR', 'calendar', null],
      ['الحجوزات', 'BOOKINGS', 'bookings', 8],
    ],
    'القوائم': [
      ['قاربي', 'MY BOAT', 'listing', null],
      ['معرض الصور', 'MEDIA', 'listing', 14],
      ['التسعير', 'PRICING', 'listing', null],
    ],
    'المالية': [
      ['المدفوعات', 'PAYOUTS', 'payouts', null],
      ['الضمان', 'ESCROW', 'payouts', 3],
      ['الضرائب', 'TAX', 'payouts', null],
    ],
    'الحساب': [
      ['التحقق', 'VERIFICATION', 'onboard', null],
      ['الإعدادات', 'SETTINGS', 'settings', null],
    ],
  };

  return (
    <div className="dash-layout" dir="rtl">
      <aside className="sidebar-dash">
        <div className="brand-mini">
          <span className="dot" />
          سي كونكت
          <span style={{ fontSize: 10, fontFamily: 'var(--ff-mono)', opacity: 0.6, letterSpacing: '0.1em', marginRight: 'auto' }}>OWNER</span>
        </div>
        {Object.entries(navGroups).map(([g, items]) => (
          <div key={g}>
            <div className="section-label">{g}</div>
            {items.map(([ar, en, id, n]) => (
              <div
                key={en}
                className={`nav-item ${subPage === id ? 'active' : ''}`}
                onClick={() => setSubPage(id)}
                style={{ cursor: 'pointer' }}
              >
                <span>{ar}</span>
                {n !== null && <span className="n">{n}</span>}
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 32, padding: 12, border: '1px dashed oklch(1 0 0 / 0.2)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', lineHeight: 1.6, opacity: 0.7, direction: 'ltr' }}>
          0% COMMISSION<br />
          MONTHS 1–3 ACTIVE<br />
          63 DAYS REMAINING
        </div>
      </aside>

      <div className="dash-wrap">
        {title && (
          <div className="dash-head">
            <div>
              <div className="num-tag">{kicker}</div>
              <h1>{title} <em>{titleEm}</em></h1>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>{actions}</div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Listing editor ─────────────────────────────────────
function SellerListing() {
  const [tab, setTab] = useStateS('basics');
  const [name, setName] = useStateS('البحر الأحمر');
  const [price, setPrice] = useStateS(2280);
  const tabs = [
    ['الأساسيات', 'BASICS', 'basics'],
    ['المواصفات', 'SPECS', 'specs'],
    ['الصور', 'PHOTOS', 'photos'],
    ['التسعير', 'PRICING', 'pricing'],
    ['الخدمات', 'AMENITIES', 'amenities'],
    ['السياسات', 'POLICIES', 'policies'],
  ];

  return (
    <>
      <div className="seller-tabs">
        {tabs.map(([ar, en, id]) => (
          <button key={id} className={`stab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <span className="ar">{ar}</span>
            <span className="en">{en}</span>
          </button>
        ))}
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="dash-card">
          {tab === 'basics' && (
            <>
              <h3>الأساسيات</h3>
              <div className="sub">BASIC INFORMATION</div>
              <div className="form-grid">
                <Field label="اسم القارب · بالعربية" value={name} onChange={setName} />
                <Field label="NAME · ENGLISH" value="Red Sea" />
                <Field label="نوع القارب" type="select" value="يخت صيد" options={['يخت صيد', 'فلوكة', 'يخت رفاهية', 'كاتاماران']} />
                <Field label="المنطقة" type="select" value="الغردقة · البحر الأحمر" options={['الغردقة · البحر الأحمر', 'شرم الشيخ', 'الإسكندرية', 'دهب']} />
                <Field label="نقطة الانطلاق" value="مرسى الغردقة · حوض ٤٢" />
                <Field label="إحداثيات GPS" value="27.2579° N, 33.8116° E" mono />
              </div>

              <div className="subhead-mini">وصف الرحلة · بالعربية</div>
              <textarea
                className="ta"
                rows="5"
                defaultValue="رحلة صيد كاملة في أعماق البحر الأحمر. الربان محمود سيف معتمد منذ ١٢ سنة، متخصص في صيد التونة والباراكودا. القارب مجهز بأحدث معدات السونار والصيد من Shimano، مع طاقم من ثلاثة أفراد لخدمتك."
              />
              <div className="char-count mono">524 / 1500 CHARS</div>
            </>
          )}

          {tab === 'specs' && (
            <>
              <h3>المواصفات التقنية</h3>
              <div className="sub">VESSEL SPECIFICATIONS</div>
              <div className="form-grid">
                <Field label="الطول · FT" value="42" mono />
                <Field label="السنة" value="2021" mono />
                <Field label="الطاقة · HP" value="2 × 350" mono />
                <Field label="السرعة القصوى · KNOTS" value="32" mono />
                <Field label="السعة · PAX" value="8" mono />
                <Field label="الكابينات" value="2" mono />
                <Field label="الحمامات" value="1" mono />
                <Field label="مدى الإبحار · NM" value="180" mono />
              </div>

              <div className="subhead-mini">المعدات الموجودة</div>
              <div className="chip-grid">
                {['سونار Garmin', 'GPS متطور', 'راديو VHF', '٤ كراسي صيد دوارة', 'صنّارات Shimano', 'مظلة خلفية', 'مكيف هواء', 'مطبخ صغير', 'حمام بمياه عذبة', 'سترات نجاة ×١٠', 'إطفاء حريق', 'نظام قمر صناعي'].map(t => (
                  <span key={t} className="chip-on">✓ {t}</span>
                ))}
                <span className="chip-add">+ إضافة</span>
              </div>
            </>
          )}

          {tab === 'photos' && (
            <>
              <h3>معرض الصور · ١٤ صورة</h3>
              <div className="sub">PHOTOS · DRAG TO REORDER · FIRST PHOTO IS THE COVER</div>
              <div className="photo-mgr">
                {BOATS.slice(0, 12).map((b, i) => (
                  <div key={i} className={`pm-cell ${i === 0 ? 'cover' : ''}`} style={{ backgroundImage: `url(${b.img})` }}>
                    <div className="pm-num mono">{String(i + 1).padStart(2, '0')}</div>
                    {i === 0 && <div className="pm-badge mono">COVER</div>}
                    <div className="pm-actions">
                      <button title="جعل الغلاف">★</button>
                      <button title="حذف">✕</button>
                    </div>
                  </div>
                ))}
                <div className="pm-cell pm-add">
                  <div className="plus">+</div>
                  <div className="lbl">إضافة صور</div>
                  <div className="hint mono">DRAG · OR CLICK</div>
                </div>
                <div className="pm-cell pm-add">
                  <div className="plus">▶</div>
                  <div className="lbl">إضافة فيديو</div>
                  <div className="hint mono">MP4 · MAX 60S</div>
                </div>
              </div>
            </>
          )}

          {tab === 'pricing' && (
            <>
              <h3>التسعير الديناميكي</h3>
              <div className="sub">DYNAMIC PRICING · WEEKDAY × SEASON</div>

              <div className="pricing-matrix">
                <div className="pm-head">
                  <div></div>
                  {['شتاء', 'ربيع', 'صيف', 'خريف'].map(s => <div key={s}>{s}</div>)}
                </div>
                {[['أحد', 1.0], ['اثنين', 1.0], ['ثلاثاء', 1.0], ['أربعاء', 1.05], ['خميس', 1.15], ['جمعة', 1.3], ['سبت', 1.25]].map(([d, base]) => (
                  <div key={d} className="pm-row">
                    <div className="pm-day">{d}</div>
                    {[0.85, 1.0, 1.2, 0.95].map((seasonMult, si) => {
                      const p = Math.round(price * base * seasonMult / 10) * 10;
                      const high = p > 3200;
                      return (
                        <div key={si} className={`pm-cell-p ${high ? 'high' : ''}`}>
                          <div className="num">{(p / 1000).toFixed(2)}<span>K</span></div>
                          <div className="mono mult">×{(base * seasonMult).toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="row-2" style={{ marginTop: 24 }}>
                <Field label="السعر الأساسي · باليوم" value={price} onChange={(v) => setPrice(+v || 0)} mono suffix="EGP" />
                <Field label="نصف يوم · ٦ ساعات" value="60% من اليوم" />
                <Field label="رحلة ليلية" value="+ 800 EGP" mono />
                <Field label="عرض ٣ أيام" value="−10% خصم" />
              </div>
            </>
          )}

          {tab === 'amenities' && (
            <>
              <h3>الخدمات المشمولة</h3>
              <div className="sub">WHAT'S INCLUDED IN THE TRIP</div>
              <div className="amen-toggle-grid">
                {[
                  ['طاقم من ٣ أفراد', true],
                  ['وقود الرحلة كاملة', true],
                  ['وجبة غداء طازجة', true],
                  ['مشروبات + قهوة', true],
                  ['طعم طازج', true],
                  ['معدات صيد كاملة', true],
                  ['صاج مزدوج للشواء', true],
                  ['سترات نجاة', true],
                  ['تأمين رحلة', true],
                  ['مدرّب صيد محترف', false],
                  ['غطس مع الزعانف', false],
                  ['نقل من الفندق', false],
                ].map(([n, on]) => (
                  <label key={n} className={`atog ${on ? 'on' : ''}`}>
                    <span className="check">{on ? '✓' : '+'}</span>
                    <span>{n}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {tab === 'policies' && (
            <>
              <h3>سياسات الإلغاء والحضور</h3>
              <div className="sub">CANCELLATION & POLICIES</div>
              <div className="policy-stack">
                {[
                  ['إلغاء مرن', 'استرداد كامل قبل ٤٨ ساعة', false],
                  ['إلغاء معتدل', 'استرداد كامل قبل ٧ أيام · جزئي قبل ٤٨ ساعة', true],
                  ['إلغاء صارم', 'استرداد جزئي ٥٠٪ قبل ١٤ يوم فقط', false],
                ].map(([t, d, on], i) => (
                  <label key={i} className={`policy-card ${on ? 'on' : ''}`}>
                    <div className="radio" />
                    <div>
                      <div className="t">{t}</div>
                      <div className="d">{d}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="subhead-mini" style={{ marginTop: 28 }}>قواعد إضافية</div>
              <div className="rules">
                {['التدخين ممنوع داخل الكابينة', 'الحيوانات الأليفة بإذن مسبق', 'لا تسمح بالحفلات الصاخبة', 'الأطفال تحت ١٢ مع وصي'].map(r => (
                  <div key={r} className="rule-item">
                    <span className="x">✓</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Live preview */}
        <div className="dash-card" style={{ position: 'sticky', top: 20, alignSelf: 'flex-start', padding: 0, overflow: 'hidden' }}>
          <div className="preview-bar mono">
            <span>● LIVE PREVIEW · كما يراه العميل</span>
            <span style={{ marginRight: 'auto', opacity: 0.6 }}>↗</span>
          </div>
          <div style={{ background: `url(${BOATS[0].img}) center/cover`, height: 220, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, insetInlineStart: 12, padding: '4px 10px', background: 'oklch(1 0 0 / 0.92)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em' }}>OFFSHORE FISHING</div>
          </div>
          <div style={{ padding: '20px 24px 24px' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', direction: 'ltr' }}>OFFSHORE FISHING · HURGHADA</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 28, fontWeight: 700, marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 4 }}>مع <em>Capt. Mahmoud Seif</em></div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--muted)', marginTop: 10, direction: 'ltr' }}>42FT · 8 PAX · 2021</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
              <div>
                <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700 }}>{Number(price).toLocaleString('en')}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}> EGP / DAY</span>
              </div>
              <div className="num">★ 4.92 (148)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="status">
          <span className="dot-live" />
          <strong>القائمة منشورة</strong>
          <span className="mono">· LAST EDIT 12 MIN AGO</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost">معاينة كعميل</button>
          <button className="btn btn-clay">حفظ التعديلات</button>
        </div>
      </div>
    </>
  );
}

// ── Field helper ───────────────────────────────────────
function Field({ label, value, onChange, mono, suffix, type = 'text', options = [] }) {
  return (
    <div className="ff">
      <label className="mono">{label}</label>
      {type === 'select' ? (
        <select defaultValue={value}>{options.map(o => <option key={o}>{o}</option>)}</select>
      ) : (
        <div className="ff-row">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            className={mono ? 'mono' : ''}
            readOnly={!onChange}
          />
          {suffix && <span className="ff-suffix mono">{suffix}</span>}
        </div>
      )}
    </div>
  );
}

// ── Bookings list + detail ─────────────────────────────
function SellerBookings() {
  const [filter, setFilter] = useStateS('upcoming');
  const [selectedIdx, setSel] = useStateS(0);

  const all = [
    { id: 'BK-7421', d: '12 MAY 2026', dAr: '١٢ مايو', t: '06:00', name: 'نور حسن', en: 'Nour Hassan', pax: 6, hours: 10, amt: 5480, status: 'pending', avatar: 'ن', phone: '+20 100 ••• 5678', email: 'nour.h@protonmail.com', payment: 'FAWRY · CODE 84296·15', notes: 'تفضل الإبحار شمالاً للوصول إلى منطقة التونة. يحضر معه ابن أخته (16 سنة).' },
    { id: 'BK-7418', d: '18 MAY 2026', dAr: '١٨ مايو', t: '07:00', name: 'Liam Carter', en: 'Liam Carter', pax: 4, hours: 6, amt: 3800, status: 'ok', avatar: 'L', phone: '+44 7700 900123', email: 'liam.c@gmail.com', payment: 'VISA •••• 4421', notes: 'First time in Egypt — beginner level fishing.' },
    { id: 'BK-7409', d: '24 MAY 2026', dAr: '٢٤ مايو', t: '06:00', name: 'أحمد لطفي', en: 'Ahmed Lotfy', pax: 8, hours: 10, amt: 6200, status: 'ok', avatar: 'أ', phone: '+20 122 ••• 1199', email: 'ahmed.l@outlook.com', payment: 'INSTAPAY', notes: 'مجموعة أصدقاء — يفضلون الصيد + غداء على الجزيرة.' },
    { id: 'BK-7403', d: '02 JUN 2026', dAr: '٢ يونيو', t: '06:30', name: 'Sara Klein', en: 'Sara Klein', pax: 3, hours: 6, amt: 2900, status: 'ok', avatar: 'S', phone: '+49 175 8810022', email: 'sara@klein.de', payment: 'VISA •••• 7812', notes: 'Snorkeling preferred over deep fishing. Vegetarian lunch.' },
    { id: 'BK-7398', d: '08 JUN 2026', dAr: '٨ يونيو', t: '06:00', name: 'منى صبري', en: 'Mona Sabry', pax: 10, hours: 10, amt: 7400, status: 'pending', avatar: 'م', phone: '+20 111 ••• 4480', email: 'mona.sabry@gmail.com', payment: 'FAWRY · CODE 71820·09', notes: 'احتفال عائلي بعيد ميلاد. يطلبون كيك + ديكور بسيط.' },
  ];
  const sel = all[selectedIdx] || all[0];

  return (
    <div className="bookings-split">
      <div className="bookings-list">
        <div className="bl-tabs">
          {[['upcoming', 'القادمة', 8], ['pending', 'بانتظار الدفع', 2], ['past', 'منتهية', 41], ['cancelled', 'ملغاة', 3]].map(([id, ar, n]) => (
            <button key={id} className={`bl-tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
              {ar}<span className="n mono">{n}</span>
            </button>
          ))}
        </div>
        <div className="bl-search">
          <input placeholder="بحث برقم الحجز أو اسم العميل…" />
        </div>
        <div className="bl-rows">
          {all.map((b, i) => (
            <div key={b.id} className={`bl-row ${i === selectedIdx ? 'sel' : ''}`} onClick={() => setSel(i)}>
              <div className="ava">{b.avatar}</div>
              <div className="info">
                <div className="top">
                  <span className="name">{b.name}</span>
                  <span className="mono id">{b.id}</span>
                </div>
                <div className="bot">
                  <span>{b.dAr} · {b.t}</span>
                  <span className="mono">·</span>
                  <span>{b.pax} أشخاص</span>
                  <span className="mono">·</span>
                  <span className={`s-mini ${b.status}`}>{b.status === 'ok' ? '✓ مدفوع' : '⏱ معلّق'}</span>
                </div>
              </div>
              <div className="amt num">{(b.amt / 1000).toFixed(1)}K</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bookings-detail">
        <div className="bd-head">
          <div>
            <div className="num-tag" style={{ direction: 'ltr' }}>§ BOOKING · {sel.id}</div>
            <h2>{sel.name} <span className="en">/ {sel.en}</span></h2>
          </div>
          <span className={`pill-status ${sel.status}`}>{sel.status === 'ok' ? '✓ CONFIRMED · PAID' : '⏱ AWAITING PAYMENT'}</span>
        </div>

        <div className="bd-grid">
          {[
            ['DATE · التاريخ', `${sel.dAr} ٢٠٢٦`],
            ['BOARDING · الصعود', `${sel.t} صباحاً`],
            ['DURATION · المدة', `${sel.hours} ساعات`],
            ['PAX · المسافرون', `${sel.pax} أشخاص`],
            ['MARINA · المرسى', 'الغردقة · حوض ٤٢'],
            ['BOAT · القارب', 'البحر الأحمر · 42FT'],
          ].map(([l, v]) => (
            <div key={l} className="bd-cell">
              <div className="l mono">{l}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>

        <div className="dash-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 24 }}>
          <div className="bd-card">
            <h4>تفاصيل العميل</h4>
            <div className="kv"><span>الجوال</span><span className="mono">{sel.phone}</span></div>
            <div className="kv"><span>البريد</span><span className="mono">{sel.email}</span></div>
            <div className="kv"><span>العميل منذ</span><span>أبريل ٢٠٢٦ · ٣ حجوزات</span></div>
            <div className="kv"><span>التقييم</span><span>★ 5.0 (٢ مراجعات)</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}>اتصال</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}>واتساب</button>
            </div>
          </div>

          <div className="bd-card">
            <h4>الدفع</h4>
            <div className="kv"><span>طريقة الدفع</span><span className="mono">{sel.payment}</span></div>
            <div className="kv"><span>السعر الأساسي</span><span className="num">{sel.amt.toLocaleString('en')} EGP</span></div>
            <div className="kv"><span>عمولة المنصة</span><span className="num" style={{ color: 'oklch(0.48 0.13 155)' }}>0% · شهر ترويج</span></div>
            <div className="kv"><span>صافي المستحق لك</span><span className="num" style={{ fontWeight: 700, fontFamily: 'var(--ff-display)', fontSize: 18 }}>{Math.round(sel.amt * 0.95).toLocaleString('en')} EGP</span></div>
            <div className="kv"><span>تاريخ الإفراج</span><span>بعد ٢٤ ساعة من الإبحار</span></div>
          </div>
        </div>

        <div className="bd-card" style={{ marginTop: 16 }}>
          <h4>ملاحظات العميل</h4>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', fontStyle: 'italic' }}>«{sel.notes}»</p>
        </div>

        <div className="bd-chat">
          <h4>محادثة مع العميل</h4>
          <div className="chat-stream">
            <div className="msg in">
              <div className="bubble">
                مرحباً، أهلاً بك! استلمت حجزك. هل هناك تفضيلات خاصة للوجبات أو الإبحار؟
              </div>
              <div className="time mono">YESTERDAY · 14:32</div>
            </div>
            <div className="msg out">
              <div className="bubble">
                {sel.notes}
              </div>
              <div className="time mono">YESTERDAY · 16:48</div>
            </div>
            <div className="msg in">
              <div className="bubble">
                ممتاز، سأجهز كل شيء. الموعد ٠٦:٠٠ صباحاً عند حوض ٤٢. أحضر معك واقي شمس وقبعة.
              </div>
              <div className="time mono">TODAY · 09:14</div>
            </div>
          </div>
          <div className="chat-input">
            <input placeholder="اكتب رسالتك…" />
            <button className="btn btn-clay">إرسال ←</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar full-page ────────────────────────────────
function SellerCalendar() {
  const [month, setMonth] = useStateS(4);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Generate full month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  const startOffset = 4; // example
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push({ empty: true });
      continue;
    }
    const variant = (day * 7 + month) % 13;
    let status = 'open';
    let booking = null;
    if (variant < 3) { status = 'booked'; booking = ['نور حسن', 'Liam Carter', 'أحمد لطفي', 'Sara K.', 'منى صبري'][variant % 5]; }
    else if (variant < 5) status = 'limited';
    else if (variant === 7) status = 'block';
    cells.push({ day, status, booking, price: status === 'limited' ? 2660 : 2280 });
  }

  return (
    <>
      <div className="cal-toolbar">
        <div className="month-nav">
          <button onClick={() => setMonth(Math.max(0, month - 1))}>←</button>
          <div className="month-label">
            <div className="ar">{months[month]} ٢٠٢٦</div>
            <div className="en">{monthsEn[month]} 2026</div>
          </div>
          <button onClick={() => setMonth(Math.min(11, month + 1))}>→</button>
        </div>

        <div className="cal-stats">
          <div><span className="mono">BOOKED</span><span className="num">12</span></div>
          <div><span className="mono">OPEN</span><span className="num">17</span></div>
          <div><span className="mono">BLOCKED</span><span className="num">2</span></div>
          <div><span className="mono">REVENUE</span><span className="num">48.6K</span></div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost">قاعدة تسعير +</button>
          <button className="btn btn-clay">حظر تواريخ</button>
        </div>
      </div>

      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="big-cal-weekdays">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="big-cal-grid">
          {cells.map((c, i) => {
            if (c.empty) return <div key={i} className="bcal empty" />;
            return (
              <div key={i} className={`bcal ${c.status}`}>
                <div className="head">
                  <span className="day-num">{c.day}</span>
                  <span className="mono price">{c.status !== 'block' && c.status !== 'booked' ? `${(c.price / 1000).toFixed(1)}K` : ''}</span>
                </div>
                {c.status === 'booked' && (
                  <div className="event">
                    <div className="dot-bk" />
                    <div className="ev-name">{c.booking}</div>
                    <div className="ev-time mono">06:00 · 6P</div>
                  </div>
                )}
                {c.status === 'limited' && (
                  <div className="event mini">
                    <span className="mono">⚡ HOT · ١ متبقي</span>
                  </div>
                )}
                {c.status === 'block' && (
                  <div className="event mini block">
                    <span className="mono">⛔ صيانة</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-row" style={{ marginTop: 24, gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="dash-card">
          <h3>قواعد التسعير النشطة</h3>
          <div className="sub">3 PRICING RULES ACTIVE</div>
          {[
            ['عطلة نهاية الأسبوع', '+30% خميس + جمعة'],
            ['ذروة الموسم', '+20% يونيو – أغسطس'],
            ['عرض ٣ أيام', '−10% خصم متعدد الأيام'],
          ].map(([t, d]) => (
            <div key={t} className="rule-row">
              <div>
                <div className="t">{t}</div>
                <div className="d mono">{d}</div>
              </div>
              <span className="dot-on" />
            </div>
          ))}
        </div>

        <div className="dash-card">
          <h3>التواريخ المحظورة</h3>
          <div className="sub">BLOCKED DATES</div>
          {[
            ['١٤ مايو', 'صيانة المحرك'],
            ['٢١ مايو', 'إجازة شخصية'],
            ['٢٨–٢٩ مايو', 'فحص خفر السواحل'],
          ].map(([d, r]) => (
            <div key={d} className="rule-row">
              <div>
                <div className="t">{d}</div>
                <div className="d">{r}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>↺</button>
            </div>
          ))}
        </div>

        <div className="dash-card" style={{ background: 'var(--abyss)', color: 'var(--sand)', borderColor: 'var(--abyss)' }}>
          <h3 style={{ color: 'var(--sand)' }}>اقتراح ذكي</h3>
          <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>SMART SUGGESTION</div>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.4, margin: '14px 0 12px' }}>
            ٧ تواريخ مفتوحة في الأسبوع القادم — السعر أعلى ١٢٪ من المتوسط. خفّض ٥٪ لزيادة الحجز.
          </p>
          <button className="btn" style={{ background: 'var(--clay)', color: 'var(--foam)', marginTop: 8 }}>طبّق ←</button>
        </div>
      </div>
    </>
  );
}

// ── Payouts ────────────────────────────────────────────
function SellerPayouts() {
  const ledger = [
    { d: '15 MAY', dAr: '١٥ مايو', amt: 38420, status: 'pending', method: 'بنك الإسكندرية ••8842', ref: 'PO-4280' },
    { d: '01 MAY', dAr: '١ مايو', amt: 41200, status: 'paid', method: 'بنك الإسكندرية ••8842', ref: 'PO-4192' },
    { d: '15 APR', dAr: '١٥ أبريل', amt: 35640, status: 'paid', method: 'بنك الإسكندرية ••8842', ref: 'PO-4108' },
    { d: '01 APR', dAr: '١ أبريل', amt: 28980, status: 'paid', method: 'بنك الإسكندرية ••8842', ref: 'PO-4021' },
    { d: '15 MAR', dAr: '١٥ مارس', amt: 19450, status: 'paid', method: 'INSTAPAY · 0100••5678', ref: 'PO-3944' },
  ];

  return (
    <>
      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="dash-card" style={{ background: 'linear-gradient(155deg, oklch(0.20 0.045 235), oklch(0.14 0.04 240))', color: 'var(--sand)', borderColor: 'transparent' }}>
          <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>NEXT PAYOUT · 15 MAY 2026</div>
          <div className="display num" style={{ fontSize: 84, lineHeight: 1, fontWeight: 700, marginTop: 8, fontFamily: 'var(--ff-display)' }}>
            38,420
            <span className="mono" style={{ fontSize: 18, fontWeight: 400, color: 'var(--sand-3)', marginRight: 8, opacity: 0.8 }}> EGP</span>
          </div>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid oklch(1 0 0 / 0.2)' }}>
            {[
              ['إجمالي الحجوزات', '43,650', null],
              ['ضمان محتجز (٣ رحلات قادمة)', '−5,230', 'hold'],
              ['عمولة المنصة 0%', '—', 'promo'],
              ['ضرائب', '0', null],
            ].map(([l, v, k]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14 }}>
                <span style={{ opacity: 0.75 }}>{l}</span>
                <span className="num mono" style={{ color: k === 'hold' ? 'var(--clay-soft)' : k === 'promo' ? 'oklch(0.78 0.14 150)' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
          <button className="btn cta-shimmer" style={{ background: 'var(--clay)', color: 'var(--foam)', width: '100%', marginTop: 18 }}>تحويل فوري الآن (رسوم 0.5%)</button>
        </div>

        <div className="dash-card">
          <h3>حساب البنك</h3>
          <div className="sub">BANK ACCOUNT · DEFAULT</div>
          <div className="bank-card">
            <div className="bk-bank">بنك الإسكندرية</div>
            <div className="bk-num mono">EG 21 · ••• ••• ••• ••• 8842</div>
            <div className="bk-name">MAHMOUD SEIF · محمود سيف</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>تعديل</button>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>+ حساب جديد</button>
          </div>

          <h3 style={{ marginTop: 24 }}>دورة الدفع</h3>
          <div className="sub">PAYOUT SCHEDULE</div>
          <div className="schedule">
            {[['كل أسبوع', false], ['كل أسبوعين', true], ['كل شهر', false]].map(([t, on]) => (
              <label key={t} className={`sched-opt ${on ? 'on' : ''}`}>
                <span className="radio" />{t}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ marginTop: 24 }}>
        <h3>دفتر السجلات</h3>
        <div className="sub">PAYOUT HISTORY · LAST 90 DAYS</div>
        <table className="dash-table">
          <thead>
            <tr><th>المرجع</th><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th></th></tr>
          </thead>
          <tbody>
            {ledger.map(l => (
              <tr key={l.ref}>
                <td className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{l.ref}</td>
                <td>{l.dAr} ٢٠٢٦</td>
                <td className="num" style={{ fontWeight: 600 }}>{l.amt.toLocaleString('en')} EGP</td>
                <td className="mono" style={{ direction: 'ltr', fontSize: 12 }}>{l.method}</td>
                <td><span className={`pill-status ${l.status === 'paid' ? 'ok' : 'pending'}`}>{l.status === 'paid' ? '✓ DEPOSITED' : '⏱ SCHEDULED'}</span></td>
                <td><button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>إيصال PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dash-card" style={{ marginTop: 24 }}>
        <h3>الضمان النشط · ESCROW</h3>
        <div className="sub">3 BOOKINGS HELD · RELEASES AFTER 24H FROM TRIP END</div>
        <div className="escrow-list">
          {[
            { id: 'BK-7421', name: 'نور حسن', d: '12 MAY', amt: 5480, hours: 14 },
            { id: 'BK-7409', name: 'أحمد لطفي', d: '24 MAY', amt: 6200, hours: 312 },
            { id: 'BK-7398', name: 'منى صبري', d: '8 JUN', amt: 7400, hours: 720 },
          ].map(e => (
            <div key={e.id} className="escrow-row">
              <div>
                <div className="t">{e.name} · <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{e.id}</span></div>
                <div className="d mono">RELEASES IN {e.hours}H · {e.d} +24H</div>
              </div>
              <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700 }}>{e.amt.toLocaleString('en')} EGP</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Onboarding wizard ─────────────────────────────────
function SellerOnboard() {
  const steps = [
    { n: '01', t: 'الهوية الشخصية', en: 'IDENTITY', s: 'done' },
    { n: '02', t: 'مستندات القارب', en: 'VESSEL DOCS', s: 'done' },
    { n: '03', t: 'رخصة الربان', en: 'CAPTAIN LICENSE', s: 'done' },
    { n: '04', t: 'تأمين القارب', en: 'INSURANCE', s: 'active' },
    { n: '05', t: 'فحص الفريق', en: 'PHYSICAL INSPECTION', s: 'pending' },
    { n: '06', t: 'الحساب البنكي', en: 'PAYOUT SETUP', s: 'pending' },
  ];

  return (
    <>
      <div className="onb-progress">
        <div className="onb-bar"><div className="onb-fill" style={{ width: '50%' }} /></div>
        <div className="onb-pct mono">3 / 6 COMPLETE · 50%</div>
      </div>

      <div className="onb-stepper">
        {steps.map((s, i) => (
          <div key={s.n} className={`onb-step ${s.s}`}>
            <div className="circle">
              {s.s === 'done' ? '✓' : s.n}
            </div>
            <div className="lbl">
              <div className="ar">{s.t}</div>
              <div className="en mono">{s.en}</div>
            </div>
            {i < steps.length - 1 && <div className="line" />}
          </div>
        ))}
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 32 }}>
        <div className="dash-card">
          <div className="num-tag">§ STEP 04 · INSURANCE</div>
          <h2 style={{ marginTop: 8 }}>تأمين القارب <em>والمسافرين</em></h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginTop: 12, maxWidth: '52ch' }}>
            كل قارب على المنصة يجب أن يكون مؤمّناً ضد الحوادث البحرية ومسؤولية الطرف الثالث. يمكنك رفع شهادة تأمين قائمة، أو شراء تغطية SeaConnect المعتمدة.
          </p>

          <div className="ins-options">
            <label className="ins-card">
              <div className="radio" />
              <div className="body">
                <div className="t">SeaConnect Marine · موصى به</div>
                <div className="d">تغطية شاملة · ١,٥٠٠,٠٠٠ EGP حدّ أقصى · مسافرون + قارب + مسؤولية</div>
                <div className="price num">2,180 EGP / سنة</div>
              </div>
              <div className="badge mono">RECOMMENDED</div>
            </label>
            <label className="ins-card on">
              <div className="radio" />
              <div className="body">
                <div className="t">رفع شهادة موجودة</div>
                <div className="d">إذا كان لديك تأمين بالفعل من شركة معتمدة (مصر للتأمين، GIG، أكسا)</div>
                <div className="upload-zone mono">
                  <span>↑ اسحب الشهادة هنا · PDF / JPG · MAX 10MB</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="dash-card">
          <h3>قائمة التحقق</h3>
          <div className="sub">VERIFICATION CHECKLIST</div>
          {[
            ['البطاقة الشخصية أو جواز سفر ساري', true],
            ['عقد ملكية القارب', true],
            ['شهادة تسجيل خفر السواحل', true],
            ['رخصة قيادة بحرية معتمدة', true],
            ['شهادة تأمين سارية', false],
            ['فحص فني للقارب (٣٠ دقيقة)', false],
          ].map(([l, on]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--rule)', opacity: on ? 1 : 0.55 }}>
              <span className={`tick-circle ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
              <span style={{ flex: 1, fontSize: 14, textDecoration: on ? 'line-through' : 'none' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="action-bar">
        <button className="btn btn-ghost">← الخطوة السابقة</button>
        <button className="btn btn-clay cta-shimmer">حفظ ومتابعة الخطوة ٥ ←</button>
      </div>
    </>
  );
}

Object.assign(window, { SellerLayout, SellerListing, SellerBookings, SellerCalendar, SellerPayouts, SellerOnboard });
