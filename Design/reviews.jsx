/* global React */

// ── Reviews Page ─────────────────────────────────────
function ReviewsPage({ boat, onNavigate }) {
  const { useState } = React;
  const [sortBy, setSortBy] = useState('recent');
  const [filterStar, setFilterStar] = useState(0); // 0 = all

  const _boat = boat || {
    name: 'نبض البحر',
    captEn: 'Captain Youssef',
    rating: 4.87,
    reviews: 124,
    img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80',
    regionEn: 'Hurghada',
  };

  const ratingBreakdown = { 5: 98, 4: 18, 3: 5, 2: 2, 1: 1 };
  const totalReviews = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);

  const categories = [
    { ar: 'الكابتن',    en: 'Captain',    score: 4.95 },
    { ar: 'النظافة',   en: 'Cleanliness', score: 4.80 },
    { ar: 'المعدات',   en: 'Equipment',   score: 4.75 },
    { ar: 'الدقة',     en: 'Punctuality', score: 4.90 },
    { ar: 'القيمة',    en: 'Value',       score: 4.82 },
    { ar: 'السلامة',   en: 'Safety',      score: 4.97 },
  ];

  const reviewItems = [
    {
      id: 1, stars: 5, date: 'أبريل 2026',
      ar: 'تجربة رائعة بكل المقاييس! الكابتن يوسف محترف جداً وودود. القارب نظيف ومجهز بالكامل. سنحجز مرة أخرى بالتأكيد.',
      en: 'Exceptional experience! Captain Youssef is very professional and friendly. The boat is clean and fully equipped.',
      name: 'أحمد المنصور', nameEn: 'Ahmed M.', initials: 'أم', country: '🇪🇬', trip: 'يوم كامل · صيد',
      helpful: 24, photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=70'],
    },
    {
      id: 2, stars: 5, date: 'أبريل 2026',
      ar: 'أفضل رحلة بحرية في حياتي. الغروب من على القارب كان مذهلاً. الكابتن أخذنا لأماكن سرية جميلة جداً.',
      en: 'Best boat trip of my life. The sunset from the deck was breathtaking. The captain took us to some beautiful hidden spots.',
      name: 'سارة الخطيب', nameEn: 'Sarah K.', initials: 'سخ', country: '🇸🇦', trip: 'نصف يوم · غروب',
      helpful: 18, photos: [],
    },
    {
      id: 3, stars: 4, date: 'مارس 2026',
      ar: 'رحلة ممتعة جداً. الطقس كان رائعاً والكابتن لطيف. فقط الطعام كان متوسطاً نوعاً ما.',
      en: 'Very enjoyable trip. Weather was perfect and captain was kind. Food was just average though.',
      name: 'محمد الفارسي', nameEn: 'Mohammed F.', initials: 'مف', country: '🇦🇪', trip: 'يوم كامل · غطس',
      helpful: 7, photos: [],
    },
    {
      id: 4, stars: 5, date: 'مارس 2026',
      ar: 'من أجمل تجارب الصيد في الغردقة. صدنا كميات كثيرة والكابتن ساعدنا طوال الوقت. القارب مجهز تجهيزاً عالياً.',
      en: 'One of the best fishing experiences in Hurghada. We caught a lot and the captain helped us throughout. Boat is very well-equipped.',
      name: 'خالد النجار', nameEn: 'Khaled N.', initials: 'خن', country: '🇪🇬', trip: 'يوم كامل · صيد',
      helpful: 31, photos: [
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&q=70',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&q=70',
      ],
    },
    {
      id: 5, stars: 5, date: 'فبراير 2026',
      ar: 'جلسة رائعة مع العائلة. الأطفال استمتعوا كثيراً. الكابتن يوسف صبور جداً مع الأطفال وحريص على السلامة.',
      en: 'Amazing family day. The kids loved it. Captain Youssef was very patient with the children and very safety-conscious.',
      name: 'ريم المطيري', nameEn: 'Reem M.', initials: 'رم', country: '🇰🇼', trip: 'يوم كامل · عائلي',
      helpful: 42, photos: [],
    },
    {
      id: 6, stars: 3, date: 'يناير 2026',
      ar: 'رحلة جيدة لكن القارب تأخر 40 دقيقة عن الموعد. الكابتن معتذر وبذل جهداً لتعويض الوقت.',
      en: 'Good trip but the boat was 40 minutes late. Captain apologized and made every effort to make up for lost time.',
      name: 'طارق عبد الله', nameEn: 'Tarek A.', initials: 'طع', country: '🇯🇴', trip: 'نصف يوم',
      helpful: 3, photos: [],
    },
  ];

  const sorted = [...reviewItems]
    .filter(r => filterStar === 0 || r.stars === filterStar)
    .sort((a, b) => {
      if (sortBy === 'highest') return b.stars - a.stars;
      if (sortBy === 'lowest')  return a.stars - b.stars;
      if (sortBy === 'helpful') return b.helpful - a.helpful;
      return b.id - a.id; // recent
    });

  const StarRow = ({ n }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} viewBox="0 0 20 20" width="14" height="14" fill={s <= n ? 'oklch(0.78 0.18 80)' : 'oklch(0.88 0 0)'}>
          <path d="M10 1l2.39 7.26H19l-5.36 3.94 2.04 6.8L10 15.27 4.32 19l2.04-6.8L1 8.26h6.61z"/>
        </svg>
      ))}
    </div>
  );

  return (
    <div className="reviews-layout">
      {/* Header */}
      <div className="reviews-header">
        <div className="reviews-boat-strip">
          <div className="reviews-boat-img" style={{ backgroundImage: `url(${_boat.img})` }} />
          <div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>{_boat.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>{_boat.regionEn} · مع {_boat.captEn}</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('write-review')}
            style={{ marginRight: 'auto' }}
          >✏️ اكتب تقييماً</button>
        </div>

        {/* Rating summary */}
        <div className="rating-summary">
          <div className="rating-big-num">
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 64, fontWeight: 700, lineHeight: 1, color: 'var(--sea)' }}>
              {_boat.rating.toFixed(2)}
            </div>
            <StarRow n={Math.round(_boat.rating)} />
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{totalReviews} تقييم</div>
          </div>

          <div className="rating-bars">
            {[5,4,3,2,1].map(s => {
              const count = ratingBreakdown[s] || 0;
              const pct = Math.round(count / totalReviews * 100);
              return (
                <button
                  key={s}
                  className={`rating-bar-row ${filterStar === s ? 'active' : ''}`}
                  onClick={() => setFilterStar(f => f === s ? 0 : s)}
                >
                  <span className="mono" style={{ fontSize: 12, minWidth: 8 }}>{s}</span>
                  <span style={{ fontSize: 12 }}>⭐</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: s >= 4 ? 'oklch(0.78 0.18 80)' : s === 3 ? 'oklch(0.70 0.15 70)' : 'oklch(0.55 0.18 25)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', minWidth: 28, textAlign: 'end' }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="category-scores">
            {categories.map((c, i) => (
              <div className="cat-score" key={i}>
                <div className="cat-score-bar-wrap">
                  <div className="cat-score-bar" style={{ height: `${(c.score / 5) * 100}%` }} />
                </div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.score.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>{c.ar}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & sort */}
      <div className="reviews-controls">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filterStar > 0 && (
            <button className="filter-chip active" onClick={() => setFilterStar(0)}>
              {filterStar} ⭐ ×
            </button>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {sorted.length} تقييم{filterStar > 0 ? ` بـ${filterStar} نجوم` : ''}
          </span>
        </div>
        <div className="sort-row">
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>ترتيب:</span>
          {[
            { id: 'recent',  ar: 'الأحدث'  },
            { id: 'highest', ar: 'الأعلى'  },
            { id: 'helpful', ar: 'الأفيد'  },
          ].map(s => (
            <button
              key={s.id}
              className={`sort-btn ${sortBy === s.id ? 'active' : ''}`}
              onClick={() => setSortBy(s.id)}
            >{s.ar}</button>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="review-list">
        {sorted.map(r => (
          <div className="review-item" key={r.id}>
            <div className="review-item-header">
              <div className="reviewer-avatar">{r.initials}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{r.name} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>{r.country}</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.nameEn} · {r.trip}</div>
              </div>
              <div style={{ marginRight: 'auto', textAlign: 'end' }}>
                <StarRow n={r.stars} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.date}</div>
              </div>
            </div>
            <p className="review-text">{r.ar}</p>
            <p className="review-text-en">{r.en}</p>
            {r.photos.length > 0 && (
              <div className="review-photos">
                {r.photos.map((p, i) => (
                  <div
                    key={i}
                    className="review-photo"
                    style={{ backgroundImage: `url(${p})` }}
                  />
                ))}
              </div>
            )}
            <div className="review-helpful">
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>هل كان هذا مفيداً؟</span>
              <button className="helpful-btn">👍 نعم ({r.helpful})</button>
              <button className="helpful-btn">👎 لا</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Write Review Page ────────────────────────────────
function WriteReviewPage({ boat, onNavigate }) {
  const { useState } = React;
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [catRatings, setCatRatings] = useState({ captain: 0, cleanliness: 0, equipment: 0, punctuality: 0, value: 0, safety: 0 });
  const [reviewText, setReviewText] = useState('');
  const [reviewTextEn, setReviewTextEn] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const _boat = boat || {
    name: 'نبض البحر',
    captEn: 'Captain Youssef',
    img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80',
    regionEn: 'Hurghada',
  };

  const categories = [
    { id: 'captain',     ar: 'الكابتن',    en: 'Captain'     },
    { id: 'cleanliness', ar: 'النظافة',   en: 'Cleanliness'  },
    { id: 'equipment',   ar: 'المعدات',   en: 'Equipment'    },
    { id: 'punctuality', ar: 'الدقة',     en: 'Punctuality'  },
    { id: 'value',       ar: 'القيمة',    en: 'Value'        },
    { id: 'safety',      ar: 'السلامة',   en: 'Safety'       },
  ];

  const starLabels = ['', 'سيئ', 'مقبول', 'جيد', 'رائع', 'ممتاز!'];

  const StarPicker = ({ value, onHover, onClick }) => (
    <div style={{ display: 'flex', gap: 4, cursor: 'pointer' }}>
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          style={{ fontSize: 28, transition: 'transform 0.1s', transform: (onHover >= s || value >= s) ? 'scale(1.15)' : 'scale(1)' }}
          onMouseEnter={() => onHover !== undefined && onHover(s)}
          onMouseLeave={() => onHover !== undefined && onHover(0)}
          onClick={() => onClick(s)}
        >
          {(onHover >= s || value >= s) ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );

  const setCat = (id, val) => setCatRatings(p => ({ ...p, [id]: val }));

  const addFakePhoto = () => {
    const imgs = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=70',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&q=70',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&q=70',
    ];
    if (photos.length < 4) setPhotos(p => [...p, imgs[p.length % imgs.length]]);
  };

  const canSubmit = selectedStar > 0 && reviewText.length >= 20;

  if (submitted) {
    return (
      <div className="pay-screen">
        <div className="pay-result-card success">
          <div className="result-icon-wrap success">
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
              <circle cx="32" cy="32" r="30" fill="oklch(0.42 0.14 150 / 0.12)" stroke="oklch(0.42 0.14 150)" strokeWidth="2"/>
              <path d="M20 32l8 8 16-16" stroke="oklch(0.42 0.14 150)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 26, margin: '16px 0 8px' }}>شكراً على تقييمك! ⭐</h2>
          <p style={{ color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7, maxWidth: 300 }}>
            تقييمك يساعد البحارة الآخرين على اختيار أفضل التجارب البحرية في مصر.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, width: '100%', maxWidth: 320 }}>
            <button className="btn btn-primary" onClick={() => onNavigate('boats')} style={{ flex: 1 }}>استكشاف قوارب</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('home')} style={{ flex: 1 }}>الرئيسية</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write-review-layout">
      {/* Back */}
      <button className="back-btn" onClick={() => onNavigate('reviews')} style={{ marginBottom: 16 }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        العودة للتقييمات
      </button>

      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>WRITE A REVIEW · اكتب تقييمك</div>
      <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 28, marginBottom: 24 }}>كيف كانت رحلتك؟</h2>

      {/* Boat summary */}
      <div className="write-review-boat">
        <div className="pay-boat-img" style={{ backgroundImage: `url(${_boat.img})`, width: 56, height: 56, borderRadius: 8, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700 }}>{_boat.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{_boat.regionEn} · {_boat.captEn}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>15 مايو 2026 · يوم كامل</div>
        </div>
      </div>

      {/* Overall rating */}
      <div className="review-section">
        <div className="review-section-title">التقييم الإجمالي <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· Overall Rating *</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StarPicker
            value={selectedStar}
            onHover={setHoverStar}
            onClick={setSelectedStar}
          />
          {(hoverStar || selectedStar) > 0 && (
            <span style={{ fontSize: 15, color: 'var(--sea)', fontWeight: 600 }}>
              {starLabels[hoverStar || selectedStar]}
            </span>
          )}
        </div>
      </div>

      {/* Category ratings */}
      <div className="review-section">
        <div className="review-section-title">تقييم تفصيلي <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· Category Ratings</span></div>
        <div className="cat-ratings-grid">
          {categories.map(c => (
            <div className="cat-rating-row" key={c.id}>
              <span className="cat-rating-label">{c.ar}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <span
                    key={s}
                    style={{ fontSize: 18, cursor: 'pointer' }}
                    onClick={() => setCat(c.id, s)}
                  >
                    {catRatings[c.id] >= s ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review text */}
      <div className="review-section">
        <div className="review-section-title">
          تقييمك بالعربية *
          <span style={{ color: charCount < 20 ? 'var(--muted)' : 'oklch(0.42 0.14 150)', fontSize: 12, fontFamily: 'var(--ff-mono)', marginRight: 'auto', fontWeight: 400 }}>
            {charCount} / 20 حرفاً كحد أدنى
          </span>
        </div>
        <textarea
          className="review-textarea"
          placeholder="شارك تجربتك مع الآخرين — ماذا أعجبك؟ ما الذي يمكن تحسينه؟"
          value={reviewText}
          onChange={e => { setReviewText(e.target.value); setCharCount(e.target.value.length); }}
          rows={5}
          dir="rtl"
        />
      </div>

      <div className="review-section">
        <div className="review-section-title">تقييمك بالإنجليزية <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· English Review (Optional)</span></div>
        <textarea
          className="review-textarea"
          placeholder="Share your experience in English to help international sailors…"
          value={reviewTextEn}
          onChange={e => setReviewTextEn(e.target.value)}
          rows={4}
          dir="ltr"
          style={{ textAlign: 'left' }}
        />
      </div>

      {/* Photo upload */}
      <div className="review-section">
        <div className="review-section-title">أضف صوراً <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· Add Photos (Optional)</span></div>
        <div className="review-photos-grid">
          {photos.map((p, i) => (
            <div
              key={i}
              className="review-photo-slot filled"
              style={{ backgroundImage: `url(${p})` }}
            >
              <button
                className="remove-photo"
                onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
              >×</button>
            </div>
          ))}
          {photos.length < 4 && (
            <button className="review-photo-slot add-photo" onClick={addFakePhoto}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>إضافة صورة</span>
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>حتى 4 صور · JPEG أو PNG · لا تتجاوز 5MB لكل صورة</div>
      </div>

      {/* Submit */}
      <div className="review-submit-row">
        <button
          className={`btn btn-ghost`}
          onClick={() => onNavigate('reviews')}
        >إلغاء</button>
        <button
          className={`btn btn-primary ${!canSubmit ? 'disabled' : ''}`}
          disabled={!canSubmit}
          onClick={() => canSubmit && setSubmitted(true)}
          style={{ minWidth: 160 }}
        >
          {canSubmit ? 'نشر التقييم ⭐' : 'أضف تقييماً وكتابة (٢٠ حرفاً)'}
        </button>
      </div>

      {!canSubmit && (selectedStar === 0 || reviewText.length < 20) && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          {selectedStar === 0 ? '* اختر عدد النجوم أولاً' : '* أكمل ٢٠ حرفاً على الأقل في المراجعة'}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ReviewsPage, WriteReviewPage });
