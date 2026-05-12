# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 09-rtl-a11y.spec.ts >> RTL/LTR direction correctness >> EN yachts has dir=ltr
- Location: tests/09-rtl-a11y.spec.ts:16:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.goto: Test timeout of 45000ms exceeded.
Call log:
  - navigating to "http://localhost:3010/en/yachts", waiting until "load"

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
          - /url: /ar/yachts
          - text: EN / AR
        - link "إدراج قاربك" [ref=e30] [cursor=pointer]:
          - /url: /en/owner/new-listing
        - link "حسابي" [ref=e31] [cursor=pointer]:
          - /url: /en/login
          - text: ن
    - main [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]: § ALL VESSELS · 183 VERIFIED
        - heading "كل القوارب." [level=1] [ref=e35]:
          - text: كل
          - emphasis [ref=e36]: القوارب
          - text: .
      - generic [ref=e37]:
        - generic [ref=e38]:
          - text: Boat Type
          - combobox [ref=e39]:
            - option "All Types" [selected]
            - option "Fishing"
            - option "Luxury"
            - option "Catamaran"
            - option "Felucca"
        - generic [ref=e40]:
          - text: Capacity
          - spinbutton [ref=e41]
        - generic [ref=e42]:
          - text: Max Price
          - spinbutton [ref=e43]
        - button "Search" [ref=e44] [cursor=pointer]
        - button "Clear" [ref=e45] [cursor=pointer]
      - generic [ref=e46]:
        - button "كل الأنواع" [ref=e47] [cursor=pointer]
        - button "يخوت فاخرة" [ref=e48] [cursor=pointer]
        - button "قوارب صيد" [ref=e49] [cursor=pointer]
        - button "فلوكات نيلية" [ref=e50] [cursor=pointer]
        - button "قوارب عائلية" [ref=e51] [cursor=pointer]
      - generic [ref=e53]:
        - link "Sayyad Al Sobh FISHING RAS SIDR MARINA Sayyad Al Sobh 4 PAX 1,200 EGP / DAY" [ref=e55] [cursor=pointer]:
          - /url: /en/yachts/08863dda-288c-4633-9c9e-02ed7b406668
          - generic [ref=e56]:
            - img "Sayyad Al Sobh" [ref=e57]
            - generic:
              - img
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e60]: FISHING
              - generic [ref=e61]: RAS SIDR MARINA
            - generic [ref=e62]: Sayyad Al Sobh
            - generic [ref=e64]: 4 PAX
            - generic [ref=e66]:
              - generic [ref=e67]: 1,200
              - generic [ref=e68]: EGP / DAY
        - link "Felucca Al Nil SAILBOAT RAS SIDR MARINA Felucca Al Nil 10 PAX 950 EGP / DAY" [ref=e70] [cursor=pointer]:
          - /url: /en/yachts/d049771f-ce72-45c3-980b-ab74303c7665
          - generic [ref=e71]:
            - img "Felucca Al Nil" [ref=e72]
            - generic:
              - img
          - generic [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e75]: SAILBOAT
              - generic [ref=e76]: RAS SIDR MARINA
            - generic [ref=e77]: Felucca Al Nil
            - generic [ref=e79]: 10 PAX
            - generic [ref=e81]:
              - generic [ref=e82]: "950"
              - generic [ref=e83]: EGP / DAY
        - link "Atlantis MOTORBOAT HURGHADA MARINA Atlantis 16 PAX 8,900 EGP / DAY" [ref=e85] [cursor=pointer]:
          - /url: /en/yachts/8857929d-c665-4866-ace2-6722ac60f33c
          - generic [ref=e86]:
            - img "Atlantis" [ref=e87]
            - generic:
              - img
          - generic [ref=e88]:
            - generic [ref=e89]:
              - generic [ref=e90]: MOTORBOAT
              - generic [ref=e91]: HURGHADA MARINA
            - generic [ref=e92]: Atlantis
            - generic [ref=e94]: 16 PAX
            - generic [ref=e96]:
              - generic [ref=e97]: 8,900
              - generic [ref=e98]: EGP / DAY
        - link "Reeh Al Bahr MOTORBOAT RAS SIDR MARINA Reeh Al Bahr 12 PAX 4,400 EGP / DAY" [ref=e100] [cursor=pointer]:
          - /url: /en/yachts/b87756d3-f4f1-49e6-b927-eedde438f4a9
          - generic [ref=e101]:
            - img "Reeh Al Bahr" [ref=e102]
            - generic:
              - img
          - generic [ref=e103]:
            - generic [ref=e104]:
              - generic [ref=e105]: MOTORBOAT
              - generic [ref=e106]: RAS SIDR MARINA
            - generic [ref=e107]: Reeh Al Bahr
            - generic [ref=e109]: 12 PAX
            - generic [ref=e111]:
              - generic [ref=e112]: 4,400
              - generic [ref=e113]: EGP / DAY
        - link "Nour Al Shati FISHING RAS SIDR MARINA Nour Al Shati 6 PAX 1,800 EGP / DAY" [ref=e115] [cursor=pointer]:
          - /url: /en/yachts/85a9d1b9-0193-47e4-b540-22fb1b218656
          - generic [ref=e116]:
            - img "Nour Al Shati" [ref=e117]
            - generic:
              - img
          - generic [ref=e118]:
            - generic [ref=e119]:
              - generic [ref=e120]: FISHING
              - generic [ref=e121]: RAS SIDR MARINA
            - generic [ref=e122]: Nour Al Shati
            - generic [ref=e124]: 6 PAX
            - generic [ref=e126]:
              - generic [ref=e127]: 1,800
              - generic [ref=e128]: EGP / DAY
        - link "Al Bahr Al Ahmar FISHING HURGHADA MARINA Al Bahr Al Ahmar 8 PAX 3,800 EGP / DAY" [ref=e130] [cursor=pointer]:
          - /url: /en/yachts/06af00cd-aaa7-45c9-8a7c-66e0d82a589e
          - generic [ref=e131]:
            - img "Al Bahr Al Ahmar" [ref=e132]
            - generic:
              - img
          - generic [ref=e133]:
            - generic [ref=e134]:
              - generic [ref=e135]: FISHING
              - generic [ref=e136]: HURGHADA MARINA
            - generic [ref=e137]: Al Bahr Al Ahmar
            - generic [ref=e139]: 8 PAX
            - generic [ref=e141]:
              - generic [ref=e142]: 3,800
              - generic [ref=e143]: EGP / DAY
    - contentinfo [ref=e144]:
      - generic [ref=e145]:
        - generic [ref=e146]:
          - generic [ref=e147]: سي كونكت
          - generic [ref=e148]: Connecting Egypt to its coastlines — since 2026.
          - generic [ref=e149]: CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR
        - generic [ref=e150]:
          - heading "المنصة" [level=5] [ref=e151]
          - list [ref=e152]:
            - listitem [ref=e153]:
              - link "استكشاف القوارب" [ref=e154] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e155]:
              - link "متجر العدد" [ref=e156] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e157]:
              - link "البطولات" [ref=e158] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e159]:
              - link "كن مالك قارب" [ref=e160] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e161]:
              - link "كن بائعاً" [ref=e162] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e163]:
          - heading "الشركة" [level=5] [ref=e164]
          - list [ref=e165]:
            - listitem [ref=e166]:
              - link "من نحن" [ref=e167] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e168]:
              - link "الصحافة" [ref=e169] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e170]:
              - link "وظائف" [ref=e171] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e172]:
              - link "اتصل بنا" [ref=e173] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e174]:
          - heading "الثقة والأمان" [level=5] [ref=e175]
          - list [ref=e176]:
            - listitem [ref=e177]:
              - link "ضمان الحجز" [ref=e178] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e179]:
              - link "شروط الاستخدام" [ref=e180] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e181]:
              - link "الخصوصية" [ref=e182] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e183]:
              - link "سياسة الاسترجاع" [ref=e184] [cursor=pointer]:
                - /url: "#"
      - generic [ref=e185]:
        - generic [ref=e186]: © 2026 SEACONNECT LLC · REGISTERED IN CAIRO, EGYPT
        - generic [ref=e187]: FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD
  - alert [ref=e188]
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
> 17  |     await page.goto('/en/yachts')
      |                ^ Error: page.goto: Test timeout of 45000ms exceeded.
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
  91  |       await page.goto(path)
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