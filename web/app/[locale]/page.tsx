import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface HomePageProps {
  params: { locale: string }
}

/**
 * Home page — Server Component (SSR for SEO per ADR-003).
 *
 * Renders the marketing hero section. All copy is served via i18n keys
 * (ADR-015). Visual design matches Design/SeaConnect.html hero section.
 */
export default function HomePage({
  params: { locale },
}: HomePageProps): React.ReactElement {
  const t = useTranslations('home.hero')
  const tNav = useTranslations('nav')

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-pearl py-16 sm:py-24"
    >
      {/* Decorative background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sea/5 to-transparent"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <h1
          id="hero-heading"
          className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl"
        >
          {t('title')}
        </h1>

        <p className="mt-6 text-lg text-ink/70 sm:text-xl">
          {t('subtitle')}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={`/${locale}/register`}>
            <Button variant="primary" size="lg">
              {t('cta')}
            </Button>
          </Link>
          <Link href={`/${locale}/login`}>
            <Button variant="secondary" size="lg">
              {tNav('login')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
