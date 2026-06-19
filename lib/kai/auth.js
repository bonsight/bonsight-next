import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export async function isKaiAuthorized() {
  const expected = createHash('sha256').update(process.env.KAI_ACCESS_CODE || '').digest('hex');
  const cookieStore = await cookies();
  return cookieStore.get('kai_auth')?.value === expected;
}
