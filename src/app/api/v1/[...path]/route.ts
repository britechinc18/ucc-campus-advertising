import { dispatch } from '@/server/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await context.params).path);
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT };
