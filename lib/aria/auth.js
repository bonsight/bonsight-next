import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export async function isAuthorized() {
  const expected = createHash('sha256').update(process.env.ARIA_ACCESS_CODE || '').digest('hex');
  const cookieStore = await cookies();
  return cookieStore.get('aria_auth')?.value === expected;
}
