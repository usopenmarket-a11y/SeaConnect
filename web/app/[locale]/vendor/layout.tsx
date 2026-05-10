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
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <VendorSidebar locale={locale} />
        </aside>
        <main>{children}</main>
      </div>
    </VendorGuard>
  )
}
