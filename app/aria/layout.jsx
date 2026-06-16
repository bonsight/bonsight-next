import { Inter } from 'next/font/google';
import './aria.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Aria — Bonsight',
  description: 'Agente autónomo de CRO y crecimiento digital de Bonsight.',
  robots: { index: false, follow: false },
};

export default function AriaLayout({ children }) {
  return <div className={`aria-root ${inter.variable}`}>{children}</div>;
}
