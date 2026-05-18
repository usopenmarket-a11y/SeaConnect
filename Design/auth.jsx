/* global React, useT, LangSwitch */

// ── Splash ────────────────────────────────────────────
function Splash({ onContinue }) {
  const { t, lang } = useT();
  React.useEffect(() => {
    const id = setTimeout(onContinue, 2000);
    return () => clearTimeout(id);
  }, [onContinue]);
  return (
    <div className="splash-shell">
      <div className="splash-brand">
        <span className="splash-mark">{t('brandMark')}</span>
        <span className="splash-word">{t('brand')}</span>
      </div>
      <div className="splash-tagline">{t('tagline')}</div>
    </div>
  );
}

// ── Onboarding ───────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const { t } = useT();
  const slides = [
    {
      img: 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?auto=format&fit=crop&w=1200&q=80',
      tag: '01 · DISCOVER',
      h: t('onb_1_h'),
      p: t('onb_1_p'),
    },
    {
      img: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80',
      tag: '02 · BOOK',
      h: t('onb_2_h'),
      p: t('onb_2_p'),
    },
    {
      img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
      tag: '03 · EARN',
      h: t('onb_3_h'),
      p: t('onb_3_p'),
    },
  ];
  const isLast = step === slides.length - 1;
  const next = () => isLast ? onComplete() : setStep(step + 1);

  return (
    <div className="onb-shell">
      <div className="onb-card">
        <div className="onb-art" style={{ backgroundImage: `url(${slides[step].img})` }} />
        <div className="onb-text">
          <div>
            <div className="onb-progress">
              {slides.map((_, i) => <div key={i} className={`onb-dot ${i <= step ? 'on' : ''}`} />)}
            </div>
            <div className="onb-step-tag">{slides[step].tag}</div>
            <h2 className="onb-h">{slides[step].h}</h2>
            <p className="onb-p">{slides[step].p}</p>
          </div>
          <div className="onb-actions">
            <button className="btn btn-ghost" onClick={onComplete}>{t('onb_skip')}</button>
            <button className="btn btn-clay btn-lg" onClick={next}>
              {isLast ? t('onb_start') : t('onb_next')} <span aria-hidden className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth split layout ────────────────────────────────
function AuthShell({ children }) {
  const { lang } = useT();
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div className="auth-art-content">
          <div className="auth-art-brand">{lang === 'ar' ? 'سي كونكت' : 'SeaConnect'}</div>
          <div className="auth-art-quote">
            {lang === 'ar'
              ? '«البحر لا يكذب — ولا يكذب من يبحر فيه».'
              : '“The sea never lies — and neither do those who sail it.”'}
          </div>
          <div className="auth-art-stamp">
            {lang === 'ar' ? 'البحر الأحمر · ٢٠٢٦' : 'RED SEA · 2026'}
          </div>
        </div>
      </div>
      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-lang-row"><LangSwitch /></div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login ────────────────────────────────────────────
function Login({ onSubmit, onRegister, onForgot }) {
  const { t, lang } = useT();
  return (
    <AuthShell>
      <h2>{t('auth_login')}</h2>
      <div className="form-field">
        <label>{t('auth_phone')} / {t('auth_email')}</label>
        <input defaultValue="" placeholder={lang === 'ar' ? '+20 100 234 5678' : '+20 100 234 5678'} dir="ltr" />
      </div>
      <div className="form-field">
        <label>{t('auth_password')}</label>
        <input type="password" defaultValue="" placeholder="••••••••" dir="ltr" />
      </div>
      <div className="auth-forgot">
        <a href="#" onClick={(e) => { e.preventDefault(); onForgot && onForgot(); }}>{t('auth_forgot')}</a>
      </div>
      <button className="btn btn-clay btn-lg" onClick={onSubmit}>
        {t('auth_login')} <span aria-hidden className="arrow">→</span>
      </button>
      <div className="auth-divider">{t('auth_or')}</div>
      <div className="auth-oauth">
        <button className="btn-oauth"><GoogleIcon /> {t('auth_google')}</button>
        <button className="btn-oauth"><AppleIcon /> {t('auth_apple')}</button>
      </div>
      <div className="auth-foot">
        {t('auth_noAcc')} <button onClick={onRegister}>{t('auth_register')}</button>
      </div>
    </AuthShell>
  );
}

// ── Register — 3 steps ───────────────────────────────
function Register({ onSubmit, onLogin }) {
  const [step, setStep] = React.useState(1);
  const [role, setRole] = React.useState('customer');
  const { t, lang } = useT();

  const roleCards = [
    { id: 'customer', icon: '⌖', titleK: 'auth_role_cust',   subK: 'auth_role_cust_s' },
    { id: 'owner',    icon: '⚓', titleK: 'auth_role_owner',  subK: 'auth_role_owner_s' },
    { id: 'vendor',   icon: '◧', titleK: 'auth_role_vendor', subK: 'auth_role_vendor_s' },
  ];

  return (
    <AuthShell>
      <div className="step-tag">{t('auth_step')} {step} {t('auth_of')} 3</div>
      <h2>{t('auth_register')}</h2>

      {step === 1 && (
        <>
          <div className="form-field">
            <label>{t('auth_name')}</label>
            <input placeholder={lang === 'ar' ? 'نور حسن' : 'Nour Hassan'} />
          </div>
          <div className="form-field">
            <label>{t('auth_email')}</label>
            <input dir="ltr" placeholder="name@example.com" />
          </div>
          <div className="form-field">
            <label>{t('auth_phone')}</label>
            <input dir="ltr" placeholder="+20 100 234 5678" />
          </div>
          <div className="form-field">
            <label>{t('auth_password')}</label>
            <input type="password" dir="ltr" placeholder="••••••••" />
          </div>
          <button className="btn btn-clay btn-lg" onClick={() => setStep(2)}>
            {t('auth_continue')} <span aria-hidden className="arrow">→</span>
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="form-field">
            <label>{t('auth_role')}</label>
          </div>
          <div className="role-cards">
            {roleCards.map(rc => (
              <button
                key={rc.id}
                className={`role-card ${role === rc.id ? 'on' : ''}`}
                onClick={() => setRole(rc.id)}
              >
                <span className="role-ico">{rc.icon}</span>
                <span>
                  <div className="role-title">{t(rc.titleK)}</div>
                  <div className="role-sub">{t(rc.subK)}</div>
                </span>
                <span className="role-check">{role === rc.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: '0 0 auto' }}>
              <span aria-hidden className="arrow-back">←</span> {t('auth_back')}
            </button>
            <button className="btn btn-clay btn-lg" onClick={() => setStep(3)} style={{ flex: 1 }}>
              {t('auth_continue')} <span aria-hidden className="arrow">→</span>
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 4 }}>{t('auth_otp_sub')}</p>
          <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 14, marginBottom: 16 }} dir="ltr">+20 100 234 5678</p>
          <div className="otp-row" dir="ltr">
            {[0,1,2,3,4,5].map(i => <input key={i} className="otp-box" maxLength="1" defaultValue={i < 3 ? String(i+1) : ''} />)}
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            <button style={{ textDecoration: 'underline', color: 'var(--ink)' }}>{t('auth_resend')}</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ flex: '0 0 auto' }}>
              <span aria-hidden className="arrow-back">←</span> {t('auth_back')}
            </button>
            <button className="btn btn-clay btn-lg" onClick={onSubmit} style={{ flex: 1 }}>
              {t('auth_verify')} <span aria-hidden className="arrow">→</span>
            </button>
          </div>
        </>
      )}

      <div className="auth-foot">
        {t('auth_yesAcc')} <button onClick={onLogin}>{t('auth_login')}</button>
      </div>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

Object.assign(window, { Splash, Onboarding, Login, Register, AuthShell });
