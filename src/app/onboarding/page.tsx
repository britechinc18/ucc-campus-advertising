import { redirect } from 'next/navigation';
import { requireViewer } from '@/server/viewer';
import { accountContext } from '@/server/frontend';
import { safeReturn } from '@/lib/market';
import { Onboarding } from '@/components/onboarding';
export const metadata = { title: 'Activate your seller profile' };
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturn(params.next);
  const u = await requireViewer(
    `/onboarding?${new URLSearchParams({ next, ...(params.kind ? { kind: params.kind } : {}) })}`,
  );
  const context = await accountContext(u.id);
  const kind = params.kind === 'student' || params.kind === 'business' ? params.kind : undefined;
  if (!kind && context.profiles.length) redirect('/my-adverts');
  return (
    <main id="main" className="container seller-onboarding-layout">
      <section className="seller-onboarding">
        <Onboarding name={u.name ?? ''} next={next} kind={kind} profiles={context.profiles} />
      </section>
    </main>
  );
}
