import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';
import { isAuthenticationConfigured } from './config';
import { db } from './db';
import { query } from './store';
import { sql } from 'drizzle-orm';
export const viewer = cache(async () => {
  const configured = isAuthenticationConfigured();
  if (!configured) return { configured, user: null };
  try {
    const session = await auth();
    if (!session?.user?.id) return { configured, user: null };
    const rows = await query<{
      id: string;
      name: string | null;
      image: string | null;
      role: string;
      suspended: boolean;
      seller_active: boolean;
    }>(
      db(),
      sql`select u.id,u.name,u.image,u.role,u.suspended,exists(select 1 from advertisers p where p.user_id=u.id and not p.suspended) as seller_active from users u where u.id=${session.user.id}`,
    );
    const user = rows[0];
    if (!user) return { configured, user: null };
    const preference = (await cookies()).get('medstash-mode')?.value;
    return { configured, user: { ...user, buyer_mode: preference === `${user.id}:buyer` } };
  } catch {
    return { configured, user: null };
  }
});
export async function requireViewer(path: string, admin = false) {
  const v = await viewer();
  if (!v.user) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  if (v.user.suspended) redirect('/account-restricted');
  if (admin && v.user.role !== 'admin') redirect('/my-adverts');
  return v.user;
}
