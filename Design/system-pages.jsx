/* global React */
/* ════════════════════════════════════════════════════════════
   SeaConnect · System Pages
   01 · Login / Signup (OTP flow)
   02 · Onboarding / KYC (multi-step)
   03 · Notifications center
   04 · Settings & account
   ════════════════════════════════════════════════════════════ */

const { useState: useSt, useEffect: useEf, useRef: useRf } = React;

/* ── small reusable btn ────────────────────────────────────── */
function Btn({ children, variant = 'primary', style: s = {}, onClick, disabled }) {
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', padding: '14px 24px',
    fontFamily: 'var(--ff-sans)', fontSize: 15, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.18s',
    opacity: disabled ? 0.5 : 1,
    ...s,
  };
  const styles = {
    primary:   { background: 'var(--clay)', color: 'var(--foam)' },
    ink:       { background: 'var(--ink)',  color: 'var(--foam)' },
    outline:   { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)' },
  };
  return (
    <button style={{ ...base, ...styles[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   01 · LOGIN / SIGNUP PAGE
   ══════════════════════════════════════════════════════════════ */
function LoginPage({ onNavigate }) {
  const [step, setSt]   = useSt('phone');   // 'phone' | 'otp' | 'signup'
  const [phone, setPh]  = useSt('');
  const [otp, setOtp]   = useSt(['', '', '', '', '', '']);
  const [timer, setTmr] = useSt(60);
  const [name, setNm]   = useSt('');
  const [city, setCty]  = useSt('');
  const otpRowRef = useRf(null);
  const timerRef  = useRf(null);

  /* countdown for resend */
  useEf(() => {
    if (step !== 'otp') return;
    setTmr(60);
    timerRef.current = setInterval(() => {
      setTmr(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const focusOtp = (i) => {
    const boxes = otpRowRef.current?.querySelectorAll('input');
    boxes?.[i]?.focus();
  };
  const handleOtpInput = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) focusOtp(i + 1);
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next);
      focusOtp(i - 1);
    }
  };

  const filled = otp.every(d => d !== '');

  return (
    <div className="auth-outer">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="mark">س</span>
          سي كونكت
          <span className="en-tag">/ SeaConnect</span>
        </div>

        {/* ── STEP: PHONE ── */}
        {step === 'phone' && (
          <>
            <div className="auth-eyebrow">SIGN IN · تسجيل الدخول</div>
            <div className="auth-title">مرحباً بك.</div>
            <div className="auth-sub">ادخل رقم محمولك لإرسال رمز التحقق.</div>

            <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
              رقم الهاتف · PHONE
            </label>
            <div className="phone-row">
              <div className="phone-prefix">
                <span className="flag">🇪🇬</span>
                <span>+20</span>
              </div>
              <input
                className="phone-input"
                placeholder="10xxxxxxxx"
                value={phone}
                onChange={e => setPh(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                type="tel"
              />
            </div>

            <Btn onClick={() => phone.length >= 10 && setSt('otp')} disabled={phone.length < 10}>
              إرسال رمز التحقق ·
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em' }}>SEND OTP</span>
            </Btn>

            <div className="auth-divider"><span>أو · OR</span></div>

            <div className="social-row">
              <button className="social-btn" onClick={() => {}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button className="social-btn" onClick={() => {}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple
              </button>
              <button className="social-btn" style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.06em' }} onClick={() => {}}>
                FAWRY ID
              </button>
            </div>

            <div className="auth-footer-link">
              ليس لديك حساب؟ &nbsp;
              <button onClick={() => setSt('signup')}>اشترك الآن · JOIN</button>
            </div>
          </>
        )}

        {/* ── STEP: OTP ── */}
        {step === 'otp' && (
          <>
            <div className="auth-eyebrow">VERIFICATION · التحقق</div>
            <div className="auth-title">رمز التحقق.</div>
            <div className="auth-sub">
              أرسلنا رمزاً من ٦ أرقام إلى
              <span style={{ fontFamily: 'var(--ff-mono)', margin: '0 6px', direction: 'ltr', display: 'inline-block' }}>
                +20 {phone}
              </span>
            </div>

            <div className="otp-row" ref={otpRowRef}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  className={`otp-box ${d ? 'filled' : ''}`}
                  maxLength={1}
                  value={d}
                  inputMode="numeric"
                  onChange={e => handleOtpInput(i, e)}
                  onKeyDown={e => handleOtpKey(i, e)}
                />
              ))}
            </div>
            <div className="otp-hint">أدخل الأرقام من اليسار إلى اليمين · ENTER DIGITS LEFT → RIGHT</div>

            {timer > 0
              ? <div className="otp-resend">إعادة الإرسال بعد · RESEND IN {timer}s</div>
              : <div className="otp-resend"><span onClick={() => setSt('phone')}>إعادة الإرسال · RESEND CODE</span></div>
            }

            <Btn onClick={() => filled && onNavigate('home')} disabled={!filled}>
              تأكيد · VERIFY
            </Btn>

            <div style={{ marginTop: 16 }}>
              <Btn variant="outline" onClick={() => setSt('phone')}>
                ← تغيير الرقم · CHANGE NUMBER
              </Btn>
            </div>
          </>
        )}

        {/* ── STEP: SIGNUP ── */}
        {step === 'signup' && (
          <>
            <div className="auth-eyebrow">NEW ACCOUNT · حساب جديد</div>
            <div className="auth-title">انضم إلينا.</div>
            <div className="auth-sub">أنشئ حسابك في ثوانٍ.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {[
                { lbl: 'الاسم الكامل · FULL NAME', ph: 'محمد علي', val: name, set: setNm },
                { lbl: 'المدينة · CITY', ph: 'القاهرة', val: city, set: setCty },
              ].map(({ lbl, ph, val, set }) => (
                <div key={lbl}>
                  <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{lbl}</label>
                  <input
                    style={{ width: '100%', border: '1px solid var(--rule-strong)', background: 'var(--foam)', fontFamily: 'var(--ff-sans)', fontSize: 14, color: 'var(--ink)', padding: '12px 14px', outline: 'none' }}
                    placeholder={ph}
                    value={val}
                    onChange={e => set(e.target.value)}
                  />
                </div>
              ))}
            </div>

            <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
              رقم الهاتف · PHONE
            </label>
            <div className="phone-row" style={{ marginBottom: 20 }}>
              <div className="phone-prefix"><span className="flag">🇪🇬</span><span>+20</span></div>
              <input className="phone-input" placeholder="10xxxxxxxx" value={phone} onChange={e => setPh(e.target.value.replace(/\D/g, '').slice(0, 11))} type="tel" />
            </div>

            <Btn onClick={() => name && phone.length >= 10 && setSt('otp')} disabled={!name || phone.length < 10}>
              إنشاء الحساب · CREATE ACCOUNT
            </Btn>

            <div className="auth-footer-link">
              لديك حساب بالفعل؟ &nbsp;
              <button onClick={() => setSt('phone')}>تسجيل الدخول · SIGN IN</button>
            </div>

            <div style={{ marginTop: 20, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, textAlign: 'center' }}>
              بإنشائك الحساب توافق على{' '}
              <span style={{ color: 'var(--clay)', borderBottom: '1px solid currentColor', cursor: 'pointer' }}>شروط الاستخدام</span>
              {' '}و{' '}
              <span style={{ color: 'var(--clay)', borderBottom: '1px solid currentColor', cursor: 'pointer' }}>سياسة الخصوصية</span>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   02 · ONBOARDING / KYC PAGE
   ══════════════════════════════════════════════════════════════ */
function KYCPage({ onNavigate }) {
  const [step, setSt]       = useSt(0);   // 0-3
  const [accType, setAccTy] = useSt('customer');

  const steps = [
    { ar: 'البيانات الشخصية', en: 'PERSONAL' },
    { ar: 'التحقق من الهوية',  en: 'IDENTITY' },
    { ar: 'نوع الحساب',       en: 'ACCOUNT'  },
    { ar: 'مكتمل',             en: 'DONE'     },
  ];

  return (
    <div className="kyc-outer">
      <div className="kyc-card">
        {/* Logo */}
        <div className="auth-logo" style={{ marginBottom: 32 }}>
          <span className="mark">س</span>
          سي كونكت
          <span className="en-tag">/ KYC · توثيق الهوية</span>
        </div>

        {/* Progress stepper */}
        <div className="onb-progress">
          <div className="onb-bar"><div className="onb-fill" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div>
          <div className="onb-pct">STEP {step + 1} / {steps.length} · {Math.round((step / (steps.length - 1)) * 100)}% COMPLETE</div>
        </div>
        <div className="onb-stepper">
          {steps.map((s, i) => (
            <div key={i} className={`onb-step ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
              <div className="circle">{i < step ? '✓' : i + 1}</div>
              <div className="lbl"><div className="ar">{s.ar}</div><div className="en">{s.en}</div></div>
              {i < steps.length - 1 && <div className="line" />}
            </div>
          ))}
        </div>

        <hr className="hairline" style={{ margin: '24px 0' }} />

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && (
          <>
            <div className="auth-eyebrow" style={{ marginBottom: 12 }}>STEP 01 · البيانات الشخصية</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>بيانات ملفك الشخصي.</div>
            <div className="kyc-field-grid">
              <div className="kyc-field">
                <label>الاسم الأول · FIRST NAME</label>
                <input defaultValue="نور" />
              </div>
              <div className="kyc-field">
                <label>الاسم الأخير · LAST NAME</label>
                <input defaultValue="حسن" />
              </div>
              <div className="kyc-field">
                <label>تاريخ الميلاد · DATE OF BIRTH</label>
                <input defaultValue="1995-07-14" type="date" style={{ direction: 'ltr' }} />
              </div>
              <div className="kyc-field">
                <label>الجنسية · NATIONALITY</label>
                <select defaultValue="eg">
                  <option value="eg">مصرية · Egyptian</option>
                  <option value="sa">سعودية · Saudi</option>
                  <option value="ae">إماراتية · Emirati</option>
                  <option value="other">أخرى · Other</option>
                </select>
              </div>
              <div className="kyc-field">
                <label>المدينة · CITY</label>
                <select defaultValue="cairo">
                  <option value="cairo">القاهرة · Cairo</option>
                  <option value="hurghada">الغردقة · Hurghada</option>
                  <option value="alex">الإسكندرية · Alexandria</option>
                  <option value="sharm">شرم الشيخ · Sharm</option>
                  <option value="luxor">الأقصر · Luxor</option>
                </select>
              </div>
              <div className="kyc-field">
                <label>البريد الإلكتروني · EMAIL (اختياري)</label>
                <input type="email" placeholder="nour@example.com" style={{ direction: 'ltr' }} />
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <Btn onClick={() => setSt(1)}>التالي · NEXT STEP →</Btn>
            </div>
          </>
        )}

        {/* ── STEP 1: Identity ── */}
        {step === 1 && (
          <>
            <div className="auth-eyebrow" style={{ marginBottom: 12 }}>STEP 02 · التحقق من الهوية</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>هويتك تحمي الجميع.</div>
            <div style={{ fontSize: 14, color: 'var(--muted-2)', marginBottom: 24, lineHeight: 1.7 }}>
              نحتاج إلى صورة هويتك لضمان سلامة المنصة ومستخدميها. بياناتك مشفرة ومؤمنة.
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                نوع الوثيقة · ID TYPE
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { val: 'nid',      ar: 'بطاقة قومية', en: 'NATIONAL ID' },
                  { val: 'passport', ar: 'جواز سفر',    en: 'PASSPORT'    },
                  { val: 'driving',  ar: 'رخصة قيادة',  en: 'DRIVING LIC' },
                ].map(({ val, ar, en }) => (
                  <div key={val} className={`account-type-card ${accType === val ? 'on' : ''}`} style={{ flex: 1 }} onClick={() => setAccTy(val)}>
                    <div className="ar" style={{ fontSize: 13, fontWeight: 600 }}>{ar}</div>
                    <div className="en">{en}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="upload-zone" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>الوجه الأمامي للهوية · FRONT SIDE</div>
              <div>انقر للرفع أو اسحب الملف هنا · CLICK OR DRAG TO UPLOAD</div>
              <div style={{ marginTop: 6, color: 'var(--muted-2)', fontSize: 10 }}>JPG, PNG, PDF · MAX 10 MB</div>
            </div>
            <div className="upload-zone" style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🤳</div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>صورة سيلفي للتحقق · SELFIE VERIFICATION</div>
              <div>صورة واضحة لوجهك كما في الهوية · FACE MUST MATCH ID</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="outline" onClick={() => setSt(0)} style={{ width: 'auto', padding: '14px 24px' }}>← رجوع</Btn>
              <Btn onClick={() => setSt(2)}>التالي · NEXT →</Btn>
            </div>
          </>
        )}

        {/* ── STEP 2: Account Type ── */}
        {step === 2 && (
          <>
            <div className="auth-eyebrow" style={{ marginBottom: 12 }}>STEP 03 · نوع الحساب</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>كيف تريد الاستخدام؟</div>
            <div style={{ fontSize: 14, color: 'var(--muted-2)', marginBottom: 24, lineHeight: 1.7 }}>
              يمكنك التغيير لاحقاً من إعدادات حسابك.
            </div>

            <div className="account-type-grid">
              {[
                { val: 'customer', icon: '⛵',  ar: 'عميل',        en: 'CUSTOMER',      sub: 'احجز رحلات واشترِ معدات' },
                { val: 'owner',    icon: '🚢',  ar: 'مالك قارب',   en: 'BOAT OWNER',    sub: 'أدرج سفنك وكسب دخلاً' },
                { val: 'vendor',   icon: '🎣',  ar: 'بائع معدات',  en: 'VENDOR',        sub: 'بع منتجاتك لمحبي البحر' },
              ].map(({ val, icon, ar, en, sub }) => (
                <div key={val} className={`account-type-card ${accType === val ? 'on' : ''}`} onClick={() => setAccTy(val)}>
                  <div className="icon">{icon}</div>
                  <div className="ar">{ar}</div>
                  <div className="en">{en}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Extra fields for boat owner */}
            {accType === 'owner' && (
              <div style={{ marginTop: 24, padding: '20px 24px', background: 'oklch(0.97 0.02 220 / 0.35)', border: '1px solid oklch(0.84 0.04 215 / 0.5)' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 14 }}>
                  OWNER DETAILS · تفاصيل المالك
                </div>
                <div className="kyc-field-grid">
                  <div className="kyc-field">
                    <label>رخصة الربان · CAPTAIN LIC.</label>
                    <input placeholder="CL-2026-XXXXXX" style={{ direction: 'ltr' }} />
                  </div>
                  <div className="kyc-field">
                    <label>الميناء الرئيسي · HOME PORT</label>
                    <select>
                      <option>الغردقة · Hurghada</option>
                      <option>شرم الشيخ · Sharm</option>
                      <option>الإسكندرية · Alexandria</option>
                    </select>
                  </div>
                  <div className="kyc-field full">
                    <label>رخصة خفر السواحل · COAST GUARD LIC.</label>
                    <div className="upload-zone" style={{ marginTop: 0 }}>
                      <div style={{ fontSize: 12 }}>📋 رفع ملف الترخيص · UPLOAD LICENSE FILE</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {accType === 'vendor' && (
              <div style={{ marginTop: 24, padding: '20px 24px', background: 'oklch(0.97 0.02 55 / 0.3)', border: '1px solid oklch(0.84 0.04 55 / 0.5)' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 14 }}>
                  VENDOR DETAILS · تفاصيل البائع
                </div>
                <div className="kyc-field-grid">
                  <div className="kyc-field">
                    <label>اسم المتجر · STORE NAME</label>
                    <input placeholder="متجر معدات البحر" />
                  </div>
                  <div className="kyc-field">
                    <label>السجل التجاري · TRADE REG.</label>
                    <input placeholder="CR-2026-XXXXXX" style={{ direction: 'ltr' }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Btn variant="outline" onClick={() => setSt(1)} style={{ width: 'auto', padding: '14px 24px' }}>← رجوع</Btn>
              <Btn onClick={() => setSt(3)}>إنهاء التوثيق · COMPLETE →</Btn>
            </div>
          </>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'oklch(0.55 0.13 155)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 28px',
              boxShadow: '0 8px 32px oklch(0.55 0.13 155 / 0.35)',
            }}>✓</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 36, fontWeight: 700, marginBottom: 12 }}>
              تم التوثيق!
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted-2)', lineHeight: 1.8, maxWidth: 38+'ch', margin: '0 auto 32px' }}>
              سيتم مراجعة بياناتك خلال ٢٤ ساعة. ستصلك إشعارات عبر واتساب ورسائل SMS. يمكنك البدء في الاستكشاف الآن.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn onClick={() => onNavigate('home')}>
                استكشف القوارب · EXPLORE BOATS
              </Btn>
              <Btn variant="outline" onClick={() => onNavigate('profile')}>
                عرض الملف الشخصي · VIEW PROFILE
              </Btn>
            </div>
            <div style={{ marginTop: 24, padding: '16px 20px', background: 'oklch(0.97 0.02 55 / 0.3)', border: '1px solid oklch(0.84 0.04 55 / 0.4)', textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8, direction: 'ltr' }}>
                VERIFICATION CHECKLIST
              </div>
              {[
                ['البيانات الشخصية · Personal data', true],
                ['الهوية الرسمية · ID document', true],
                ['مراجعة المنصة · Platform review', false],
              ].map(([lbl, done]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--rule)', fontSize: 13 }}>
                  <span className="tick-circle" style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: done ? 'oklch(0.55 0.13 155)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: done ? 'white' : 'var(--muted)', background: done ? 'oklch(0.55 0.13 155)' : 'transparent', flexShrink: 0 }}>{done ? '✓' : '–'}</span>
                  <span style={{ color: done ? 'var(--ink)' : 'var(--muted)' }}>{lbl}</span>
                  {!done && <span style={{ marginRight: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--clay)', border: '1px solid var(--clay)', padding: '2px 6px' }}>PENDING</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   03 · NOTIFICATIONS PAGE
   ══════════════════════════════════════════════════════════════ */
const NOTIFS = [
  {
    id: 1, type: 'booking', icon: '⚓', unread: true,
    title: 'تم تأكيد حجزك',
    desc: 'رحلة الغردقة مع الربان عمر — ١٢ مايو ٢٠٢٦ · ٠٦:٠٠ صباحاً. تذكرة فوري سارية لمدة ٤٨ ساعة.',
    time: '10:32', date: 'اليوم',
  },
  {
    id: 2, type: 'payment', icon: '💳', unread: true,
    title: 'دفعة فوري مستلمة',
    desc: 'استلمنا دفعة ٨,٢٠٠ EGP لحجز BOAT-0042. سيتم تحويل المبلغ بعد إتمام الرحلة.',
    time: '09:15', date: 'اليوم',
  },
  {
    id: 3, type: 'booking', icon: '⚓', unread: false,
    title: 'تذكير بموعد رحلتك',
    desc: 'رحلتك على متن "نجمة النيل" بعد ٣ أيام. تأكد من إحضار الهوية الشخصية ووصول باكر.',
    time: '08:00', date: 'اليوم',
  },
  {
    id: 4, type: 'alert', icon: '🌊', unread: false,
    title: 'تحذير طقس · البحر الأحمر',
    desc: 'توقع موجات ١.٨ م وريح ٢٢ عقدة يوم الأربعاء. قد يؤثر ذلك على رحلات المناطق المفتوحة.',
    time: '18:44', date: 'أمس',
  },
  {
    id: 5, type: 'system', icon: '🏆', unread: false,
    title: 'بطولة جديدة مفتوحة للتسجيل',
    desc: 'بطولة صيد البحر الأحمر ٢٠٢٦ — سجّل الآن واربح ٥٠,٠٠٠ EGP. آخر موعد للتسجيل ٢٠ مايو.',
    time: '12:00', date: 'أمس',
  },
  {
    id: 6, type: 'payment', icon: '💳', unread: false,
    title: 'رد استرجاع مكتمل',
    desc: 'تم رد ٣,٤٠٠ EGP لحجز BOAT-0031 الملغي. سيظهر في حسابك خلال ٢-٥ أيام عمل.',
    time: '10:20', date: '١١ مايو',
  },
  {
    id: 7, type: 'booking', icon: '⚓', unread: false,
    title: 'تقييم رحلتك',
    desc: 'كيف كانت رحلتك على متن "شمس البحر" مع الربان خالد؟ تقييمك يساعد الجميع.',
    time: '09:00', date: '١١ مايو',
  },
  {
    id: 8, type: 'system', icon: '⭐', unread: false,
    title: 'عرض حصري · عملاء مميزون',
    desc: 'خصم ١٥٪ على حجزك القادم لمحبي البحر الذين أكملوا ٥ رحلات أو أكثر. كودك: SEA15.',
    time: '14:00', date: '١٠ مايو',
  },
];

function NotificationsPage({ onNavigate }) {
  const [tab, setTab]     = useSt('all');
  const [notifs, setNf]   = useSt(NOTIFS);

  const tabs = [
    { id: 'all',     ar: 'الكل',      count: notifs.filter(n => n.unread).length },
    { id: 'booking', ar: 'الحجوزات',  count: notifs.filter(n => n.type === 'booking' && n.unread).length },
    { id: 'payment', ar: 'المدفوعات', count: 0 },
    { id: 'system',  ar: 'النظام',    count: 0 },
  ];

  const visible = tab === 'all' ? notifs : notifs.filter(n => n.type === tab);
  const unreadCount = notifs.filter(n => n.unread).length;

  const markAllRead = () => setNf(notifs.map(n => ({ ...n, unread: false })));
  const markRead    = (id) => setNf(notifs.map(n => n.id === id ? { ...n, unread: false } : n));

  return (
    <div className="notif-shell">
      <div className="notif-header">
        <div className="notif-header-top">
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--clay)', marginBottom: 6 }}>
              NOTIFICATIONS · الإشعارات
            </div>
            <h1>
              الإشعارات
              {unreadCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--clay)', color: 'var(--foam)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--ff-mono)', marginRight: 14, verticalAlign: 'middle' }}>
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button className="mark-all" onClick={markAllRead}>
              تحديد الكل كمقروء · MARK ALL READ
            </button>
          )}
        </div>
        <div className="notif-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`notif-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.ar}
              {t.count > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--clay)', color: 'var(--foam)', fontSize: 10, fontWeight: 700, marginRight: 6, verticalAlign: 'middle' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="notif-empty">
          <div className="big">🔔</div>
          <p>لا توجد إشعارات في هذه الفئة حتى الآن.<br />NO NOTIFICATIONS IN THIS CATEGORY YET.</p>
        </div>
      ) : (
        <div className="notif-list">
          {/* Group by date */}
          {['اليوم', 'أمس', '١١ مايو', '١٠ مايو'].map(date => {
            const group = visible.filter(n => n.date === date);
            if (!group.length) return null;
            return (
              <div key={date}>
                <div style={{ padding: '12px 48px', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', background: 'oklch(0.955 0.015 85 / 0.5)', borderBottom: '1px solid var(--rule)', direction: 'ltr' }}>
                  {date.toUpperCase()} · {date === 'اليوم' ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </div>
                {group.map(n => (
                  <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                    <div className={`notif-icon ${n.type}`}>{n.icon}</div>
                    <div className="notif-body">
                      <div className="title">{n.title}</div>
                      <div className="desc">{n.desc}</div>
                      <div className="meta">
                        <span>{n.time}</span>
                        <span className="dot" />
                        <span style={{ textTransform: 'uppercase' }}>{n.type}</span>
                      </div>
                    </div>
                    {n.unread && <div className="notif-unread-dot" />}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   04 · SETTINGS PAGE
   ══════════════════════════════════════════════════════════════ */
function SettingsPage({ onNavigate }) {
  const [active, setActive] = useSt('profile');
  const [lang,   setLang]   = useSt('ar');
  const [notifToggles, setNt] = useSt({
    booking:   true,
    payment:   true,
    weather:   true,
    promo:     false,
    newsletter: false,
  });
  const toggleNt = k => setNt(p => ({ ...p, [k]: !p[k] }));

  const sidebar = [
    { id: 'profile',   icon: '👤', ar: 'الملف الشخصي',     en: 'Profile'    },
    { id: 'notifs',    icon: '🔔', ar: 'الإشعارات',          en: 'Notifications' },
    { id: 'payments',  icon: '💳', ar: 'طرق الدفع',          en: 'Payments'   },
    { id: 'lang',      icon: '🌐', ar: 'اللغة والمنطقة',     en: 'Language'   },
    { id: 'security',  icon: '🔐', ar: 'الخصوصية والأمان',   en: 'Security'   },
    { id: 'about',     icon: 'ℹ️', ar: 'عن التطبيق',         en: 'About'      },
  ];

  return (
    <div className="settings-shell">
      <div className="settings-header">
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--clay)', marginBottom: 6 }}>
          SETTINGS · الإعدادات
        </div>
        <h1>الإعدادات</h1>
      </div>

      <div className="settings-body">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {sidebar.map(s => (
            <div key={s.id} className={`settings-sidebar-item ${active === s.id ? 'on' : ''}`} onClick={() => setActive(s.id)}>
              <span className="icon">{s.icon}</span>
              <div>
                <div>{s.ar}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)', marginTop: 2 }}>{s.en}</div>
              </div>
            </div>
          ))}
          <div style={{ margin: '24px 16px 0', borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
            <button className="btn-danger" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }} onClick={() => onNavigate('login')}>
              ⏻ تسجيل الخروج · LOGOUT
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="settings-content">

          {/* ── Profile ── */}
          {active === 'profile' && (
            <>
              <div className="settings-section-title">الملف الشخصي · PROFILE</div>
              <div className="avatar-edit-row">
                <div className="avatar-big">ن</div>
                <div className="avatar-edit-info">
                  <div className="name">نور حسن</div>
                  <div className="since">MEMBER SINCE · 2026-01 · CAIRO</div>
                  <div className="change-photo">تغيير الصورة · CHANGE PHOTO</div>
                </div>
              </div>
              {[
                { lbl: 'الاسم الكامل · FULL NAME',          val: 'نور حسن',           type: 'text' },
                { lbl: 'رقم الهاتف · PHONE',                val: '+20 10xxxxxxxx',    type: 'tel', dir: 'ltr' },
                { lbl: 'البريد الإلكتروني · EMAIL',          val: 'nour@example.com',  type: 'email', dir: 'ltr' },
                { lbl: 'المدينة · CITY',                     val: 'القاهرة',           type: 'text' },
              ].map(({ lbl, val, type, dir }) => (
                <div className="settings-row" key={lbl}>
                  <div className="settings-row-info">
                    <div className="label">{lbl.split(' · ')[0]}</div>
                    <div className="sub" style={{ direction: dir || 'inherit' }}>{val}</div>
                  </div>
                  <button style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--clay)', border: '1px solid var(--clay)', padding: '6px 14px' }}>تعديل · EDIT</button>
                </div>
              ))}
              <div style={{ marginTop: 28 }}>
                <Btn style={{ width: 'auto', padding: '12px 32px' }}>حفظ التغييرات · SAVE</Btn>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {active === 'notifs' && (
            <>
              <div className="settings-section-title">الإشعارات · NOTIFICATIONS</div>
              <div className="settings-section">
                {[
                  { k: 'booking',    ar: 'تحديثات الحجوزات',    en: 'Booking updates — confirmations, reminders, cancellations' },
                  { k: 'payment',    ar: 'تنبيهات المدفوعات',    en: 'Payment confirmations, receipts, and refund status' },
                  { k: 'weather',    ar: 'تحذيرات الطقس',        en: 'Marine weather alerts affecting your upcoming trips' },
                  { k: 'promo',      ar: 'العروض والخصومات',     en: 'Promotional offers, loyalty points, and seasonal deals' },
                  { k: 'newsletter', ar: 'النشرة الإخبارية',      en: 'Monthly SeaConnect newsletter and market updates' },
                ].map(({ k, ar, en }) => (
                  <div className="settings-row" key={k}>
                    <div className="settings-row-info">
                      <div className="label">{ar}</div>
                      <div className="sub">{en}</div>
                    </div>
                    <button className={`toggle ${notifToggles[k] ? 'on' : ''}`} onClick={() => toggleNt(k)} />
                  </div>
                ))}
              </div>
              <div className="settings-section">
                <div className="settings-section-title">القنوات · CHANNELS</div>
                {[
                  { ar: 'إشعارات التطبيق', en: 'In-app push notifications', on: true },
                  { ar: 'رسائل SMS',        en: 'Text messages to your registered phone', on: true },
                  { ar: 'واتساب',           en: 'WhatsApp messages (Egypt only)', on: true },
                  { ar: 'البريد الإلكتروني', en: 'Email digest (weekly summary)', on: false },
                ].map(({ ar, en, on }) => (
                  <div className="settings-row" key={ar}>
                    <div className="settings-row-info">
                      <div className="label">{ar}</div>
                      <div className="sub">{en}</div>
                    </div>
                    <button className={`toggle ${on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Payments ── */}
          {active === 'payments' && (
            <>
              <div className="settings-section-title">طرق الدفع · PAYMENT METHODS</div>
              <div className="settings-section">
                <div className="pm-list">
                  {[
                    { logo: 'FAWRY',          detail: 'كود فوري · كود يُرسل إليك', badge: 'DEFAULT' },
                    { logo: 'VF CASH',        detail: 'محفظة فودافون · 010xxxxxxxx' },
                    { logo: 'INSTAPAY',       detail: 'نظام التحويل الفوري · بنك القاهرة' },
                    { logo: 'VISA •••• 4821', detail: 'تنتهي صلاحيتها في 09/28' },
                  ].map(({ logo, detail, badge }) => (
                    <div key={logo} className="pm-row">
                      <div className="pm-logo">{logo}</div>
                      <div className="pm-detail">{detail}</div>
                      {badge && <div className="pm-badge">{badge}</div>}
                      <button style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', border: '1px solid var(--rule)', padding: '5px 10px' }}>إزالة · REMOVE</button>
                    </div>
                  ))}
                  <div className="pm-add">
                    <span style={{ fontSize: 18 }}>＋</span>
                    <span>إضافة طريقة دفع · ADD PAYMENT METHOD</span>
                  </div>
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">تاريخ المعاملات · TRANSACTION HISTORY</div>
                {[
                  { ref: 'SC-2026-0421', amount: '8,200', date: '2026-05-12', type: 'حجز', status: 'مكتمل' },
                  { ref: 'SC-2026-0397', amount: '3,400', date: '2026-05-10', type: 'استرجاع', status: 'مكتمل', refund: true },
                  { ref: 'SC-2026-0351', amount: '12,500', date: '2026-04-28', type: 'حجز', status: 'مكتمل' },
                ].map(t => (
                  <div className="settings-row" key={t.ref}>
                    <div className="settings-row-info">
                      <div className="label" style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, direction: 'ltr' }}>{t.ref}</div>
                      <div className="sub" style={{ direction: 'ltr' }}>{t.date} · {t.type}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: t.refund ? 'oklch(0.55 0.13 155)' : 'var(--ink)', direction: 'ltr' }}>
                        {t.refund ? '+' : ''}{t.amount} EGP
                      </div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)' }}>{t.status.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Language ── */}
          {active === 'lang' && (
            <>
              <div className="settings-section-title">اللغة والمنطقة · LANGUAGE & REGION</div>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label">لغة التطبيق · App language</div>
                    <div className="sub">تغيير لغة الواجهة وتوجيه النص</div>
                  </div>
                  <div className="lang-seg">
                    <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>العربية · AR</button>
                    <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>ENGLISH · EN</button>
                  </div>
                </div>
                {[
                  { ar: 'المنطقة الزمنية · Time zone', sub: 'Africa/Cairo (UTC+3)', val: 'Africa/Cairo (UTC+3)', dir: 'ltr' },
                  { ar: 'العملة الافتراضية · Currency', sub: 'جنيه مصري · EGP', val: 'EGP' },
                  { ar: 'تنسيق التاريخ · Date format', sub: 'DD/MM/YYYY', val: 'DD/MM/YYYY', dir: 'ltr' },
                ].map(({ ar, sub, val, dir }) => (
                  <div className="settings-row" key={ar}>
                    <div className="settings-row-info">
                      <div className="label">{ar.split(' · ')[0]}</div>
                      <div className="sub">{sub}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--muted-2)', direction: dir || 'inherit' }}>{val}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Security ── */}
          {active === 'security' && (
            <>
              <div className="settings-section-title">الخصوصية والأمان · PRIVACY & SECURITY</div>
              <div className="settings-section">
                {[
                  { ar: 'المصادقة الثنائية', en: 'Two-factor authentication via SMS OTP', on: true },
                  { ar: 'تسجيل الدخول بالبصمة', en: 'Biometric login — fingerprint or Face ID', on: false },
                  { ar: 'إشعار تسجيل الدخول', en: 'Notify me when account is accessed from a new device', on: true },
                ].map(({ ar, en, on }) => (
                  <div className="settings-row" key={ar}>
                    <div className="settings-row-info">
                      <div className="label">{ar}</div>
                      <div className="sub">{en}</div>
                    </div>
                    <button className={`toggle ${on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>
              <div className="settings-section">
                <div className="settings-section-title">بياناتك · YOUR DATA</div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label">تنزيل بياناتي · Download my data</div>
                    <div className="sub">ملف JSON يحتوي على كل بياناتك — سيُرسل على بريدك</div>
                  </div>
                  <button style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '8px 16px' }}>طلب · REQUEST</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label" style={{ color: 'oklch(0.50 0.18 28)' }}>حذف الحساب · Delete account</div>
                    <div className="sub">لا يمكن التراجع عن هذا الإجراء. ستُحذف جميع بياناتك خلال ٣٠ يوماً.</div>
                  </div>
                  <button className="btn-danger" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>حذف · DELETE</button>
                </div>
              </div>
            </>
          )}

          {/* ── About ── */}
          {active === 'about' && (
            <>
              <div className="settings-section-title">عن التطبيق · ABOUT</div>
              <div className="settings-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ width: 56, height: 56, background: 'var(--ink)', color: 'var(--foam)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-display)', fontSize: 28, fontWeight: 700 }}>س</div>
                  <div>
                    <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700 }}>سي كونكت</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginTop: 4, direction: 'ltr' }}>SeaConnect v1.0.0 · Build 2026-05-14</div>
                  </div>
                </div>
                {[
                  { ar: 'شروط الاستخدام',              en: 'Terms of Service'    },
                  { ar: 'سياسة الخصوصية',              en: 'Privacy Policy'      },
                  { ar: 'سياسة الاسترجاع والإلغاء',    en: 'Cancellation Policy' },
                  { ar: 'إرشادات المجتمع',              en: 'Community Guidelines' },
                  { ar: 'اتصل بالدعم الفني',            en: 'Contact Support'     },
                ].map(({ ar, en }) => (
                  <div className="settings-row" key={ar} style={{ cursor: 'pointer' }}>
                    <div className="settings-row-info"><div className="label">{ar}</div><div className="sub">{en}</div></div>
                    <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: '16px 0', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)', direction: 'ltr', lineHeight: 1.8 }}>
                © 2026 SEACONNECT LLC · REGISTERED IN CAIRO, EGYPT<br />
                CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 05 · SEARCH & FILTERS PAGE
// ═══════════════════════════════════════════════════════════════════════
function SearchPage({ onOpenBoat }) {
  const { useState } = React;
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeRegions, setActiveRegions] = useState([]);
  const [activeAmenities, setActiveAmenities] = useState([]);
  const [sort, setSort] = useState('recommended');

  const boatTypes = ['قارب صيد', 'يخت فاخر', 'كاتاماران', 'زورق سرعة', 'قارب شراعي', 'قارب غطس'];
  const regions   = ['الغردقة', 'شرم الشيخ', 'دهب', 'الإسكندرية', 'الأقصر', 'مرسى مطروح'];
  const amenities = ['صيد سمك', 'غطس', 'شنطة بحرية', 'طاهٍ على متن', 'مكيف هواء', 'ربان خبير'];

  const toggle = (arr, setArr, val) =>
    setArr(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);

  const activeTags = [
    ...activeTypes.map(t => ({ label: t, clear: () => toggle(activeTypes, setActiveTypes, t) })),
    ...activeRegions.map(r => ({ label: r, clear: () => toggle(activeRegions, setActiveRegions, r) })),
    ...activeAmenities.map(a => ({ label: a, clear: () => toggle(activeAmenities, setActiveAmenities, a) })),
  ];

  const filtered = (BOATS || []).filter(b => {
    const matchQ = !query || b.name.includes(query) || b.region.includes(query) || (b.type && b.type.includes(query));
    const matchR = activeRegions.length === 0 || activeRegions.includes(b.region);
    return matchQ && matchR;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price-asc')  return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'rating')     return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '28px 48px 0', display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '2px solid var(--ink)', marginBottom: 0 }}>
        <h1 className="display" style={{ fontSize: 36 }}>البحث والفلترة</h1>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--muted)' }}>· SEARCH & FILTERS</span>
      </div>

      <div className="search-layout">
        {/* ── Sidebar ── */}
        <aside className="search-sidebar">
          <div className="search-sidebar-title">الفلاتر <span>FILTERS</span></div>

          {activeTags.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="filter-group-label">مفعّلة · ACTIVE</div>
              <div className="search-active-tags">
                {activeTags.map((t, i) => (
                  <div key={i} className="search-tag">
                    {t.label}<span className="search-tag-x" onClick={t.clear}>×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {[
            { label: 'نوع القارب · BOAT TYPE', items: boatTypes, arr: activeTypes, setArr: setActiveTypes },
            { label: 'المنطقة · REGION',        items: regions,   arr: activeRegions, setArr: setActiveRegions },
            { label: 'الميزات · AMENITIES',     items: amenities, arr: activeAmenities, setArr: setActiveAmenities },
          ].map(({ label, items, arr, setArr }) => (
            <div className="filter-group" key={label}>
              <div className="filter-group-label">{label}</div>
              <div className="filter-chips">
                {items.map(t => (
                  <button key={t} className={`filter-chip ${arr.includes(t) ? 'active' : ''}`}
                    onClick={() => toggle(arr, setArr, t)}>{t}</button>
                ))}
              </div>
            </div>
          ))}

          <div className="filter-group">
            <div className="filter-group-label">نطاق السعر · PRICE / DAY</div>
            <div className="range-slider-row">
              <span className="range-label">500</span>
              <div className="range-track">
                <div className="range-fill" />
                <div className="range-handle" style={{ left: '20%' }} />
                <div className="range-handle" style={{ left: '85%' }} />
              </div>
              <span className="range-label">25k</span>
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted-2)', marginTop: 6, direction: 'ltr', textAlign: 'center' }}>
              1,000 — 20,000 EGP
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">تاريخ الإتاحة · DATE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['من · FROM', 'إلى · TO'].map(p => (
                <div key={p} style={{ padding: '9px 12px', border: '1px solid var(--rule-strong)', borderRadius: 2, fontSize: 12, color: 'var(--muted-2)', background: 'oklch(1 0 0 / 0.6)', textAlign: 'center' }}>{p}</div>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">عدد الركاب · CAPACITY</div>
            <div className="filter-chips">
              {['2–4', '5–8', '9–12', '13+'].map(c => (
                <button key={c} className="filter-chip" style={{ fontFamily: 'var(--ff-mono)', direction: 'ltr' }}>{c}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" style={{ width: '100%' }}>تطبيق الفلاتر</button>
            <button className="btn btn-ghost" style={{ width: '100%' }}
              onClick={() => { setActiveTypes([]); setActiveRegions([]); setActiveAmenities([]); }}>
              مسح الكل
            </button>
          </div>
        </aside>

        {/* ── Main results ── */}
        <main className="search-main">
          <div className="search-bar-row">
            <div className="search-input-wrap">
              <span className="search-input-icon">🔍</span>
              <input className="search-input" type="text"
                placeholder="ابحث عن قارب، مكان، رحلة..."
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <select className="search-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="recommended">الأنسب</option>
              <option value="price-asc">الأقل سعراً</option>
              <option value="price-desc">الأعلى سعراً</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>

          <div className="search-results-meta">
            {sorted.length} RESULTS{query ? ` FOR "${query.toUpperCase()}"` : ''} · EGYPT
          </div>

          {sorted.length > 0 ? (
            <div className="search-results-grid">
              {sorted.map(b => (
                <div key={b.id} onClick={() => onOpenBoat && onOpenBoat(b)}
                  style={{ background: 'oklch(1 0 0 / 0.72)', backdropFilter: 'blur(6px)', border: '1px solid var(--rule)', borderRadius: 2, cursor: 'pointer', transition: 'border-color 0.18s, transform 0.2s, box-shadow 0.2s', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rule-strong)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px oklch(0.20 0.045 235 / 0.10)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ aspectRatio: '16/9', backgroundImage: `url(${b.img})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.14 0.04 240 / 0.55) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--sand)', letterSpacing: '0.1em', direction: 'ltr' }}>★ {b.rating}</div>
                    <div style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', background: 'var(--clay)', color: 'var(--foam)', padding: '3px 8px', borderRadius: 1 }}>{b.type}</div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--ff-display)', fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 10, direction: 'ltr' }}>{b.regionEn ? b.regionEn.toUpperCase() : b.region}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700 }}>{b.price.toLocaleString('en')}</span>
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', marginRight: 4 }}> EGP / يوم</span>
                      </div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted-2)', direction: 'ltr' }}>👥 {b.capacity} PAX</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-no-results">
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚓</div>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>لا توجد نتائج</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>جرّب البحث بكلمات أخرى أو عدّل الفلاتر</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 06 · VENDOR STOREFRONT & CART
// ═══════════════════════════════════════════════════════════════════════
function VendorPage() {
  const { useState } = React;
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categories = [
    { id: 'all',        label: 'الكل' },
    { id: 'fishing',    label: 'صيد السمك' },
    { id: 'safety',     label: 'السلامة' },
    { id: 'diving',     label: 'الغطس' },
    { id: 'navigation', label: 'الملاحة' },
    { id: 'clothing',   label: 'الملابس البحرية' },
  ];

  const products = [
    { id: 'p1', name: 'طقم صنارات احترافي', brand: 'SHIMANO', price: 1850, oldPrice: 2400, img: 'https://images.unsplash.com/photo-1416169607655-0c2b3ce2e1cc?w=400&q=80', category: 'fishing', badge: 'sale', specs: [['الوزن','320g'],['الطول','2.4m'],['القوة','20lb'],['المادة','كربون']] },
    { id: 'p2', name: 'سترة نجاة بحرية ISO', brand: 'SPINLOCK', price: 3200, img: 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&q=80', category: 'safety', badge: 'new', specs: [['الحجم','M/L'],['الطفو','150N'],['اللون','برتقالي'],['الشهادة','ISO 12402']] },
    { id: 'p3', name: 'نظارة غطس بانورامية', brand: 'CRESSI', price: 890, oldPrice: 1100, img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80', category: 'diving', badge: 'sale', specs: [['الإطار','سيليكون'],['العدسة','شبه منحرف'],['اللون','أسود/أزرق'],['الحجم','موحد']] },
    { id: 'p4', name: 'GPS بحري محمول', brand: 'GARMIN', price: 5600, img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80', category: 'navigation', badge: null, specs: [['الشاشة','5 بوصة'],['البطارية','15h'],['مقاوم','IPX7'],['الخرائط','بحر متوسط']] },
    { id: 'p5', name: 'سمكة طعم ميتالك', brand: 'RAPALA', price: 320, img: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=400&q=80', category: 'fishing', badge: null, specs: [['الطول','14cm'],['الوزن','28g'],['العمق','0–3m'],['اللون','فضي']] },
    { id: 'p6', name: 'طقم كايت ساحلي', brand: 'NORTH SAILS', price: 12500, img: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=80', category: 'diving', badge: 'new', specs: [['الحجم','12m²'],['النوع','C-Shape'],['الطاقة','4 خيوط'],['الضغط','7 PSI']] },
    { id: 'p7', name: 'قبعة شمس مقاومة للماء', brand: 'COLUMBIA', price: 280, img: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=400&q=80', category: 'clothing', badge: null, specs: [['المادة','نايلون'],['UPF','50+'],['مقاوم','للماء'],['الطوي','قابلة']] },
    { id: 'p8', name: 'لاسلكي VHF بحري', brand: 'ICOM', price: 2200, img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80', category: 'navigation', badge: null, specs: [['القدرة','5W'],['القنوات','57 بحرية'],['مقاوم','IPX7'],['البطارية','12h']] },
  ];

  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);

  const addToCart = (p) => setCartItems(prev => {
    const ex = prev.find(i => i.id === p.id);
    if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { ...p, qty: 1 }];
  });
  const removeFromCart = (id) => setCartItems(p => p.filter(i => i.id !== id));
  const updateQty = (id, delta) => setCartItems(p =>
    p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
  );

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const isInCart = (id) => cartItems.some(i => i.id === id);

  return (
    <div style={{ position: 'relative' }}>
      {/* Cart overlay */}
      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />

      {/* Cart drawer */}
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <div>
            <div className="cart-drawer-title">سلة التسوق</div>
            <div className="cart-drawer-count">{cartCount} ITEM{cartCount !== 1 ? 'S' : ''}</div>
          </div>
          <div className="cart-drawer-close" onClick={() => setCartOpen(false)}>×</div>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🛒</div>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18 }}>السلة فارغة</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>أضف منتجات من المتجر</div>
            </div>
          )}
          {cartItems.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-img" style={{ backgroundImage: `url(${item.img})` }} />
              <div>
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-brand">{item.brand}</div>
                <div className="cart-item-qty">
                  <div className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</div>
                  <div className="qty-val">{item.qty}</div>
                  <div className="qty-btn" onClick={() => updateQty(item.id, +1)}>+</div>
                  <span style={{ marginRight: 10, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => removeFromCart(item.id)}>حذف</span>
                </div>
              </div>
              <div className="cart-item-price" style={{ direction: 'ltr' }}>
                {(item.price * item.qty).toLocaleString('en')}
                <br /><span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)' }}>EGP</span>
              </div>
            </div>
          ))}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            {[
              ['المجموع الفرعي', `${cartTotal.toLocaleString('en')} EGP`, false],
              ['الشحن', 'مجاني ✓', false],
              ['ضريبة القيمة المضافة 14%', `${Math.round(cartTotal * 0.14).toLocaleString('en')} EGP`, false],
            ].map(([l, v, bold]) => (
              <div key={l} className="cart-summary-row">
                <span>{l}</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, direction: 'ltr' }}>{v}</span>
              </div>
            ))}
            <div className="cart-summary-row total">
              <span>الإجمالي</span>
              <span style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 700, direction: 'ltr' }}>
                {Math.round(cartTotal * 1.14).toLocaleString('en')} <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}>EGP</span>
              </span>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }}>إتمام الشراء — فوري</button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 13 }} onClick={() => setCartOpen(false)}>متابعة التسوق</button>
          </div>
        )}
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <div className="product-modal-img" style={{ backgroundImage: `url(${selectedProduct.img})` }} />
            <div className="product-modal-info">
              <div className="product-modal-brand">{selectedProduct.brand}</div>
              <div className="product-modal-name">{selectedProduct.name}</div>
              <div className="product-modal-price" style={{ direction: 'ltr' }}>
                {selectedProduct.price.toLocaleString('en')}
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--muted)', marginRight: 6 }}>EGP</span>
                {selectedProduct.oldPrice && (
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--muted)', textDecoration: 'line-through', marginRight: 8 }}>
                    {selectedProduct.oldPrice.toLocaleString('en')}
                  </span>
                )}
              </div>
              <div className="product-modal-specs">
                {selectedProduct.specs.map(([k, v], i) => (
                  <div key={i} className="spec-item">
                    <div className="k">{k}</div>
                    <div className="v">{v}</div>
                  </div>
                ))}
              </div>
              <div className="product-modal-desc">
                منتج عالي الجودة للاستخدام البحري في مياه البحر الأحمر والمتوسط. مناسب للمحترفين والهواة. متوفر للشحن الفوري في الغردقة، شرم الشيخ، والقاهرة خلال ٢٤–٤٨ ساعة.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); setCartOpen(true); }}>
                  أضف للسلة +
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedProduct(null)}>إغلاق</button>
              </div>
            </div>
            <div className="product-modal-close" style={{ position: 'absolute', top: 12, left: 12, width: 32, height: 32, borderRadius: '50%', background: 'oklch(1 0 0 / 0.85)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}
              onClick={() => setSelectedProduct(null)}>×</div>
          </div>
        </div>
      )}

      {/* Vendor hero banner */}
      <div className="vendor-hero">
        <div className="vendor-hero-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=80)' }} />
        <div className="vendor-hero-content">
          <div className="vendor-badge">⭐ VERIFIED VENDOR · EST. 2019</div>
          <div className="vendor-name">بحار ستور</div>
          <div className="vendor-meta">BAHAR STORE · MARINE EQUIPMENT & SUPPLIES · HURGHADA, EGYPT</div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="vendor-stats-bar">
        {[['4.9','التقييم'],['2,847','طلب مكتمل'],['120+','منتج'],['24h','متوسط الشحن'],['98%','رضا العملاء']].map(([n, l], i) => (
          <div key={i} className="vendor-stat">
            <div className="n num">{n}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="vendor-content">
        {/* Category chips */}
        <div className="vendor-categories">
          {categories.map(c => (
            <button key={c.id} className={`filter-chip ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}>{c.label}</button>
          ))}
        </div>

        {/* Section heading */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 className="display" style={{ fontSize: 28 }}>
              {activeCategory === 'all' ? 'جميع المنتجات' : categories.find(c => c.id === activeCategory)?.label}
            </h2>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)' }}>
              · {filtered.length} PRODUCTS
            </span>
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', direction: 'ltr' }}>
            SORT: FEATURED ▾
          </div>
        </div>

        {/* Product grid */}
        <div className="vendor-grid">
          {filtered.map(p => (
            <div key={p.id} className="vendor-product-card" onClick={() => setSelectedProduct(p)}>
              <div className="vendor-product-img" style={{ backgroundImage: `url(${p.img})` }}>
                {p.badge && (
                  <div className={`vendor-product-badge ${p.badge}`}>
                    {p.badge === 'sale' ? 'خصم' : 'جديد'}
                  </div>
                )}
              </div>
              <div className="vendor-product-info">
                <div className="vendor-product-name">{p.name}</div>
                <div className="vendor-product-brand">{p.brand}</div>
                <div className="vendor-product-price-row">
                  <div>
                    <div className="vendor-product-price" style={{ direction: 'ltr' }}>
                      {p.price.toLocaleString('en')} <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)' }}>EGP</span>
                    </div>
                    {p.oldPrice && (
                      <div className="vendor-product-old-price">{p.oldPrice.toLocaleString('en')} EGP</div>
                    )}
                  </div>
                  <div className={`vendor-add-btn ${isInCart(p.id) ? 'added' : ''}`}
                    onClick={e => { e.stopPropagation(); addToCart(p); }}>
                    {isInCart(p.id) ? '✓' : '+'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="cart-fab" onClick={() => setCartOpen(true)}>
          <div className="n">{cartCount}</div>
          سلة التسوق ·
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, direction: 'ltr' }}>
            {cartTotal.toLocaleString('en')} EGP
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Export all ───────────────────────────────────────────── */
Object.assign(window, { LoginPage, KYCPage, NotificationsPage, SettingsPage });
