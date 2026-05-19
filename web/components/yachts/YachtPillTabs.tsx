'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
}

export function YachtPillTabs({ locale }: Props) {
  const t = useTranslations('yachts')
  const [active, setActive] = React.useState(0)

  const tabs = [
    { key: 'tabAll',     count: 183 },
    { key: 'tabLuxury',  count: 28  },
    { key: 'tabFishing', count: 76  },
    { key: 'tabFelucca', count: 22  },
    { key: 'tabFamily',  count: 57  },
  ]

  return (
    <div className="pill-tabs">
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          className={`pill${i === active ? ' active' : ''}`}
          onClick={() => setActive(i)}
        >
          {t(tab.key as Parameters<typeof t>[0])}
          <span className="pill-count">{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
