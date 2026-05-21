import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import NavigationBehavior from '@/components/NavigationBehavior';
import Analytics from '@/components/Analytics';

export const metadata = {
  title: 'Bonsight LLC — Estrategia de datos',
  description: 'Estrategia de datos, crecimiento digital, CRO y acompañamiento a equipos.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <Script id="gtm" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-PQT654B4');
        `}</Script>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PQT654B4"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <Navbar />
        <NavigationBehavior />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
