/* global React */
// SeaConnect i18n — single source of truth for Arabic / English strings.
// No bilingual mixing inside a single view. Switch the whole tree at once.

const STRINGS = {
  // ── brand + chrome
  brand:           { ar: 'سي كونكت',                                      en: 'SeaConnect' },
  brandMark:       { ar: 'س',                                              en: 'S' },
  tagline:         { ar: 'نُقرّب البحر إلى المصريين — منذ ٢٠٢٦.',          en: 'Connecting Egypt to its coastlines — since 2026.' },
  estd:            { ar: 'تأسست ٢٠٢٦',                                    en: 'EST. 2026' },
  cityHQ:          { ar: 'القاهرة · مصر',                                  en: 'CAIRO · EGYPT' },
  coastsList:      { ar: 'البحر الأحمر · المتوسط · النيل',                en: 'RED SEA · MEDITERRANEAN · NILE' },
  liveBoats:       { ar: 'قارب مباشر',                                     en: 'BOATS LIVE' },
  wind:            { ar: 'الرياح',                                         en: 'WIND' },
  swell:           { ar: 'الموج',                                          en: 'SWELL' },
  air:             { ar: 'الحرارة',                                        en: 'AIR' },
  knots:           { ar: 'عقدة',                                           en: 'KTS' },
  metres:          { ar: 'م',                                              en: 'M' },
  degrees:         { ar: '°م',                                             en: '°C' },

  // ── nav
  nav_home:        { ar: 'الرئيسية',           en: 'Home' },
  nav_boats:       { ar: 'القوارب واليخوت',     en: 'Boats' },
  nav_market:      { ar: 'متجر العدد',          en: 'Gear shop' },
  nav_comps:       { ar: 'البطولات',            en: 'Competitions' },
  nav_account:     { ar: 'حسابي',               en: 'Account' },
  nav_listYourBoat:{ ar: 'أدرج قاربك',           en: 'List your boat' },
  cart:            { ar: 'السلّة',              en: 'Cart' },
  signIn:          { ar: 'تسجيل الدخول',         en: 'Sign in' },
  signUp:          { ar: 'إنشاء حساب',          en: 'Create account' },

  // ── footer
  footer_platform:   { ar: 'المنصة',           en: 'Platform' },
  footer_company:    { ar: 'الشركة',           en: 'Company' },
  footer_trust:      { ar: 'الثقة والأمان',     en: 'Trust & safety' },
  footer_explore:    { ar: 'استكشاف القوارب',    en: 'Browse boats' },
  footer_gear:       { ar: 'متجر العدد',         en: 'Gear shop' },
  footer_comps:      { ar: 'البطولات',           en: 'Competitions' },
  footer_becomeOwner:{ ar: 'كن مالك قارب',       en: 'Become a boat owner' },
  footer_becomeVendor:{ar: 'كن بائعاً',          en: 'Become a vendor' },
  footer_about:      { ar: 'من نحن',             en: 'About us' },
  footer_press:      { ar: 'الصحافة',           en: 'Press' },
  footer_careers:    { ar: 'وظائف',              en: 'Careers' },
  footer_contact:    { ar: 'اتصل بنا',           en: 'Contact' },
  footer_guarantee:  { ar: 'ضمان الحجز',         en: 'Booking guarantee' },
  footer_terms:      { ar: 'شروط الاستخدام',     en: 'Terms of use' },
  footer_privacy:    { ar: 'سياسة الخصوصية',     en: 'Privacy policy' },
  footer_refund:     { ar: 'سياسة الاسترجاع',    en: 'Refund policy' },
  footer_copyright:  { ar: '© ٢٠٢٦ سي كونكت · القاهرة، مصر', en: '© 2026 SEACONNECT · CAIRO, EGYPT' },
  footer_pay:        { ar: 'فوري · ڤودافون كاش · إنستاباي · فيزا · ماستركارد', en: 'FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD' },
  footer_citiesLine: { ar: 'القاهرة · الغردقة · الإسكندرية · شرم الشيخ · دهب · الأقصر', en: 'CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR' },

  // ── hero
  hero_issue:      { ar: 'العدد الأول · ربيع ٢٠٢٦',  en: 'ISSUE 01 · SPRING 2026' },
  hero_position:   { ar: 'منصّة مصر للترفيه البحري',  en: 'EGYPT\u2019S MARITIME LEISURE PLATFORM' },
  hero_title1:     { ar: 'البحر أقرب',                  en: 'The sea is closer' },
  hero_title2:     { ar: 'مما تتخيّل.',                en: 'than you think.' },
  hero_titleAccent:{ ar: 'تتخيّل',                     en: 'than you think.' }, // italic word for accent
  hero_sub:        { ar: 'احجز قارب صيد أو يخت فاخر على طول ساحل مصر، اقتن أدواتك من بائعين معتمدين، وسجّل في البطولات — كل ذلك في مكان واحد موثوق.', en: 'Charter a fishing boat or a luxury yacht along Egypt\u2019s coastline, buy gear from verified vendors, and sign up for tournaments — all in one trusted place.' },

  // ── search
  search_dest:     { ar: 'الوجهة',             en: 'Destination' },
  search_date:     { ar: 'التاريخ',            en: 'Date' },
  search_duration: { ar: 'المدة',              en: 'Duration' },
  search_party:    { ar: 'المسافرون',          en: 'Party' },
  search_btn:      { ar: 'ابحث',               en: 'Search' },
  dur_half:        { ar: 'نصف يوم · ٦ ساعات',   en: 'Half day · 6 h' },
  dur_full:        { ar: 'يوم كامل · ١٠ ساعات', en: 'Full day · 10 h' },
  dur_multi:       { ar: 'أيام متعددة',         en: 'Multi-day' },
  people:          { ar: 'أشخاص',              en: 'people' },
  person:          { ar: 'شخص',                en: 'person' },

  // ── regions (cities)
  region_all:      { ar: 'كل السواحل',         en: 'All coasts' },
  region_hurghada: { ar: 'الغردقة',             en: 'Hurghada' },
  region_alex:     { ar: 'الإسكندرية',          en: 'Alexandria' },
  region_sharm:    { ar: 'شرم الشيخ',           en: 'Sharm El Sheikh' },
  region_dahab:    { ar: 'دهب',                 en: 'Dahab' },
  region_portsaid: { ar: 'بورسعيد',             en: 'Port Said' },
  region_luxor:    { ar: 'الأقصر — النيل',      en: 'Luxor — Nile' },
  region_aswan:    { ar: 'أسوان — النيل',       en: 'Aswan — Nile' },
  region_redSea:   { ar: 'البحر الأحمر',        en: 'Red Sea' },
  region_med:      { ar: 'المتوسط',             en: 'Mediterranean' },
  region_nile:     { ar: 'النيل',               en: 'Nile' },

  // ── boat card / specs
  verified:        { ar: 'مُعتمد',              en: 'Verified' },
  topBooked:       { ar: 'الأكثر حجزاً',         en: 'Top booked' },
  newTag:          { ar: 'جديد',                en: 'New' },
  featured:        { ar: 'مميّز',                en: 'Featured' },
  nileTag:         { ar: 'نيلي',                 en: 'Nile' },
  ft:              { ar: 'قدم',                  en: 'ft' },
  pax:             { ar: 'مسافر',                en: 'pax' },
  year:            { ar: 'عام',                  en: 'year' },
  perDay:          { ar: '/ يوم',                en: '/ day' },
  perHalfDay:      { ar: '/ نصف يوم',            en: '/ half day' },
  withCapt:        { ar: 'مع',                   en: 'with' },
  egp:             { ar: 'ج.م',                  en: 'EGP' },
  rating:          { ar: 'تقييم',                en: 'rating' },
  reviews:         { ar: 'تقييمات',              en: 'reviews' },
  reviewsLabel:    { ar: 'تقييم',                en: 'reviews' },

  // ── section headers
  sec_featured:    { ar: 'قوارب مختارة لهذا الأسبوع', en: 'Featured this week' },
  sec_featured_em: { ar: 'مختارة',                 en: 'this week' },
  sec_seeAll:      { ar: 'شاهد الكل',              en: 'See all' },
  sec_gear:        { ar: 'عدّة الصيد — من خبراء إلى خبراء', en: 'Gear — from experts, for experts' },
  sec_gear_em:     { ar: 'من خبراء',                en: 'for experts' },
  sec_gear_link:   { ar: 'المتجر كاملاً',           en: 'Whole shop' },
  sec_comps:       { ar: 'بطولات قادمة',            en: 'Upcoming tournaments' },
  sec_comps_em:    { ar: 'قادمة',                  en: 'tournaments' },
  sec_comps_link:  { ar: 'التقويم الكامل',          en: 'Full calendar' },

  // ── trust block (sticky story)
  trust_step01_tag:{ ar: 'الثقة · الخطوة ١ — المعاينة', en: 'TRUST · STEP 01 — INSPECTION' },
  trust_step01_h1: { ar: 'كل قارب،',              en: 'Every boat,' },
  trust_step01_h2: { ar: 'مُعاين شخصياً.',         en: 'personally inspected.' },
  trust_step01_em: { ar: 'مُعاين',                 en: 'personally inspected.' },
  trust_step01_p:  { ar: 'فريقنا يصعد على متن كل سفينة قبل اعتمادها. نتحقق من رخصة خفر السواحل، ومعدات السلامة، وحالة المحرك، وعدد سترات النجاة. لا نوافق على أي قارب لا يستوفي ٢٧ نقطة فحص.', en: 'Our team boards every vessel before approving it. We verify the coastguard license, safety equipment, engine condition, and number of life jackets. We do not approve a boat that does not pass all 27 inspection points.' },
  trust_step02_tag:{ ar: 'الثقة · الخطوة ٢ — الضمان', en: 'TRUST · STEP 02 — ESCROW' },
  trust_step02_h1: { ar: 'مدفوعاتك في',            en: 'Your payment in' },
  trust_step02_h2: { ar: 'ضمان — حتى الإبحار.',    en: 'escrow — until you sail.' },
  trust_step02_em: { ar: 'ضمان',                   en: 'escrow' },
  trust_step02_p:  { ar: 'مدفوعاتك محفوظة في حساب ضمان موثوق. لا تذهب للربان إلا بعد ٢٤ ساعة من انتهاء الرحلة. إذا حدث أي خلل — إلغاء، أعطال، عدم مطابقة — تُعاد أموالك كاملة دون سؤال.', en: 'Your payment is held in trust. It only releases to the captain 24 hours after your trip ends. If anything goes wrong — cancellation, mechanical issues, mis-listing — you get every pound back, no questions asked.' },
  trust_step03_tag:{ ar: 'الثقة · الخطوة ٣ — التأمين', en: 'TRUST · STEP 03 — INSURANCE' },
  trust_step03_h1: { ar: 'تأمين شامل',             en: 'Full coverage' },
  trust_step03_h2: { ar: 'على كل رحلة.',            en: 'on every trip.' },
  trust_step03_em: { ar: 'على كل رحلة',             en: 'on every trip.' },
  trust_step03_p:  { ar: 'كل حجز يأتي معه تأمين سفر بقيمة تصل إلى ١٠٠,٠٠٠ ج.م لكل مسافر. إصابات، فقدان معدات، أو تأخير في العودة — كل ذلك مغطى. لأن الثقة لا تكفي وحدها.', en: 'Every booking includes travel insurance up to EGP 100,000 per passenger. Injuries, lost gear, late returns — all covered. Because trust alone is not enough.' },

  // ── marquee
  m_vessels:       { ar: 'قارب معتمد',             en: 'verified vessels' },
  m_regions:       { ar: 'منطقة بحرية',             en: 'maritime regions' },
  m_ratingAvg:     { ar: 'متوسط التقييم',           en: 'average rating' },
  m_escrowHrs:     { ar: 'حماية الضمان',            en: 'escrow protection' },
  m_insurance:     { ar: 'ج.م تأمين لكل مسافر',      en: 'EGP insurance per pax' },
  m_tournaments:   { ar: 'بطولات هذا الموسم',        en: 'tournaments this season' },
  m_commission:    { ar: 'عمولة · أول ٣ شهور',      en: 'commission · first 3 months' },
  m_seaHours:      { ar: 'ساعة إبحار مُسجّلة',       en: 'sea-hours logged' },

  // ── owner-strip CTA
  owner_tag:       { ar: 'لمُلّاك القوارب',        en: 'For boat owners' },
  owner_h:         { ar: 'قاربك يعمل لصالحك.',     en: 'Your boat, working for you.' },
  owner_em:        { ar: 'يعمل',                   en: 'working' },
  owner_p:         { ar: 'أدرج قاربك مجاناً. ٠٪ عمولة في الأشهر الثلاثة الأولى. إدارة حجوزات، مواعيد، ومدفوعات — من لوحة تحكم واحدة.', en: 'List your boat for free. 0% commission for the first three months. Bookings, calendar, and payouts — one dashboard.' },
  owner_cta1:      { ar: 'ابدأ الإدراج مجاناً',     en: 'Start listing — free' },
  owner_cta2:      { ar: 'كيف تعمل المنصة؟',        en: 'How it works' },

  // ── boat detail
  d_back:          { ar: 'العودة',                 en: 'Back' },
  d_type:          { ar: 'النوع',                  en: 'Type' },
  d_length:        { ar: 'الطول',                  en: 'Length' },
  d_pax:           { ar: 'الركاب',                 en: 'Capacity' },
  d_year:          { ar: 'السنة',                  en: 'Year' },
  d_coords:        { ar: 'الإحداثيات',              en: 'Coords' },
  d_specs:         { ar: 'المواصفات التقنية',        en: 'Technical specs' },
  d_included:      { ar: 'ما تشمله الرحلة',          en: 'What\u2019s included' },
  d_reviews_h:     { ar: 'التقييمات',                en: 'Reviews' },
  d_seeAllReviews: { ar: 'كل التقييمات',             en: 'All reviews' },
  d_location:      { ar: 'الموقع ونقطة الانطلاق',     en: 'Departure point' },
  d_tripDate:      { ar: 'تاريخ الرحلة',             en: 'Trip date' },
  d_depart:        { ar: 'الانطلاق',                 en: 'Depart' },
  d_return:        { ar: 'العودة',                   en: 'Return' },
  d_duration:      { ar: 'المدة',                    en: 'Duration' },
  d_passengers:    { ar: 'المسافرون',                 en: 'Passengers' },
  d_cta:           { ar: 'متابعة الحجز',              en: 'Continue to book' },
  d_serviceFee:    { ar: 'رسوم الخدمة (١٢٪)',        en: 'Service fee (12%)' },
  d_insuranceLine: { ar: 'تأمين الرحلة',              en: 'Trip insurance' },
  d_total:         { ar: 'الإجمالي',                  en: 'Total' },
  d_guarantee1:    { ar: 'دفعتك في ضمان حتى ٢٤ ساعة بعد انتهاء الرحلة.', en: 'Your payment is held in escrow until 24h after the trip.' },
  d_guarantee2:    { ar: 'إلغاء مجاني حتى ٤٨ ساعة قبل الانطلاق.',         en: 'Free cancellation up to 48h before departure.' },
  d_guarantee3:    { ar: 'فوري · ڤودافون كاش · إنستاباي · فيزا.',          en: 'Fawry · Vodafone Cash · InstaPay · Visa accepted.' },
  morePhotos:      { ar: '+ ١٤ صورة',                 en: '+ 14 photos' },

  // tech specs
  spec_loa:        { ar: 'الطول الكلي',               en: 'Length overall' },
  spec_engine:     { ar: 'المحرك',                    en: 'Engine' },
  spec_cruise:     { ar: 'سرعة الإبحار',               en: 'Cruise speed' },
  spec_fuel:       { ar: 'مدى الوقود',                 en: 'Fuel range' },
  spec_cabins:     { ar: 'الكبائن',                    en: 'Cabins' },
  spec_built:      { ar: 'سنة الصنع',                  en: 'Built' },
  spec_sleeps:     { ar: 'نوم لـ',                     en: 'sleeps' },

  // amenities
  am_crew:         { ar: 'طاقم من ٣ أفراد + ربان معتمد', en: 'Crew of 3 + licensed captain' },
  am_fuel:         { ar: 'وقود للرحلة كاملة',            en: 'Fuel for the full trip' },
  am_rods:         { ar: 'معدات صيد Shimano احترافية',   en: 'Pro-grade Shimano fishing gear' },
  am_bait:         { ar: 'طعم طازج + علبة ثلج',          en: 'Fresh bait + cooler' },
  am_food:         { ar: 'وجبة غداء طازجة + مشروبات',   en: 'Fresh lunch + drinks' },
  am_safety:       { ar: 'سترات نجاة + تأمين',           en: 'Life jackets + insurance' },
  am_nav:          { ar: 'سونار Garmin + GPS + راديو VHF', en: 'Garmin sonar + GPS + VHF radio' },
  am_grill:        { ar: 'صاج مزدوج + مشواة للأسماك',    en: 'Twin grill + fish bbq' },
  am_chairs:       { ar: 'مظلة خلفية + ٤ كراسي صيد دوّارة', en: 'Aft shade + 4 fighting chairs' },
  am_bath:         { ar: 'حمام + دش بمياه عذبة',         en: 'Bathroom + freshwater shower' },

  // ── booking flow
  bk_title:        { ar: 'إكمال الحجز',                en: 'Complete booking' },
  bk_title_em:     { ar: 'الحجز',                     en: 'booking' },
  bk_step1:        { ar: 'تفاصيل الرحلة',              en: 'Trip details' },
  bk_step2:        { ar: 'بياناتك',                    en: 'Your details' },
  bk_step3:        { ar: 'الدفع',                      en: 'Payment' },
  bk_step4:        { ar: 'مراجعة',                     en: 'Review' },
  bk_tripType:     { ar: 'نوع الرحلة',                  en: 'Trip type' },
  bk_trip_deep:    { ar: 'صيد عميق — شعاب جُفتون',      en: 'Deep-sea — Giftun reefs' },
  bk_trip_coast:   { ar: 'صيد ساحلي',                  en: 'Coastal fishing' },
  bk_trip_snorkel: { ar: 'سباحة وسنوركل',               en: 'Swim & snorkel' },
  bk_special:      { ar: 'طلبات خاصة (اختياري)',        en: 'Special requests (optional)' },
  bk_special_ph:   { ar: 'وجبة نباتية، طفل رضيع، احتياجات معدات...', en: 'Veg meals, infant on board, gear needs…' },
  bk_addons:       { ar: 'إضافات',                     en: 'Add-ons' },
  bk_addon_photo:  { ar: 'مصوّر محترف طوال اليوم',       en: 'Pro photographer, full day' },
  bk_addon_clean:  { ar: 'تنظيف + تعبئة السمك للعودة',    en: 'Clean + pack catch for return' },
  bk_addon_hotel:  { ar: 'نقل من/إلى الفندق (اتجاهان)',  en: 'Hotel transfer (round-trip)' },
  bk_firstName:    { ar: 'الاسم الأول',                en: 'First name' },
  bk_lastName:     { ar: 'اسم العائلة',                en: 'Last name' },
  bk_email:        { ar: 'البريد الإلكتروني',            en: 'Email' },
  bk_phone:        { ar: 'رقم الهاتف',                 en: 'Phone' },
  bk_nationalId:   { ar: 'رقم البطاقة القومية',          en: 'National ID' },
  bk_paxList:      { ar: 'قائمة المسافرين',             en: 'Passenger list' },
  bk_adult:        { ar: 'بالغ',                       en: 'Adult' },
  bk_child:        { ar: 'طفل',                        en: 'Child' },
  bk_infant:       { ar: 'رضيع',                       en: 'Infant' },
  bk_payMethod:    { ar: 'طريقة الدفع',                 en: 'Payment method' },
  bk_pay_fawry_s:  { ar: 'الدفع عند أي منفذ فوري',       en: 'Pay at any Fawry outlet' },
  bk_pay_vdf_s:    { ar: 'تحويل من محفظتك',              en: 'Wallet transfer' },
  bk_pay_inst_s:   { ar: 'تحويل بنكي فوري',              en: 'Instant bank transfer' },
  bk_pay_card_s:   { ar: 'فيزا · ماستركارد',             en: 'Visa · Mastercard' },
  bk_fawryHowH:    { ar: 'آلية فوري',                   en: 'How Fawry works' },
  bk_fawryHow1:    { ar: 'نرسل لك كود دفع فوري عبر رسالة نصية', en: 'We text you a Fawry pay-code' },
  bk_fawryHow2:    { ar: 'توجّه إلى أي منفذ فوري (٢٠٠,٠٠٠+ منفذ)', en: 'Go to any Fawry outlet (200,000+)' },
  bk_fawryHow3:    { ar: 'ادفع — الحجز يتأكد خلال دقيقتين', en: 'Pay — your booking confirms in 2 min' },
  bk_review:       { ar: 'مراجعة نهائية',              en: 'Final review' },
  bk_review_main:  { ar: 'المسافر الرئيسي',             en: 'Lead passenger' },
  bk_review_date:  { ar: 'التاريخ',                    en: 'Date' },
  bk_review_party: { ar: 'المسافرون',                  en: 'Party' },
  bk_review_addons:{ ar: 'الإضافات',                   en: 'Add-ons' },
  bk_review_pay:   { ar: 'الدفع',                      en: 'Payment' },
  bk_terms:        { ar: 'أوافق على شروط الاستخدام وسياسة الإلغاء، وأؤكد أن كل المسافرين فوق ٦ سنوات يحملون بطاقة هوية سارية.', en: 'I agree to the Terms and Cancellation Policy, and confirm every passenger over 6 carries valid ID.' },
  bk_back:         { ar: 'السابق',                     en: 'Back' },
  bk_cancel:       { ar: 'إلغاء',                      en: 'Cancel' },
  bk_next:         { ar: 'متابعة',                     en: 'Continue' },
  bk_confirm:      { ar: 'تأكيد الحجز ودفع عبر فوري',    en: 'Confirm & pay via Fawry' },
  bk_dayUnit:      { ar: 'يوم',                        en: 'day' },

  // ── confirmation
  conf_ref:        { ar: 'رقم الحجز',                  en: 'Booking reference' },
  conf_title:      { ar: 'رحلتك مؤكّدة.',               en: 'Your trip is confirmed.' },
  conf_title_em:   { ar: 'مؤكّدة',                    en: 'confirmed.' },
  conf_sub:        { ar: 'أرسلنا كود دفع فوري إلى',     en: 'We\u2019ve sent a Fawry pay-code to' },
  conf_sub2:       { ar: 'ادفع خلال ٤٨ ساعة لتأمين حجزك. ستصلك التفاصيل الكاملة على بريدك.', en: 'Pay within 48h to lock your booking. Full details land in your inbox.' },
  conf_ticket:     { ar: 'التذكرة',                   en: 'Ticket' },
  conf_date:       { ar: 'التاريخ',                   en: 'Date' },
  conf_boarding:   { ar: 'الصعود',                    en: 'Boarding' },
  conf_marina:     { ar: 'المرسى',                    en: 'Marina' },
  conf_pax:        { ar: 'المسافرون',                 en: 'Pax' },
  conf_fawry:      { ar: 'كود فوري',                  en: 'Fawry code' },
  conf_paid:       { ar: 'الإجمالي المدفوع',           en: 'Total paid' },
  conf_next:       { ar: 'ماذا بعد؟',                 en: 'What\u2019s next?' },
  conf_n1:         { ar: 'ادفع عبر فوري خلال ٤٨ ساعة',   en: 'Pay via Fawry within 48 h' },
  conf_n2:         { ar: 'ستصلك بيانات الربان النهائية',  en: 'You\u2019ll receive captain contact' },
  conf_n3:         { ar: 'الوصول للمرسى قبل ١٥ دقيقة',    en: 'Arrive at marina 15 min early' },
  conf_n4:         { ar: 'بعد الرحلة — شاركنا تقييمك',   en: 'After the trip — leave a review' },
  conf_home:       { ar: 'العودة إلى الرئيسية',          en: 'Back to home' },

  // ── profile
  prof_kicker:     { ar: 'عضو · نور حسن · القاهرة',     en: 'MEMBER · NOUR HASSAN · CAIRO' },
  prof_h:          { ar: 'حسابي على البحر',           en: 'My account at sea' },
  prof_em:         { ar: 'على البحر',                 en: 'at sea' },
  prof_sub:        { ar: 'رحلاتك القادمة، طلباتك من المتجر، البطولات التي شاركت فيها — كلها هنا.', en: 'Your upcoming trips, shop orders, tournaments — all in one place.' },
  prof_since:      { ar: 'عضو منذ يناير ٢٠٢٦ · القاهرة', en: 'MEMBER SINCE JAN 2026 · CAIRO' },
  prof_trips:      { ar: 'رحلات',                     en: 'trips' },
  prof_comps:      { ar: 'بطولات',                    en: 'tournaments' },
  prof_orders:     { ar: 'طلبات متجر',                 en: 'shop orders' },
  prof_points:     { ar: 'نقاط',                      en: 'points' },
  prof_tab_all:    { ar: 'كل الحجوزات',                en: 'All bookings' },
  prof_tab_up:     { ar: 'القادمة',                   en: 'Upcoming' },
  prof_tab_done:   { ar: 'المكتملة',                  en: 'Completed' },
  prof_tab_orders: { ar: 'طلبات المتجر',                en: 'Shop orders' },
  prof_tab_comps:  { ar: 'البطولات',                  en: 'Tournaments' },
  prof_tab_saved:  { ar: 'المفضّلة',                  en: 'Saved' },
  prof_upcomingH:  { ar: 'قادمة',                     en: 'Upcoming' },
  prof_pastH:      { ar: 'مكتملة',                    en: 'Past' },
  prof_status_up:  { ar: 'قادمة',                     en: 'Upcoming' },
  prof_status_done:{ ar: 'مكتملة',                    en: 'Completed' },
  prof_daysLeft:   { ar: 'يوم',                       en: 'days' },
  prof_payPending: { ar: 'كود فوري مرسل · ادفع خلال ٤٨ ساعة', en: 'Fawry code sent · pay within 48h' },
  prof_yourReview: { ar: 'تقييمك',                    en: 'Your review' },

  // ── boats listing page
  boats_kicker:    { ar: 'كل القوارب · ١٨٣ معتمد',     en: 'ALL VESSELS · 183 VERIFIED' },
  boats_h:         { ar: 'كل القوارب',                en: 'Every vessel' },
  boats_em:        { ar: 'القوارب',                   en: 'vessel' },
  boats_sub:       { ar: 'من اليخوت الفاخرة إلى الفلوكات النيلية التقليدية، كل قارب موثّق وفنياً مفحوص.', en: 'From luxury yachts to traditional Nile feluccas — every boat documented and inspected.' },
  boats_tab_all:   { ar: 'كل الأنواع',                en: 'All types' },
  boats_tab_lux:   { ar: 'يخوت فاخرة',                en: 'Luxury yachts' },
  boats_tab_fish:  { ar: 'قوارب صيد',                 en: 'Fishing boats' },
  boats_tab_felucca:{ar: 'فلوكات نيلية',               en: 'Nile feluccas' },
  boats_tab_family:{ ar: 'قوارب عائلية',               en: 'Family boats' },
  boats_count:     { ar: 'قارب معتمد',                 en: 'verified boats' },

  // ── marketplace
  mkt_kicker:      { ar: 'متجر العدد · أكثر من ٢٢٠٠ بائع', en: 'GEAR SHOP · 2,200+ VENDORS' },
  mkt_h:           { ar: 'عدّة الصيد كلها في مكان واحد', en: 'All your fishing gear, one shop' },
  mkt_em:          { ar: 'في مكان واحد',              en: 'one shop' },
  mkt_sub:         { ar: 'من Shimano و Daiwa، إلى الحرفيين المحليين في الإسكندرية ودمياط.', en: 'From Shimano and Daiwa, to local makers in Alexandria and Damietta.' },
  mkt_count:       { ar: 'بائع موثّق',                 en: 'verified vendors' },
  mkt_cat_all:     { ar: 'كل المنتجات',               en: 'All products' },
  mkt_cat_rods:    { ar: 'صنارات وبكرات',              en: 'Rods & reels' },
  mkt_cat_lines:   { ar: 'خيوط',                      en: 'Lines' },
  mkt_cat_lures:   { ar: 'طعوم',                      en: 'Lures' },
  mkt_cat_boxes:   { ar: 'صناديق',                    en: 'Tackle boxes' },
  mkt_cat_clothes: { ar: 'ملابس',                     en: 'Apparel' },
  mkt_cat_safety:  { ar: 'سلامة',                     en: 'Safety' },
  mkt_cat_elec:    { ar: 'إلكترونيات',                 en: 'Electronics' },

  // ── competitions
  comps_kicker:    { ar: 'البطولات · تقويم الصيد ٢٠٢٦', en: 'TOURNAMENTS · FISHING CALENDAR 2026' },
  comps_h:         { ar: 'البطولات والأحداث',           en: 'Tournaments & events' },
  comps_em:        { ar: 'والأحداث',                  en: 'events' },
  comps_sub:       { ar: 'تقويم كل بطولات الصيد في مصر — من أندية الهواة إلى البطولات الاحترافية.', en: 'Every fishing tournament in Egypt — from amateur clubs to pro circuits.' },
  comps_count:     { ar: 'بطولة هذا العام',             en: 'events this year' },
  comp_participants:{ ar: 'مشارك',                   en: 'entries' },
  comp_prize:      { ar: 'جوائز',                     en: 'prize pool' },
  comp_register:   { ar: 'سجّل',                     en: 'Enter' },
  comp_lb_h:       { ar: 'اللوحة المباشرة',            en: 'Live leaderboard' },
  comp_lb_em:      { ar: 'المباشرة',                  en: 'leaderboard' },
  comp_lb_heaviest:{ ar: 'الأثقل',                    en: 'Heaviest' },
  comp_lb_longest: { ar: 'الأطول',                    en: 'Longest' },
  comp_lb_count:   { ar: 'الأكثر صيداً',                en: 'Most caught' },
  comp_lb_rank:    { ar: 'الترتيب',                   en: 'Rank' },
  comp_lb_angler:  { ar: 'الصيّاد',                   en: 'Angler' },
  comp_lb_boat:    { ar: 'القارب',                    en: 'Boat' },
  comp_lb_catch:   { ar: 'أثقل صيد',                  en: 'Heaviest catch' },
  comp_lb_weight:  { ar: 'الوزن',                     en: 'Weight' },
  comp_lb_subtitle:{ ar: 'بطولة الغردقة المفتوحة',      en: 'Hurghada Open' },

  // ── trip durations
  hours:           { ar: 'ساعات',                     en: 'hours' },
  hour:            { ar: 'ساعة',                      en: 'hour' },

  // ── auth
  auth_welcome:    { ar: 'أهلاً بك في',                en: 'Welcome to' },
  auth_brand:      { ar: 'سي كونكت',                  en: 'SeaConnect' },
  auth_login:      { ar: 'تسجيل الدخول',              en: 'Sign in' },
  auth_register:   { ar: 'إنشاء حساب',                en: 'Create account' },
  auth_or:         { ar: 'أو',                       en: 'or' },
  auth_google:     { ar: 'متابعة باستخدام Google',     en: 'Continue with Google' },
  auth_apple:      { ar: 'متابعة باستخدام Apple',      en: 'Continue with Apple' },
  auth_phone:      { ar: 'رقم الهاتف',                en: 'Phone number' },
  auth_password:   { ar: 'كلمة المرور',               en: 'Password' },
  auth_forgot:     { ar: 'نسيت كلمة المرور؟',          en: 'Forgot password?' },
  auth_noAcc:      { ar: 'ليس لديك حساب؟',             en: 'Don\u2019t have an account?' },
  auth_yesAcc:     { ar: 'لديك حساب بالفعل؟',          en: 'Already have an account?' },
  auth_name:       { ar: 'الاسم الكامل',               en: 'Full name' },
  auth_email:      { ar: 'البريد الإلكتروني',           en: 'Email' },
  auth_role:       { ar: 'اختر طريقة استخدامك',        en: 'How will you use SeaConnect?' },
  auth_role_cust:  { ar: 'عميل · أبحث عن رحلات',       en: 'Customer · find trips' },
  auth_role_cust_s:{ ar: 'احجز قوارب، اشتر عُدّة، شارك في بطولات.', en: 'Book boats, buy gear, join tournaments.' },
  auth_role_owner: { ar: 'مالك قارب · أُؤجّر سفينتي',  en: 'Boat owner · rent out my vessel' },
  auth_role_owner_s:{ar: 'أدرج قاربك، اقبل الحجوزات، استلم الأرباح.', en: 'List your boat, accept bookings, get paid.' },
  auth_role_vendor:{ ar: 'بائع عُدّة · لي متجر',        en: 'Vendor · I sell gear' },
  auth_role_vendor_s:{ar:'بيع منتجاتك مباشرة للصيّادين.', en: 'Sell your products directly to anglers.' },
  auth_otp:        { ar: 'أدخل رمز التحقق',             en: 'Enter verification code' },
  auth_otp_sub:    { ar: 'أرسلنا رمزاً مكوناً من ٦ أرقام إلى',   en: 'We sent a 6-digit code to' },
  auth_resend:     { ar: 'إعادة الإرسال',              en: 'Resend' },
  auth_verify:     { ar: 'تحقّق',                     en: 'Verify' },
  auth_continue:   { ar: 'متابعة',                    en: 'Continue' },
  auth_back:       { ar: 'العودة',                    en: 'Back' },
  auth_step:       { ar: 'خطوة',                      en: 'Step' },
  auth_of:         { ar: 'من',                       en: 'of' },
  onb_skip:        { ar: 'تخطّي',                     en: 'Skip' },
  onb_next:        { ar: 'التالي',                    en: 'Next' },
  onb_start:       { ar: 'ابدأ الآن',                  en: 'Get started' },
  onb_1_h:         { ar: 'اكتشف أفضل القوارب',         en: 'Find the best boats' },
  onb_1_p:         { ar: 'آلاف القوارب والرحلات على ساحل مصر، كلها في تطبيق واحد موثوق.', en: 'Thousands of boats and trips along Egypt\u2019s coast — in one trusted app.' },
  onb_2_h:         { ar: 'احجز في دقيقتين',            en: 'Book in two minutes' },
  onb_2_p:         { ar: 'ادفع بأمان عبر فوري واستلم تأكيدك فوراً.', en: 'Pay safely with Fawry and get confirmation instantly.' },
  onb_3_h:         { ar: 'أو اربح من قاربك',           en: 'Or earn from your boat' },
  onb_3_p:         { ar: 'سجّل كمالك قارب وابدأ في استقبال الحجوزات.', en: 'Register as an owner and start receiving bookings.' },

  // ── search results
  sr_kicker:       { ar: 'نتائج البحث',                en: 'Search results' },
  sr_h:            { ar: 'قوارب مطابقة لرحلتك',         en: 'Boats matching your trip' },
  sr_em:           { ar: 'مطابقة',                    en: 'matching' },
  sr_resultsFound: { ar: 'قارب موجود',                 en: 'boats found' },
  sr_sort:         { ar: 'ترتيب',                     en: 'Sort' },
  sr_sort_recommended:{ ar: 'مُوصى',                   en: 'Recommended' },
  sr_sort_priceL:  { ar: 'السعر · الأقل',              en: 'Price · low' },
  sr_sort_priceH:  { ar: 'السعر · الأعلى',              en: 'Price · high' },
  sr_sort_rating:  { ar: 'الأعلى تقييماً',              en: 'Top rated' },
  sr_sort_distance:{ ar: 'الأقرب',                    en: 'Nearest' },
  sr_view_list:    { ar: 'قائمة',                     en: 'List' },
  sr_view_map:     { ar: 'خريطة',                     en: 'Map' },
  sr_filt_h:       { ar: 'تصفية',                     en: 'Filter' },
  sr_filt_price:   { ar: 'النطاق السعري · ج.م/يوم',     en: 'Price range · EGP/day' },
  sr_filt_pax:     { ar: 'سعة الركاب',                 en: 'Capacity' },
  sr_filt_type:    { ar: 'نوع القارب',                 en: 'Boat type' },
  sr_filt_trip:    { ar: 'نوع الرحلة',                 en: 'Trip type' },
  sr_filt_amen:    { ar: 'وسائل الراحة',                en: 'Amenities' },
  sr_filt_clear:   { ar: 'مسح',                       en: 'Clear' },
  sr_filt_apply:   { ar: 'تطبيق',                     en: 'Apply' },
  sr_min:          { ar: 'الحد الأدنى',                en: 'Min' },
  sr_max:          { ar: 'الحد الأقصى',                en: 'Max' },

  // ── owner listing wizard
  ow_kicker:       { ar: 'إدارة المالك · إدراج قارب جديد', en: 'OWNER · NEW LISTING' },
  ow_h:            { ar: 'أدرج قاربك على المنصة',       en: 'List your boat on the platform' },
  ow_em:           { ar: 'قاربك',                    en: 'your boat' },
  ow_sub:          { ar: 'خمس خطوات سريعة. تتم مراجعة قاربك خلال ٢٤ ساعة من الإرسال.', en: 'Five quick steps. Your boat is reviewed within 24h of submission.' },
  ow_step_info:    { ar: 'الأساسيات',                en: 'Basics' },
  ow_step_media:   { ar: 'الصور',                    en: 'Media' },
  ow_step_amen:    { ar: 'وسائل الراحة',              en: 'Amenities' },
  ow_step_docs:    { ar: 'الوثائق',                  en: 'Documents' },
  ow_step_cal:     { ar: 'التقويم',                  en: 'Calendar' },
  ow_boatName_ar:  { ar: 'اسم القارب (بالعربية)',     en: 'Boat name (Arabic)' },
  ow_boatName_en:  { ar: 'اسم القارب (بالإنجليزية)',  en: 'Boat name (English)' },
  ow_boatType:     { ar: 'نوع القارب',                en: 'Boat type' },
  ow_capacity:     { ar: 'السعة',                    en: 'Capacity' },
  ow_priceDay:     { ar: 'سعر اليوم الكامل · ج.م',    en: 'Full-day price · EGP' },
  ow_priceHalf:    { ar: 'سعر نصف اليوم · ج.م',       en: 'Half-day price · EGP' },
  ow_priceHour:    { ar: 'سعر الساعة · ج.م',          en: 'Hourly price · EGP' },
  ow_port:         { ar: 'مرسى الانطلاق',              en: 'Departure marina' },
  ow_descAR:       { ar: 'وصف القارب (بالعربية)',     en: 'Description (Arabic)' },
  ow_descEN:       { ar: 'وصف القارب (بالإنجليزية)',  en: 'Description (English)' },
  ow_media_h:      { ar: 'صور القارب',                en: 'Boat photos' },
  ow_media_sub:    { ar: 'حد أدنى ٣ صور، حد أقصى ١٠. اسحب لإعادة الترتيب.', en: 'Min 3, max 10 photos. Drag to reorder.' },
  ow_uploadPhoto:  { ar: 'رفع صورة',                  en: 'Upload photo' },
  ow_amen_h:       { ar: 'ما تشمله رحلتك',             en: 'What your trip includes' },
  ow_amen_sub:     { ar: 'اختر كل ما ينطبق. هذا ما يراه العملاء.', en: 'Tick everything that applies. Customers see exactly this.' },
  ow_docs_h:       { ar: 'الوثائق الرسمية',             en: 'Official documents' },
  ow_docs_sub:     { ar: 'كل الوثائق محمية ومحفوظة بأمان. لن يطّلع عليها سوى فريق المراجعة.', en: 'All documents are private. Only the review team can access them.' },
  ow_doc_vessel:   { ar: 'تسجيل السفينة',              en: 'Vessel registration' },
  ow_doc_insurance:{ ar: 'وثيقة التأمين',              en: 'Insurance certificate' },
  ow_doc_capt:     { ar: 'رخصة الربان',                en: 'Captain\u2019s license' },
  ow_doc_tourism:  { ar: 'ترخيص السياحة',              en: 'Tourism license' },
  ow_uploadDoc:    { ar: 'رفع الملف',                  en: 'Upload file' },
  ow_cal_h:        { ar: 'إدارة التوافر',              en: 'Availability calendar' },
  ow_cal_sub:      { ar: 'اضغط على الأيام لإغلاقها أو فتحها. الأيام الخضراء متاحة للحجز.', en: 'Tap dates to block/unblock. Green days are open for booking.' },
  ow_submit:       { ar: 'إرسال للمراجعة',              en: 'Submit for review' },
  ow_saveDraft:    { ar: 'حفظ كمسودة',                en: 'Save draft' },
  ow_submitted_h:  { ar: 'قاربك قيد المراجعة',          en: 'Your listing is under review' },
  ow_submitted_em: { ar: 'قيد المراجعة',              en: 'under review' },
  ow_submitted_p:  { ar: 'سنخبرك خلال ٢٤ ساعة. تابع الحالة من لوحة التحكم.', en: 'You\u2019ll hear from us within 24h. Track the status in your dashboard.' },

  // ── owner booking request
  obr_kicker:      { ar: 'طلب حجز جديد',                en: 'NEW BOOKING REQUEST' },
  obr_h:           { ar: 'طلب من',                    en: 'Request from' },
  obr_em:          { ar: 'طلب',                      en: 'Request' },
  obr_countdown:   { ar: 'يلزم الرد خلال',              en: 'Respond within' },
  obr_accept:      { ar: 'قبول الطلب',                 en: 'Accept request' },
  obr_decline:     { ar: 'رفض',                       en: 'Decline' },
  obr_payout:      { ar: 'صافي الأرباح بعد العمولة',     en: 'Your payout after commission' },
  obr_commission:  { ar: 'عمولة المنصة',                en: 'Platform fee' },
  obr_total:       { ar: 'إجمالي العميل',                en: 'Customer total' },
  obr_specialReq:  { ar: 'طلبات خاصة',                  en: 'Special requests' },
  obr_decline_reason:{ ar: 'سبب الرفض',                en: 'Reason for decline' },
  obr_reason_unav: { ar: 'القارب غير متاح في هذا التاريخ', en: 'Boat unavailable that date' },
  obr_reason_maint:{ ar: 'صيانة',                     en: 'Maintenance' },
  obr_reason_cap:  { ar: 'السعة لا تناسب',              en: 'Party too large' },
  obr_reason_other:{ ar: 'سبب آخر',                   en: 'Other' },

  // ── admin approvals
  ap_kicker:       { ar: 'لوحة المشرف · مراجعات معلّقة', en: 'ADMIN · PENDING REVIEWS' },
  ap_h:            { ar: 'الموافقات المعلّقة',           en: 'Pending approvals' },
  ap_em:           { ar: 'المعلّقة',                  en: 'Pending' },
  ap_sub:          { ar: 'قوارب ومنتجات وبائعون ينتظرون المراجعة.', en: 'Boats, products, and vendors waiting on review.' },
  ap_tab_boats:    { ar: 'قوارب',                     en: 'Boats' },
  ap_tab_products: { ar: 'منتجات',                    en: 'Products' },
  ap_tab_vendors:  { ar: 'بائعون',                    en: 'Vendors' },
  ap_approve:      { ar: 'موافقة',                    en: 'Approve' },
  ap_reject:       { ar: 'رفض',                       en: 'Reject' },
  ap_open:         { ar: 'فتح التفاصيل',                en: 'Open' },
  ap_submittedBy:  { ar: 'مُقدَّم من',                  en: 'Submitted by' },
  ap_ago:          { ar: 'منذ',                       en: 'ago' },

  // ── common UI
  required:        { ar: 'مطلوب',                    en: 'Required' },
  optional:        { ar: 'اختياري',                  en: 'optional' },
  yes:             { ar: 'نعم',                      en: 'Yes' },
  no:              { ar: 'لا',                       en: 'No' },
  loading:         { ar: 'تحميل…',                   en: 'Loading…' },
  more:            { ar: 'المزيد',                   en: 'More' },
  less:            { ar: 'أقل',                      en: 'Less' },
};

