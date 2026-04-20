/* global React */
const { useState: useStateBk } = React;

function BookingFlow({ boat, onBack, onConfirm }) {
  const [step, setStep] = useStateBk(1);
  const total = boat ? boat.price + Math.round(boat.price * 0.12) + 180 : 0;

  const steps = [
    { n: '01', t: 'تفاصيل الرحلة', s: 'Trip details' },
    { n: '02', t: 'بياناتك', s: 'Your info' },
    { n: '03', t: 'الدفع', s: 'Payment' },
    { n: '04', t: 'تأكيد', s: 'Review' },
  ];

  return (
    <>
      <div style={{ padding: '32px 48px 0' }}>
        <button className="mono" onClick={onBack} style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
          ← العودة إلى {boat?.name}
        </button>
        <h1 className="display" style={{ fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1 }}>
          إكمال <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>الحجز</em>
        </h1>
      </div>

      <div className="flow-steps">
        {steps.map((s, i) => (
          <div key={i} className={`flow-step ${step === i + 1 ? 'current' : ''} ${step > i + 1 ? 'done' : ''}`}>
            <div className="n">{s.n}</div>
            <div className="txt">
              <div className="t">{s.s}</div>
              <div className="s">{s.t}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, padding: '0 48px 60px', alignItems: 'start' }}>
        <div style={{ background: 'var(--foam)', border: '1px solid var(--rule)', padding: 36 }}>
          {step === 1 && (
            <>
              <div className="subhead" style={{ marginTop: 0 }}>تفاصيل الرحلة</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-field"><label>تاريخ الرحلة</label><input defaultValue="الخميس · 12 مايو 2026" /></div>
                <div className="form-field"><label>عدد المسافرون</label><select><option>6 أشخاص</option></select></div>
                <div className="form-field"><label>الانطلاق</label><select><option>06:00 صباحاً</option></select></div>
                <div className="form-field"><label>العودة</label><select><option>04:00 مساءً</option></select></div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>نوع الرحلة</label><select><option>صيد عميق — شعاب جُفتون</option><option>صيد ساحلي</option><option>سباحة وسنوركل</option></select></div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>طلبات خاصة (اختياري)</label><textarea rows="3" placeholder="وجبة نباتية، طفل رضيع، احتياجات معدات..." /></div>
              </div>

              <div className="subhead">إضافات</div>
              {[
                { t: 'مصوّر محترف طوال اليوم', p: 1200 },
                { t: 'تنظيف + تعبئة السمك للعودة', p: 350 },
                { t: 'نقل من/إلى الفندق (٢ اتجاه)', p: 420 },
              ].map((a, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--rule)', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} defaultChecked={i === 0} />
                  <span style={{ flex: 1, fontSize: 15 }}>{a.t}</span>
                  <span className="num" style={{ fontFamily: 'var(--ff-mono)', fontSize: 14 }}>+{a.p} EGP</span>
                </label>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div className="subhead" style={{ marginTop: 0 }}>بياناتك</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-field"><label>الاسم الأول</label><input defaultValue="نور" /></div>
                <div className="form-field"><label>اسم العائلة</label><input defaultValue="حسن" /></div>
                <div className="form-field"><label>البريد الإلكتروني</label><input defaultValue="noor.hassan@gmail.com" /></div>
                <div className="form-field"><label>رقم الهاتف</label><input defaultValue="+20 100 234 5678" dir="ltr" /></div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>رقم البطاقة القومية (لتوثيق الرحلة)</label><input defaultValue="2*********4567" dir="ltr" /></div>
              </div>
              <div className="subhead">قائمة المسافرين (6)</div>
              {['نور حسن', 'كريم حسن', 'ليلى حسن', 'ضيف ٤', 'ضيف ٥', 'ضيف ٦'].map((n, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
                  <input defaultValue={n} style={{ border: '1px solid var(--rule)', padding: '10px 12px', fontFamily: 'var(--ff-sans)', fontSize: 14, background: 'var(--sand)' }} />
                  <select style={{ border: '1px solid var(--rule)', padding: '10px 12px', fontFamily: 'var(--ff-sans)', fontSize: 14, background: 'var(--sand)' }}>
                    <option>بالغ</option><option>طفل</option><option>رضيع</option>
                  </select>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <div className="subhead" style={{ marginTop: 0 }}>طريقة الدفع</div>
              {[
                { t: 'Fawry', s: 'الدفع عند أي منفذ فوري', code: 'FAWRY', active: true },
                { t: 'Vodafone Cash', s: 'تحويل من محفظتك', code: 'VDF', active: false },
                { t: 'InstaPay', s: 'تحويل بنكي فوري', code: 'INST', active: false },
                { t: 'بطاقة ائتمان', s: 'Visa · Mastercard', code: 'CARD', active: false },
              ].map((p, i) => (
                <label key={i} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 16,
                  padding: '18px 20px', border: `1px solid ${p.active ? 'var(--ink)' : 'var(--rule)'}`,
                  marginBottom: 10, cursor: 'pointer', background: p.active ? 'var(--sand)' : 'var(--foam)',
                }}>
                  <input type="radio" name="pay" defaultChecked={p.active} style={{ width: 18, height: 18 }} />
                  <div>
                    <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{p.t}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{p.s}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', padding: '4px 8px', border: '1px solid var(--rule)', color: 'var(--muted)' }}>{p.code}</div>
                </label>
              ))}

              <div style={{ background: 'var(--sand)', padding: 20, marginTop: 20, border: '1px dashed var(--rule-strong)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>HOW FAWRY WORKS · آلية فوري</div>
                <ol style={{ paddingRight: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                  <li>نرسل لك كود دفع فوري عبر رسالة نصية</li>
                  <li>توجّه إلى أي منفذ فوري (٢٠٠,٠٠٠+ منفذ)</li>
                  <li>ادفع المبلغ — الحجز يتأكد خلال دقيقتين</li>
                </ol>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="subhead" style={{ marginTop: 0 }}>مراجعة نهائية</div>
              {[
                ['المسافر الرئيسي', 'نور حسن'],
                ['البريد الإلكتروني', 'noor.hassan@gmail.com'],
                ['الهاتف', '+20 100 234 5678'],
                ['التاريخ', 'الخميس · 12 مايو 2026 · 06:00 → 16:00'],
                ['المسافرون', '6 أشخاص (5 بالغين، 1 طفل)'],
                ['الإضافات', 'مصوّر محترف (+1,200 EGP)'],
                ['الدفع', 'Fawry · يرسل الكود عند التأكيد'],
              ].map(([l, v], i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', padding: '14px 0', borderBottom: '1px solid var(--rule)' }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</span>
                  <span style={{ fontSize: 15 }}>{v}</span>
                </div>
              ))}

              <label style={{ display: 'flex', gap: 12, marginTop: 24, fontSize: 13, color: 'var(--ink-2)' }}>
                <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
                <span>أوافق على <u>شروط الاستخدام</u> و<u>سياسة الإلغاء</u>، وأؤكد أن كل المسافرين فوق ٦ سنوات يحملون بطاقة هوية سارية.</span>
              </label>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--rule)' }}>
            <button className="btn btn-ghost" onClick={() => step === 1 ? onBack() : setStep(step - 1)}>
              ← {step === 1 ? 'إلغاء' : 'السابق'}
            </button>
            <button
              className="btn btn-clay btn-lg"
              onClick={() => step === 4 ? onConfirm() : setStep(step + 1)}
            >
              {step === 4 ? 'تأكيد الحجز ودفع عبر فوري →' : 'متابعة →'}
            </button>
          </div>
        </div>

        {/* Summary panel */}
        <div style={{ position: 'sticky', top: 100, background: 'var(--foam)', border: '1px solid var(--ink)' }}>
          <div style={{ aspectRatio: '4/3', backgroundImage: `url(${boat?.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ padding: 24 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{boat?.typeEn.toUpperCase()} · {boat?.regionEn.toUpperCase()}</div>
            <div className="display" style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{boat?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>مع {boat?.capt}</div>
            <hr className="hairline" style={{ margin: '18px 0' }} />
            <div className="line-items" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
              <div className="row"><span className="l">{boat?.price.toLocaleString('en')} × 1 يوم</span><span className="v">{boat?.price.toLocaleString('en')}</span></div>
              <div className="row"><span className="l">رسوم الخدمة</span><span className="v">{Math.round((boat?.price || 0) * 0.12).toLocaleString('en')}</span></div>
              <div className="row"><span className="l">مصوّر محترف</span><span className="v">+1,200</span></div>
              <div className="row"><span className="l">تأمين</span><span className="v">180</span></div>
              <div className="row total"><span className="l">الإجمالي</span><span className="v">{(total + 1200).toLocaleString('en')} EGP</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Confirmation({ boat, onHome }) {
  const ref = 'SC-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  return (
    <div className="confirm-wrap">
      <div style={{ width: 120, height: 120, margin: '0 auto 8px' }}>
        <Lottie src="https://lottie.host/4f4e4f6a-c8e4-4e4e-9e8b-3e4e4f6a8b8b/confirm.lottie" loop={false} />
      </div>
      <div className="confirm-stamp">✓ CONFIRMATION · رقم الحجز {ref}</div>
      <div className="confirm-title">رحلتك <em>مؤكّدة</em>.</div>
      <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '54ch', marginTop: 16 }}>
        أرسلنا كود دفع فوري إلى <strong>+20 100 ••• 5678</strong>. ادفع خلال ٤٨ ساعة لتأمين حجزك. ستصلك التفاصيل الكاملة على بريدك.
      </p>

      <div className="ticket">
        <div className="main">
          <h4>التذكرة</h4>
          <div className="display" style={{ fontSize: 36, lineHeight: 1, marginBottom: 4 }}>{boat?.name}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>{boat?.typeEn} · {boat?.regionEn}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>DATE · التاريخ</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>الخميس ١٢ مايو ٢٠٢٦</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>BOARDING · الصعود</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>06:00 صباحاً</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>MARINA · المرسى</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>الغردقة · حوض ٤٢</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>PAX · المسافرون</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>6 أشخاص</div>
            </div>
          </div>

          <div style={{ marginTop: 32, padding: 16, background: 'var(--ink)', color: 'var(--sand)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.08em', direction: 'ltr', textAlign: 'center' }}>
            FAWRY CODE · 8·4·7·2·9·6·1·5
          </div>
        </div>
        <div className="side">
          <h4>الإجمالي المدفوع</h4>
          <div className="display" style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>
            <span className="num">{((boat?.price || 0) + Math.round((boat?.price || 0) * 0.12) + 180 + 1200).toLocaleString('en')}</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginRight: 6 }}> EGP</span>
          </div>

          <h4 style={{ marginTop: 28 }}>ماذا بعد؟</h4>
          <ol style={{ paddingRight: 20, fontSize: 13, lineHeight: 1.8, color: 'var(--ink-2)' }}>
            <li>ادفع عبر فوري خلال ٤٨ ساعة</li>
            <li>ستصلك تأكيد نهائي + بيانات الربان</li>
            <li>الوصول للمرسى قبل ١٥ دقيقة من الإبحار</li>
            <li>بعد الرحلة — شاركنا تقييمك</li>
          </ol>

          <button className="btn btn-ghost" style={{ marginTop: 20, width: '100%' }} onClick={onHome}>
            العودة إلى الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BookingFlow, Confirmation });
