import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a hover shadow lift effect. */
  hoverable?: boolean
  /** Removes internal padding for custom content. */
  noPadding?: boolean
}

interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * SeaConnect design-system card container.
 *
 * Uses --sand background token with rounded corners and optional shadow.
 * Logical padding ensures correct spacing in both LTR and RTL (ADR-014).
 *
 * @example
 * <Card hoverable>
 *   <Card.Header>
 *     <h2>{t('bookings.title')}</h2>
 *   </Card.Header>
 *   <Card.Body>...</Card.Body>
 *   <Card.Footer>...</Card.Footer>
 * </Card>
 */
export function Card({
  hoverable = false,
  noPadding = false,
  className,
  children,
  ...props
}: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl bg-sand shadow-sm',
        hoverable && 'transition-shadow duration-200 hover:shadow-md',
        !noPadding && 'p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({
  className,
  children,
  ...props
}: CardSectionProps): React.ReactElement {
  return (
    <div
      className={cn(
        'mb-3 border-b border-ink/10 pb-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardBody({
  className,
  children,
  ...props
}: CardSectionProps): React.ReactElement {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({
  className,
  children,
  ...props
}: CardSectionProps): React.ReactElement {
  return (
    <div
      className={cn(
        'mt-3 border-t border-ink/10 pt-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
