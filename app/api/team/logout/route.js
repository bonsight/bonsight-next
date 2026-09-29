import { logoutTeamUser } from '@/lib/team/auth';

export async function POST() {
  await logoutTeamUser();
  return Response.json({ ok: true });
}
