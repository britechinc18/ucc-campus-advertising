import { NextResponse } from 'next/server';
import { signOut } from '@/server/auth';
import { isAuthenticationConfigured } from '@/server/config';
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin)
    return new Response('Forbidden', { status: 403 });
  if (isAuthenticationConfigured()) await signOut({ redirect: false });
  return NextResponse.redirect(new URL('/', url), 303);
}
