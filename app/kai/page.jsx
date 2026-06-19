import { isKaiAuthorized } from '@/lib/kai/auth';
import { redirect } from 'next/navigation';
import KaiChat from './components/KaiChat';

export default async function KaiPage() {
  if (!(await isKaiAuthorized())) {
    redirect('/kai/login');
  }

  return <KaiChat />;
}
