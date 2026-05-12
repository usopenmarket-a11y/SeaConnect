/**
 * Vendor area layout — applies role guard + sidebar to /[locale]/vendor/*.
 *
 * The VendorGuard ('use client') redirects unauthenticated users to login
 * and non-vendor users to the home page. The sidebar shows nav links to
 * the vendor's product management pages.
 *
 * RTL: grid columns flip automatically due to logical block flow — the sidebar
 * is inserted before <main> and the grid handles direction.
 *
 * ADR-014: logical CSS only.
 */

import * as React from 'react'

import { VendorGuard } from '@/components/vendor/VendorGuard'
import { VendorSidebar } from '@/components/vendor/VendorSidebar'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export default function VendorLayout({
  children,
  params: { locale },
}: Props): React.ReactElement {
  return (
    <VendorGuard locale={locale}>
      <div className="dash-layout">
        <VendorSidebar locale={locale} />
        <main>{children}</main>
      </div>
    </VendorGuard>
  )
}
