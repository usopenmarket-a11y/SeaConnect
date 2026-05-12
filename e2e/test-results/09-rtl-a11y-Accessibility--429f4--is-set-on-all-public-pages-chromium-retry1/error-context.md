# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 09-rtl-a11y.spec.ts >> Accessibility basics >> page title is set on all public pages
- Location: tests/09-rtl-a11y.spec.ts:89:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.goto: Test timeout of 45000ms exceeded.
Call log:
  - navigating to "http://localhost:3010/en", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: EST. 2026
        - generic [ref=e6]: CAIRO · EGYPT
        - generic [ref=e7]: RED SEA · MEDITERRANEAN · NILE
      - generic [ref=e8]:
        - generic [ref=e9]: WIND 12 KTS NE
        - generic [ref=e10]: SWELL 0.8 M
        - generic [ref=e11]: AIR 27°C
        - generic [ref=e12]: BOATS LIVE · 183
    - navigation "التنقل الرئيسي" [ref=e13]:
      - link "سي كونكت — الرئيسية" [ref=e14] [cursor=pointer]:
        - /url: /en
        - generic [ref=e15]: س
        - text: سي كونكت
        - generic [ref=e16]: / SeaConnect
      - generic [ref=e17]:
        - link "الرئيسية" [ref=e18] [cursor=pointer]:
          - /url: /en
        - link "القوارب واليخوت" [ref=e19] [cursor=pointer]:
          - /url: /en/yachts
        - link "متجر العدد" [ref=e20] [cursor=pointer]:
          - /url: /en/marketplace
        - link "البطولات" [ref=e21] [cursor=pointer]:
          - /url: /en/competitions
        - link "حسابي" [ref=e22] [cursor=pointer]:
          - /url: /en/profile
      - generic [ref=e23]:
        - link "السلة" [ref=e24] [cursor=pointer]:
          - /url: /en/cart
          - img [ref=e25]
        - link "تغيير اللغة" [ref=e29] [cursor=pointer]:
          - /url: /ar
          - text: EN / AR
        - link "إدراج قاربك" [ref=e30] [cursor=pointer]:
          - /url: /en/owner/new-listing
        - link "حسابي" [ref=e31] [cursor=pointer]:
          - /url: /en/login
          - text: ن
    - main [ref=e32]:
      - generic [ref=e36]:
        - generic [ref=e38]:
          - generic [ref=e40]: ISSUE 01 · SPRING 2026
          - generic [ref=e41]: ·
          - generic [ref=e42]: EGYPT'S MARITIME LEISURE PLATFORM
        - heading "The sea is closer مما than you think." [level=1] [ref=e44]:
          - text: The sea is closer
          - text: مما
          - emphasis [ref=e45]: than you think
          - text: .
        - paragraph [ref=e47]: Book a fishing boat or luxury yacht along Egypt's coastline, source gear from certified vendors, and register for tournaments — all in one trusted place.
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]: Destination
            - combobox [ref=e52]:
              - option "الغردقة · البحر الأحمر" [selected]
              - option "الإسكندرية · المتوسط"
              - option "شرم الشيخ"
              - option "الأقصر · النيل"
          - generic [ref=e53]:
            - generic [ref=e54]: Date
            - textbox [ref=e55]: 12 مايو 2026
          - generic [ref=e56]:
            - generic [ref=e57]: Duration
            - combobox [ref=e58]:
              - option "نصف يوم · 6 س"
              - option "يوم كامل · 10 س" [selected]
              - option "أيام متعددة"
          - generic [ref=e59]:
            - generic [ref=e60]: Passengers
            - combobox [ref=e61]:
              - option "2 أشخاص" [selected]
              - option "4 أشخاص"
              - option "6 أشخاص"
              - option "10 أشخاص"
          - button "Search ←" [ref=e62] [cursor=pointer]
      - generic [ref=e63]:
        - button "All coasts 183" [ref=e64] [cursor=pointer]:
          - generic [ref=e65]: All coasts
          - generic [ref=e66]: "183"
        - button "Hurghada 68" [ref=e67] [cursor=pointer]:
          - generic [ref=e68]: Hurghada
          - generic [ref=e69]: "68"
        - button "Alexandria 42" [ref=e70] [cursor=pointer]:
          - generic [ref=e71]: Alexandria
          - generic [ref=e72]: "42"
        - button "Sharm El Sheikh 31" [ref=e73] [cursor=pointer]:
          - generic [ref=e74]: Sharm El Sheikh
          - generic [ref=e75]: "31"
        - button "Dahab 14" [ref=e76] [cursor=pointer]:
          - generic [ref=e77]: Dahab
          - generic [ref=e78]: "14"
        - button "Port Said 12" [ref=e79] [cursor=pointer]:
          - generic [ref=e80]: Port Said
          - generic [ref=e81]: "12"
        - button "Luxor — Nile 9" [ref=e82] [cursor=pointer]:
          - generic [ref=e83]: Luxor — Nile
          - generic [ref=e84]: "9"
        - button "Aswan — Nile 7" [ref=e85] [cursor=pointer]:
          - generic [ref=e86]: Aswan — Nile
          - generic [ref=e87]: "7"
      - generic [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]: "183"
          - generic [ref=e93]: قارب معتمد · VESSELS
        - generic [ref=e95]:
          - generic [ref=e96]: "12"
          - generic [ref=e97]: منطقة بحرية · REGIONS
        - generic [ref=e99]:
          - generic [ref=e100]: "4.92"
          - generic [ref=e101]: متوسط التقييم · RATING
        - generic [ref=e103]:
          - generic [ref=e104]: 24H
          - generic [ref=e105]: حماية الضمان · ESCROW
        - generic [ref=e107]:
          - generic [ref=e108]: 100K
          - generic [ref=e109]: EGP تأمين لكل مسافر
        - generic [ref=e111]:
          - generic [ref=e112]: "12"
          - generic [ref=e113]: بطولات هذا الموسم · TOURNAMENTS
        - generic [ref=e115]:
          - generic [ref=e116]: 0%
          - generic [ref=e117]: عمولة · أول ٣ شهور
        - generic [ref=e119]:
          - generic [ref=e120]: 8,400+
          - generic [ref=e121]: ساعة إبحار · LOGGED
        - generic [ref=e123]:
          - generic [ref=e124]: "183"
          - generic [ref=e125]: قارب معتمد · VESSELS
        - generic [ref=e127]:
          - generic [ref=e128]: "12"
          - generic [ref=e129]: منطقة بحرية · REGIONS
        - generic [ref=e131]:
          - generic [ref=e132]: "4.92"
          - generic [ref=e133]: متوسط التقييم · RATING
        - generic [ref=e135]:
          - generic [ref=e136]: 24H
          - generic [ref=e137]: حماية الضمان · ESCROW
        - generic [ref=e139]:
          - generic [ref=e140]: 100K
          - generic [ref=e141]: EGP تأمين لكل مسافر
        - generic [ref=e143]:
          - generic [ref=e144]: "12"
          - generic [ref=e145]: بطولات هذا الموسم · TOURNAMENTS
        - generic [ref=e147]:
          - generic [ref=e148]: 0%
          - generic [ref=e149]: عمولة · أول ٣ شهور
        - generic [ref=e151]:
          - generic [ref=e152]: 8,400+
          - generic [ref=e153]: ساعة إبحار · LOGGED
      - generic [ref=e155]:
        - generic [ref=e157]:
          - generic [ref=e158]:
            - generic [ref=e159]: § 01 · FEATURED VESSELS
            - heading "Featured boats this week" [level=2] [ref=e160]:
              - text: Featured
              - emphasis [ref=e161]: boats
              - text: this week
          - link "View all (183) ←" [ref=e162] [cursor=pointer]:
            - /url: /en/yachts
        - generic [ref=e163]:
          - link "Sayyad Al Sobh FISHING Sayyad Al Sobh 4 PAX 1,200 EGP / DAY" [ref=e166] [cursor=pointer]:
            - /url: /en/yachts/08863dda-288c-4633-9c9e-02ed7b406668
            - generic [ref=e167]:
              - img "Sayyad Al Sobh" [ref=e168]
              - generic:
                - img
            - generic [ref=e169]:
              - generic [ref=e171]: FISHING
              - generic [ref=e172]: Sayyad Al Sobh
              - generic [ref=e174]: 4 PAX
              - generic [ref=e176]:
                - generic [ref=e177]: 1,200
                - generic [ref=e178]: EGP / DAY
          - link "Felucca Al Nil SAILBOAT Felucca Al Nil 10 PAX 950 EGP / DAY" [ref=e181] [cursor=pointer]:
            - /url: /en/yachts/d049771f-ce72-45c3-980b-ab74303c7665
            - generic [ref=e182]:
              - img "Felucca Al Nil" [ref=e183]
              - generic:
                - img
            - generic [ref=e184]:
              - generic [ref=e186]: SAILBOAT
              - generic [ref=e187]: Felucca Al Nil
              - generic [ref=e189]: 10 PAX
              - generic [ref=e191]:
                - generic [ref=e192]: "950"
                - generic [ref=e193]: EGP / DAY
          - link "Atlantis MOTORBOAT Atlantis 16 PAX 8,900 EGP / DAY" [ref=e196] [cursor=pointer]:
            - /url: /en/yachts/8857929d-c665-4866-ace2-6722ac60f33c
            - generic [ref=e197]:
              - img "Atlantis" [ref=e198]
              - generic:
                - img
            - generic [ref=e199]:
              - generic [ref=e201]: MOTORBOAT
              - generic [ref=e202]: Atlantis
              - generic [ref=e204]: 16 PAX
              - generic [ref=e206]:
                - generic [ref=e207]: 8,900
                - generic [ref=e208]: EGP / DAY
          - link "Reeh Al Bahr MOTORBOAT Reeh Al Bahr 12 PAX 4,400 EGP / DAY" [ref=e211] [cursor=pointer]:
            - /url: /en/yachts/b87756d3-f4f1-49e6-b927-eedde438f4a9
            - generic [ref=e212]:
              - img "Reeh Al Bahr" [ref=e213]
              - generic:
                - img
            - generic [ref=e214]:
              - generic [ref=e216]: MOTORBOAT
              - generic [ref=e217]: Reeh Al Bahr
              - generic [ref=e219]: 12 PAX
              - generic [ref=e221]:
                - generic [ref=e222]: 4,400
                - generic [ref=e223]: EGP / DAY
          - link "Nour Al Shati FISHING Nour Al Shati 6 PAX 1,800 EGP / DAY" [ref=e226] [cursor=pointer]:
            - /url: /en/yachts/85a9d1b9-0193-47e4-b540-22fb1b218656
            - generic [ref=e227]:
              - img "Nour Al Shati" [ref=e228]
              - generic:
                - img
            - generic [ref=e229]:
              - generic [ref=e231]: FISHING
              - generic [ref=e232]: Nour Al Shati
              - generic [ref=e234]: 6 PAX
              - generic [ref=e236]:
                - generic [ref=e237]: 1,800
                - generic [ref=e238]: EGP / DAY
          - link "Al Bahr Al Ahmar FISHING Al Bahr Al Ahmar 8 PAX 3,800 EGP / DAY" [ref=e241] [cursor=pointer]:
            - /url: /en/yachts/06af00cd-aaa7-45c9-8a7c-66e0d82a589e
            - generic [ref=e242]:
              - img "Al Bahr Al Ahmar" [ref=e243]
              - generic:
                - img
            - generic [ref=e244]:
              - generic [ref=e246]: FISHING
              - generic [ref=e247]: Al Bahr Al Ahmar
              - generic [ref=e249]: 8 PAX
              - generic [ref=e251]:
                - generic [ref=e252]: 3,800
                - generic [ref=e253]: EGP / DAY
      - generic [ref=e262]:
        - generic [ref=e263]:
          - generic [ref=e264]: § TRUST · STEP 01 — INSPECTION
          - heading "كل قارب، مُعاين شخصياً." [level=2] [ref=e265]:
            - text: كل قارب،
            - emphasis [ref=e266]: مُعاين
            - text: شخصياً.
          - paragraph [ref=e267]: فريقنا يصعد على متن كل سفينة قبل اعتمادها. نتحقق من رخصة خفر السواحل، ومعدات السلامة، وحالة المحرك، وعدد سترات النجاة. لا نوافق على أي قارب لا يستوفي ٢٧ نقطة فحص.
        - generic [ref=e268]:
          - generic [ref=e269]: § TRUST · STEP 02 — ESCROW
          - heading "دفعك في ضمان، حتى الإبحار." [level=2] [ref=e270]:
            - text: دفعك في
            - emphasis [ref=e271]: ضمان
            - text: ،
            - text: حتى الإبحار.
          - paragraph [ref=e272]: مدفوعاتك محفوظة في حساب ضمان موثوق. لا تذهب للربان إلا بعد ٢٤ ساعة من انتهاء الرحلة. إذا حدث أي خلل — إلغاء، أعطال، عدم مطابقة — تُعاد أموالك كاملة دون سؤال.
        - generic [ref=e273]:
          - generic [ref=e274]: § TRUST · STEP 03 — INSURANCE
          - heading "تأمين شامل على كل رحلة." [level=2] [ref=e275]:
            - text: تأمين شامل
            - emphasis [ref=e276]: على كل رحلة
            - text: .
          - paragraph [ref=e277]: كل حجز يأتي معه تأمين سفر بقيمة تصل إلى ١٠٠,٠٠٠ EGP لكل مسافر. إصابات، فقدان معدات، أو تأخير في العودة — كل ذلك مغطى. لأن الثقة لا تكفي وحدها.
      - generic [ref=e282]:
        - generic [ref=e284]:
          - generic [ref=e285]:
            - generic [ref=e286]: § 03 · GEAR MARKETPLACE
            - heading "Fishing gear — — from experts to experts" [level=2] [ref=e287]:
              - text: Fishing gear — —
              - emphasis [ref=e288]: from experts
              - text: to experts
          - link "Full store ←" [ref=e289] [cursor=pointer]:
            - /url: /en/marketplace
        - generic [ref=e290]:
          - generic [ref=e292] [cursor=pointer]:
            - img "سنارة ستيلا 8000" [ref=e293]
            - generic [ref=e294]: SHIMANO
            - generic [ref=e295]: سنارة ستيلا 8000
            - generic [ref=e296]:
              - generic [ref=e297]: 12,400
              - text: EGP
          - generic [ref=e299] [cursor=pointer]:
            - img "بكرة سالتيجا 14000" [ref=e300]
            - generic [ref=e301]: DAIWA
            - generic [ref=e302]: بكرة سالتيجا 14000
            - generic [ref=e303]:
              - generic [ref=e304]: 8,900
              - text: EGP
          - generic [ref=e306] [cursor=pointer]:
            - img "طقم صنارة كاملة" [ref=e307]
            - generic [ref=e308]: PENN
            - generic [ref=e309]: طقم صنارة كاملة
            - generic [ref=e310]:
              - generic [ref=e311]: 3,200
              - text: EGP
          - generic [ref=e313] [cursor=pointer]:
            - img "طعوم صناعية × 12" [ref=e314]
            - generic [ref=e315]: RAPALA
            - generic [ref=e316]: طعوم صناعية × 12
            - generic [ref=e317]:
              - generic [ref=e318]: "780"
              - text: EGP
          - generic [ref=e320] [cursor=pointer]:
            - img "جهاز كشف أسماك STRIKER" [ref=e321]
            - generic [ref=e322]: GARMIN
            - generic [ref=e323]: جهاز كشف أسماك STRIKER
            - generic [ref=e324]:
              - generic [ref=e325]: 6,400
              - text: EGP
          - generic [ref=e327] [cursor=pointer]:
            - img "صندوق معدات مزدوج" [ref=e328]
            - generic [ref=e329]: PLANO
            - generic [ref=e330]: صندوق معدات مزدوج
            - generic [ref=e331]:
              - generic [ref=e332]: "540"
              - text: EGP
          - generic [ref=e334] [cursor=pointer]:
            - img "قميص صيد طويل الكم" [ref=e335]
            - generic [ref=e336]: COLUMBIA
            - generic [ref=e337]: قميص صيد طويل الكم
            - generic [ref=e338]:
              - generic [ref=e339]: "890"
              - text: EGP
          - generic [ref=e341] [cursor=pointer]:
            - img "صناصيل بحرية × 50" [ref=e342]
            - generic [ref=e343]: MUSTAD
            - generic [ref=e344]: صناصيل بحرية × 50
            - generic [ref=e345]:
              - generic [ref=e346]: "120"
              - text: EGP
      - generic [ref=e347]:
        - generic [ref=e349]:
          - generic [ref=e350]:
            - generic [ref=e351]: § 04 · TOURNAMENTS & EVENTS
            - heading "Upcoming tournaments" [level=2] [ref=e352]:
              - text: Upcoming
              - emphasis [ref=e353]: tournaments
          - link "Full calendar ←" [ref=e354] [cursor=pointer]:
            - /url: /en/competitions
        - generic [ref=e355]:
          - generic [ref=e357] [cursor=pointer]:
            - generic [ref=e358]:
              - generic [ref=e359]: "12"
              - generic [ref=e360]: MAY 2026
            - generic [ref=e361]:
              - generic [ref=e362]: بطولة البحر الأحمر للصيد الكبير
              - generic [ref=e363]: SAFAGA MARINA · 14 HRS · 3 ROUNDS
            - generic [ref=e364]:
              - generic [ref=e365]: "84"
              - text: مشارك
            - generic [ref=e366]:
              - generic [ref=e367]: 120K
              - text: جوائز EGP
            - button "سجّل · 500 EGP" [ref=e368]
          - generic [ref=e370] [cursor=pointer]:
            - generic [ref=e371]:
              - generic [ref=e372]: "26"
              - generic [ref=e373]: MAY 2026
            - generic [ref=e374]:
              - generic [ref=e375]: كأس الاسكندرية السنوي
              - generic [ref=e376]: ABU QIR · 8 HRS · DEEP SEA
            - generic [ref=e377]:
              - generic [ref=e378]: "56"
              - text: مشارك
            - generic [ref=e379]:
              - generic [ref=e380]: 60K
              - text: جوائز EGP
            - button "سجّل · 300 EGP" [ref=e381]
          - generic [ref=e383] [cursor=pointer]:
            - generic [ref=e384]:
              - generic [ref=e385]: "8"
              - generic [ref=e386]: JUN 2026
            - generic [ref=e387]:
              - generic [ref=e388]: بطولة شرم للتونة
              - generic [ref=e389]: SHARM MARINA · 12 HRS · PELAGIC
            - generic [ref=e390]:
              - generic [ref=e391]: "42"
              - text: مشارك
            - generic [ref=e392]:
              - generic [ref=e393]: 90K
              - text: جوائز EGP
            - button "سجّل · 450 EGP" [ref=e394]
          - generic [ref=e396] [cursor=pointer]:
            - generic [ref=e397]:
              - generic [ref=e398]: "19"
              - generic [ref=e399]: JUN 2026
            - generic [ref=e400]:
              - generic [ref=e401]: مهرجان النيل للصيد الرياضي
              - generic [ref=e402]: LUXOR · 6 HRS · CATCH & RELEASE
            - generic [ref=e403]:
              - generic [ref=e404]: "120"
              - text: مشارك
            - generic [ref=e405]:
              - generic [ref=e406]: 40K
              - text: جوائز EGP
            - button "سجّل · 150 EGP" [ref=e407]
      - generic [ref=e410]:
        - generic [ref=e411]:
          - generic [ref=e412]: § 05 · FOR BOAT OWNERS
          - heading "Your boat works for you." [level=3] [ref=e413]:
            - text: Your boat
            - emphasis [ref=e414]: works
            - text: for you.
          - paragraph [ref=e415]: List your boat for free. 0% commission for the first 3 months. Manage bookings, schedules, and payments — from one dashboard.
        - generic [ref=e416]:
          - link "Start listing for free ←" [ref=e417] [cursor=pointer]:
            - /url: /en/owner/new-listing
          - link "How does the platform work?" [ref=e418] [cursor=pointer]:
            - /url: /en/about
    - contentinfo [ref=e419]:
      - generic [ref=e420]:
        - generic [ref=e421]:
          - generic [ref=e422]: سي كونكت
          - generic [ref=e423]: Connecting Egypt to its coastlines — since 2026.
          - generic [ref=e424]: CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR
        - generic [ref=e425]:
          - heading "المنصة" [level=5] [ref=e426]
          - list [ref=e427]:
            - listitem [ref=e428]:
              - link "استكشاف القوارب" [ref=e429] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e430]:
              - link "متجر العدد" [ref=e431] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e432]:
              - link "البطولات" [ref=e433] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e434]:
              - link "كن مالك قارب" [ref=e435] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e436]:
              - link "كن بائعاً" [ref=e437] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e438]:
          - heading "الشركة" [level=5] [ref=e439]
          - list [ref=e440]:
            - listitem [ref=e441]:
              - link "من نحن" [ref=e442] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e443]:
              - link "الصحافة" [ref=e444] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e445]:
              - link "وظائف" [ref=e446] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e447]:
              - link "اتصل بنا" [ref=e448] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e449]:
          - heading "الثقة والأمان" [level=5] [ref=e450]
          - list [ref=e451]:
            - listitem [ref=e452]:
              - link "ضمان الحجز" [ref=e453] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e454]:
              - link "شروط الاستخدام" [ref=e455] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e456]:
              - link "الخصوصية" [ref=e457] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e458]:
              - link "سياسة الاسترجاع" [ref=e459] [cursor=pointer]:
                - /url: "#"
      - generic [ref=e460]:
        - generic [ref=e461]: © 2026 SEACONNECT LLC · REGISTERED IN CAIRO, EGYPT
        - generic [ref=e462]: FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD
  - alert [ref=e463]
