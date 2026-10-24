import { ProfileWorkspace } from '@/components/profile-workspace';
export const metadata = { title: 'My Profile' };
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ identity?: string }>;
}) {
  return <ProfileWorkspace business={(await searchParams).identity === 'business'} />;
}
