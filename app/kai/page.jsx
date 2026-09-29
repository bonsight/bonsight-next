import { isKaiAuthorized } from '@/lib/kai/auth';
import { teamLoginUrl } from '@/lib/team/auth';
import { redirect } from 'next/navigation';
import KaiChat from './components/KaiChat';

export default async function KaiPage() {
  if (!(await isKaiAuthorized())) {
    redirect(await teamLoginUrl());
  }

  return <KaiChat />;
}
