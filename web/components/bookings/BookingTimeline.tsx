'use client'

/**
 * BookingTimeline — chronological list of immutable BookingEvents
 * (ADR-012 audit log) rendered as a vertical list.
 *
 * Each event maps to a localized label via the bookingDetail.event.* keys.
 * The actor's display name is whatever the API returned (server formats it
 * from first/last/email).
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

export type BookingEventType =
  | 'created'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'payment_received'

export interface TimelineEvent {
  id: string
  event_type: BookingEventType
  actor_name: string | null
  notes: string
  created_at: string
}

interface Props {
  events: TimelineEvent[]
  locale: string
}

const dotColorMap: Record<BookingEventType, string> = {
  created: 'bg-sea',
  confirmed: 'bg-emerald-500',
  declined: 'bg-red-500',
  cancelled: 'bg-red-500',
  completed: 'bg-sea',
  payment_received: 'bg-emerald-500',
}

function formatTimestamp(iso: string, locale: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function BookingTimeline({ events, locale }: Props): React.ReactElement {
  const t = useTranslations('bookingDetail.event')

  if (events.length === 0) {
    return <p className="text-sm text-ink/50">—</p>
  }

  return (
    <ol role="list" className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColorMap[event.event_type] ?? 'bg-ink/40'}`}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-ink">
              {t(event.event_type)}
            </p>
            {event.actor_name && (
              <p className="text-xs text-ink/60">{event.actor_name}</p>
            )}
            {event.notes && (
              <p className="text-xs text-ink/60">{event.notes}</p>
            )}
            <p className="font-mono text-xs text-ink/40">
              {formatTimestamp(event.created_at, locale)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
