/* global React */

// ── Payment Page (method selection + summary) ────────
function PaymentPage({ boat, onNavigate, onBack }) {
  const { useState } = React;
  const [method, setMethod] = useState('fawry');
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const _boat = boat || {
    name: 'نبض البحر',
    captEn: 'Captain Youssef',
    img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80',
    price: 4200,
    regionEn: 'Hurghada',
  };

  const nights = 1;
  const subtotal = _boat.price * nights;
  const serviceFee = Math.round(subtotal * 0.08);
  const discount = promoApplied ? Math.round(subtotal * 0.10) : 0;
  const total = subtotal + serviceFee - discount;

  const methods = [
    {
      id: 'fawry',
      icon: '🟠',
      ar: 'فوري',
      en: 'Fawry',
      sub: 'ادفع في أي فرع فوري أو عبر التطبيق',
      subEn: 'Pay at any Fawry branch or via app',
      badge: 'الأكثر شيوعاً',
    },
    {
      id: 'vodafone',
      icon: '🔴',
      ar: 'فودافون كاش',
      en: 'Vodafone Cash',
      sub: 'دفع فوري عبر محفظة فودافون',
      subEn: 'Instant payment via Vodafone wallet',
      badge: null,
    },
    {
      id: 'instapay',
      icon: '🟢',
      ar: 'إنستاباي',
      en: 'InstaPay',
      sub: 'تحويل فوري عبر تطبيق البنوك',
      subEn: 'Instant transfer via banking app',
      badge: null,
    },
    {
      id: 'visa',
      icon: '💳',
      ar: 'بطاقة بنكية',
      en: 'Visa / Mastercard',
      sub: 'ادفع بأمان عبر بوابة الدفع',
      subEn: 'Secure payment via payment gateway',
      badge: null,
    },
  ];

  const applyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'SEACOL') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('كود الخصم غير صحيح');
      setPromoApplied(false);
    }
  };

  const handlePay = () => {
    if (!agreed) return;
    setProcessing(true);
    setTimeout(() => {
      onNavigate('pay-processing');
    }, 600);
  };

  return (
    <div className="payment-layout">
      <div className="payment-main">
        {/* Back */}
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          العودة للحجز
        </button>

        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8, marginTop: 16 }}>STEP 3 OF 3 · PAYMENT · الدفع</div>
        <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 26, margin: '0 0 24px' }}>اختر طريقة الدفع</h2>

        {/* Payment methods */}
        <div className="pay-methods">
          {methods.map(m => (
            <button
              key={m.id}
              className={`pay-method-card ${method === m.id ? 'selected' : ''}`}
              onClick={() => setMethod(m.id)}
            >
              <div className="pay-radio">
                <div className={`radio-dot ${method === m.id ? 'active' : ''}`} />
              </div>
              <span className="pay-method-icon">{m.icon}</span>
              <div className="pay-method-info">
                <div className="pay-method-name">{m.ar} <span className="mono" style={{ fontSize: 11, opacity: 0.55 }}>{m.en}</span></div>
                <div className="pay-method-sub">{m.sub}</div>
              </div>
              {m.badge && <span className="pay-badge">{m.badge}</span>}
            </button>
          ))}
        </div>

        {/* Fawry instructions */}
        {method === 'fawry' && (
          <div className="fawry-box">
            <div className="fawry-header">
              <span style={{ fontSize: 24 }}>🟠</span>
              <div>
                <div style={{ fontWeight: 700 }}>تعليمات الدفع عبر فوري</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>FAWRY PAYMENT INSTRUCTIONS</div>
              </div>
            </div>
            <ol className="fawry-steps">
              <li>اذهب إلى أقرب فرع فوري أو افتح تطبيق فوري</li>
              <li>اختر <strong>«دفع فواتير»</strong> ثم <strong>«سي كونكت · SeaConnect»</strong></li>
              <li>أدخل كود الدفع: <span className="fawry-code">SC-{Math.floor(Math.random() * 900000 + 100000)}</span></li>
              <li>تأكيد المبلغ: <strong className="mono">{total.toLocaleString('en')} EGP</strong></li>
              <li>احتفظ بإيصال الدفع — ستصلك رسالة تأكيد خلال دقيقتين</li>
            </ol>
            <div className="fawry-note">
              ⏳ الكود صالح لمدة <strong>24 ساعة</strong> من الآن. يُحجز القارب مؤقتاً لمدة 30 دقيقة ريثما تكتمل عملية الدفع.
            </div>
          </div>
        )}

        {/* Vodafone Cash */}
        {method === 'vodafone' && (
          <div className="method-info-box" style={{ borderColor: 'oklch(0.55 0.2 25 / 0.3)', background: 'oklch(0.55 0.2 25 / 0.05)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🔴 الدفع عبر فودافون كاش</div>
            <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>سيُرسَل لك كود USSD على رقم فودافون المسجّل. اتبع التعليمات لإتمام الدفع خلال 5 دقائق.</p>
          </div>
        )}

        {/* InstaPay */}
        {method === 'instapay' && (
          <div className="method-info-box" style={{ borderColor: 'oklch(0.45 0.15 150 / 0.3)', background: 'oklch(0.45 0.15 150 / 0.05)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🟢 الدفع عبر إنستاباي</div>
            <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>تحويل فوري من تطبيق البنك الخاص بك إلى حساب سي كونكت. آمن ومشفر بالكامل.</p>
          </div>
        )}

        {/* Visa card form */}
        {method === 'visa' && (
          <div className="card-form">
            <div className="card-form-title">💳 بيانات البطاقة البنكية</div>
            <div className="form-field">
              <label>رقم البطاقة</label>
              <input type="text" placeholder="•••• •••• •••• ••••" className="form-input" maxLength={19} dir="ltr" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label>تاريخ الانتهاء</label>
                <input type="text" placeholder="MM / YY" className="form-input" dir="ltr" />
              </div>
              <div className="form-field">
                <label>CVV</label>
                <input type="text" placeholder="•••" className="form-input" maxLength={4} dir="ltr" />
              </div>
            </div>
            <div className="form-field">
              <label>الاسم على البطاقة</label>
              <input type="text" placeholder="JOHN DOE" className="form-input" dir="ltr" />
            </div>
            <div className="secure-badges">
              <span>🔒 SSL Encrypted</span>
              <span>🛡️ 3D Secure</span>
              <span>PCI DSS Compliant</span>
            </div>
          </div>
        )}

        {/* Promo code */}
        <div className="promo-section">
          <div className="promo-label">كود خصم؟ <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Promo code</span></div>
          <div className="promo-row">
            <input
              className="form-input promo-input"
              placeholder="أدخل الكود · e.g. SEACOL"
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value); setPromoError(''); }}
              dir="ltr"
            />
            <button className="btn btn-ghost" onClick={applyPromo} style={{ whiteSpace: 'nowrap' }}>تطبيق</button>
          </div>
          {promoApplied && <div style={{ color: 'oklch(0.42 0.14 150)', fontSize: 13, marginTop: 4 }}>✓ تم تطبيق خصم 10% · Promo applied</div>}
          {promoError && <div style={{ color: 'oklch(0.45 0.18 25)', fontSize: 13, marginTop: 4 }}>✗ {promoError}</div>}
        </div>

        {/* Agreement */}
        <div className="agreement-row">
          <button
            className={`checkbox ${agreed ? 'checked' : ''}`}
            onClick={() => setAgreed(a => !a)}
          >{agreed ? '✓' : ''}</button>
          <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            أوافق على <a href="#" style={{ color: 'var(--sea)' }}>شروط الاستخدام</a> و<a href="#" style={{ color: 'var(--sea)' }}>سياسة الاسترجاع</a>. أفهم أن الإلغاء قبل 48 ساعة يستحق استرداداً كاملاً.
          </span>
        </div>
      </div>

      {/* Sidebar: booking summary */}
      <div className="payment-sidebar">
        <div className="pay-summary-card">
          <div className="pay-boat-preview">
            <div
              className="pay-boat-img"
              style={{ backgroundImage: `url(${_boat.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="pay-boat-info">
              <div className="pay-boat-name">{_boat.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{_boat.regionEn} · مع {_boat.captEn}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>15 مايو 2026 · يوم كامل</div>
            </div>
          </div>

          <div className="pay-line-items">
            <div className="pay-line">
              <span>{_boat.price.toLocaleString('en')} EGP × {nights} يوم</span>
              <span className="mono">{subtotal.toLocaleString('en')} EGP</span>
            </div>
            <div className="pay-line">
              <span>رسوم الخدمة (8%)</span>
              <span className="mono">{serviceFee.toLocaleString('en')} EGP</span>
            </div>
            {promoApplied && (
              <div className="pay-line" style={{ color: 'oklch(0.42 0.14 150)' }}>
                <span>خصم SEACOL (10%)</span>
                <span className="mono">−{discount.toLocaleString('en')} EGP</span>
              </div>
            )}
            <div className="pay-divider" />
            <div className="pay-line pay-total">
              <span>الإجمالي</span>
              <span className="mono">{total.toLocaleString('en')} EGP</span>
            </div>
          </div>

          <button
            className={`btn btn-primary pay-cta ${!agreed ? 'disabled' : ''}`}
            onClick={handlePay}
            disabled={!agreed || processing}
          >
            {processing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span className="pay-spinner" />
                جارٍ المعالجة…
              </span>
            ) : (
              <>ادفع {total.toLocaleString('en')} EGP</>
            )}
          </button>

          <div className="pay-trust-row">
            <span>🔒 مدفوعات آمنة</span>
            <span>·</span>
            <span>ضمان استرداد 100%</span>
          </div>
        </div>

        {/* Payment methods accepted */}
        <div className="accepted-methods">
          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>ACCEPTED PAYMENTS</div>
          <div className="accepted-row">
            {['🟠 Fawry', '🔴 VF Cash', '🟢 InstaPay', '💳 Visa', '💳 MC'].map((p, i) => (
              <span key={i} className="accepted-badge">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pay Processing (loading screen) ─────────────────
function PayProcessing({ onNavigate }) {
  React.useEffect(() => {
    const t = setTimeout(() => onNavigate('pay-done'), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pay-screen">
      <div className="pay-processing-card">
        <div className="processing-spinner-wrap">
          <svg className="processing-ring" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="oklch(0.92 0.015 220)" strokeWidth="4"/>
            <circle
              cx="32" cy="32" r="28"
              stroke="oklch(0.38 0.08 220)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="44 132"
              style={{ transformOrigin: '50% 50%', animation: 'spin 1s linear infinite' }}
            />
          </svg>
          <span className="processing-icon">⚓</span>
        </div>
        <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 26, marginBottom: 8 }}>جارٍ تأكيد الدفع</h2>
        <p style={{ color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7, maxWidth: 300 }}>
          نتصل بمعالج الدفع للتحقق من المعاملة.<br />يرجى عدم إغلاق الصفحة.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--ff-mono)', textAlign: 'center', letterSpacing: '0.05em' }}>
          Processing payment… please wait
        </p>
      </div>
    </div>
  );
}

// ── Pay Success ──────────────────────────────────────
function PaySuccess({ boat, onNavigate }) {
  const { useState } = React;
  const _boat = boat || { name: 'نبض البحر', regionEn: 'Hurghada', captEn: 'Captain Youssef' };
  const ref = 'SC-' + Math.floor(Math.random() * 9000000 + 1000000);

  return (
    <div className="pay-screen">
      <div className="pay-result-card success">
        <div className="result-icon-wrap success">
          <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
            <circle cx="32" cy="32" r="30" fill="oklch(0.42 0.14 150 / 0.12)" stroke="oklch(0.42 0.14 150)" strokeWidth="2"/>
            <path d="M20 32l8 8 16-16" stroke="oklch(0.42 0.14 150)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 28, margin: '16px 0 8px', color: 'oklch(0.30 0.12 150)' }}>
          تم الحجز بنجاح! 🎉
        </h2>
        <p style={{ color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7, maxWidth: 320 }}>
          رحلتك إلى {_boat.regionEn} مع {_boat.captEn} مؤكدة. تفاصيل الرحلة أُرسلت إلى بريدك الإلكتروني.
        </p>

        <div className="booking-ref-box">
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.08em' }}>BOOKING REFERENCE · رقم الحجز</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--sea)', letterSpacing: '0.05em' }}>{ref}</div>
        </div>

        <div className="booking-details-list">
          <div className="bdetail">
            <span className="bdetail-label">القارب</span>
            <span className="bdetail-val">{_boat.name}</span>
          </div>
          <div className="bdetail">
            <span className="bdetail-label">التاريخ</span>
            <span className="bdetail-val mono">15 مايو 2026</span>
          </div>
          <div className="bdetail">
            <span className="bdetail-label">المنطقة</span>
            <span className="bdetail-val">{_boat.regionEn}</span>
          </div>
          <div className="bdetail">
            <span className="bdetail-label">الكابتن</span>
            <span className="bdetail-val">{_boat.captEn}</span>
          </div>
          <div className="bdetail">
            <span className="bdetail-label">الحالة</span>
            <span className="bdetail-val" style={{ color: 'oklch(0.42 0.14 150)', fontWeight: 700 }}>✓ مؤكد</span>
          </div>
        </div>

        <div className="success-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('profile')} style={{ flex: 1 }}>
            عرض حجوزاتي
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('home')} style={{ flex: 1 }}>
            الصفحة الرئيسية
          </button>
        </div>

        <div className="rating-prompt">
          <span>⭐</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>بعد رحلتك، لا تنسَ تقييم تجربتك!</span>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => onNavigate('write-review')}>
            تقييم
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pay Failed ───────────────────────────────────────
function PayFailed({ onNavigate, onBack }) {
  const reasons = [
    'رصيد غير كافٍ — تأكد من أن رصيدك يغطي المبلغ المطلوب.',
    'انتهت مدة صلاحية الكود — جدد وحاول مجدداً.',
    'خطأ في الاتصال — تحقق من الإنترنت وأعد المحاولة.',
  ];
  const [activeReason] = React.useState(0);

  return (
    <div className="pay-screen">
      <div className="pay-result-card failed">
        <div className="result-icon-wrap failed">
          <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
            <circle cx="32" cy="32" r="30" fill="oklch(0.45 0.18 25 / 0.10)" stroke="oklch(0.45 0.18 25)" strokeWidth="2"/>
            <path d="M22 22l20 20M42 22L22 42" stroke="oklch(0.45 0.18 25)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 28, margin: '16px 0 8px', color: 'oklch(0.35 0.18 25)' }}>
          فشلت عملية الدفع
        </h2>
        <p style={{ color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7, maxWidth: 300 }}>
          لم يتم خصم أي مبلغ. القارب لا يزال محجوزاً مؤقتاً لمدة 15 دقيقة.
        </p>

        <div className="fail-reason-box">
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'oklch(0.35 0.18 25)' }}>⚠ السبب المحتمل</div>
          <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{reasons[activeReason]}</div>
        </div>

        <div className="fail-actions">
          <button className="btn btn-primary" onClick={onBack} style={{ flex: 1 }}>
            ↩ حاول مرة أخرى
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('home')} style={{ flex: 1 }}>
            إلغاء الحجز
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
          تواجه مشكلة؟ <a href="#" style={{ color: 'var(--sea)' }}>تواصل مع الدعم</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PaymentPage, PayProcessing, PaySuccess, PayFailed });
