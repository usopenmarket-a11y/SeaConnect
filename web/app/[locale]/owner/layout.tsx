/**
 * Owner area layout — applies role guard + sidebar to /[locale]/owner/*.
 *
 * The OwnerGuard ('use client') redirects unauthenticated users to login
 * and non-owner users to the home page. The sidebar shows nav links to
 * Dashboard / Bookings / My yachts.
 *
 * RTL: the grid columns flip automatically because we use `grid-cols-*`
 * with logical block flow — the sidebar is inserted before `<main>` and
 * the grid handles direction.
 */

import * as React from 'react'

import { OwnerGuard } from '@/components/owner/OwnerGuard'
import { OwnerSidebar } from '@/components/owner/OwnerSidebar'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export default function OwnerLayout({
  children,
  params: { locale },
}: Props): React.ReactElement {
  return (
    <OwnerGuard locale={locale}>
      <div className="dash-layout">
        <OwnerSidebar locale={locale} />
        <main>{children}</main>
      </div>
    </OwnerGuard>
  )
}
