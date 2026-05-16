/* global React, BOATS */
// ═══════════════════════════════════════════════════════════════════════
// SeaConnect · Boat Owner Flows
// 01 · Listing Wizard (5 steps)
// 02 · Incoming Booking Requests
// 03 · Earnings Dashboard
// ═══════════════════════════════════════════════════════════════════════

// ── 01 · LISTING WIZARD ─────────────────────────────────────────────────
function ListingWizard({ onNavigate }) {
  const { useState, useEffect, useRef } = React;
  const [step, setStep] = useState(1);
  const [filledPhotos, setFilledPhotos] = useState([0]);
  const [checkedAmenities, setCheckedAmenities] = useState([0, 1, 2, 5]);
  const [calMonth, setCalMonth] = useState({ year: 2026, month: 5 });
  const [blockedDays, setBlockedDays] = useState([3, 4, 10, 17, 18, 24, 25]);

  const steps = [
    { n: 1, label: 'المعلومات الأساسية' },
    { n: 2, label: 'الصور والفيديو' },
    { n: 3, label: 'الميزات' },
    { n: 4, label: 'الوثائق' },
    { n: 5, label: 'التقويم والنشر' },
  ];

  const amenities = [
    { icon: '🛟', label: 'سترات النجاة' },
    { icon: '🎣', label: 'أدوات الصيد' },
    { icon: '❄️', label: 'ثلاجة مياه' },
    { icon: '🧭', label: 'GPS ملاحة' },
    { icon: '🚿', label: 'دورة مياه' },
    { icon: '☂️', label: 'مظلة شمس' },
    { icon: '🔊', label: 'نظام صوتي' },
    { icon: '🤿', label: 'معدات غطس' },
    { icon: '🍱', label: 'طاهٍ على متن' },
    { icon: '⚓', label: 'مرساة' },
    { icon: '🧊', label: 'ثلج للأسماك' },
    { icon: '📡', label: 'راديو بحري' },
  ];

  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const firstDay = (y, m) => new Date(y, m - 1, 1).getDay();
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dayNames = ['أحد','اثن','ثلا','أرب','خمس','جمع','سبت'];

  const toggleBlock = (d) => setBlockedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const buildCalendar = () => {
    const { year, month } = calMonth;
    const total = daysInMonth(year, month);
    const start = firstDay(year, month);
    const cells = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  };

  return (
    <div>
      <div className="wizard-layout">
        <div className="wizard-header">
          <div className="kicker">SEACONNECT · BOAT OWNER · LIST YOUR VESSEL</div>
          <h1>أضف قاربك إلى المنصة</h1>
          <p>أكمل الخطوات الخمس لنشر قاربك وبدء استقبال الحجوزات خلال 24 ساعة.</p>
        </div>

        {/* Progress stepper */}
        <div className="wizard-progress">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: step > s.n ? 'var(--ink)' : 'var(--rule)', transition: 'background 0.3s', marginBottom: 18 }} />}
              <div className="wizard-prog-step" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div className={`wizard-prog-circle ${step > s.n ? 'done' : step === s.n ? 'active' : ''}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <div className={`wizard-prog-label ${step === s.n ? 'active' : ''}`} style={{ fontSize: 10, textAlign: 'center' }}>{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Basic info ── */}
        {step === 1 && (
          <>
            <div className="wizard-card">
              <div className="wizard-card-title">معلومات القارب الأساسية</div>
              <div className="wizard-card-sub">أدخل البيانات الأساسية لقاربك. ستظهر هذه المعلومات للعملاء في صفحة القارب.</div>
              <div className="wizard-form-row">
                <div className="wizard-field">
                  <label>اسم القارب (عربي)</label>
                  <input type="text" placeholder="مثال: يخت النسر الذهبي" defaultValue="يخت النجمة البحرية" />
                </div>
                <div className="wizard-field">
                  <label>Boat Name (English)</label>
                  <input type="text" placeholder="e.g. Golden Eagle Yacht" defaultValue="Al-Najma Al-Bahriya" style={{ direction: 'ltr' }} />
                </div>
              </div>
              <div className="wizard-form-row">
                <div className="wizard-field">
                  <label>نوع القارب</label>
                  <select defaultValue="yacht">
                    <option value="">اختر النوع</option>
                    <option value="yacht">يخت فاخر</option>
                    <option value="fishing">قارب صيد</option>
                    <option value="catamaran">كاتاماران</option>
                    <option value="speedboat">زورق سرعة</option>
                    <option value="sailboat">قارب شراعي</option>
                    <option value="diving">قارب غطس</option>
                  </select>
                </div>
                <div className="wizard-field">
                  <label>ميناء الانطلاق</label>
                  <select defaultValue="hurghada">
                    <option value="">اختر الميناء</option>
                    <option value="hurghada">مرسى الغردقة</option>
                    <option value="sharm">مرسى شرم الشيخ</option>
                    <option value="dahab">مرسى دهب</option>
                    <option value="alex">مرسى الإسكندرية</option>
                    <option value="luxor">مرسى الأقصر</option>
                    <option value="matrouh">مرسى مطروح</option>
                  </select>
                </div>
              </div>
              <div className="wizard-form-row triple">
                <div className="wizard-field">
                  <label>السعة القصوى (أشخاص)</label>
                  <input type="number" defaultValue="8" min="1" max="50" style={{ direction: 'ltr' }} />
                </div>
                <div className="wizard-field">
                  <label>طول القارب (متر)</label>
                  <input type="number" defaultValue="14" min="5" style={{ direction: 'ltr' }} />
                </div>
                <div className="wizard-field">
                  <label>سنة الصنع</label>
                  <input type="number" defaultValue="2019" min="1980" max="2026" style={{ direction: 'ltr' }} />
                </div>
              </div>
              <div className="wizard-form-row triple">
                <div className="wizard-field">
                  <label>سعر اليوم الكامل (EGP)</label>
                  <input type="number" defaultValue="4500" style={{ direction: 'ltr' }} />
                </div>
                <div className="wizard-field">
                  <label>سعر نصف يوم (EGP)</label>
                  <input type="number" defaultValue="2800" style={{ direction: 'ltr' }} />
                </div>
                <div className="wizard-field">
                  <label>سعر الساعة (EGP)</label>
                  <input type="number" defaultValue="650" style={{ direction: 'ltr' }} />
                </div>
              </div>
              <div className="wizard-form-row single">
                <div className="wizard-field">
                  <label>وصف القارب (عربي)</label>
                  <textarea placeholder="اكتب وصفاً جذاباً لقاربك — الميزات، التجربة، ما يميزك..." defaultValue="يخت فاخر بمحرك قوي وديكور داخلي فاخر. مناسب لرحلات العائلة والأصدقاء. ربان ذو خبرة 15 عاماً في مياه البحر الأحمر." />
                </div>
              </div>
              <div className="wizard-form-row single">
                <div className="wizard-field">
                  <label>Description (English)</label>
                  <textarea placeholder="Write an attractive description in English..." style={{ direction: 'ltr' }} defaultValue="A luxurious motor yacht perfect for family trips and group outings. Experienced captain with 15 years in the Red Sea." />
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setStep(2)}>
              التالي — الصور والفيديو ←
            </button>
          </>
        )}

        {/* ── Step 2: Photos ── */}
        {step === 2 && (
          <>
            <div className="wizard-card">
              <div className="wizard-card-title">صور القارب والفيديو</div>
              <div className="wizard-card-sub">ارفع من 3 إلى 10 صور عالية الجودة. الصورة الأولى ستكون الصورة الرئيسية. يمكنك رفع فيديو واحد (اختياري).</div>

              <div className="photo-grid">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i}
                    className={`photo-slot ${filledPhotos.includes(i) ? 'filled' : ''} ${i === 0 ? 'primary-slot' : ''}`}
                    onClick={() => setFilledPhotos(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
                    style={filledPhotos.includes(i) ? {
                      backgroundImage: `url(${BOATS[i % BOATS.length]?.img})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    } : {}}
                  >
                    {!filledPhotos.includes(i) && (
                      <>
                        <div>📷</div>
                        <div className="slot-label">{i === 0 ? 'MAIN' : `PHOTO ${i + 1}`}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', direction: 'ltr', letterSpacing: '0.08em' }}>
                {filledPhotos.length}/10 PHOTOS UPLOADED · {filledPhotos.length >= 3 ? '✓ MINIMUM MET' : `⚠ NEED ${3 - filledPhotos.length} MORE`}
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 20, marginTop: 4 }}>
                <div className="wizard-field">
                  <label>فيديو القارب (اختياري — بحد أقصى 50 MB)</label>
                  <div style={{ border: '2px dashed var(--rule-strong)', borderRadius: 2, padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'oklch(0.97 0.005 210 / 0.5)' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>ارفع فيديو</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4, direction: 'ltr' }}>MP4 / MOV · MAX 50MB</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>رجوع</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>التالي — الميزات ←</button>
            </div>
          </>
        )}

        {/* ── Step 3: Amenities ── */}
        {step === 3 && (
          <>
            <div className="wizard-card">
              <div className="wizard-card-title">ميزات القارب والمعدات</div>
              <div className="wizard-card-sub">اختر جميع الميزات والمعدات المتوفرة على قاربك. هذه المعلومات تساعد العملاء في اختيار القارب المناسب.</div>
              <div className="amenities-grid">
                {amenities.map((a, i) => (
                  <div
                    key={i}
                    className={`amenity-check ${checkedAmenities.includes(i) ? 'on' : ''}`}
                    onClick={() => setCheckedAmenities(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
                  >
                    <span className="icon">{a.icon}</span>
                    <span>{a.label}</span>
                    <span className="box">{checkedAmenities.includes(i) ? '✓' : ''}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'oklch(0.97 0.005 210 / 0.5)', border: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.1em' }}>TRIP TYPES OFFERED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['صيد سمك','غطس','سياحة','أفراح وتجمعات','رحلات غروب','جولة ليلية'].map((t, i) => (
                    <div key={i} className={`filter-chip ${[0,1,2].includes(i) ? 'active' : ''}`}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>رجوع</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(4)}>التالي — الوثائق ←</button>
            </div>
          </>
        )}

        {/* ── Step 4: Documents ── */}
        {step === 4 && (
          <>
            <div className="wizard-card">
              <div className="wizard-card-title">وثائق القارب والترخيص</div>
              <div className="wizard-card-sub">جميع الوثائق مطلوبة لاستكمال مراجعة القارب. ستُراجع من قِبل فريقنا خلال 24 ساعة.</div>
              {[
                { label: 'رخصة تسجيل القارب', hint: 'VESSEL REGISTRATION', done: true },
                { label: 'وثيقة التأمين البحري', hint: 'MARINE INSURANCE', done: true },
                { label: 'رخصة الربان', hint: "CAPTAIN'S LICENSE", done: false },
                { label: 'رخصة السياحة', hint: 'TOURISM LICENSE', done: false },
              ].map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                  <div style={{ width: 44, height: 44, background: doc.done ? 'oklch(0.92 0.04 145 / 0.3)' : 'oklch(0.97 0.005 210 / 0.5)', border: `1px solid ${doc.done ? 'oklch(0.72 0.10 145)' : 'var(--rule-strong)'}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {doc.done ? '✅' : '📄'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.label}</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', direction: 'ltr' }}>{doc.hint} · {doc.done ? 'PDF · 1.2MB · UPLOADED' : 'PDF / JPG / PNG · MAX 10MB'}</div>
                  </div>
                  <button className="btn" style={{ fontSize: 12, padding: '8px 16px', background: doc.done ? 'transparent' : 'var(--ink)', color: doc.done ? 'var(--muted)' : 'var(--sand)', border: '1px solid var(--rule-strong)', borderRadius: 2 }}>
                    {doc.done ? 'استبدال' : 'رفع'}
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'oklch(0.95 0.04 70 / 0.3)', border: '1px solid oklch(0.80 0.08 70)', borderRadius: 2, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>تأكد من أن جميع الوثائق سارية وغير منتهية الصلاحية. الوثائق المنتهية ستؤدي إلى رفض الطلب.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(3)}>رجوع</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(5)}>التالي — التقويم ←</button>
            </div>
          </>
        )}

        {/* ── Step 5: Calendar + Submit ── */}
        {step === 5 && (
          <>
            <div className="wizard-card">
              <div className="wizard-card-title">تحديد الإتاحة وإرسال للمراجعة</div>
              <div className="wizard-card-sub">حدد الأيام التي لا يكون فيها القارب متاحاً (إجازات، صيانة، إلخ). يمكنك تحديث التقويم في أي وقت بعد النشر.</div>

              <div className="mini-cal">
                <div className="mini-cal-header">
                  <span className="mini-cal-nav" onClick={() => setCalMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })}>‹</span>
                  <span>{monthNames[calMonth.month - 1]} {calMonth.year}</span>
                  <span className="mini-cal-nav" onClick={() => setCalMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })}>›</span>
                </div>
                <div className="mini-cal-grid">
                  {dayNames.map(d => <div key={d} className="mini-cal-day-header">{d}</div>)}
                  {buildCalendar().map((day, i) => (
                    <div key={i}
                      className={`cal-day ${!day ? 'empty' : blockedDays.includes(day) ? 'blocked' : 'available'} ${day === 15 ? 'today' : ''}`}
                      onClick={() => day && toggleBlock(day)}
                    >{day || ''}</div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                {[['var(--clay)', 'available', 'متاح'], ['oklch(0.95 0.04 25 / 0.3)', 'blocked', 'محجوب (لا تحجز)'], ['oklch(0.92 0.04 220 / 0.4)', 'booked', 'محجوز مسبقاً']].map(([color, key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wizard-card" style={{ background: 'oklch(0.97 0.01 220 / 0.6)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 14, direction: 'ltr' }}>LISTING SUMMARY · REVIEW BEFORE SUBMIT</div>
              {[
                ['القارب', 'يخت النجمة البحرية · يخت فاخر · 8 أشخاص'],
                ['الميناء', 'مرسى الغردقة · البحر الأحمر'],
                ['الأسعار', '4,500 EGP / يوم · 2,800 EGP / نصف يوم · 650 EGP / ساعة'],
                ['الصور', `${filledPhotos.length} صور مرفوعة`],
                ['الميزات', `${checkedAmenities.length} ميزة محددة`],
                ['الوثائق', '2 من 4 وثائق مرفوعة'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--rule)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', minWidth: 100 }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(4)}>رجوع</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 2 }} onClick={() => onNavigate && onNavigate('home')}>
                إرسال للمراجعة 🚀
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 02 · OWNER BOOKING REQUESTS ──────────────────────────────────────────
function OwnerBookingRequests({ onNavigate }) {
  const { useState, useEffect, useRef } = React;
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [declineModal, setDeclineModal] = useState(false);

  const tabs = [
    { id: 'pending',   label: 'في الانتظار', count: 3 },
    { id: 'confirmed', label: 'مؤكدة',        count: 8 },
    { id: 'completed', label: 'مكتملة',        count: 24 },
    { id: 'declined',  label: 'مرفوضة',        count: 2 },
  ];

  const requests = {
    pending: [
      { id: 'br1', name: 'أحمد خالد', avatar: 'أ', phone: '+20 100 XXX XXXX', date: '22 MAY 2026', tripType: 'صيد', pax: 5, hours: 8, amount: 4500, commission: 450, special: 'نريد إحضار معدات صيد إضافية. هل يمكن ذلك؟', countdown: '01:47:22', urgent: false, rating: null, trips: 3 },
      { id: 'br2', name: 'سارة مصطفى', avatar: 'س', phone: '+20 112 XXX XXXX', date: '24 MAY 2026', tripType: 'سياحة', pax: 8, hours: 6, amount: 3200, commission: 320, special: '', countdown: '00:18:05', urgent: true, rating: '4.8', trips: 12 },
      { id: 'br3', name: 'محمود علي', avatar: 'م', phone: '+20 115 XXX XXXX', date: '27 MAY 2026', tripType: 'غطس', pax: 4, hours: 10, amount: 5800, commission: 580, special: 'مجموعة من الغواصين المتمرسين. نحتاج معدات غطس كاملة.', countdown: '06:30:00', urgent: false, rating: '5.0', trips: 7 },
    ],
    confirmed: [
      { id: 'bc1', name: 'نور حسن', avatar: 'ن', date: '17 MAY 2026', tripType: 'صيد', pax: 6, amount: 4500, status: 'CONFIRMED', phone: '+20 106 XXX XXXX' },
      { id: 'bc2', name: 'كريم إبراهيم', avatar: 'ك', date: '19 MAY 2026', tripType: 'سياحة', pax: 3, amount: 2800, status: 'CONFIRMED', phone: '+20 101 XXX XXXX' },
    ],
    completed: [],
    declined: [],
  };

  const CountdownTimer = ({ time, urgent }) => {
    const [t, setT] = useState(time);
    return (
      <div className="brq-timer">
        <div className={`countdown ${urgent ? 'urgent' : ''}`}>{t}</div>
        <div className="label">للرد · TO RESPOND</div>
      </div>
    );
  };

  return (
    <div>
      {/* Decline modal */}
      {declineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0.14 0.04 240 / 0.5)', z: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'oklch(0.99 0.004 210)', borderRadius: '4px 4px 0 0', padding: '28px 28px 40px', width: '100%', maxWidth: 520, border: '1px solid var(--rule)' }}>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>سبب الرفض</div>
            <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 20 }}>اختر سبب رفض الحجز. سيُرسل للعميل.</div>
            {['القارب غير متاح في هذا التاريخ', 'صيانة مجدولة', 'مشكلة في الطاقة الاستيعابية', 'سبب آخر'].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 2, marginBottom: 8, cursor: 'pointer', background: i === 0 ? 'oklch(0.97 0.01 220 / 0.5)' : 'oklch(1 0 0 / 0.6)', fontSize: 14 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${i === 0 ? 'var(--ink)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i === 0 && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink)' }} />}
                </div>
                {r}
              </div>
            ))}
            <textarea placeholder="ملاحظات إضافية (اختياري)" style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--rule-strong)', borderRadius: 2, fontSize: 13, fontFamily: 'var(--ff-sans)', background: 'oklch(1 0 0 / 0.7)', color: 'var(--ink)', outline: 'none', minHeight: 80, resize: 'none', marginTop: 4, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeclineModal(false)}>إلغاء</button>
              <button className="btn-decline" style={{ flex: 2 }} onClick={() => { setDeclineModal(false); }}>تأكيد الرفض</button>
            </div>
          </div>
        </div>
      )}

      <div className="owner-bookings-layout">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid var(--ink)' }}>
          <h1 className="display" style={{ fontSize: 34 }}>طلبات الحجز</h1>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--muted)' }}>· BOOKING REQUESTS</span>
        </div>

        {/* Tabs */}
        <div className="notif-tabs" style={{ marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} className={`notif-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.count > 0 && <span className="badge">{t.count}</span>}
              {t.label}
            </button>
          ))}
        </div>

        {/* Pending requests */}
        {tab === 'pending' && requests.pending.map(r => (
          <div key={r.id} className={`booking-request-card ${r.urgent ? 'urgent' : ''}`}>
            <div className="brq-header">
              <div className="brq-avatar" style={{ background: r.urgent ? 'var(--clay)' : 'var(--ink)' }}>{r.avatar}</div>
              <div className="brq-customer">
                <div className="name">{r.name}</div>
                <div className="meta">
                  {r.rating && `★ ${r.rating} · `}{r.trips} رحلات سابقة · {r.phone}
                </div>
              </div>
              <CountdownTimer time={r.countdown} urgent={r.urgent} />
            </div>

            {r.special && <div className="brq-special">💬 "{r.special}"</div>}

            <div className="brq-details">
              <div className="brq-detail-item"><div className="k">التاريخ</div><div className="v">{r.date}</div></div>
              <div className="brq-detail-item"><div className="k">نوع الرحلة</div><div className="v">{r.tripType}</div></div>
              <div className="brq-detail-item"><div className="k">عدد الأشخاص</div><div className="v">{r.pax} أشخاص</div></div>
              <div className="brq-detail-item">
                <div className="k">المبلغ</div>
                <div className="brq-amount">
                  {r.amount.toLocaleString('en')} <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}>EGP</span>
                  <div className="after-comm">صافي بعد العمولة: {(r.amount - r.commission).toLocaleString('en')} EGP</div>
                </div>
              </div>
            </div>

            <div className="brq-actions">
              <button className="btn-accept">قبول الحجز ✓</button>
              <button className="btn-decline" onClick={() => setDeclineModal(true)}>رفض ✗</button>
              <button className="btn" style={{ fontSize: 12, padding: '10px 16px', border: '1px solid var(--rule-strong)', borderRadius: 2 }}>تفاصيل أكثر</button>
            </div>
          </div>
        ))}

        {/* Confirmed */}
        {tab === 'confirmed' && requests.confirmed.map(r => (
          <div key={r.id} className="booking-request-card">
            <div className="brq-header">
              <div className="brq-avatar">{r.avatar}</div>
              <div className="brq-customer">
                <div className="name">{r.name}</div>
                <div className="meta">{r.date} · {r.tripType} · {r.pax} أشخاص · {r.phone}</div>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.12em', padding: '5px 10px', background: 'oklch(0.92 0.04 145 / 0.4)', color: 'oklch(0.35 0.12 145)', borderRadius: 2 }}>CONFIRMED ✓</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }}>تواصل مع العميل</button>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}>تأشير كمكتملة</button>
            </div>
          </div>
        ))}

        {(tab === 'completed' || tab === 'declined') && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 20 }}>لا توجد بيانات بعد</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 03 · OWNER EARNINGS DASHBOARD ────────────────────────────────────────
function OwnerEarnings({ onNavigate }) {
  const monthLabels = ['NOV','DEC','JAN','FEB','MAR','APR','MAY'];
  const monthData = [12400, 18200, 9800, 22500, 31000, 28400, 14200];
  const maxVal = Math.max(...monthData);

  const payouts = [
    { ref: 'SC-PAY-0054', date: '2026-05-01', amount: '28,400', status: 'paid' },
    { ref: 'SC-PAY-0047', date: '2026-04-01', amount: '31,000', status: 'paid' },
    { ref: 'SC-PAY-0041', date: '2026-03-01', amount: '22,500', status: 'paid' },
    { ref: 'SC-PAY-0036', date: '2026-02-01', amount: '9,800',  status: 'paid' },
    { ref: 'SC-PAY-0029', date: '2026-01-01', amount: '18,200', status: 'paid' },
    { ref: 'SC-PAY-PEND', date: '2026-06-01', amount: '14,200', status: 'pending' },
  ];

  return (
    <div>
      <div className="earnings-layout">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h1 className="display" style={{ fontSize: 34 }}>الأرباح والمدفوعات</h1>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--muted)' }}>· EARNINGS & PAYOUTS</span>
          </div>
          <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>طلب صرف 💸</button>
        </div>

        {/* KPI Cards */}
        <div className="earnings-kpi-row">
          {[
            { label: 'TOTAL EARNED · ALL TIME', value: '136,500', sub: 'جنيه صافي بعد العمولة', highlight: false },
            { label: 'THIS MONTH · MAY 2026', value: '14,200', sub: 'جنيه · 8 رحلات مكتملة', highlight: false },
            { label: 'PENDING PAYOUT', value: '14,200', sub: 'سيُحوَّل 01 يونيو 2026', highlight: true },
            { label: 'AVG PER TRIP', value: '4,215', sub: 'جنيه لكل رحلة', highlight: false },
          ].map((k, i) => (
            <div key={i} className={`earnings-kpi ${k.highlight ? 'highlight' : ''}`}>
              <div className="label">{k.label}</div>
              <div className="value" style={{ direction: 'ltr' }}>{k.value}</div>
              <div className="sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="earnings-chart">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700 }}>الأرباح الشهرية</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', direction: 'ltr' }}>NOV 2025 — MAY 2026</div>
          </div>
          <div className="chart-bars">
            {monthData.map((val, i) => (
              <div key={i} className="chart-bar-wrap">
                <div
                  className={`chart-bar ${i === monthData.length - 1 ? 'current' : ''}`}
                  style={{ height: `${(val / maxVal) * 100}%` }}
                  title={`${val.toLocaleString('en')} EGP`}
                />
                <div className="chart-bar-label">{monthLabels[i]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 4, background: 'var(--sea)', borderRadius: 2 }} /><span style={{ fontSize: 11, color: 'var(--muted)' }}>مكتمل</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 4, background: 'var(--clay)', borderRadius: 2 }} /><span style={{ fontSize: 11, color: 'var(--muted)' }}>الشهر الحالي</span></div>
          </div>
        </div>

        {/* Bank account */}
        <div className="wizard-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="wizard-card-title" style={{ marginBottom: 4 }}>حساب الصرف البنكي</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)', direction: 'ltr', letterSpacing: '0.08em' }}>
                CIB · **** **** **** 4821 · CAIRO, EGYPT
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }}>تعديل</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div style={{ flex: 1, padding: '12px 14px', background: 'oklch(0.97 0.005 210 / 0.5)', border: '1px solid var(--rule)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 4 }}>PAYOUT SCHEDULE</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>1 من كل شهر</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', background: 'oklch(0.97 0.005 210 / 0.5)', border: '1px solid var(--rule)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 4 }}>COMMISSION RATE</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>10% لكل حجز</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', background: 'oklch(0.97 0.005 210 / 0.5)', border: '1px solid var(--rule)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 4 }}>NEXT PAYOUT</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>01 يونيو 2026</div>
            </div>
          </div>
        </div>

        {/* Payout history */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 22 }}>سجل المدفوعات</h2>
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em' }}>· PAYOUT HISTORY</span>
        </div>
        <div className="payout-list">
          {payouts.map((p, i) => (
            <div key={i} className="payout-row">
              <div className="ref">{p.ref}</div>
              <div className="date">{p.date}</div>
              <div className="amount" style={{ direction: 'ltr' }}>{p.amount} <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)' }}>EGP</span></div>
              <div className={`status ${p.status}`}>{p.status === 'paid' ? 'PAID ✓' : 'PENDING'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
