import './globals.css';
import Navbar from '../components/Navbar';
import NavigationBehavior from '../components/NavigationBehavior';

export const metadata = {
  title: 'Bonsight LLC — Estrategia de datos',
  description: 'Estrategia de datos, crecimiento digital, CRO y acompañamiento a equipos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <NavigationBehavior />
        {children}
      </body>
    </html>
  );
}
