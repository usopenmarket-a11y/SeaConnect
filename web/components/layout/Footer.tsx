import * as React from 'react'

/**
 * Footer — dark ink background, 4-column grid, payment logos strip.
 *
 * Matches Footer() from Design/shared.jsx exactly.
 * Server Component — fully static, no client state.
 * ADR-015: strings are Arabic-first content. Locale-aware links could be added
 * later; for now the footer links are placeholder hrefs.
 */
export function Footer(): React.ReactElement {
  return (
    <footer className="footer" role="contentinfo" data-screen-label="footer">
      <div className="top">
        {/* Brand column */}
        <div>
          <div className="brand">سي كونكت</div>
          <div className="tagline">Connecting Egypt to its coastlines — since 2026.</div>
          <div
            className="mono"
            style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', direction: 'ltr' }}
          >
            CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR
          </div>
        </div>

        {/* Platform column */}
        <div>
          <h5>المنصة</h5>
          <ul>
            <li><a href="#">استكشاف القوارب</a></li>
            <li><a href="#">متجر العدد</a></li>
            <li><a href="#">البطولات</a></li>
            <li><a href="#">كن مالك قارب</a></li>
            <li><a href="#">كن بائعاً</a></li>
          </ul>
        </div>

        {/* Company column */}
        <div>
          <h5>الشركة</h5>
          <ul>
            <li><a href="#">من نحن</a></li>
            <li><a href="#">الصحافة</a></li>
            <li><a href="#">وظائف</a></li>
            <li><a href="#">اتصل بنا</a></li>
          </ul>
        </div>

        {/* Trust column */}
        <div>
          <h5>الثقة والأمان</h5>
          <ul>
            <li><a href="#">ضمان الحجز</a></li>
            <li><a href="#">شروط الاستخدام</a></li>
            <li><a href="#">الخصوصية</a></li>
            <li><a href="#">سياسة الاسترجاع</a></li>
          </ul>
        </div>
      </div>

      <div className="bottom">
        <span>© 2026 SEACONNECT LLC · REGISTERED IN CAIRO, EGYPT</span>
        <span>FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD</span>
      </div>
    </footer>
  )
}
