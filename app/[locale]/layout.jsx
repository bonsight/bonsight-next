import { headers } from 'next/headers';
import Navbar from '@/components/Navbar';
import NavigationBehavior from '@/components/NavigationBehavior';
import Analytics from '@/components/Analytics';
import ChatWidget from '@/components/ChatWidget';

const BASE = 'https://bonsight.co';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const h = await headers();
  const pathname = h.get('x-pathname') || '';
  const en = locale === 'en';

  return {
    title: {
      default: 'Bonsight',
      template: '%s | Bonsight',
    },
    description: en
      ? 'From strategy to execution. With you every step. Data strategy, digital growth and team development.'
      : 'De la estrategia a la ejecución. Contigo en cada paso. Estrategia de datos, crecimiento digital y desarrollo de equipos.',
    openGraph: {
      siteName: 'Bonsight',
      locale: en ? 'en_US' : 'es_ES',
      type: 'website',
    },
    alternates: {
      canonical: `${BASE}/${locale}${pathname}`,
      languages: {
        'es':        `${BASE}/es${pathname}`,
        'en':        `${BASE}/en${pathname}`,
        'x-default': `${BASE}/es${pathname}`,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  return (
    <>
      <Navbar locale={locale} />
      <NavigationBehavior />
      <Analytics />
      {children}
      <ChatWidget />
    </>
  );
}
