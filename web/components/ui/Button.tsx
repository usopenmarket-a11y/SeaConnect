import * as React from 'react'
import { cn } from '@/lib/utils'

/** Visual style variant for the button. */
type ButtonVariant = 'primary' | 'secondary' | 'ghost'

/** Size variant for the button. */
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to 'primary'. */
  variant?: ButtonVariant
  /** Size preset. Defaults to 'md'. */
  size?: ButtonSize
  /** Renders a full-width block button. */
  fullWidth?: boolean
  /** Shows a loading spinner and disables interaction. */
  isLoading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-sea text-white',
    'hover:opacity-90 active:opacity-80',
    'disabled:opacity-50',
  ].join(' '),
  secondary: [
    'border border-sea text-sea bg-transparent',
    'hover:bg-sea/5 active:bg-sea/10',
    'disabled:opacity-50',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink',
    'hover:bg-ink/5 active:bg-ink/10',
    'disabled:opacity-50',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 ps-3 pe-3 text-sm gap-1.5',
  md: 'h-10 ps-4 pe-4 text-base gap-2',
  lg: 'h-12 ps-6 pe-6 text-lg gap-2.5',
}

/**
 * SeaConnect design-system button.
 *
 * Uses logical padding properties (ps-/pe-) so layout is correct in
 * both LTR and RTL contexts (ADR-014).
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleSubmit}>
 *   {t('common.confirm')}
 * </Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        // Base
        'inline-flex items-center justify-center',
        'rounded-lg font-sans font-semibold',
        'transition-all duration-150',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        // Variant
        variantClasses[variant],
        // Size
        sizeClasses[size],
        // Width
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
