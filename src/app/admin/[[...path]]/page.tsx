import { AdminProfileReviews } from '@/components/admin-profile-reviews';
import { PersonalProfileForm } from '@/components/personal-profile-form';
import { personalProfile } from '@/server/profiles';
import { requireViewer } from '@/server/viewer';
import { AdminBusinessEditor } from '@/components/admin-business-editor';
import { notFound } from 'next/navigation';
import { AdminPosting } from '@/components/admin-posting';
import { SystemCheck } from '@/components/system-check';
import { AdminScreen } from '@/components/admin-screen';
export const metadata = { title: 'Administration' };
export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (path.length === 3 && path[0] === 'businesses' && path[2] === 'profile')
    return <AdminBusinessEditor advertiserId={path[1]} />;
  if (path.length === 1 && path[0] === 'profiles') return <AdminProfileReviews />;
  if (path.length === 2 && path[0] === 'personal') {
    const user = await requireViewer('/admin', true);
    return <PersonalProfileForm profile={await personalProfile(user.id, path[1])} assisted />;
  }
  if (path.length === 1 && path[0] === 'post') return <AdminPosting />;
  if (path.length === 1 && path[0] === 'system') return <SystemCheck />;
  if (
    path.length > 2 ||
    ![
      '',
      'submissions',
      'adverts',
      'reports',
      'advertisers',
      'businesses',
      'categories',
      'settings',
      'audit',
    ].includes(path[0] ?? '')
  )
    notFound();
  return <AdminScreen key={path.join('/')} resource={path[0] ?? 'overview'} target={path[1]} />;
}
