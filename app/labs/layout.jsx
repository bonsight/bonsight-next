import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './labs.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-serif' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata = {
  title: 'Labs — Bonsight',
  description: 'Espacio de proyectos vivos — pruebas, aportes y aprendizaje continuo.',
  robots: { index: false, follow: false },
};

export default function LabsLayout({ children }) {
  return <div className={`labs-root ${inter.variable} ${fraunces.variable} ${mono.variable}`}>{children}</div>;
}