// Numerals — Arabic-Indic for Arabic locale, Latin for English.
function toLocaleNumerals(value, lang) {
  if (lang === 'en') return String(value);
  const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(value).replace(/\d/g, d => map[+d]);
}

function formatPrice(value, lang) {
  const formatted = Number(value).toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-arab' : 'en-US');
  return formatted;
}

// ── React context ───────────────────────────────────
const LangContext = React.createContext({ lang: 'ar', t: (k) => k, setLang: () => {} });

function LangProvider({ children, initial = 'ar' }) {
  const [lang, setLangState] = React.useState(() => localStorage.getItem('sc-lang') || initial);

  React.useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('data-lang', lang);
    localStorage.setItem('sc-lang', lang);
  }, [lang]);

  const t = React.useCallback((key) => {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[lang] ?? entry.ar ?? key;
  }, [lang]);

  const n = React.useCallback((value) => toLocaleNumerals(value, lang), [lang]);
  const p = React.useCallback((value) => formatPrice(value, lang), [lang]);

  const setLang = (l) => setLangState(l);

  const value = React.useMemo(() => ({ lang, t, n, p, setLang }), [lang, t, n, p]);

  return React.createElement(LangContext.Provider, { value }, children);
}

function useT() {
  return React.useContext(LangContext);
}

// Convenience inline helper for static UI strings — usage <T k="nav_home" />
function T({ k }) {
  const { t } = useT();
  return t(k);
}

Object.assign(window, { LangProvider, useT, T, LangContext, STRINGS });