```

# Test source

```ts
  1   | /**
  2   |  * RTL layout & accessibility tests
  3   |  * Verifies direction, font loading, logical CSS, aria labels.
  4   |  */
  5   | import { test, expect } from '@playwright/test'
  6   | 
  7   | const PAGES_TO_CHECK = ['/en', '/ar', '/en/yachts', '/ar/yachts', '/en/marketplace', '/en/competitions']
  8   | 
  9   | test.describe('RTL/LTR direction correctness', () => {
  10  |   test('EN home has dir=ltr', async ({ page }) => {
  11  |     await page.goto('/en')
  12  |     const dir = await page.locator('[dir]').first().getAttribute('dir')
  13  |     expect(dir).toBe('ltr')
  14  |   })
  15  | 
  16  |   test('EN yachts has dir=ltr', async ({ page }) => {
  17  |     await page.goto('/en/yachts')
  18  |     const dir = await page.locator('[dir]').first().getAttribute('dir')
  19  |     expect(dir).toBe('ltr')
  20  |   })
  21  | 
  22  |   test('AR home has dir=rtl', async ({ page }) => {
  23  |     await page.goto('/ar')
  24  |     const dir = await page.locator('[dir]').first().getAttribute('dir')
  25  |     expect(dir).toBe('rtl')
  26  |   })
  27  | 
  28  |   test('AR yachts has dir=rtl', async ({ page }) => {
  29  |     await page.goto('/ar/yachts')
  30  |     const dir = await page.locator('[dir]').first().getAttribute('dir')
  31  |     expect(dir).toBe('rtl')
  32  |   })
  33  | 
  34  |   test('AR pages have lang=ar on html or body', async ({ page }) => {
  35  |     await page.goto('/ar')
  36  |     const lang = await page.locator('html').getAttribute('lang').catch(() => null)
  37  |       || await page.locator('[lang]').first().getAttribute('lang').catch(() => null)
  38  |     expect(lang).toMatch(/ar/)
  39  |   })
  40  | })
  41  | 
  42  | test.describe('Font loading', () => {
  43  |   test('Cairo font is referenced in EN page styles', async ({ page }) => {
  44  |     await page.goto('/en')
  45  |     // Check CSS for Cairo font reference
  46  |     const styles = await page.evaluate(() => {
  47  |       const sheets = Array.from(document.styleSheets)
  48  |       return sheets.length > 0
  49  |     })
  50  |     expect(styles).toBe(true)
  51  |   })
  52  | })
  53  | 
  54  | test.describe('Accessibility basics', () => {
  55  |   test('nav has aria-label', async ({ page }) => {
  56  |     await page.goto('/en')
  57  |     const nav = page.locator('nav[aria-label]')
  58  |     await expect(nav).toBeVisible()
  59  |   })
  60  | 
  61  |   test('images have alt text', async ({ page }) => {
  62  |     await page.goto('/en')
  63  |     const images = page.locator('img')
  64  |     const count = await images.count()
  65  |     let missingAlt = 0
  66  |     for (let i = 0; i < Math.min(count, 10); i++) {
  67  |       const alt = await images.nth(i).getAttribute('alt')
  68  |       const ariaHidden = await images.nth(i).getAttribute('aria-hidden')
  69  |       if (!alt && ariaHidden !== 'true') missingAlt++
  70  |     }
  71  |     expect(missingAlt).toBe(0)
  72  |   })
  73  | 
  74  |   test('buttons have accessible text or aria-label', async ({ page }) => {
  75  |     await page.goto('/en')
  76  |     const buttons = page.locator('button')
  77  |     const count = await buttons.count()
  78  |     let missingLabel = 0
  79  |     for (let i = 0; i < Math.min(count, 20); i++) {
  80  |       const text = await buttons.nth(i).innerText().catch(() => '')
  81  |       const ariaLabel = await buttons.nth(i).getAttribute('aria-label')
  82  |       const ariaLabelledby = await buttons.nth(i).getAttribute('aria-labelledby')
  83  |       if (!text.trim() && !ariaLabel && !ariaLabelledby) missingLabel++
  84  |     }
  85  |     // Allow max 2 unlabelled icon buttons
  86  |     expect(missingLabel).toBeLessThanOrEqual(2)
  87  |   })
  88  | 
  89  |   test('page title is set on all public pages', async ({ page }) => {
  90  |     for (const path of PAGES_TO_CHECK) {
> 91  |       await page.goto(path)
      |                  ^ Error: page.goto: Test timeout of 45000ms exceeded.
  92  |       const title = await page.title()
  93  |       expect(title.length, `${path} has empty title`).toBeGreaterThan(3)
  94  |     }
  95  |   })
  96  | })
  97  | 
  98  | test.describe('No JS errors on key pages', () => {
  99  |   for (const path of ['/en', '/ar', '/en/yachts', '/en/marketplace', '/en/competitions', '/en/login']) {
  100 |     test(`${path} — no uncaught console errors`, async ({ page }) => {
  101 |       const errors: string[] = []
  102 |       page.on('pageerror', e => errors.push(e.message))
  103 |       await page.goto(path)
  104 |       await page.waitForTimeout(2000)
  105 |       // Filter out known non-critical warnings
  106 |       const criticalErrors = errors.filter(e =>
  107 |         !e.includes('Warning:') &&
  108 |         !e.includes('hydration') &&
  109 |         !e.includes('ResizeObserver')
  110 |       )
  111 |       expect(criticalErrors, `JS errors on ${path}: ${criticalErrors.join(', ')}`).toHaveLength(0)
  112 |     })
  113 |   }
  114 | })
  115 | 
```