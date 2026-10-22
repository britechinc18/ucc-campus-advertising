import 'server-only';
import { cache } from 'react';
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
    const rows = await query<{ id: string; name: string | null; role: string; suspended: boolean }>(
      db(),
      sql`select id,name,role,suspended from users where id=${session.user.id}`,
    );
    return { configured, user: rows[0] ?? null };
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
