import Navbar from '@/components/Navbar';
import NavigationBehavior from '@/components/NavigationBehavior';
import Analytics from '@/components/Analytics';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  return (
    <>
      <Navbar locale={locale} />
      <NavigationBehavior />
      <Analytics />
      {children}
    </>
  );
}
