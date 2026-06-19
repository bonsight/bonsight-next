import { Inter } from 'next/font/google';
import './kai.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Kai — Consultor Estratégico de Bonsight',
  description: 'Kai entiende tu negocio, hace las preguntas correctas y te ayuda a encontrar oportunidades de crecimiento.',
  robots: { index: false, follow: false },
};

export default function KaiLayout({ children }) {
  return <div className={`kai-root ${inter.variable}`}>{children}</div>;
}
