import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Bonsight',
  description: 'Estrategia de datos, crecimiento digital, CRO y acompañamiento a equipos.',
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.svg',
  },
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'es';
  return (
    <html lang={locale}>
      <head>
        <Script id="ms-clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "xnhih7jnm4");
        `}</Script>
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
        {children}
      </body>
    </html>
  );
}
