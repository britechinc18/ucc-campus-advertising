import type { NextRequest } from 'next/server';
import { handlers } from '@/server/auth';
import { isAuthenticationConfigured } from '@/server/config';
export const runtime = 'nodejs';
function unavailable() {
  return Response.json(
    { code: 'AUTH_UNAVAILABLE', message: 'Sign-in is not configured for this backend preview' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function GET(request: NextRequest) {
  if (!isAuthenticationConfigured()) return unavailable();
  return handlers.GET(request);
}
export async function POST(request: NextRequest) {
  if (!isAuthenticationConfigured()) return unavailable();
  return handlers.POST(request);
}
