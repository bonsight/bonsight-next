import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { teamLoginUrl } from '@/lib/team/auth';
import { redirect } from 'next/navigation';

export default async function LabsRootPage() {
  if (!(await isLabsAdminAuthorized())) {
    redirect(await teamLoginUrl());
  }
  redirect('/admin');
}
