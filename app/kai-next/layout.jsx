import { DM_Sans } from 'next/font/google';
import './kai-next.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const metadata = {
  title: 'Kai Next — Bonsight',
  description: 'Próxima generación de Kai — loop agéntico, MVP interno.',
  robots: { index: false, follow: false },
};

export default function KaiNextLayout({ children }) {
  return <div className={`knx-root ${dmSans.variable}`}>{children}</div>;
}
