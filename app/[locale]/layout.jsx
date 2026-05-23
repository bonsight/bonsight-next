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
  return {
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
