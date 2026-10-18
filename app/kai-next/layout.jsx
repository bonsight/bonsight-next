import { DM_Sans } from 'next/font/google';
import './kai-next.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const metadata = {
  title: 'Kai — Bonsight',
  description: 'Kai conecta lo que tu empresa sabe con lo que ocurre en tus datos, para ayudarte a entender, decidir y actuar.',
  robots: { index: false, follow: false },
};

export default function KaiNextLayout({ children }) {
  return <div className={`knx-root ${dmSans.variable}`}>{children}</div>;
}
