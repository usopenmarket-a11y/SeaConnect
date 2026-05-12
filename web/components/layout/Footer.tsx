'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

/**
 * Footer — dark ink background, 4-column grid, payment logos strip.
 *
 * Matches Footer() from Design/shared.jsx exactly.
 * Client Component: uses useTranslations for ADR-015 compliance.
 *
 * ADR-015: all strings via t() from footer namespace.
 */
export function Footer(): React.ReactElement {
  const t = useTranslations('footer')

  return (
    <footer className="footer" role="contentinfo" data-screen-label="footer">
      <div className="top">
        {/* Brand column */}
        <div>
          <div className="brand">{t('brand')}</div>
          <div className="tagline">{t('tagline')}</div>
          <div
            className="mono"
            style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', direction: 'ltr' }}
          >
            CAIRO · HURGHADA · ALEXANDRIA · SHARM EL SHEIKH · DAHAB · LUXOR
          </div>
        </div>

        {/* Platform column */}
        <div>
          <h5>{t('platform')}</h5>
          <ul>
            <li><a href="#">{t('explore')}</a></li>
            <li><a href="#">{t('store')}</a></li>
            <li><a href="#">{t('tournaments')}</a></li>
            <li><a href="#">{t('becomeOwner')}</a></li>
            <li><a href="#">{t('becomeVendor')}</a></li>
          </ul>
        </div>

        {/* Company column */}
        <div>
          <h5>{t('company')}</h5>
          <ul>
            <li><a href="#">{t('about')}</a></li>
            <li><a href="#">{t('press')}</a></li>
            <li><a href="#">{t('careers')}</a></li>
            <li><a href="#">{t('contact')}</a></li>
          </ul>
        </div>

        {/* Trust column */}
        <div>
          <h5>{t('trust')}</h5>
          <ul>
            <li><a href="#">{t('guarantee')}</a></li>
            <li><a href="#">{t('terms')}</a></li>
            <li><a href="#">{t('privacy')}</a></li>
            <li><a href="#">{t('refund')}</a></li>
          </ul>
        </div>
      </div>

      <div className="bottom">
        <span>{t('copyright')}</span>
        <span>FAWRY · VODAFONE CASH · INSTAPAY · VISA · MASTERCARD</span>
      </div>
    </footer>
  )
}
